import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_MODEL = 'google/gemini-2.5-flash';
const MIN_QUESTION_COUNT = 30;
const MAX_QUESTION_HINT = 80;
const MAX_AI_TOKENS = 16000;
const MAX_GENERATION_ATTEMPTS = 3;

const QUIZ_PROMPT = `You are a quiz generator.
Generate a LARGE, thorough bank of multiple-choice questions from the provided material.

CRITICAL RULES:
1. Generate at least ${MIN_QUESTION_COUNT} questions whenever the material is substantial enough.
2. If the material is rich or lengthy, generate up to ${MAX_QUESTION_HINT} questions.
3. Cover every section, heading, paragraph, list, definition, example, case study, table, and key fact.
4. Create multiple questions from each major topic.
5. Mix difficulty levels: recall, understanding, application, and analysis.
6. Keep explanations short so you can fit more questions.
7. Do not repeat or paraphrase the same question.

Return ONLY valid JSON array. Each item must have:
- "question": string
- "options": array of exactly 4 strings
- "correct_answer": number from 0 to 3
- "explanation": brief string`;

type ChatMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
};

const getMimeTypeFromUrl = (fileUrl: string) => {
  const url = fileUrl.toLowerCase();
  if (url.includes('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (url.includes('.ppt')) return 'application/vnd.ms-powerpoint';
  if (url.includes('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (url.includes('.doc')) return 'application/msword';
  return 'application/pdf';
};

const extractTextFromAiContent = (content: unknown): string => {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
};

const parseQuestionsFromContent = (content: string): unknown[] => {
  const trimmedContent = content.trim();
  const candidates: string[] = [];

  const arrayMatch = trimmedContent.match(/\[[\s\S]*\]/);
  if (arrayMatch) candidates.push(arrayMatch[0]);

  const objectMatch = trimmedContent.match(/\{[\s\S]*\}/);
  if (objectMatch) candidates.push(objectMatch[0]);

  candidates.push(trimmedContent);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown[] }).questions)) {
        return (parsed as { questions: unknown[] }).questions;
      }
    } catch {
      continue;
    }
  }

  throw new Error('Failed to parse questions');
};

const normalizeQuestions = (questions: unknown[]): QuizQuestion[] => {
  return questions
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, unknown>;
      const question = typeof record.question === 'string' ? record.question.trim() : '';
      const rawOptions = Array.isArray(record.options)
        ? record.options.map((option) => String(option ?? '').trim()).filter(Boolean)
        : [];
      const options = rawOptions.slice(0, 4);
      const correctAnswer = Number(record.correct_answer);
      const explanation = typeof record.explanation === 'string' ? record.explanation.trim() : '';

      if (!question || options.length !== 4 || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
        return null;
      }

      return {
        question,
        options,
        correct_answer: correctAnswer,
        explanation,
      } satisfies QuizQuestion;
    })
    .filter((question): question is QuizQuestion => Boolean(question));
};

const dedupeQuestions = (questions: QuizQuestion[]): QuizQuestion[] => {
  const seen = new Set<string>();

  return questions.filter((question) => {
    const key = question.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const callAi = async (apiKey: string, messages: ChatMessage[]) => {
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: MAX_AI_TOKENS,
      temperature: 0.2,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    const error = new Error('AI processing failed') as Error & { status?: number; details?: string };
    error.status = aiResponse.status;
    error.details = errorText;
    throw error;
  }

  const aiData = await aiResponse.json();

  return {
    content: extractTextFromAiContent(aiData.choices?.[0]?.message?.content),
    finishReason: aiData.choices?.[0]?.finish_reason ?? null,
  };
};

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
    let baseMessages: ChatMessage[];

    if (body.fileUrl) {
      const fileResponse = await fetch(body.fileUrl);
      if (!fileResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch uploaded file' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      const uint8 = new Uint8Array(fileBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64Data = btoa(binary);
      const mimeType = getMimeTypeFromUrl(body.fileUrl);

      baseMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: QUIZ_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
            },
          },
        ],
      }];
    } else if (body.text) {
      if (typeof body.text !== 'string' || body.text.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'No text provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      baseMessages = [{
        role: 'user',
        content: `${QUIZ_PROMPT}\n\nContent:\n${body.text}`,
      }];
    } else {
      return new Response(JSON.stringify({ error: 'Provide either fileUrl or text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let allQuestions: QuizQuestion[] = [];
    let lastRawContent = '';

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const additionalQuestionTarget = allQuestions.length === 0
        ? MIN_QUESTION_COUNT
        : Math.max(MIN_QUESTION_COUNT - allQuestions.length, 12);

      const messages = attempt === 0
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: 'user',
              content: `You have generated only ${allQuestions.length} unique questions so far. Generate ${additionalQuestionTarget} MORE UNIQUE questions from the same source material. Focus on sections, details, examples, tables, and concepts not yet covered. Do not repeat or paraphrase any of these existing questions:\n${allQuestions.map((question, index) => `${index + 1}. ${question.question}`).join('\n')}\n\nReturn ONLY a JSON array of NEW questions.`,
            },
          ];

      const aiResult = await callAi(LOVABLE_API_KEY, messages);
      lastRawContent = aiResult.content;

      const parsedQuestions = parseQuestionsFromContent(aiResult.content);
      const normalizedQuestions = normalizeQuestions(parsedQuestions);
      allQuestions = dedupeQuestions([...allQuestions, ...normalizedQuestions]);

      const enoughQuestions = allQuestions.length >= MIN_QUESTION_COUNT;
      const truncatedOutput = aiResult.finishReason === 'length';
      if (enoughQuestions && !truncatedOutput) break;
    }

    if (allQuestions.length === 0) {
      return new Response(JSON.stringify({ error: 'No questions found in file', raw: lastRawContent }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ questions: allQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error & { status?: number; details?: string };
    console.error('Edge function error:', err);

    if (err.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (err.status === 402) {
      return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: err.message, details: err.details }), {
      status: err.status ?? 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});