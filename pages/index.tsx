import Head from 'next/head'
import ChatWidget from '../components/ChatWidget'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Hifisti AI Assistant</title>
      </Head>
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to Hifisti AI Assistant</h1>
        <p className="mb-8">Start chatting using the assistant in the corner.</p>
      </main>
      <ChatWidget />
    </div>
  )
}