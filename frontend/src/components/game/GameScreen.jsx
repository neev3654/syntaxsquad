import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext.jsx';
import { useVoice } from '../../contexts/VoiceContext.jsx';
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
  const [activeTab, setActiveTab] = useState('role');
  const [phase, setPhase] = useState('briefing');
  const [musicMuted, setMusicMuted] = useState(false);

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
<<<<<<< Updated upstream
    return <RoomExploration2D />;
=======
    return (
      <>
        <RoomExploration />
        {/* Voting modal overlays exploration when active */}
        <AnimatePresence>
          {(state.gameState === 'voting' || state.votingResults) && <VotingModal />}
        </AnimatePresence>
      </>
    );
>>>>>>> Stashed changes
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
            onClick={() => { actions.closeRoom(); window.location.href = '/'; }}
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
<<<<<<< Updated upstream
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
=======
              {/* Timeline */}
              <div>
                <h3 className="game-title text-3xl mb-8 border-b border-[color:var(--color-blood-dark)] pb-4">Timeline</h3>
                <div className="space-y-10 mt-6">
                  {(mystery.timeline || []).map((event, idx) => (
                    <div key={idx} className="relative pl-10 border-l-2 border-[color:var(--color-blood-dark)] py-1">
                      <div className="absolute w-4 h-4 bg-[color:var(--color-blood-glow)] rounded-full -left-[9px] top-2 shadow-[0_0_15px_var(--color-blood)]" />
                      <span className="font-[family-name:var(--font-family-heading)] text-[color:var(--color-gold)] text-base tracking-widest block mb-3 break-words">{event.time}</span>
                      <p className="text-xl text-[color:var(--color-bone)] break-words whitespace-pre-wrap leading-relaxed">{event.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clues */}
              <div>
                <h3 className="game-title text-3xl mb-8 border-b border-[color:var(--color-blood-dark)] pb-4">Initial Clues</h3>
                <div className="space-y-8 mt-6">
                  {(mystery.initialClues || []).map((clue, idx) => (
                    <div key={idx} className="panel rounded overflow-hidden shadow-lg">
                      <h4 className="panel-header text-lg">{clue.name}</h4>
                      <p className="p-6 md:p-8 text-xl text-[color:var(--color-bone)] break-words whitespace-pre-wrap leading-relaxed">{clue.description}</p>
                    </div>
                  ))}
>>>>>>> Stashed changes
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
