
import Head from 'next/head';
import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input) return;

    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');

    const response = await axios.post('/api/gemini', {
      message: input
    });

    const botMsg = { role: 'assistant', content: response.data.reply };
    setMessages([...messages, userMsg, botMsg]);
  };

  return (
    <>
      <Head>
        <title>Hifisti AI Assistant</title>
      </Head>
      <div id="chat-widget">
        <div id="chat-box">
          {messages.map((msg, idx) => (
            <div key={idx} className="message">
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <input
          id="chat-input"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
      </div>
    </>
  );
}
