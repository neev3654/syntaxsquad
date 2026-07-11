import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';

// Parse the narrative text into sections
function parseNarrative(text) {
  if (!text) return [];
  const sectionKeys = [
    'THE MURDERER',
    'THE TIMELINE',
    'THE CLUES',
    'THE IGNORED CLUES',
    'THE LIES',
    'THE VERDICT',
    'EPILOGUE'
  ];
  const icons = ['🔪', '⏱️', '🔍', '👁️', '🎭', '⚖️', '👻'];
  const sections = [];

  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const nextKey = sectionKeys[i + 1];
    const pattern = new RegExp(`${key}[:\\s]*([\\s\\S]*?)(?=${nextKey ? nextKey : '$'})`, 'i');
    const match = text.match(pattern);
    if (match) {
      sections.push({
        title: key.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' '),
        icon: icons[i],
        content: match[1].trim()
      });
    }
  }

  // Fallback: show raw text in one block
  if (sections.length === 0) {
    return [{ title: 'The Truth', icon: '🕯️', content: text }];
  }
  return sections;
}

// Typewriter hook
function useTypewriter(text, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active || !text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [text, active, speed]);

  const skip = () => {
    clearInterval(intervalRef.current);
    setDisplayed(text);
    setDone(true);
  };

  return { displayed, done, skip };
}

