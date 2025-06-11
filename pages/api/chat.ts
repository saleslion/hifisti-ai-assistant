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
  images: { edges: { node: { url: string } }[] };
  variants: { edges: { node: { price: { amount: string } } }[] };
};

const fetchProducts = async (): Promise<ProductNode[]> => {
  const query = `
    {
      products(first: 50) {
        edges {
          node {
            title
            description
            images(first: 1) {
              edges { node { url } }
            }
            variants(first: 5) {
              edges {
                node {
                  price { amount }
                }
              }
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

const formatProducts = (products: ProductNode[]) => {
  return products.map((p, idx) => {
    const title = p.title;
    const desc = p.description;
    const price = p.variants.edges[0]?.node?.price?.amount || 'N/A';
    const image = p.images.edges[0]?.node?.url || '';
    return `🔹 **${title}**\n${desc}\n💰 €${price}\n🖼️ ${image}`;
  }).join('\n\n');
};

const formatArticles = (articles: any[]) => {
  return articles.map((a, idx) => {
    return `📝 **${a.title}**\n${a.excerpt || a.contentHtml.slice(0, 200)}`;
  }).join('\n\n');
};

const extractBudgetFromMessage = (message: string): number | null => {
  const match = message.match(/(?:under|less than|up to)?\s*€?\s?(\d{2,5})(?:\s?(?:euros?|euro))?/i);
  return match ? parseFloat(match[1]) : null;
};

const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/gi, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  const latestUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content;
  if (!latestUserMessage) {
    return res.status(400).json({ error: 'No valid user message found' });
  }

  const budget = extractBudgetFromMessage(latestUserMessage);
  const userQuery = normalizeText(latestUserMessage);

  try {
    const [products, articles] = await Promise.all([
      fetchProducts(),
      fetchArticles(),
    ]);

    // Filter products by semantic relevance + budget
    const relevantProducts = products.filter((p) => {
      const title = normalizeText(p.title);
      const description = normalizeText(p.description);
      const price = parseFloat(p.variants.edges[0]?.node?.price?.amount || '0');
      const matchesQuery = title.includes(userQuery) || description.includes(userQuery);
      const withinBudget = !budget || price <= budget;
      return matchesQuery && withinBudget;
    });

    const formattedProducts = formatProducts(relevantProducts);
    const formattedArticles = formatArticles(articles);

    const prompt = `
🛍️ You are a smart AI product advisor for the Shopify store https://${SHOPIFY_DOMAIN}.

Your goal is to recommend products ONLY using the data below from the store.

${budget ? `💸 The customer has a budget of €${budget}. Only suggest products near or below this amount.` : ''}

==========================
📦 PRODUCT CATALOG:
${formattedProducts || 'No products found.'}

==========================
📝 BLOG ARTICLES:
${formattedArticles || 'No articles available.'}

==========================
👤 USER INPUT:
"${latestUserMessage}"

Please reply with helpful, accurate suggestions ONLY based on the above data. Do not assume anything not explicitly given.
If no product matches, say so in a helpful way.
`;

    const reply = await askGroq(prompt);
    res.status(200).json({ reply });
  } catch (err: any) {
    console.error('[SHOPIFY_AI_ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
