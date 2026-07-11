import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';

function PlayerList({ players, playerId, isHost, maxPlayers }) {
  const { actions } = useGame();
  const emptySlots = maxPlayers - players.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden glass-panel">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(139, 0, 0, 0.15)', background: 'rgba(0,0,0,0.2)' }}
      >
        <span className="text-sm uppercase tracking-widest text-stone-400" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Players Investigation Group
        </span>
        <span className="text-sm text-stone-300 font-bold" style={{ fontFamily: 'var(--font-family-body)' }}>
          {players.filter(p => p.isConnected).length} / {maxPlayers}
        </span>
      </div>
      
      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => (
            <motion.div
              key={player.playerId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              layout
              className="flex items-center justify-between px-6 py-5 border-b border-white/5"
              style={{ 
                opacity: player.isConnected ? 1 : 0.35
              }}
            >
              <div className="flex items-center gap-4">
                {/* Status Dot */}
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ 
                    background: !player.isConnected ? '#5a2d2d' : (player.isReady || player.isHost) ? '#2a6a3a' : '#555',
                    boxShadow: (player.isReady || player.isHost) && player.isConnected ? '0 0 8px rgba(42, 106, 58, 0.6)' : 'none'
                  }}
                />
                
                {/* Name - Bigger and better styled */}
                <span 
                  className="text-xl md:text-2xl text-stone-100 font-medium"
                  style={{ 
                    fontFamily: 'var(--font-family-body)',
                    letterSpacing: '0.02em'
                  }}
                >
                  {player.name}
                  {player.playerId === playerId && (
                    <span className="text-sm text-stone-500 italic"> (you)</span>
                  )}
                </span>
                
                {player.isHost && (
                  <span className="text-xs px-2 py-0.5 bg-stone-900/80 text-stone-300 uppercase tracking-widest rounded border border-stone-700" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    host
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Status text */}
                <span className="text-sm uppercase tracking-wider font-semibold" style={{ 
                  fontFamily: 'var(--font-family-body)',
                  color: !player.isConnected ? '#5a2d2d' : (player.isReady || player.isHost) ? '#4ea366' : 'rgba(255,255,255,0.25)'
                }}>
                  {!player.isConnected ? 'disconnected' : (player.isReady || player.isHost) ? 'ready' : 'not ready'}
                </span>

                {/* Host actions */}
                {isHost && player.playerId !== playerId && player.isConnected && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { playClickSound(); actions.kickPlayer(player.playerId); }}
                      onMouseEnter={playHoverSound}
                      className="text-xs text-red-500/80 hover:text-red-400 transition-colors uppercase tracking-widest pl-3 border-l border-stone-700"
                      style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-family-heading)' }}
                    >
                      [kick]
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <motion.div
              key={`empty-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="px-6 py-5 flex items-center gap-4 border-b border-stone-900/20"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <span className="text-xl md:text-2xl text-stone-600 italic font-medium" style={{ fontFamily: 'var(--font-family-body)' }}>
                - empty slot -
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(PlayerList);
