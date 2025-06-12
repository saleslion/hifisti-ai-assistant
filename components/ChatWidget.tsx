import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! What can I help you find today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            text: msg.text, // FIXED: use text, not content
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        text:
          data.reply?.trim() ||
          'Sorry, I didn’t catch that. Could you try again?',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('❌ Error calling chat API:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-100">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg flex flex-col h-[80vh] border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b font-semibold text-lg text-center">
          Hifisti AI Shopping Assistant
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[75%] p-3 rounded-xl whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-100 self-end ml-auto text-right'
                  : 'bg-gray-100 text-left'
              }`}
            >
              <div className="prose prose-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        className="text-blue-600 underline hover:text-blue-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div className="bg-gray-100 p-3 rounded-xl max-w-[75%]">
              Typing...
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something like 'Best speakers for under €500'"
            className="flex-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
