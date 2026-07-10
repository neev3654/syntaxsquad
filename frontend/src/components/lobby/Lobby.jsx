import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound, setMuted } from '../../audio/audioEngine.js';
import PlayerList from './PlayerList.jsx';
import RightPanel from './RightPanel.jsx';
import ChatPanel from './ChatPanel.jsx';
import LobbyHeader from './LobbyHeader.jsx';
import CountdownOverlay from './CountdownOverlay.jsx';
import { useVoice } from '../../contexts/VoiceContext.jsx';

function Lobby() {
  const { state, actions } = useGame();
  const { isMuted, toggleMute, micError } = useVoice();
  const { room, playerId } = state;
  const [musicMuted, setMusicMuted] = useState(false);

  const toggleMusic = () => {
    setMusicMuted(prev => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  };

  const isHost = useMemo(() => room?.hostId === playerId, [room?.hostId, playerId]);
  const connectedPlayers = useMemo(() => 
    room?.players?.filter(p => p.isConnected) || [], 
    [room?.players]
  );
  const myPlayer = useMemo(() => 
    room?.players?.find(p => p.playerId === playerId),
    [room?.players, playerId]
  );

  if (!room) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-20 flex flex-col h-screen"
      >
        {/* Header */}
        <LobbyHeader room={room} isHost={isHost} />

        {/* Main Content - 2 column layout */}
        <div className="flex-1 flex overflow-hidden p-6 md:p-12 gap-8 lg:gap-12 max-w-[1600px] mx-auto w-full">
          
          {/* Left - Player List */}
          <div className="flex-1 flex flex-col min-w-0 gap-6">
            <PlayerList 
              players={room.players} 
              playerId={playerId}
              isHost={isHost}
              maxPlayers={room.maxPlayers}
            />

            {/* Action Buttons */}
            <div className="flex gap-8 justify-center flex-wrap pt-6" style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
              
              {/* Music Toggle */}
              <button
                onClick={() => {
                  playClickSound();
                  toggleMusic();
                }}
                onMouseEnter={playHoverSound}
                className="horror-btn text-lg px-8 py-5"
                style={{
                  borderColor: musicMuted ? 'rgba(74, 158, 255, 0.6)' : 'rgba(255, 60, 60, 0.6)',
                  color: musicMuted ? '#4e9eff' : '#ff4d4d'
                }}
                title="Toggle Background Music"
              >
                {musicMuted ? 'Music On' : 'Music Off'}
              </button>

              {/* Mic Toggle */}
              <button
                onClick={() => {
                  playClickSound();
                  toggleMute();
                }}
                onMouseEnter={playHoverSound}
                className="horror-btn text-lg px-8 py-5"
                style={{
                  borderColor: !isMuted ? 'rgba(74, 158, 74, 0.6)' : 'rgba(255, 60, 60, 0.6)',
                  color: !isMuted ? '#4ea366' : '#ff4d4d'
                }}
                title={micError || 'Toggle Microphone'}
              >
                {!isMuted ? 'Mic On' : 'Mic Off'}
              </button>

              {/* Ready / Unready */}
              {!isHost && myPlayer && (
                <button
                  onClick={() => {
                    playClickSound();
                    actions.setReady(!myPlayer.isReady);
                  }}
                  onMouseEnter={playHoverSound}
                  className="horror-btn text-lg px-12 py-5 relative overflow-hidden group"
                  style={{
                    borderColor: myPlayer.isReady ? 'rgba(255, 60, 60, 0.6)' : 'rgba(74, 158, 74, 0.8)',
                    backgroundColor: myPlayer.isReady ? 'rgba(255, 60, 60, 0.1)' : 'rgba(74, 158, 74, 0.15)',
                    color: myPlayer.isReady ? '#ff4d4d' : '#4ea366',
                    boxShadow: myPlayer.isReady ? '0 0 10px rgba(255,60,60,0.2)' : '0 0 15px rgba(74,158,74,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></span>
                  <span className="relative z-10 font-bold uppercase tracking-wider">
                    {myPlayer.isReady ? 'Not Ready' : 'Ready'}
                  </span>
                </button>
              )}

              {/* Start Game (Host only) */}
              {isHost && (
                <button
                  onClick={() => {
                    playClickSound();
                    actions.startGame();
                  }}
                  onMouseEnter={playHoverSound}
                  disabled={connectedPlayers.length < room.maxPlayers || connectedPlayers.some(p => !p.isReady && !p.isHost)}
                  className="horror-btn text-lg px-12 py-5"
                  style={{
                    borderColor: connectedPlayers.length >= room.maxPlayers && !connectedPlayers.some(p => !p.isReady && !p.isHost) ? 'rgba(184, 134, 11, 0.5)' : 'rgba(139, 0, 0, 0.15)',
                    opacity: connectedPlayers.length >= room.maxPlayers && !connectedPlayers.some(p => !p.isReady && !p.isHost) ? 1 : 0.6
                  }}
                >
                  {connectedPlayers.length < room.maxPlayers 
                    ? `waiting for ${room.maxPlayers - connectedPlayers.length} more` 
                    : connectedPlayers.some(p => !p.isReady && !p.isHost)
                      ? 'waiting for players to be ready'
                      : 'start game'}
                </button>
              )}

              {/* Leave Room */}
              <button
                onClick={() => {
                  playClickSound();
                  actions.leaveRoom();
                }}
                onMouseEnter={playHoverSound}
                className="horror-btn text-lg px-12 py-5"
                style={{
                  borderColor: 'rgba(200, 50, 50, 0.5)',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                leave
              </button>
            </div>
          </div>

          {/* Right Panel - Mission & Chat */}
          <div className="hidden lg:flex flex-col w-96 xl:w-[28rem] flex-shrink-0 gap-6">
            <div className="flex-none">
              <RightPanel room={room} ping={state.ping} isHost={isHost} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ChatPanel />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {state.countdown !== null && state.countdown >= 0 && (
          <CountdownOverlay count={state.countdown} />
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Lobby);
