import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';
import '../styles/global.css';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const chatBoxRef = useRef(null);
  const debounceTimer = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const contextMessages = updatedMessages.slice(-4); // reduce token usage
      const response = await axios.post('/api/chat', { history: contextMessages });
      const botMsg = { role: 'assistant', content: response.data.reply };
      setMessages([...updatedMessages, botMsg]);
    } catch {
      const errMsg = { role: 'assistant', content: 'Sorry, something went wrong.' };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const cached = sessionStorage.getItem('products');
    if (cached) {
      setProducts(JSON.parse(cached));
      return;
    }

    try {
      const res = await axios.get('/api/products'); // your endpoint for Shopify data
      setProducts(res.data);
      sessionStorage.setItem('products', JSON.stringify(res.data));
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleDebouncedInput = (e) => {
    setInput(e.target.value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (e.key === 'Enter') sendMessage();
    }, 300);
  };

  return (
    <>
      <Head>
        <title>Hifisti AI Assistant</title>
      </Head>
      <div className="app-container">
        <header className="app-header">🛍️ Hifisti AI Assistant</header>
        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && <div className="message assistant">Thinking...</div>}
        </div>
        <div className="product-preview">
          <h3>Top Picks</h3>
          <div className="product-grid">
            {products.map((product, index) => (
              <div key={index} className="product-card">
                <h4>{product.title}</h4>
                <p>{product.description || 'No description'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="input-area">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => handleDebouncedInput(e)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </>
  );
}
