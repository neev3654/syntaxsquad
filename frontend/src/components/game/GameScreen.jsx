import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext.jsx';
import { useVoice } from '../../contexts/VoiceContext.jsx';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { playClickSound, playHoverSound, setMuted } from '../../audio/audioEngine.js';
import RoomExploration2D from './RoomExploration2D.jsx';
import RoomExploration from './RoomExploration.jsx';
import VotingModal from './VotingModal.jsx';

/* ────────────────────────────────────────────────
   Inline styles object — keeps JSX clean
   ──────────────────────────────────────────────── */
const S = {
  /* ── Page ── */
  page: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, #0c0a09 0%, #0a0908 40%, #080706 100%)',
    zIndex: 50,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },

  /* ── Header ── */
  header: {
    display: 'flex', flexWrap: 'wrap',
    justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(12px)',
    gap: '16px',
  },
  headerTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(1.15rem, 2.5vw, 1.6rem)',
    fontWeight: 700,
    color: '#e8ddd0',
    letterSpacing: '0.08em',
    lineHeight: 1.3,
  },
  headerSub: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)',
    color: 'rgba(200,185,165,0.55)',
    fontStyle: 'italic',
    marginTop: 4,
    letterSpacing: '0.03em',
  },
  headerBtns: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
  },

  /* ── Tabs ── */
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(0,0,0,0.25)',
  },

  /* ── Content ── */
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
  },
  contentInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '40px 0 60px',
  },

  /* ── Character intro ── */
  charLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    color: 'rgba(184,134,11,0.7)',
    textAlign: 'center',
    marginBottom: 12,
  },
  charName: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(2rem, 5vw, 3.2rem)',
    fontWeight: 700,
    color: '#f0e8dc',
    textAlign: 'center',
    lineHeight: 1.2,
    letterSpacing: '0.04em',
  },
  charMeta: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
    fontStyle: 'italic',
    color: 'rgba(200,185,165,0.6)',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: '0.06em',
  },
  divider: {
    width: 48,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.4), transparent)',
    margin: '20px auto 0',
  },

  /* ── Card ── */
  cardWrap: {
    display: 'flex', flexDirection: 'column', gap: 28,
    marginTop: 44,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    padding: '16px 32px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center',
  },
};

/* ── Small helper components ── */

