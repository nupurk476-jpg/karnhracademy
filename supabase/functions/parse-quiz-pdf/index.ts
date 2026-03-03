import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QUIZ_PROMPT = `Extract ALL multiple-choice questions from this content. Return a JSON array where each element has:
- "question": the question text
- "options": an array of exactly 4 option strings
- "correct_answer": the index (0-3) of the correct option
- "explanation": a brief explanation of why the correct answer is right

If the content contains study material but no explicit questions, generate as many relevant MCQ questions as possible from ALL the content — cover every topic, concept, definition, and key point thoroughly. Do not limit yourself to a small number; aim for comprehensive coverage of the entire document.

Return ONLY valid JSON array, no markdown, no extra text.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = req.headers.get('content-type') || '';
    let userContent: string;

    if (contentType.includes('multipart/form-data')) {
      // File upload — extract text content from the file
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Read file as text — works for text-based formats
      // For binary formats (PDF/PPT/DOC), we send as base64 but limit size
      const fileName = file.name.toLowerCase();
      const isBinary = fileName.endsWith('.pdf') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
      
      if (isBinary) {
        // Check file size — limit to 4MB for binary to avoid memory issues
        if (file.size > 4 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'File too large. Please use files under 4MB, or paste the text content directly using the "Paste Text" option.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Encode to base64 in chunks to avoid stack overflow
        const chunkSize = 4096;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          for (let j = 0; j < slice.length; j++) {
            binary += String.fromCharCode(slice[j]);
          }
        }
        const base64 = btoa(binary);

        let mimeType = 'application/octet-stream';
        if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (fileName.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        else if (fileName.endsWith('.ppt')) mimeType = 'application/vnd.ms-powerpoint';
        else if (fileName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (fileName.endsWith('.doc')) mimeType = 'application/msword';

        // Use multimodal approach for binary files
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: QUIZ_PROMPT },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
              ],
            }],
          }),
        });

        return handleAiResponse(aiResponse);
      } else {
        // Text-based file
        userContent = await file.text();
      }
    } else {
      // JSON body with pasted text
      const body = await req.json();
      const text = body.text;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'No text provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userContent = text;
    }

    // Text-based request
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `${QUIZ_PROMPT}\n\nContent:\n${userContent}`,
        }],
      }),
    });

    return handleAiResponse(aiResponse);
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleAiResponse(aiResponse: Response): Promise<Response> {
  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    const status = aiResponse.status;
    if (status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (status === 402) {
      return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'AI processing failed', details: errorText }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || '';

  let questions;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse questions', raw: content }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ questions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
