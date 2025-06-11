// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = 'hifisti.myshopify.com';
const STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { searchTerm } = req.body;

    if (!STOREFRONT_API_KEY) {
      throw new Error('Missing SHOPIFY_STOREFRONT_API_KEY in environment variables');
    }

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid searchTerm in request body' });
    }

    const query = `
      query GetProducts($query: String!) {
        products(first: 5, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const shopifyRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { query: searchTerm },
      }),
    });

    const json = await shopifyRes.json();

    if (json.errors) {
      console.error('[Shopify Errors]', JSON.stringify(json.errors));
      return res.status(500).json({ error: 'Shopify API error', details: json.errors });
    }

    const products = json.data.products.edges.map((edge: any) => {
      const p = edge.node;
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        description: p.description,
        image: p.images.edges[0]?.node.url || null,
        imageAlt: p.images.edges[0]?.node.altText || '',
        price: p.variants.edges[0]?.node.price.amount || null,
        currency: p.variants.edges[0]?.node.price.currencyCode || null,
      };
    });

    return res.status(200).json({ products });
  } catch (err: any) {
    console.error('[SHOPIFY_API_ERROR]', err.message || err, err.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
