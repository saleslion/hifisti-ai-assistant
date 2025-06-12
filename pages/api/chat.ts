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
    },
    body: JSON.stringify({ contents: messages }),
  });

  const json = await res.json();

  if (!json?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return 'Here are some options based on what you’re looking for.';
  }

  return json.candidates[0].content.parts[0].text.trim();
};

const formatProducts = (products: ProductNode[]) => {
  return products.map((p) => {
    const title = p.title;
    const desc = p.description.split('. ')[0];
    const price = p.variants.edges[0]?.node?.price?.amount || 'N/A';
    const image = p.images.edges[0]?.node?.url || '';
    const url = `https://${SHOPIFY_DOMAIN}/products/${p.handle}`;
    return `🔹 [${title}](${url})\n${desc}.\n💰 €${price}\n🖼️ ${image}`;
  }).join('\n\n');
};

const formatArticles = (articles: any[]) => {
  return articles.map((a) => `📝 **${a.title}**\n${a.excerpt || a.contentHtml?.slice(0, 200) || ''}`).join('\n\n');
};

const extractBudgetFromMessage = (message: string): number | null => {
  const match = message.match(/(?:under|less than|up to|maximum|max)?\s*€?\s?(\d{2,5})(?:\s?(?:euros?|euro))?/i);
  return match ? parseFloat(match[1]) : null;
};

const extractUseCase = (message: string): string | undefined => {
  const match = message.match(/\b(music|movies?|gaming)\b/i);
  return match ? match[1].toLowerCase() : undefined;
};

const extractLocation = (message: string): string | undefined => {
  const match = message.match(/\b(room|living\s?room|studio|bedroom|office)\b/i);
  return match ? match[1].toLowerCase() : undefined;
};

const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/gi, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const latestUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0]?.content || messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0]?.text; // fallback for text

    if (!latestUserMessage) {
      return res.status(400).json({ error: 'No valid user message found' });
    }

    let budget: number | undefined;
    let useCase: string | undefined;
    let location: string | undefined;

    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const text = msg.content || msg.text;
      if (!budget) {
        const b = extractBudgetFromMessage(text);
        if (b) budget = b;
      }
      if (!useCase) {
        const u = extractUseCase(text);
        if (u) useCase = u;
      }
      if (!location) {
        const l = extractLocation(text);
        if (l) location = l;
      }
    }

    const userQuery = normalizeText(latestUserMessage);
    const [products, articles] = await Promise.all([fetchProducts(), fetchArticles()]);

    let relevantProducts = products.filter((p) => {
      const text = normalizeText([
        p.title,
        p.description,
        p.productType || '',
        ...(p.tags || [])
      ].join(' '));

      const keywords = userQuery.split(' ');
      const matchesQuery = keywords.some(word => text.includes(word));

      const price = parseFloat(p.variants.edges[0]?.node?.price?.amount || '0');
      const withinBudget = !budget || price <= budget * 1.25;
      return matchesQuery && withinBudget;
    }).slice(0, 10);

    if (relevantProducts.length === 0) {
      relevantProducts = products.slice(0, 5);
    }

    const formattedProducts = formatProducts(relevantProducts);
    const formattedArticles = formatArticles(articles);

    const reply = await askGemini(latestUserMessage, {
      budget,
      useCase,
      location,
      catalog: formattedProducts,
      articles: formattedArticles,
    });

    res.status(200).json({ reply });
  } catch (err: any) {
    console.error('[SHOPIFY_AI_ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
