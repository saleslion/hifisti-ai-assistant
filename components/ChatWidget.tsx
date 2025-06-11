import { useState } from 'react';

export default function ChatWidget() {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    });

    const data = await res.json();
    if (data.reply) {
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    }

    setInput('');
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white shadow-lg rounded-lg p-4">
      <div className="h-64 overflow-y-auto mb-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <p className="inline-block bg-gray-200 rounded px-2 py-1 m-1">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-grow border px-2 py-1 rounded"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={send}
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}