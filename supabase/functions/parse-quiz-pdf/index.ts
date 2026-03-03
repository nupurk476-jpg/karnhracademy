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

    const body = await req.json();
    let messages: any[];

    if (body.fileUrl) {
      // File was uploaded to storage — pass the public URL to AI
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: QUIZ_PROMPT },
          { type: 'image_url', image_url: { url: body.fileUrl } },
        ],
      }];
    } else if (body.text) {
      // Pasted text
      if (typeof body.text !== 'string' || body.text.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'No text provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      messages = [{
        role: 'user',
        content: `${QUIZ_PROMPT}\n\nContent:\n${body.text}`,
      }];
    } else {
      return new Response(JSON.stringify({ error: 'Provide either fileUrl or text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

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
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
