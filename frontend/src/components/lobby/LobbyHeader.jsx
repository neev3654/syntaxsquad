import { memo, useState } from 'react';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';

function LobbyHeader({ room, isHost }) {
  const { actions } = useGame();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    playClickSound();
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = room.roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const connectedCount = room.players.filter(p => p.isConnected).length;

  return (
    <div 
      className="flex-shrink-0 px-6 md:px-10 py-6"
      style={{ 
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div className="grid grid-cols-3 items-center w-full">
        {/* Left: Session name / general details */}
        <div className="flex flex-col gap-1 items-start text-stone-300">
          <span className="text-xs uppercase tracking-widest text-stone-400 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
            Current Session
          </span>
          <span 
            className="text-lg md:text-xl font-bold"
            style={{ color: '#fff', fontFamily: 'var(--font-family-heading)' }}
          >
            {room.roomName}
          </span>
        </div>

        {/* Center: Bigger, prominent Room Code */}
        <div className="flex flex-col items-center justify-center">
          <span
            className="text-4xl md:text-5xl font-bold tracking-widest leading-none text-stone-100"
            style={{ fontFamily: 'var(--font-family-heading)' }}
          >
            {room.roomCode}
          </span>
          
          <button
            onClick={copyCode}
            onMouseEnter={playHoverSound}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors duration-200 mt-2 uppercase tracking-widest font-semibold"
            style={{ 
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-family-body)',
            }}
          >
            [{copied ? 'copied' : 'copy code'}]
          </button>
        </div>

        {/* Right: Players + Status & Host controls */}
        <div className="flex items-center justify-end gap-6 text-stone-300">
          <div className="flex flex-col items-end gap-1 font-medium" style={{ fontFamily: 'var(--font-family-body)' }}>
            <span className="text-sm">
              Players: <span className="font-bold text-stone-100">{connectedCount}</span> / {room.maxPlayers}
            </span>
            <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
              {room.isLocked ? '🔒 Private' : '🔓 Open'}
            </span>
          </div>

          {isHost && (
            <div className="flex items-center gap-4 border-l border-stone-800 pl-6">
              <button
                onClick={() => { playClickSound(); actions.lockRoom(!room.isLocked); }}
                onMouseEnter={playHoverSound}
                className="text-sm text-stone-300 hover:text-stone-100 transition-colors uppercase tracking-widest font-semibold"
                style={{ 
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-family-heading)'
                }}
              >
                [{room.isLocked ? 'unlock' : 'lock'}]
              </button>
              <button
                onClick={() => { playClickSound(); actions.closeRoom(); }}
                onMouseEnter={playHoverSound}
                className="text-sm text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest font-semibold"
                style={{ 
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-family-heading)'
                }}
              >
                [close]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(LobbyHeader);
