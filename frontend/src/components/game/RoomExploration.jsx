import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';
import modalBg from '../../assets/modal-bg.png';

export default function RoomExploration() {
  const { state, actions } = useGame();
  const mystery = state.room?.mysteryData;
  const rooms = mystery?.rooms || [];

  const [currentRoomId, setCurrentRoomId] = useState('hallway');
  const [inspectedClue, setInspectedClue] = useState(null);
  const [discoveredClues, setDiscoveredClues] = useState([]);
  const [showMap, setShowMap] = useState(false);

  const currentRoom = rooms.find(r => r.id === currentRoomId) || rooms[0];
  const connectedRooms = currentRoom?.connections?.map(id => rooms.find(r => r.id === id)).filter(Boolean) || [];

  const handleMoveToRoom = (roomId) => {
    playClickSound();
    setCurrentRoomId(roomId);
    setInspectedClue(null);
  };

  const handleInspectClue = (clue) => {
    playClickSound();
    setInspectedClue(clue);
    if (!discoveredClues.find(c => c.name === clue.name)) {
      setDiscoveredClues(prev => [...prev, clue]);
    }
  };

  if (!currentRoom) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black z-50 text-white font-mono">
        <h1 className="text-xl">No rooms available.</h1>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black z-50 flex flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-family-body), Cormorant Garamond, serif' }}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(139, 0, 0, 0.3)', background: 'rgba(10, 8, 6, 0.95)' }}
      >
        <div className="flex items-center gap-4">
          <h1
            className="text-xl md:text-2xl tracking-[0.15em] uppercase"
            style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
          >
            {currentRoom.name}
          </h1>
          <span className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(139, 0, 0, 0.2)', color: 'rgba(200, 160, 120, 0.6)', border: '1px solid rgba(139, 0, 0, 0.3)' }}>
            {discoveredClues.length} clue{discoveredClues.length !== 1 ? 's' : ''} found
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { playClickSound(); setShowMap(prev => !prev); }}
            onMouseEnter={playHoverSound}
            className="text-sm tracking-wider uppercase transition-colors"
            style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: showMap ? '#daa520' : 'rgba(200, 160, 120, 0.5)', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            [ {showMap ? 'Close Map' : 'Map'} ]
          </button>
          <button
            onClick={() => { playClickSound(); actions.closeRoom(); window.location.href = '/'; }}
            onMouseEnter={playHoverSound}
            className="text-sm tracking-wider uppercase transition-colors"
            style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: 'rgba(200, 80, 80, 0.5)', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            [ Leave ]
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── MAP OVERLAY ── */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center"
              style={{ background: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowMap(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative"
                style={{ width: '600px', height: '500px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  className="text-center text-lg tracking-[0.2em] uppercase mb-6"
                  style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
                >
                  Mansion Map
                </h2>

                {/* Connection Lines */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                  {rooms.map(room =>
                    room.connections?.map(connId => {
                      const target = rooms.find(r => r.id === connId);
                      if (!target) return null;
                      return (
                        <line
                          key={`${room.id}-${connId}`}
                          x1={`${room.position.left}%`} y1={`${room.position.top}%`}
                          x2={`${target.position.left}%`} y2={`${target.position.top}%`}
                          stroke="rgba(139, 0, 0, 0.3)"
                          strokeWidth="1"
                          strokeDasharray="6,4"
                        />
                      );
                    })
                  )}
                </svg>

                {/* Room Nodes */}
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => { handleMoveToRoom(room.id); setShowMap(false); }}
                    onMouseEnter={playHoverSound}
                    className="absolute flex flex-col items-center transition-all duration-300"
                    style={{
                      left: `${room.position.left}%`,
                      top: `${room.position.top}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        width: room.id === currentRoomId ? '20px' : '14px',
                        height: room.id === currentRoomId ? '20px' : '14px',
                        background: room.id === currentRoomId
                          ? 'radial-gradient(circle, #daa520, #8b6914)'
                          : 'radial-gradient(circle, rgba(139, 0, 0, 0.6), rgba(92, 0, 0, 0.8))',
                        border: `2px solid ${room.id === currentRoomId ? '#daa520' : 'rgba(139, 0, 0, 0.5)'}`,
                        boxShadow: room.id === currentRoomId
                          ? '0 0 15px rgba(218, 165, 32, 0.5)'
                          : '0 0 8px rgba(139, 0, 0, 0.3)',
                      }}
                    />
                    <span
                      className="mt-2 text-xs tracking-wider whitespace-nowrap"
                      style={{
                        fontFamily: 'var(--font-family-old), IM Fell English, serif',
                        color: room.id === currentRoomId ? '#daa520' : 'rgba(200, 160, 120, 0.6)',
                        textShadow: '0 0 10px rgba(0,0,0,0.8)',
                      }}
                    >
                      {room.name}
                    </span>
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LEFT: Room Scene ── */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>

          {/* Room Description */}
          <div
            className="p-8 md:p-12 flex-1 overflow-y-auto"
            style={{
              backgroundImage: `linear-gradient(rgba(8, 6, 5, 0.92), rgba(8, 6, 5, 0.96)), url(${modalBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRoomId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(200, 180, 150, 0.7)' }}>
                  {currentRoom.description}
                </p>

                {/* Clues in room */}
                {currentRoom.clues && currentRoom.clues.length > 0 && (
                  <div className="mb-8">
                    <h3
                      className="text-sm tracking-[0.25em] uppercase mb-4"
                      style={{ fontFamily: 'var(--font-family-old), IM Fell English, serif', color: 'rgba(218, 165, 32, 0.7)' }}
                    >
                      Things of Interest
                    </h3>
                    <div className="flex flex-col gap-3">
                      {currentRoom.clues.map((clue, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleInspectClue(clue)}
                          onMouseEnter={playHoverSound}
                          className="text-left transition-all duration-300 group"
                          style={{
                            padding: '1rem 1.25rem',
                            background: inspectedClue?.name === clue.name ? 'rgba(139, 0, 0, 0.15)' : 'rgba(20, 15, 10, 0.6)',
                            border: `1px solid ${inspectedClue?.name === clue.name ? 'rgba(139, 0, 0, 0.5)' : 'rgba(139, 0, 0, 0.15)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span style={{ color: '#daa520', fontSize: '0.85rem' }}>🔍</span>
                            <span
                              className="tracking-wider"
                              style={{
                                fontFamily: 'var(--font-family-old), IM Fell English, serif',
                                color: inspectedClue?.name === clue.name ? '#d4c5a9' : 'rgba(200, 160, 120, 0.7)',
                              }}
                            >
                              {clue.name}
                            </span>
                            {clue.isSupernatural && (
                              <span className="text-xs px-2 py-0.5" style={{ color: 'rgba(150, 100, 200, 0.7)', background: 'rgba(150, 100, 200, 0.1)', border: '1px solid rgba(150, 100, 200, 0.2)' }}>
                                Eerie
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspected Clue Detail */}
                <AnimatePresence mode="wait">
                  {inspectedClue && (
                    <motion.div
                      key={inspectedClue.name}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-8 overflow-hidden"
                    >
                      <div
                        className="p-6"
                        style={{ background: 'rgba(139, 0, 0, 0.08)', borderLeft: '3px solid rgba(139, 0, 0, 0.5)' }}
                      >
                        <h4
                          className="text-base tracking-wider mb-2"
                          style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
                        >
                          {inspectedClue.name}
                        </h4>
                        <p className="leading-relaxed" style={{ color: 'rgba(200, 180, 150, 0.8)' }}>
                          {inspectedClue.description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div
            className="px-6 py-4 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: 'rgba(139, 0, 0, 0.2)', background: 'rgba(10, 8, 6, 0.98)' }}
          >
            <span
              className="text-xs tracking-[0.2em] uppercase mr-2"
              style={{ fontFamily: 'var(--font-family-old), IM Fell English, serif', color: 'rgba(200, 160, 120, 0.4)' }}
            >
              Move to:
            </span>
            {connectedRooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleMoveToRoom(room.id)}
                onMouseEnter={playHoverSound}
                className="text-sm tracking-wider uppercase transition-all duration-300"
                style={{
                  fontFamily: 'var(--font-family-heading), Cinzel, serif',
                  color: 'rgba(200, 160, 120, 0.7)',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  background: 'rgba(20, 15, 10, 0.6)',
                  border: '1px solid rgba(139, 0, 0, 0.2)',
                }}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Discovered Clues Sidebar ── */}
        <div
          className="hidden md:flex flex-col w-72 border-l overflow-y-auto"
          style={{ borderColor: 'rgba(139, 0, 0, 0.2)', background: 'rgba(8, 6, 5, 0.95)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(139, 0, 0, 0.15)' }}>
            <h3
              className="text-xs tracking-[0.25em] uppercase"
              style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: 'rgba(218, 165, 32, 0.6)' }}
            >
              Evidence Collected
            </h3>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {discoveredClues.length === 0 && (
              <p className="text-xs italic" style={{ color: 'rgba(200, 160, 120, 0.3)' }}>
                No evidence collected yet. Explore rooms and inspect items...
              </p>
            )}
            {discoveredClues.map((clue, idx) => (
              <div
                key={idx}
                className="p-3"
                style={{ background: 'rgba(20, 15, 10, 0.6)', border: '1px solid rgba(139, 0, 0, 0.15)' }}
              >
                <h4 className="text-sm mb-1" style={{ color: '#d4c5a9', fontFamily: 'var(--font-family-old), IM Fell English, serif' }}>
                  {clue.name}
                </h4>
                <p className="text-xs" style={{ color: 'rgba(200, 160, 120, 0.5)' }}>
                  {clue.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
