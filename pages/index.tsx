import Head from 'next/head';
import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <>
      <Head><title>Hifisti AI Assistant</title></Head>
      <ChatWidget />
    </>
  );
}