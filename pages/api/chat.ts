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
  const query = `
    {
      products(first: 50) {
        edges {
          node {
            title
            handle
            description
            productType
            tags
            images(first: 1) {
              edges { node { url } }
            }
            variants(first: 1) {
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

const askGroq = async (
  prompt: string,
  context: { budget?: number; useCase?: string; location?: string }
) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY in environment variables');

  const { budget, useCase, location } = context;

  const systemPrompt = `
You are a smart, confident, and sales-focused audio product advisor for the Shopify store Hifisti.

You already know:
- Budget: ${budget ? `€${budget}` : 'not yet specified'}
- Use case: ${useCase || 'not yet specified'}
- Room type: ${location || 'not yet specified'}

🎯 Your job:
- Recommend the most relevant product(s) based on the user's current query.
- Users may ask for speakers, turntables, headphones, amps, etc.
- Always tailor suggestions to their budget and use case.
- If the user wants Hi-Fi but is on a budget, explain realistic trade-offs.
- NEVER suggest products more than 125% over budget unless they ask for premium options.

✅ Format:
- Product name (as a clickable link)
- One-sentence benefit
- Price
- Product image

🧠 Be helpful, persuasive, and concise. Never repeat questions already answered. Always guide toward the next best decision.
`.trim();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const json = await res.json();

  if (!json?.choices?.[0]?.message?.content?.trim()) {
    return 'Here are some options based on what you’re looking for.';
  }

  return json.choices[0].message.content.trim();
};

const formatProducts = (products: ProductNode[]) => {
  return products.map((p) => {
    const title = p.title;
    const desc = p.description.split('. ')[0];
    const price = p.variants.edges[0]?.node?.price?.amount || 'N/A';
    const image = p.images.edges[0]?.node?.url || '';
    const url = `https://${SHOPIFY_DOMAIN}/products/${p.handle}`;
    return `🔹 **[${title}](${url})**\n${desc}.\n💰 €${price}\n🖼️ ${image}`;
  }).join('\n\n');
};

const formatArticles = (articles: any[]) => {
  return articles.map((a) => {
    return `📝 **${a.title}**\n${a.excerpt || a.contentHtml.slice(0, 200)}`;
  }).join('\n\n');
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
      .slice(-1)[0]?.content;

    if (!latestUserMessage) {
      return res.status(400).json({ error: 'No valid user message found' });
    }

    let budget: number | undefined;
    let useCase: string | undefined;
    let location: string | undefined;

    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      if (!budget) {
        const b = extractBudgetFromMessage(msg.content);
        if (b) budget = b;
      }
      if (!useCase) {
        const u = extractUseCase(msg.content);
        if (u) useCase = u;
      }
      if (!location) {
        const l = extractLocation(msg.content);
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

    const prompt = `
MATCHING PRODUCTS:

${formattedProducts}

==========================
RELATED BLOG ARTICLES:
${formattedArticles}

USER QUERY:
"${latestUserMessage}"
`;

    console.log('🧠 Prompt Sent to Groq:\n', prompt);
    console.log('📦 Product Count:', relevantProducts.length);

    const reply = await askGroq(prompt, {
      budget: budget ?? undefined,
      useCase,
      location,
    });

    res.status(200).json({ reply });
  } catch (err: any) {
    console.error('[SHOPIFY_AI_ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
