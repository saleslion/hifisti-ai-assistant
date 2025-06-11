
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        contents: [{
          parts: [{ text: `You are an AI shopping assistant for Hifisti. A user asked: "${message}"` }]
        }]
      }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn’t find an answer.';
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Gemini error:', error.message);
    res.status(500).json({ error: 'Gemini API error' });
  }
}
