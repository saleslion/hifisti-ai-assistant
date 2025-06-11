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

const fetchProducts = async (search: string) => {
  const query = `
    {
      products(first: 8, query: "${search}") {
        edges {
          node {
            title
            description
            images(first: 1) {
              edges { node { url } }
            }
            variants(first: 1) {
              edges { node { price { amount } } }
            }
          }
        }
      }
    }
  `;
  const data = await fetchFromShopify(query);
  return data.products.edges.map((edge: any) => edge.node);
};

const fetchArticles = async () => {
  const query = `
    {
      articles(first: 5) {
        edges {
          node {
            title
            excerpt
            contentHtml
          }
        }
      }
    }
  `;
  const data = await fetchFromShopify(query);
  return data.articles.edges.map((edge: any) => edge.node);
};

const askGroq = async (prompt: string) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY in environment variables');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content || 'No AI response.';
};

const formatProducts = (products: any[]) => {
  return products.map((p, idx) => {
    const title = p.title;
    const desc = p.description;
    const price = p.variants.edges[0]?.node?.price?.amount || 'N/A';
    const image = p.images.edges[0]?.node?.url || '';
    return `Product ${idx + 1}:
- Title: ${title}
- Description: ${desc}
- Price: ₱${price}
- Image: ${image}`;
  }).join('\n\n');
};

const formatArticles = (articles: any[]) => {
  return articles.map((a, idx) => {
    return `Article ${idx + 1}: ${a.title}\nExcerpt: ${a.excerpt || a.contentHtml.slice(0, 200)}`;
  }).join('\n\n');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    const [products, articles] = await Promise.all([
      fetchProducts(message),
      fetchArticles(),
    ]);

    const formattedProducts = formatProducts(products);
    const formattedArticles = formatArticles(articles);

    const prompt = `
You are a product advisor for the Shopify store https://${SHOPIFY_DOMAIN}.

Your job is to recommend or guide users ONLY using the data from the store.
Below is what you have access to:

PRODUCTS:
${formattedProducts || 'No products found.'}

ARTICLES:
${formattedArticles || 'No articles available.'}

The user said:
"${message}"

Now respond with helpful advice using only the info above. If no products match, say so.
    `;

    const reply = await askGroq(prompt);
    res.status(200).json({ response: reply });
  } catch (err: any) {
    console.error('[SHOPIFY_AI_ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
