import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  const sendMessage = () => {
    if (!input.trim()) return
    const newMessage = { role: 'user', content: input }
    setMessages([...messages, newMessage])
    setInput('')
  }

  return (
    <>
      <Head>
        <title>Hifisti AI Assistant</title>
      </Head>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <header className="bg-white shadow p-4 text-xl font-bold flex items-center space-x-2">
          <span>🛍️</span>
          <span>Hifisti AI Assistant</span>
        </header>

        <main className="p-4 flex flex-col space-y-4 max-w-3xl mx-auto">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-grow border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={sendMessage}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Send
            </button>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg shadow space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm">
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
