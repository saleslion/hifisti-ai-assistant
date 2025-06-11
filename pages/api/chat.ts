import type { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages payload' });

    if (GEMINI_API_KEY) {
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: messages.map((m: any) => m.content).join('\n') }] }]
        }),
      });
      const geminiData = await geminiResponse.json();
      const geminiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (geminiReply) return res.status(200).json({ reply: geminiReply });
    }

    if (GROQ_API_KEY) {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model: 'mixtral-8x7b-32768', messages }),
      });
      const groqData = await groqResponse.json();
      const groqReply = groqData?.choices?.[0]?.message?.content;
      if (groqReply) return res.status(200).json({ reply: groqReply });
    }

    throw new Error('No valid AI response from Gemini or Groq');
  } catch (err: any) {
    console.error('[API_CHAT_ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}