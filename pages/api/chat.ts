// /pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages payload' });
  }

  try {
    // === Gemini First Attempt ===
    if (GEMINI_API_KEY) {
      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: messages.map((m: any) => m.content).join('\n') }],
            },
          ],
        }),
      });

      const geminiData = await geminiRes.json();
      const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply) {
        return res.status(200).json({ reply });
      } else {
        console.warn('[Gemini] No valid reply, falling back to Groq');
      }
    }

    // === Groq Fallback ===
    if (GROQ_API_KEY) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages,
        }),
      });

      const groqData = await groqRes.json();
      const reply = groqData?.choices?.[0]?.message?.content;

      if (reply) {
        return res.status(200).json({ reply });
      } else {
        throw new Error('Groq did not return a valid response');
      }
    }

    throw new Error('No available AI providers (Gemini or Groq)');
  } catch (err: any) {
    console.error('[API_CHAT_ERROR]', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
