import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = 'hifisti.myshopify.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Embedded diagnostic logs
  console.log("🧪 ENV CHECK:", {
    tokenPresent: !!process.env.SHOPIFY_STOREFRONT_API_KEY,
    tokenValue: process.env.SHOPIFY_STOREFRONT_API_KEY?.slice(0, 5) + '***',
  });

  const STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
  if (!STOREFRONT_API_KEY) {
    return res.status(500).json({ error: 'Missing SHOPIFY_STOREFRONT_API_KEY in environment variables' });
  }

  const { message } = req.body;
  const searchTerm = message || 'headphones';

  const query = `
    query Products($query: String) {
      products(first: 4, query: $query) {
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

  try {
    const shopifyRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_API_KEY,
      },
      body: JSON.stringify({ query, variables: { query: searchTerm } }),
    });

    const shopifyData = await shopifyRes.json();

    if (shopifyData.errors) {
      return res.status(400).json({ error: 'Shopify API returned errors', details: shopifyData.errors });
    }

    return res.status(200).json({ products: shopifyData.data.products.edges });
  } catch (error) {
    console.error('[SHOPIFY_API_ERROR]', error);
    return res.status(500).json({ error: 'Error fetching data from Shopify', details: error });
  }
}
