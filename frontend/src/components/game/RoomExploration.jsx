import React, { useState, useEffect } from 'react';
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

  // Accusation UI state
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [defenseText, setDefenseText] = useState('');
  const [defenseSubmitted, setDefenseSubmitted] = useState(false);
  const [defenseTimer, setDefenseTimer] = useState(60);
  const [accusationBannerVisible, setAccusationBannerVisible] = useState(false);

  const currentRoom = rooms.find(r => r.id === currentRoomId) || rooms[0];
  const connectedRooms = currentRoom?.connections?.map(id => rooms.find(r => r.id === id)).filter(Boolean) || [];

  const myPlayerId = state.playerId;
  const accusation = state.accusation;
  const isAccused = accusation?.accusedId === myPlayerId;
  const isHost = state.room?.hostId === myPlayerId;
  const gameState = state.gameState;

  // Other players I can accuse
  const otherPlayers = (state.room?.players || []).filter(
    p => p.playerId !== myPlayerId && p.isConnected
  );

  // Show accusation banner when a new accusation arrives
  useEffect(() => {
    if (accusation && accusation.accuserId && gameState === 'accusation') {
      setAccusationBannerVisible(true);
      setDefenseSubmitted(false);
    }
  }, [accusation?.accuserId, accusation?.accusedId, gameState]);

  // Defense countdown timer
  useEffect(() => {
    if (gameState !== 'accusation' || !accusation?.accuserId) return;
    setDefenseTimer(60);
    const interval = setInterval(() => {
      setDefenseTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [accusation?.accuserId, gameState]);

  const handleMoveToRoom = (roomId) => {
    playClickSound();
    setCurrentRoomId(roomId);
    setInspectedClue(null);
  };

  const handleInspectClue = (clue, roomId, clueIdx) => {
    playClickSound();
    setInspectedClue(clue);
    if (!discoveredClues.find(c => c.name === clue.name)) {
      setDiscoveredClues(prev => [...prev, clue]);
      // Sync with server
      const clueId = `${roomId}_${clueIdx}`;
      actions.discoverClue(clueId);
    }
  };

  const handleAccuse = async (targetPlayerId) => {
    playClickSound();
    setShowAccuseModal(false);
    await actions.accusePlayer(targetPlayerId);
  };

  const handleSubmitDefense = async () => {
    if (!defenseText.trim()) return;
    playClickSound();
    await actions.submitDefense(defenseText.trim());
    setDefenseSubmitted(true);
  };

  const handleStartVoting = () => {
    playClickSound();
    actions.startVoting();
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
      {/* ── ACCUSATION BANNER ── */}
      <AnimatePresence>
        {accusationBannerVisible && accusation?.accuserId && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,0,0,0.95), rgba(80,0,0,0.98))',
              borderBottom: '2px solid rgba(200,0,0,0.6)',
              boxShadow: '0 4px 30px rgba(139,0,0,0.5)'
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">⚖️</span>
              <div>
                <p
                  className="text-lg font-bold tracking-wider"
                  style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#fff' }}
                >
                  {accusation.accuserName} has accused {accusation.accusedName}!
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,200,200,0.8)' }}>
                  {gameState === 'accusation' && !accusation.isResolved
                    ? `Defense window: ${defenseTimer}s remaining`
                    : accusation.defense
                    ? 'Defense submitted — voting begins soon'
                    : 'Awaiting response...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAccusationBannerVisible(false)}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255,200,200,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DEFENSE PANEL (shown to accused player) ── */}
      <AnimatePresence>
        {isAccused && gameState === 'accusation' && !defenseSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              className="w-full max-w-xl mx-4 p-8 rounded-lg"
              style={{
                background: 'linear-gradient(160deg, rgba(20,10,10,0.98), rgba(40,10,10,0.98))',
                border: '1px solid rgba(139,0,0,0.6)',
                boxShadow: '0 0 60px rgba(139,0,0,0.3)'
              }}
            >
              <div className="text-center mb-6">
                <span className="text-4xl">🛡️</span>
                <h2
                  className="text-2xl mt-3 tracking-widest"
                  style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
                >
                  You Have Been Accused
                </h2>
                <p className="text-sm mt-2" style={{ color: 'rgba(200,160,120,0.6)' }}>
                  <span style={{ color: 'rgba(255,100,100,0.9)', fontWeight: 'bold' }}>
                    {accusation?.accuserName}
                  </span>{' '}
                  accuses you of murder. Submit your defense before time runs out.
                </p>
                <div className="mt-3 text-sm font-mono" style={{ color: defenseTimer < 15 ? 'rgba(255,80,80,0.9)' : 'rgba(200,160,120,0.6)' }}>
                  ⏱ {defenseTimer}s remaining
                </div>
              </div>

              <textarea
                value={defenseText}
                onChange={e => setDefenseText(e.target.value)}
                maxLength={500}
                rows={5}
                placeholder="State your defense... where were you? what do you know?"
                className="w-full resize-none rounded p-4 text-sm leading-relaxed mb-4 focus:outline-none"
                style={{
                  background: 'rgba(10,5,5,0.8)',
                  border: '1px solid rgba(139,0,0,0.3)',
                  color: '#d4c5a9',
                  fontFamily: 'var(--font-family-body), Cormorant Garamond, serif',
                }}
              />

              <button
                onClick={handleSubmitDefense}
                disabled={!defenseText.trim()}
                onMouseEnter={playHoverSound}
                className="w-full py-3 rounded tracking-widest uppercase text-sm transition-all duration-300 disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-family-heading), Cinzel, serif',
                  background: defenseText.trim() ? 'linear-gradient(135deg, rgba(139,0,0,0.8), rgba(100,0,0,0.9))' : 'rgba(40,20,20,0.5)',
                  color: '#d4c5a9',
                  border: '1px solid rgba(139,0,0,0.4)',
                  cursor: defenseText.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Submit Defense
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DEFENSE SUBMITTED CONFIRMATION (for accused) ── */}
      <AnimatePresence>
        {isAccused && defenseSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded text-sm tracking-wider"
            style={{
              background: 'rgba(0,80,0,0.8)',
              border: '1px solid rgba(0,180,0,0.3)',
              color: 'rgba(150,255,150,0.9)',
              fontFamily: 'var(--font-family-heading), Cinzel, serif'
            }}
          >
            ✓ Defense submitted — awaiting voting
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACCUSED DEFENSE VIEW (shown to non-accused players) ── */}
      <AnimatePresence>
        {accusation?.defense && gameState === 'accusation' && !isAccused && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 z-40 p-4 rounded"
            style={{
              background: 'rgba(20,40,20,0.9)',
              border: '1px solid rgba(0,180,0,0.3)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <p className="text-xs tracking-wider uppercase mb-1" style={{ color: 'rgba(150,255,150,0.6)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
              🛡️ {accusation.accusedName}'s Defense:
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(200,230,200,0.9)' }}>
              "{accusation.defense}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── START VOTING BUTTON (host, after accusation) ── */}
      <AnimatePresence>
        {isHost && gameState === 'accusation' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <button
              onClick={handleStartVoting}
              onMouseEnter={playHoverSound}
              className="px-8 py-3 tracking-widest uppercase text-sm transition-all duration-300"
              style={{
                fontFamily: 'var(--font-family-heading), Cinzel, serif',
                background: 'linear-gradient(135deg, rgba(80,40,0,0.9), rgba(139,90,0,0.9))',
                color: '#daa520',
                border: '1px solid rgba(218,165,32,0.4)',
                boxShadow: '0 0 20px rgba(218,165,32,0.2)',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              ⚖️ Begin the Vote
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACCUSE MODAL ── */}
      <AnimatePresence>
        {showAccuseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowAccuseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4 p-6 rounded-lg"
              style={{
                background: 'linear-gradient(160deg, rgba(15,8,8,0.99), rgba(30,10,10,0.99))',
                border: '1px solid rgba(139,0,0,0.5)',
                boxShadow: '0 0 50px rgba(139,0,0,0.25)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2
                  className="text-xl tracking-widest"
                  style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
                >
                  ⚖️ Make an Accusation
                </h2>
                <p className="text-xs mt-2" style={{ color: 'rgba(200,160,120,0.5)' }}>
                  Choose who you believe committed the murder
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {otherPlayers.map(player => (
                  <button
                    key={player.playerId}
                    onClick={() => handleAccuse(player.playerId)}
                    onMouseEnter={playHoverSound}
                    className="flex items-center gap-4 p-4 rounded transition-all duration-200 text-left"
                    style={{
                      background: 'rgba(30,15,15,0.6)',
                      border: '1px solid rgba(139,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.6)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.2)'}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: 'rgba(139,0,0,0.2)', border: '1px solid rgba(139,0,0,0.3)' }}
                    >
                      {['🕵️', '🧙', '💀', '🦇', '🐍', '🌙', '⚗️', '🗡️'][player.avatar % 8]}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#d4c5a9', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
                        {player.name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(200,160,120,0.5)' }}>
                        {mystery?.suspects?.find(s => s.playerId === player.playerId)?.occupation || 'Unknown occupation'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAccuseModal(false)}
                className="w-full mt-4 py-2 text-xs tracking-wider uppercase transition-colors"
                style={{ color: 'rgba(200,160,120,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                [ Cancel ]
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* Accuse button — only visible during investigation */}
          {gameState === 'investigation' && otherPlayers.length > 0 && (
            <button
              onClick={() => { playClickSound(); setShowAccuseModal(true); }}
              onMouseEnter={playHoverSound}
              className="text-sm tracking-wider uppercase transition-all duration-300 px-4 py-1 rounded"
              style={{
                fontFamily: 'var(--font-family-heading), Cinzel, serif',
                color: 'rgba(220,100,100,0.9)',
                cursor: 'pointer',
                background: 'rgba(139,0,0,0.15)',
                border: '1px solid rgba(139,0,0,0.35)',
              }}
            >
              ⚖️ Accuse
            </button>
          )}

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

      {/* Game state status bar */}
      {gameState === 'accusation' && (
        <div
          className="px-6 py-2 flex items-center gap-3 text-xs tracking-wider"
          style={{ background: 'rgba(80,0,0,0.5)', borderBottom: '1px solid rgba(139,0,0,0.3)' }}
        >
          <span className="animate-pulse" style={{ color: 'rgba(255,100,100,0.9)' }}>●</span>
          <span style={{ color: 'rgba(200,120,120,0.9)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
            {accusation?.defense
              ? `${accusation.accusedName} has submitted their defense — awaiting vote`
              : `${accusation?.accusedName} has ${defenseTimer}s to respond...`}
          </span>
        </div>
      )}

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
                          onClick={() => handleInspectClue(clue, currentRoomId, idx)}
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
                            {discoveredClues.find(c => c.name === clue.name) && (
                              <span className="text-xs px-2 py-0.5" style={{ color: 'rgba(100,200,100,0.7)', background: 'rgba(0,80,0,0.2)', border: '1px solid rgba(0,150,0,0.2)' }}>
                                Examined
                              </span>
                            )}
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
