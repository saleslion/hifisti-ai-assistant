// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages } = req.body;

    console.log('[DEBUG] GEMINI_API_KEY:', !!GEMINI_API_KEY);
    console.log('[DEBUG] GROQ_API_KEY:', !!GROQ_API_KEY);
    console.log('[DEBUG] Incoming messages:', JSON.stringify(messages));

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload' });
    }

    // === Try Gemini ===
    if (GEMINI_API_KEY) {
      const geminiResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        {
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
