import { memo } from 'react';
import { motion } from 'framer-motion';

function RightPanel({ room, ping, isHost }) {
  if (!room) return null;

  const connectedCount = room.players.filter(p => p.isConnected).length;
  const readyCount = room.players.filter(p => p.isReady && p.isConnected).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col w-full h-full overflow-hidden glass-panel"
    >
      {/* Header */}
      <div 
        className="px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.3)' }}
      >
        <span className="text-sm uppercase tracking-widest text-stone-400 font-bold" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Room Information
        </span>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        
        {/* Room Code */}
        <div className="flex justify-between items-center">
          <div className="text-sm uppercase tracking-wider text-stone-400 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
            Invitation Code
          </div>
          <div className="text-3xl font-bold tracking-widest text-stone-100" style={{ fontFamily: 'var(--font-family-heading)' }}>
            {room.roomCode}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Room Name */}
        <div className="flex justify-between items-center">
          <div className="text-sm uppercase tracking-wider text-stone-400 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
            Active Session
          </div>
          <div className="text-lg text-stone-200 font-medium" style={{ fontFamily: 'var(--font-family-body)' }}>
            {room.roomName}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Players */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm uppercase tracking-wider text-stone-400 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
              Connected Players
            </div>
            <div className="text-lg text-stone-200 font-bold" style={{ fontFamily: 'var(--font-family-body)' }}>
              {connectedCount} <span style={{ color: 'rgba(255,255,255,0.25)' }}>/ {room.maxPlayers}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-stone-900 border border-stone-800 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${(connectedCount / room.maxPlayers) * 100}%`,
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.6))'
              }}
            />
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Ready Status */}
        <div className="flex justify-between items-center">
          <div className="text-sm uppercase tracking-wider text-stone-400 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
            Ready Status
          </div>
          <div className="text-lg font-bold" style={{ 
            fontFamily: 'var(--font-family-body)',
            color: readyCount === connectedCount && connectedCount > 1 ? '#4ea366' : 'rgba(255,255,255,0.4)' 
          }}>
            {readyCount} / {connectedCount}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Network and Privacy Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-stone-900/40 border border-white/5 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
              Network Ping
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-200 font-mono">
              <span className="w-2 h-2 rounded-full" style={{ background: ping < 100 ? '#4ea366' : ping < 200 ? '#b8860b' : '#cc3333', boxShadow: `0 0 8px ${ping < 100 ? '#4ea366' : ping < 200 ? '#b8860b' : '#cc3333'}` }} />
              <span>{ping}ms</span>
            </div>
          </div>
          <div className="p-3 bg-stone-900/40 border border-white/5 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1 font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
              Lobby State
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-200 uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-family-body)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: room.isLocked ? '#cc3333' : '#4ea366', boxShadow: `0 0 8px ${room.isLocked ? '#cc3333' : '#4ea366'}` }} />
              <span>{room.isLocked ? 'Locked' : 'Open'}</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default memo(RightPanel);