function HeaderBtn({ active, danger, children, ...props }) {
  const base = {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    padding: '7px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    border: '1px solid',
  };

  const style = danger
    ? {
        ...base,
        color: 'rgba(200,180,160,0.5)',
        borderColor: 'rgba(200,180,160,0.15)',
        background: 'transparent',
      }
    : active
    ? {
        ...base,
        color: '#c8b496',
        borderColor: 'rgba(184,134,11,0.35)',
        background: 'rgba(184,134,11,0.08)',
      }
    : {
        ...base,
        color: 'rgba(200,180,160,0.45)',
        borderColor: 'rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      };

  return <button style={style} {...props}>{children}</button>;
}

function Tab({ active, children, ...props }) {
  return (
    <button
      style={{
        flex: 1,
        padding: '14px 8px',
        fontFamily: "'Cinzel', serif",
        fontSize: 'clamp(0.6rem, 1.1vw, 0.72rem)',
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: active ? '#d4c5a9' : 'rgba(200,185,165,0.35)',
        background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid rgba(139,0,0,0.8)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function InfoCard({ label, color = '#b8860b', children }) {
  const colorMap = {
    gold: { accent: '#b8860b', bg: 'rgba(184,134,11,0.04)', border: 'rgba(184,134,11,0.15)', label: 'rgba(184,134,11,0.75)' },
    red: { accent: '#8b0000', bg: 'rgba(139,0,0,0.04)', border: 'rgba(139,0,0,0.2)', label: '#c44' },
    blue: { accent: '#4a6fa5', bg: 'rgba(74,111,165,0.04)', border: 'rgba(74,111,165,0.15)', label: 'rgba(74,111,165,0.85)' },
    purple: { accent: '#7c3aed', bg: 'rgba(124,58,237,0.04)', border: 'rgba(124,58,237,0.15)', label: 'rgba(160,120,240,0.85)' },
  };
  const c = colorMap[color] || colorMap.gold;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        borderLeft: `3px solid ${c.accent}`,
        overflow: 'hidden',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      {/* Label */}
      <div
        style={{
          padding: '14px 28px',
          borderBottom: `1px solid ${c.border}`,
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: c.label,
          }}
        >
          {label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 28px 26px' }}>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)',
            lineHeight: 1.85,
            color: '#d4c5a9',
            margin: 0,
          }}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

function EnterBtn({ onClick, onMouseEnter }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '0.8rem',
        fontWeight: 700,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#d4c5a9',
        background: 'linear-gradient(180deg, rgba(20,16,12,0.9) 0%, rgba(12,10,8,0.95) 100%)',
        border: '1px solid rgba(139,0,0,0.35)',
        padding: '14px 48px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.4s ease',
        boxShadow: '0 2px 20px rgba(139,0,0,0.12)',
      }}
    >
      ⚰️&nbsp;&nbsp;Enter the Mansion
    </button>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════ */
export default function GameScreen() {
  const { state, actions } = useGame();
  const { isMuted, toggleMute, micError } = useVoice();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('role');
  const [phase, setPhase] = useState('briefing');
  const [musicMuted, setMusicMuted] = useState(false);

  // ── Accusation UI state ──
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [defenseText, setDefenseText] = useState('');
  const [defenseSubmitted, setDefenseSubmitted] = useState(false);
  const [defenseTimer, setDefenseTimer] = useState(60);
  const [accusationBannerVisible, setAccusationBannerVisible] = useState(false);

  const toggleMusic = () => {
    setMusicMuted(prev => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  };

  const mystery = state.room?.mysteryData;
  const myPlayerId = state.playerId;

  // Find the suspect assigned to the current player
  const myRole = mystery?.suspects?.find(s => s.playerId === myPlayerId) || mystery?.suspects?.[0];
  const otherSuspects = mystery?.suspects?.filter(s => s.playerId !== myPlayerId) || [];

  // ── Accusation derived state ──
  const accusation = state.accusation;
  const gameState = state.gameState;
  const isAccused = accusation?.accusedId === myPlayerId;
  const isHost = state.room?.hostId === myPlayerId;
  const otherPlayersForAccuse = (state.room?.players || []).filter(
    p => p.playerId !== myPlayerId && p.isConnected
  );


  if (!mystery) {
    return (
      <div style={{ ...S.page, justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#c44', fontFamily: "'Cinzel', serif", fontSize: '1.1rem', letterSpacing: '0.1em' }}>
          Error: Mystery data not found.
        </p>
      </div>
    );
  }

  // ── Room Exploration Phase ──
  if (phase === 'exploring') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', zIndex: 50 }}>
        <RoomExploration2D />

        {/* Accuse button — shown during investigation */}
        {gameState === 'investigation' && otherPlayersForAccuse.length > 0 && (
          <div style={{ position: 'fixed', bottom: 100, right: 24, zIndex: 60 }}>
            <button
              onClick={() => {
                playClickSound();
                setShowAccuseModal(true);
              }}
              onMouseEnter={playHoverSound}
              className="premium-btn text-sm px-8 py-3 rounded-full flex items-center justify-center shadow-lg"
              style={{
                borderColor: 'rgba(218, 165, 32, 0.6)',
                background: 'rgba(10, 10, 10, 0.85)',
                color: '#daa520',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 'bold'
              }}
            >
              ⚖️ Accuse
            </button>
          </div>
        )}

        {/* Accusation Modal */}
        <AnimatePresence>
          {showAccuseModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 80,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onClick={() => setShowAccuseModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="glass-panel w-full max-w-md mx-4 p-8 flex flex-col gap-6"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="text-center">
                  <h3 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-stone-100" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    ⚖️ Make an Accusation
                  </h3>
                  <p className="text-sm uppercase tracking-wider text-stone-400 font-semibold mt-2" style={{ fontFamily: 'var(--font-family-body)' }}>
                    Choose who you believe committed the murder
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  {otherPlayersForAccuse.map(player => (
                    <button
                      key={player.playerId}
                      onClick={() => {
                        actions.accusePlayer(player.playerId);
                        setShowAccuseModal(false);
                        setAccusationBannerVisible(true);
                        setDefenseSubmitted(false);
                        setDefenseTimer(60);
                      }}
                      className="flex items-center gap-4 px-5 py-4 rounded-lg transition-all duration-300"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                      >
                        {['🕵️','🧙','💀','🦇','🐍','🌙','⚗️','🗡️'][player.avatar % 8]}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-stone-200" style={{ fontFamily: 'var(--font-family-body)' }}>{player.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowAccuseModal(false)} 
                  className="text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-stone-300 transition-colors mx-auto mt-2" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-heading)' }}
                >
                  [ Cancel ]
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accusation Banner */}
        <AnimatePresence>
          {accusationBannerVisible && accusation?.accuserId && gameState === 'accusation' && (
            <motion.div
              initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
              className="glass-panel"
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 70,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                padding: '16px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 30px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '2rem' }}>⚖️</span>
                <div>
                  <p className="font-bold text-stone-100 uppercase tracking-widest text-lg md:text-xl m-0" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    {accusation.accuserName} has accused {accusation.accusedName}!
                  </p>
                  <p className="font-semibold text-stone-400 uppercase tracking-wider text-xs md:text-sm mt-1" style={{ fontFamily: 'var(--font-family-body)' }}>
                    {!accusation.defense ? `Defense window: ${defenseTimer}s remaining` : `Defense submitted — ready to vote`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAccusationBannerVisible(false)} 
                className="text-stone-400 hover:text-stone-200 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Defense Panel — only for the accused player */}
        <AnimatePresence>
          {isAccused && gameState === 'accusation' && !defenseSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 90,
                background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <motion.div initial={{ y: 40 }} animate={{ y: 0 }} style={{
                width: '100%', maxWidth: 480, margin: '0 16px',
                background: 'linear-gradient(160deg, #140a0a, #280a0a)',
                border: '1px solid rgba(139,0,0,0.6)',
                borderRadius: 10, padding: 32,
                boxShadow: '0 0 60px rgba(139,0,0,0.3)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛡️</div>
                  <h2 style={{ fontFamily: "'Cinzel', serif", color: '#d4c5a9', fontSize: '1.2rem', letterSpacing: '0.12em', margin: '0 0 6px' }}>You Have Been Accused</h2>
                  <p style={{ color: 'rgba(200,160,120,0.6)', fontSize: '0.85rem', fontFamily: "'Cormorant Garamond', serif", margin: '0 0 8px' }}>
                    <span style={{ color: 'rgba(255,100,100,0.9)', fontWeight: 'bold' }}>{accusation?.accuserName}</span> accuses you of the murder.
                  </p>
                  <p style={{ color: defenseTimer < 15 ? 'rgba(255,80,80,0.9)' : 'rgba(200,160,120,0.6)', fontSize: '0.85rem', fontFamily: 'monospace' }}>⏱ {defenseTimer}s remaining</p>
                </div>
                <textarea
                  value={defenseText}
                  onChange={e => setDefenseText(e.target.value)}
                  maxLength={500} rows={4}
                  placeholder="State your defense..."
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'none',
                    background: 'rgba(10,5,5,0.8)', border: '1px solid rgba(139,0,0,0.3)',
                    borderRadius: 6, padding: 14, color: '#d4c5a9',
                    fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', lineHeight: 1.6,
                    marginBottom: 14, outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    if (!defenseText.trim()) return;
                    actions.submitDefense(defenseText.trim());
                    setDefenseSubmitted(true);
                  }}
                  disabled={!defenseText.trim()}
                  style={{
                    width: '100%', padding: '12px 0',
                    fontFamily: "'Cinzel', serif", fontSize: '0.72rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', borderRadius: 6, cursor: defenseText.trim() ? 'pointer' : 'not-allowed',
                    background: defenseText.trim() ? 'linear-gradient(135deg, rgba(139,0,0,0.85), rgba(100,0,0,0.9))' : 'rgba(40,20,20,0.5)',
                    color: '#d4c5a9', border: '1px solid rgba(139,0,0,0.4)', opacity: defenseText.trim() ? 1 : 0.4
                  }}
                >
                  Submit Defense
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host: Begin Vote button */}
        <AnimatePresence>
          {isHost && gameState === 'accusation' && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 70 }}
            >
              <button
                onClick={() => actions.startVoting()}
                className="premium-btn px-10 py-4 text-sm font-bold uppercase tracking-widest rounded-full shadow-2xl"
                style={{
                  fontFamily: 'var(--font-family-heading)',
                  background: 'rgba(10, 10, 10, 0.9)',
                  color: '#daa520',
                  borderColor: 'rgba(218,165,32,0.6)',
                }}
              >
                ⚖️ Begin the Vote
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voting modal */}
        <AnimatePresence>
          {(state.gameState === 'voting' || state.votingResults) && <VotingModal />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Briefing Phase ──
  const tabs = [
    { id: 'role', label: 'Your Role' },
    { id: 'location', label: 'The Location' },
    { id: 'suspects', label: 'Other Suspects' },
    { id: 'timeline', label: 'Timeline & Clues' },
  ];

  return (
    <motion.div
      key="game-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={S.page}
    >
      {/* ─── HEADER ─── */}
      <header style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={S.headerTitle}>
            {mystery.victim.name} is Dead.
          </h1>
          <p style={S.headerSub}>
            {mystery.victim.backstory}
          </p>
        </div>

        <div style={S.headerBtns}>
          <HeaderBtn
            active={!musicMuted}
            onClick={toggleMusic}
            title="Toggle Background Music"
          >
            {musicMuted ? '♪ Music Off' : '♪ Music On'}
          </HeaderBtn>

          <HeaderBtn
            active={!isMuted}
            onClick={toggleMute}
            title={micError || 'Toggle Microphone'}
          >
            {!isMuted ? '🎙 Mic On' : '🎙 Mic Off'}
          </HeaderBtn>

          <HeaderBtn
            danger
            onClick={() => {
              actions.closeRoom();
              navigate('/menu');
            }}
          >
            Leave Game
          </HeaderBtn>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <div style={S.tabBar}>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      <div style={S.content}>
        <AnimatePresence mode="wait">

          {/* ── YOUR ROLE ── */}
          {activeTab === 'role' && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              style={S.contentInner}
            >
              {/* Character intro */}
              <div>
                <p style={S.charLabel}>You Are</p>
                <h2 style={S.charName}>{myRole?.name}</h2>
                <p style={S.charMeta}>{myRole?.age} yrs · {myRole?.occupation}</p>
                <div style={S.divider} />
              </div>

              {/* Info cards */}
              <div style={S.cardWrap}>
                <InfoCard label="Public Background" color="gold">
                  {myRole?.publicBackground}
                </InfoCard>

                <InfoCard label="Private Objective" color="red">
                  {myRole?.privateObjective}
                </InfoCard>

                <InfoCard label="Hidden Information" color="blue">
                  {myRole?.hiddenInformation}
                </InfoCard>

                {myRole?.secretRelationship && (
                  <InfoCard label="Secret Relationship" color="purple">
                    {myRole?.secretRelationship}
                  </InfoCard>
                )}
              </div>
            </motion.div>
          )}

          {/* ── THE LOCATION ── */}
          {activeTab === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              style={S.contentInner}
            >
              <p style={{ ...S.charLabel, color: 'rgba(74,111,165,0.7)' }}>The Scene of the Crime</p>
              <h2 style={S.charName}>{mystery.location.name}</h2>
              <div style={S.divider} />

              <div
                style={{
                  marginTop: 44,
                  padding: '28px 32px',
                  background: 'rgba(74,111,165,0.04)',
                  border: '1px solid rgba(74,111,165,0.12)',
                  borderLeft: '3px solid rgba(74,111,165,0.5)',
                  borderRadius: 8,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)',
                    lineHeight: 1.9,
                    color: '#d4c5a9',
                    margin: 0,
                  }}
                >
                  {mystery.location.description}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── OTHER SUSPECTS ── */}
          {activeTab === 'suspects' && (
            <motion.div
              key="suspects"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              style={{ ...S.contentInner, maxWidth: 900 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {otherSuspects.map((suspect, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(184,134,11,0.03)',
                      border: '1px solid rgba(184,134,11,0.12)',
                      borderLeft: '3px solid rgba(184,134,11,0.4)',
                      borderRadius: 8,
                      padding: '28px 32px',
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
                        fontWeight: 700,
                        color: '#f0e8dc',
                        letterSpacing: '0.04em',
                        marginBottom: 4,
                      }}
                    >
                      {suspect.name}
                    </h3>
                    <p
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '0.95rem',
                        fontStyle: 'italic',
                        color: 'rgba(200,185,165,0.5)',
                        marginBottom: 20,
                        paddingBottom: 16,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {suspect.age} yrs · {suspect.occupation}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {suspect.physicalDescription && (
                        <div>
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'rgba(184,134,11,0.55)',
                              display: 'block',
                              marginBottom: 6,
                            }}
                          >
                            Appearance
                          </span>
                          <p
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
                              lineHeight: 1.75,
                              color: '#c8b496',
                              margin: 0,
                            }}
                          >
                            {suspect.physicalDescription}
                          </p>
                        </div>
                      )}

                      <div>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'rgba(184,134,11,0.55)',
                            display: 'block',
                            marginBottom: 6,
                          }}
                        >
                          Known Background
                        </span>
                        <p
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
                            lineHeight: 1.75,
                            color: '#c8b496',
                            margin: 0,
                          }}
                        >
                          {suspect.publicBackground}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── TIMELINE & CLUES ── */}
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              style={{ ...S.contentInner, maxWidth: 900 }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
                  gap: 48,
                }}
              >
                {/* Timeline column */}
                <div>
                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                      fontWeight: 700,
                      color: '#e8ddd0',
                      letterSpacing: '0.06em',
                      paddingBottom: 14,
                      borderBottom: '1px solid rgba(139,0,0,0.2)',
                      marginBottom: 24,
                    }}
                  >
                    Timeline of Events
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {mystery.timeline.map((event, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: 16,
                          alignItems: 'flex-start',
                        }}
                      >
                        {/* Dot */}
                        <div
                          style={{
                            width: 10, height: 10,
                            borderRadius: '50%',
                            background: '#8b0000',
                            boxShadow: '0 0 8px rgba(139,0,0,0.5)',
                            marginTop: 7,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              letterSpacing: '0.15em',
                              color: 'rgba(184,134,11,0.7)',
                              display: 'block',
                              marginBottom: 5,
                            }}
                          >
                            {event.time}
                          </span>
                          <p
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              fontSize: 'clamp(1rem, 1.5vw, 1.12rem)',
                              lineHeight: 1.7,
                              color: '#c8b496',
                              margin: 0,
                            }}
                          >
                            {event.event}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clues column */}
                <div>
                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                      fontWeight: 700,
                      color: '#e8ddd0',
                      letterSpacing: '0.06em',
                      paddingBottom: 14,
                      borderBottom: '1px solid rgba(74,111,165,0.2)',
                      marginBottom: 24,
                    }}
                  >
                    Initial Clues
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {mystery.initialClues.map((clue, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(74,111,165,0.04)',
                          border: '1px solid rgba(74,111,165,0.12)',
                          borderLeft: '3px solid rgba(74,111,165,0.4)',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 20px',
                            borderBottom: '1px solid rgba(74,111,165,0.08)',
                            background: 'rgba(0,0,0,0.12)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'rgba(74,111,165,0.75)',
                            }}
                          >
                            {clue.name}
                          </span>
                        </div>
                        <p
                          style={{
                            padding: '16px 20px',
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 'clamp(1rem, 1.5vw, 1.12rem)',
                            lineHeight: 1.75,
                            color: '#c8b496',
                            margin: 0,
                          }}
                        >
                          {clue.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div style={S.bottomBar}>
        <EnterBtn
          onClick={() => { playClickSound(); setPhase('exploring'); }}
          onMouseEnter={playHoverSound}
        />
      </div>
    </motion.div>
  );
}
