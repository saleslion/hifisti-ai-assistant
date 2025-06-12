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
          text: msg.text, // use text, not content
        })),
      }),
    });

    const data = await response.json();
    console.log('[API DATA]', data); // <-- Diagnostic line

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
