import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBoxRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/chat', { history: updatedMessages });
      const botMsg = { role: 'assistant', content: response.data.reply };
      setMessages([...updatedMessages, botMsg]);
    } catch {
      const errMsg = { role: 'assistant', content: 'Sorry, something went wrong.' };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <Head>
        <title>Hifisti Shopping Assistant</title>
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
            <div className="product-card">
              <h4>Klipsch Jubilee</h4>
              <p>Premium sound system with powerful bass.</p>
            </div>
            <div className="product-card">
              <h4>Aiwa MSBTU-600</h4>
              <p>Compact Hi-Fi with Bluetooth 5.0.</p>
            </div>
            <div className="product-card">
              <h4>Klipschorn 75th SE</h4>
              <p>Limited edition anniversary speakers.</p>
            </div>
          </div>
        </div>
        <div className="input-area">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </>
  );
}
