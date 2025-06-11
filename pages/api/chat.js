
import axios from 'axios';

async function fetchShopifyProducts(domain, token) {
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

  try {
    const response = await axios.post(
      `https://${domain}/api/2023-07/graphql.json`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
      }
    );
    return response.data.data.products.edges.map(edge => edge.node);
  } catch (err) {
    console.error("Shopify API error:", err.response?.data || err.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body;
  const shopifyDomain = process.env.SHOPIFY_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  console.log("Incoming message:", message);

  const products = await fetchShopifyProducts(shopifyDomain, storefrontToken);

  const prompt = `
You are an AI shopping assistant for Hifisti.

Here are some products:
${JSON.stringify(products, null, 2)}

User asked: "${message}"
`;

  // Try Gemini first
  try {
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=' + geminiKey,
      {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      }
    );
    const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn’t find an answer.';
    console.log("Gemini succeeded");
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini failed:", error.response?.data || error.message);
  }

  // Fall back to Groq (Mixtral)
  try {
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI shopping assistant for a Shopify store.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        }
      }
    );

    const reply = groqResponse.data.choices?.[0]?.message?.content || 'Sorry, Groq could not generate a reply.';
    console.log("Groq fallback succeeded");
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Groq failed:", error.response?.data || error.message);
    return res.status(500).json({ error: 'Both Gemini and Groq failed to generate a response.' });
  }
}
