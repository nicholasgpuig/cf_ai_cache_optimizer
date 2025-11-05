import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAnalysisData?: boolean;
};

export default function LLMChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with analysis data if passed from upload
  useEffect(() => {
    const analysisData = (location.state as { analysisData?: unknown })?.analysisData;
    if (analysisData && messages.length === 0) {
      const dataMessage: Message = {
        role: 'user',
        content: JSON.stringify(analysisData, null, 2),
        timestamp: new Date(),
        isAnalysisData: true
      };

      setMessages([dataMessage]);
      setIsLoading(true);

      // Send to AI for analysis
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Here is the analysis of uploaded CDN logs. Please review the data and provide insights:\n\n${JSON.stringify(analysisData, null, 2)}`
          }]
        })
      })
      .then(response => response.json())
      .then(data => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || 'I have received your analysis data.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      })
      .catch(error => {
        console.error('Error sending analysis data:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, there was an error analyzing your data. Please try asking me about it.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [location.state, messages.length]);

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

  const toggleMessageExpansion = (index: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', backgroundColor: 'white', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '1200px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#1f2937'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>AI Cache Optimizer</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Chat with AI to analyze your CDN cache performance</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1200px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <svg style={{ width: '4rem', height: '4rem', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ fontSize: '1.125rem', margin: '0.5rem 0' }}>Start a conversation</p>
            <p style={{ fontSize: '0.875rem' }}>Ask me about cache optimization, performance issues, or log analysis</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isExpanded = expandedMessages.has(index);
          const isAnalysisData = message.isAnalysisData;
          const contentPreview = isAnalysisData && !isExpanded
            ? message.content.substring(0, 200) + '...'
            : message.content;

          return (
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
                {isAnalysisData && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}>
                    <button
                      onClick={() => toggleMessageExpansion(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        marginRight: '0.5rem',
                        color: message.role === 'user' ? 'white' : '#1f2937',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <svg
                        style={{
                          width: '1rem',
                          height: '1rem',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    Analysis Data
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.role === 'assistant' && !isAnalysisData ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({children}) => <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '0.25rem' }}>{children}</h1>,
                        h2: ({children}) => <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '0.25rem' }}>{children}</h2>,
                        h3: ({children}) => <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginTop: '0.375rem', marginBottom: '0.25rem' }}>{children}</h3>,
                        p: ({children}) => <p style={{ marginTop: '0', marginBottom: '0.375rem', lineHeight: '1.5' }}>{children}</p>,
                        ul: ({children}) => <ul style={{ marginLeft: '1.25rem', marginTop: '0.25rem', marginBottom: '0.375rem', paddingLeft: '0', listStyleType: 'disc' }}>{children}</ul>,
                        ol: ({children}) => <ol style={{ marginLeft: '1.25rem', marginTop: '0.25rem', marginBottom: '0.375rem', paddingLeft: '0', listStyleType: 'decimal' }}>{children}</ol>,
                        li: ({children}) => <li style={{ marginBottom: '0.125rem' }}>{children}</li>,
                        strong: ({children}) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
                        em: ({children}) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                        blockquote: ({children}) => <blockquote style={{ borderLeft: '3px solid #e5e7eb', paddingLeft: '0.75rem', marginLeft: '0', marginTop: '0.25rem', marginBottom: '0.375rem', fontStyle: 'italic' }}>{children}</blockquote>,
                        code: ({children}) => <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', fontSize: '0.875em', fontFamily: 'monospace' }}>{children}</code>,
                        table: ({children}) => <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '0.25rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{children}</table>,
                        thead: ({children}) => <thead style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>{children}</thead>,
                        tbody: ({children}) => <tbody>{children}</tbody>,
                        tr: ({children}) => <tr style={{ borderBottom: '1px solid #e5e7eb' }}>{children}</tr>,
                        th: ({children}) => <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: 'bold' }}>{children}</th>,
                        td: ({children}) => <td style={{ padding: '0.375rem 0.5rem' }}>{children}</td>,
                      }}
                    >
                      {contentPreview}
                    </ReactMarkdown>
                  ) : (
                    contentPreview
                  )}
                </div>
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
          );
        })}

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
      </div>

      {/* Input Container */}
      <div style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
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
