import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatCompletionRequestMessage, Groq } from 'groq-sdk';
import type { NextApiRequest, NextApiResponse } from 'next';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { history } = req.body;
  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Missing or invalid message history' });
  }

  const cleanMessages = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  try {
    // Attempt Gemini first
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const chat = model.startChat({ history: cleanMessages });
    const result = await chat.sendMessage(history[history.length - 1].content);
    const text = result.response.text();
    return res.status(200).json({ reply: text, source: 'gemini' });

  } catch (geminiErr) {
    console.warn('Gemini failed:', geminiErr?.response?.data || geminiErr.message);

    if (geminiErr?.response?.status !== 429) {
      return res.status(500).json({ error: 'Gemini failed', details: geminiErr.message });
    }

    // Fallback to Groq
    try {
      const messages = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const completion = await groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages,
      });

      const reply = completion.choices[0]?.message?.content || 'Sorry, no response.';
      return res.status(200).json({ reply, source: 'groq' });

    } catch (groqErr) {
      console.error('Groq failed:', groqErr);
      return res.status(503).json({ error: 'Groq fallback failed', details: groqErr.message });
    }
  }
}
