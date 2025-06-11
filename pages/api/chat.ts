import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = 'hifisti.myshopify.com';

const fetchProductsFromShopify = async (queryTerm: string = '') => {
  const STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
  if (!STOREFRONT_API_KEY) throw new Error('Missing SHOPIFY_STOREFRONT_API_KEY in environment variables');

  const query = `
    query Products($query: String) {
      products(first: 8, query: $query) {
        edges {
          node {
            id
            title
            description
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  price {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_API_KEY,
    },
    body: JSON.stringify({ query, variables: { query: queryTerm } }),
  });

  const json = await response.json();
  if (json.errors) throw new Error('Shopify returned an error: ' + JSON.stringify(json.errors));
  return json.data.products.edges.map((edge: any) => edge.node);
};

const askGroq = async (prompt: string) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY in environment variables');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'Sorry, no helpful answer was generated.';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message in request body' });

  try {
    const products = await fetchProductsFromShopify(message);
    const shopifyContext = JSON.stringify(products, null, 2);

    const aiPrompt = `
You are a helpful shopping assistant for https://${SHOPIFY_DOMAIN}.

Here are the current products from the Shopify store:

${shopifyContext}

A user just asked: "${message}"

Based only on these products, give a smart recommendation. Include what to consider, and which product(s) best match the user's need.
`;

    const aiResponse = await askGroq(aiPrompt);
    return res.status(200).json({ response: aiResponse });
  } catch (error: any) {
    console.error('[AI_SHOPIFY_ERROR]', error);
    return res.status(500).json({ error: error.message || 'Unexpected server error' });
  }
}
