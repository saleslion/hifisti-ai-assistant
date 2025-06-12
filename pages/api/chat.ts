import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = 'hifisti.myshopify.com';

const fetchFromShopify = async (query: string) => {
  const token = process.env.SHOPIFY_STOREFRONT_API_KEY;
  if (!token) throw new Error('Missing SHOPIFY_STOREFRONT_API_KEY in environment variables');

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  if (json.errors) throw new Error('Shopify error: ' + JSON.stringify(json.errors));
  return json.data;
};

type ProductNode = {
  title: string;
  description: string;
  handle: string;
  productType?: string;
  tags?: string[];
  images: { edges: { node: { url: string } }[] };
  variants: { edges: { node: { price: { amount: string } } }[] };
};

const fetchProducts = async (): Promise<ProductNode[]> => {
  const query = `{
    products(first: 50) {
      edges {
        node {
          title
          handle
          description
          productType
          tags
          images(first: 1) { edges { node { url } } }
          variants(first: 1) { edges { node { price { amount } } } }
        }
      }
    }
  }`;
  const data = await fetchFromShopify(query);
  return data.products.edges.map((edge: any) => edge.node);
};

const fetchArticles = async () => {
  const query = `{
    articles(first: 5) {
      edges {
        node {
          title
          excerpt
          contentHtml
        }
      }
    }
  }`;
  const data = await fetchFromShopify(query);
  return data.articles.edges.map((edge: any) => edge.node);
};

const askGemini = async (
  prompt: string,
  context: { budget?: number; useCase?: string; location?: string; catalog: string; articles: string }
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in environment variables');

  const messages = [
    {
      role: 'user',
      parts: [
        {
          text: `
You are an expert product advisor for an audio equipment store.

Your job is to:
- Recommend products that match the user's request using the provided Shopify product catalog.
- Prioritize product matches by title, tags, and productType (e.g., "turntables", "speakers", "amps").
- Use budget, use case, and room info if available.
- Suggest exactly 3-5 matching products in this format:

🔊 [Product Title](product_link)
Short 1-line benefit.
💰 €Price
🖼️ Image URL

Then suggest 1 blog article if relevant.

CATALOG:
${context.catalog}

ARTICLES:
${context.articles}

USER MESSAGE:
${prompt}
`.trim(),
        },
      ],
    },
  ];

  // Gemini expects API key in URL, not as a Bearer token!
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
