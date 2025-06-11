
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body;
  console.log("MESSAGE:", message);

  const shopifyDomain = process.env.SHOPIFY_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

  const query = `
  {
    products(first: 5) {
      edges {
        node {
          title
          description
          handle
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
        }
      }
    }
  }`;

  let products = [];

  try {
    const response = await axios.post(
      `https://${shopifyDomain}/api/2023-07/graphql.json`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
      }
    );

    console.log("Shopify response:", response.data);

    products = response.data.data.products.edges.map(edge => edge.node);

  } catch (err) {
    console.error("Shopify API error:", err.response?.data || err.message);
  }

  const prompt = `
You are an AI shopping assistant for Hifisti.

Here are some products:
${JSON.stringify(products, null, 2)}

User asked: "${message}"
`;

  console.log("Prompt to Gemini:", prompt);

  try {
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      }
    );

    const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn’t find an answer.';
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Gemini error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Gemini API error' });
  }
}