// Individual narrative section with typewriter
function NarrativeSection({ section, index, isActive, onComplete }) {
  const { displayed, done, skip } = useTypewriter(section.content, 15, isActive);

  useEffect(() => {
    if (done && onComplete) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [done, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-10"
      style={{ borderLeft: '3px solid rgba(139,0,0,0.4)', paddingLeft: '1.5rem' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{section.icon}</span>
        <h3
          className="text-lg tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#daa520' }}
        >
          {section.title}
        </h3>
      </div>
      <p
        className="leading-relaxed text-base"
        style={{ color: 'rgba(212,197,169,0.88)', fontFamily: 'var(--font-family-body), Cormorant Garamond, serif', fontSize: '1.05rem' }}
      >
        {displayed}
        {!done && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
            style={{ background: 'rgba(212,197,169,0.6)', verticalAlign: 'middle' }}
          />
        )}
      </p>
      {isActive && !done && (
        <button
          onClick={skip}
          className="mt-3 text-xs opacity-40 hover:opacity-70 transition-opacity tracking-wider"
          style={{ color: 'rgba(200,160,120,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}
        >
          [ Skip ]
        </button>
      )}
    </motion.div>
  );
}

// Statistics panel
function StatisticsPanel({ statistics }) {
  if (!statistics) return null;
  const {
    totalClues,
    discoveredClues,
    correctVoters = [],
    timeTaken,
    mvp,
    playersWon,
    murderer
  } = statistics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 p-6 rounded-lg"
      style={{
        background: 'rgba(20,12,12,0.8)',
        border: '1px solid rgba(139,0,0,0.3)',
        boxShadow: '0 0 30px rgba(0,0,0,0.5)'
      }}
    >
      <h3
        className="text-base tracking-[0.25em] uppercase mb-6"
        style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: 'rgba(218,165,32,0.7)' }}
      >
        📊 Game Statistics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard label="Clues Discovered" value={`${discoveredClues} / ${totalClues}`} icon="🔍" />
        <StatCard label="Time Taken" value={timeTaken || '—'} icon="⏱️" />
        <StatCard label="Most Valuable" value={mvp || '—'} icon="🏆" />
        <StatCard
          label="Verdict"
          value={playersWon ? 'Players Won!' : 'Murderer Escaped'}
          icon={playersWon ? '✅' : '❌'}
          highlight={playersWon ? 'success' : 'failure'}
        />
        <StatCard
          label="True Murderer"
          value={murderer || '???'}
          icon="🔪"
        />
        <div className="p-4 rounded" style={{ background: 'rgba(10,5,5,0.6)', border: '1px solid rgba(139,0,0,0.15)' }}>
          <p className="text-xs tracking-wider uppercase mb-2" style={{ color: 'rgba(218,165,32,0.5)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
            🗳️ Correct Voters
          </p>
          {correctVoters.length > 0 ? (
            correctVoters.map((name, i) => (
              <p key={i} className="text-sm" style={{ color: 'rgba(150,255,150,0.8)' }}>{name}</p>
            ))
          ) : (
            <p className="text-sm" style={{ color: 'rgba(200,160,120,0.4)' }}>None</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  const color = highlight === 'success' ? 'rgba(150,255,150,0.9)'
    : highlight === 'failure' ? 'rgba(255,120,120,0.9)'
    : '#d4c5a9';
  return (
    <div className="p-4 rounded" style={{ background: 'rgba(10,5,5,0.6)', border: '1px solid rgba(139,0,0,0.15)' }}>
      <p className="text-xs tracking-wider uppercase mb-1" style={{ color: 'rgba(218,165,32,0.5)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
        {icon} {label}
      </p>
      <p className="text-sm font-medium" style={{ color }}>{value}</p>
    </div>
  );
}

// Candle flicker particles
function CandleParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            background: `rgba(${200 + Math.random() * 55}, ${80 + Math.random() * 80}, 0, 0.4)`,
            left: Math.random() * 100 + '%',
            bottom: '0%',
          }}
          animate={{
            y: [0, -(200 + Math.random() * 400)],
            x: [(Math.random() - 0.5) * 40],
            opacity: [0, 0.6, 0],
            scale: [1, 0.5, 0]
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
}

export default function RevealScreen() {
  const { state, actions } = useGame();
  const { revealData, room, playerId } = state;

  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [allComplete, setAllComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const narrative = revealData?.narrative || '';
  const statistics = revealData?.statistics;
  const sections = parseNarrative(narrative);
  const isHost = room?.hostId === playerId;

  // Request reveal if not yet loaded
  useEffect(() => {
    if (!revealData) {
      actions.requestReveal();
    } else {
      setLoading(false);
    }
  }, [revealData]);

  useEffect(() => {
    if (revealData) setLoading(false);
  }, [revealData]);

  const handleSectionComplete = () => {
    setActiveSectionIdx(prev => {
      const next = prev + 1;
      if (next >= sections.length) {
        setAllComplete(true);
        return prev;
      }
      return next;
    });
  };

  const handlePlayAgain = () => {
    playClickSound();
    actions.playAgain();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] overflow-hidden flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(30,8,8,1) 0%, rgba(5,2,2,1) 60%, rgba(0,0,0,1) 100%)',
        fontFamily: 'var(--font-family-body), Cormorant Garamond, serif'
      }}
    >
      <CandleParticles />

      {/* Fog overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,0,0,0.01) 2px, rgba(139,0,0,0.01) 4px)',
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 text-center py-10 px-6 border-b"
        style={{ borderColor: 'rgba(139,0,0,0.3)', background: 'rgba(5,2,2,0.6)' }}
      >
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-4xl mb-3"
        >
          🕯️
        </motion.div>
        <h1
          className="text-3xl md:text-5xl tracking-[0.25em] uppercase mb-3"
          style={{
            fontFamily: 'var(--font-family-heading), Cinzel, serif',
            color: '#d4c5a9',
            textShadow: '0 0 40px rgba(139,0,0,0.6), 0 0 80px rgba(139,0,0,0.3)'
          }}
        >
          The Truth Revealed
        </h1>
        <p className="text-sm tracking-[0.3em] uppercase" style={{ color: 'rgba(200,160,120,0.4)' }}>
          The spirits speak at last
        </p>
      </motion.header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Loading state */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-t-2 border-red-600 rounded-full"
              />
              <p className="text-sm tracking-widest" style={{ color: 'rgba(200,160,120,0.5)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
                The spirits are composing the truth...
              </p>
            </motion.div>
          )}

          {/* Narrative sections */}
          {!loading && sections.length > 0 && (
            <div>
              {sections.slice(0, activeSectionIdx + 1).map((section, idx) => (
                <NarrativeSection
                  key={section.title}
                  section={section}
                  index={idx}
                  isActive={idx === activeSectionIdx}
                  onComplete={idx === activeSectionIdx ? handleSectionComplete : undefined}
                />
              ))}
            </div>
          )}

          {/* Statistics (shown after all sections complete) */}
          <AnimatePresence>
            {allComplete && statistics && (
              <StatisticsPanel statistics={statistics} />
            )}
          </AnimatePresence>

          {/* Play Again */}
          <AnimatePresence>
            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-10 flex flex-col items-center gap-4"
              >
                {isHost ? (
                  <>
                    <p className="text-xs tracking-wider" style={{ color: 'rgba(200,160,120,0.4)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
                      As the keeper of the manor, you may summon the spirits once more
                    </p>
                    <button
                      onClick={handlePlayAgain}
                      onMouseEnter={playHoverSound}
                      className="px-10 py-4 tracking-[0.2em] uppercase text-sm transition-all duration-500 rounded"
                      style={{
                        fontFamily: 'var(--font-family-heading), Cinzel, serif',
                        background: 'linear-gradient(135deg, rgba(20,15,10,0.9), rgba(10,8,5,0.95))',
                        color: '#d4c5a9',
                        border: '1px solid rgba(139,0,0,0.4)',
                        boxShadow: '0 0 30px rgba(139,0,0,0.15)',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Play Again
                    </button>
                  </>
                ) : (
                  <p className="text-sm tracking-wider text-center" style={{ color: 'rgba(200,160,120,0.4)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
                    Awaiting the host to begin a new investigation...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip all sections button */}
          {!loading && !allComplete && sections.length > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setActiveSectionIdx(sections.length - 1);
                  setTimeout(() => setAllComplete(true), 1200);
                }}
                className="text-xs opacity-25 hover:opacity-50 transition-opacity tracking-widest uppercase"
                style={{ color: 'rgba(200,160,120,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}
              >
                [ Skip All ]
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
