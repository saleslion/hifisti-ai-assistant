import { useState } from 'react';

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! What can I help you find today?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    // TODO: Send input to backend (e.g., /api/chat)
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-100">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg flex flex-col h-[80vh] border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b font-semibold text-lg text-center">
          Hifisti AI Shopping Assistant
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[75%] p-3 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-blue-100 self-end ml-auto text-right'
                  : 'bg-gray-100 text-left'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
