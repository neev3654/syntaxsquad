import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound } from '../../audio/audioEngine.js';

function ChatPanel() {
  const { state, actions } = useGame();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll only if user is already near the bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.room?.messages?.length]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = input.trim();
    if (!trimmed) return;
    actions.sendMessage(trimmed);
    setInput('');
    playClickSound();
  }, [input, actions]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    } else {
      actions.sendTyping();
    }
  }, [handleSubmit, actions]);

  const formatTime = (isoString) => {
    const d = isoString ? new Date(isoString) : new Date();
    if (isNaN(d.getTime())) return '00:00';
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'system': return 'rgba(255,255,255,0.3)';
      case 'join': return 'rgba(74,158,74,0.6)';
      case 'leave': return 'rgba(255,255,255,0.25)';
      case 'kick': return 'rgba(200,50,50,0.6)';
      default: return 'rgba(255,255,255,0.7)';
    }
  };

  if (!state.room) return null;

  const messages = state.room.messages || [];

  return (
    <div 
      className="flex flex-col h-full w-full glass-panel"
      style={{ borderTop: 'none', borderBottom: 'none', borderRight: 'none' }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <span className="text-sm uppercase tracking-widest text-stone-400 font-bold" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Chat
        </span>
      </div>
      
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-2" 
        style={{ fontFamily: 'var(--font-family-body)', fontSize: '0.9rem' }}
      >
        {messages.map((msg, i) => (
          <div key={`${msg.timestamp || ''}-${i}`} style={{ color: getMessageColor(msg.type) }}>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>
              [{formatTime(msg.timestamp)}]
            </span>
            {' '}
            {msg.type === 'chat' && (
              <span style={{ color: msg.playerId === state.playerId ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)' }}>
                {msg.playerName}:
              </span>
            )}
            {' '}
            <span style={{ fontStyle: msg.type !== 'chat' ? 'italic' : 'normal' }}>
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSubmit} 
        className="px-5 py-4"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          placeholder="> type here..."
          className="w-full bg-transparent border-none outline-none text-sm"
          style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontFamily: 'var(--font-family-body)',
            fontSize: '0.95rem'
          }}
        />
      </form>
    </div>
  );
}

export default memo(ChatPanel);
