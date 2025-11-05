import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function LLMChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>AI Cache Optimizer</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Chat with AI to analyze your CDN cache performance</p>
      </div>

      {/* Messages Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <svg style={{ width: '4rem', height: '4rem', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ fontSize: '1.125rem', margin: '0.5rem 0' }}>Start a conversation</p>
            <p style={{ fontSize: '0.875rem' }}>Ask me about cache optimization, performance issues, or log analysis</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: message.role === 'user' ? '#2563eb' : 'white',
                color: message.role === 'user' ? 'white' : '#1f2937',
                border: message.role === 'user' ? 'none' : '1px solid #e5e7eb'
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
              <div
                style={{
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  color: message.role === 'user' ? '#bfdbfe' : '#9ca3af'
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '0ms' }}></div>
                <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '150ms' }}></div>
                <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', maxWidth: '64rem', margin: '0 auto' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              padding: '0.75rem 1rem',
              maxHeight: '8rem',
              overflowY: 'auto',
              outline: 'none'
            }}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              backgroundColor: !input.trim() || isLoading ? '#93c5fd' : '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              border: 'none',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isLoading ? 0.5 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              if (input.trim() && !isLoading) {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }
            }}
            onMouseOut={(e) => {
              if (input.trim() && !isLoading) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
          >
            <svg
              style={{ width: '1.5rem', height: '1.5rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
