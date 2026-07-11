import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';

const AVATARS = ['🕵️', '🧙', '💀', '🦇', '🐍', '🌙', '⚗️', '🗡️'];

export default function VotingModal() {
  const { state, actions } = useGame();
  const { votingPhase, votingResults, accusation, room, playerId, gameState } = state;

  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(votingPhase?.timeLimit || 120);
  const [showResults, setShowResults] = useState(false);

  const suspects = votingPhase?.suspects || room?.mysteryData?.suspects?.map(s => ({
    name: s.name,
    occupation: s.occupation,
    physicalDescription: s.physicalDescription
  })) || [];

  const votesCast = votingPhase?.votesCast || 0;
  const totalPlayers = (room?.players || []).filter(p => p.isConnected).length;

  // Show results when they arrive
  useEffect(() => {
    if (votingResults) {
      setShowResults(true);
    }
  }, [votingResults]);

  // Countdown timer
  useEffect(() => {
    if (!votingPhase?.isActive || hasVoted || showResults) return;
    setTimeLeft(votingPhase.timeLimit || 120);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [votingPhase?.isActive, hasVoted, showResults]);

  const handleCastVote = async () => {
    if (!selectedSuspect || hasVoted) return;
    playClickSound();
    await actions.castVote(selectedSuspect);
    setHasVoted(true);
  };

  const timerColor = timeLeft > 60 ? '#4ade80' : timeLeft > 30 ? '#facc15' : '#f87171';
  const timerPct = (timeLeft / (votingPhase?.timeLimit || 120)) * 100;

  // Don't render if voting isn't active
  if (gameState !== 'voting' && !showResults) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(6px)' }}
    >
      {/* Results Modal */}
      <AnimatePresence>
        {showResults && votingResults && (
          <ResultsModal votingResults={votingResults} room={room} suspects={suspects} />
        )}
      </AnimatePresence>

      {/* Voting UI */}
      {!showResults && (
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-2xl mx-4 flex flex-col"
          style={{
            background: 'linear-gradient(160deg, rgba(10,5,5,0.99), rgba(25,10,10,0.99))',
            border: '1px solid rgba(139,0,0,0.4)',
            boxShadow: '0 0 80px rgba(139,0,0,0.2)',
            borderRadius: '8px',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            className="px-8 py-6 border-b"
            style={{ borderColor: 'rgba(139,0,0,0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-2xl tracking-[0.2em] uppercase"
                style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
              >
                ⚖️ Cast Your Vote
              </h2>
              {/* Timer */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-2xl font-mono font-bold" style={{ color: timerColor }}>
                  {timeLeft}s
                </span>
                <div className="w-24 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <motion.div
                    className="h-1 rounded-full"
                    style={{ background: timerColor, width: `${timerPct}%`, transition: 'width 1s linear, background 1s' }}
                  />
                </div>
              </div>
            </div>

            {/* Accusation context */}
            {accusation?.accusedName && (
              <p className="text-sm" style={{ color: 'rgba(200,160,120,0.6)' }}>
                {accusation.accuserName} accused {accusation.accusedName}.{' '}
                {accusation.defense && (
                  <span style={{ color: 'rgba(150,220,150,0.7)' }}>
                    Defense: "{accusation.defense.slice(0, 60)}{accusation.defense.length > 60 ? '...' : ''}"
                  </span>
                )}
              </p>
            )}

            {/* Vote progress */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ background: 'rgba(218,165,32,0.7)', width: totalPlayers > 0 ? `${(votesCast / totalPlayers) * 100}%` : '0%' }}
                  layout
                />
              </div>
              <span className="text-xs font-mono shrink-0" style={{ color: 'rgba(218,165,32,0.7)' }}>
                {votesCast}/{totalPlayers} voted
              </span>
            </div>
          </div>

          {/* Suspects Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {hasVoted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <span className="text-5xl">✓</span>
                <p
                  className="text-xl tracking-wider"
                  style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
                >
                  Vote Cast
                </p>
                <p className="text-sm" style={{ color: 'rgba(200,160,120,0.5)' }}>
                  You voted for <span style={{ color: '#daa520' }}>{selectedSuspect}</span>
                </p>
                <p className="text-xs mt-2" style={{ color: 'rgba(200,160,120,0.4)' }}>
                  Waiting for other players... ({votesCast}/{totalPlayers})
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suspects.map((suspect, idx) => {
                  const isSelected = selectedSuspect === suspect.name;
                  return (
                    <motion.button
                      key={suspect.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => { playClickSound(); setSelectedSuspect(suspect.name); }}
                      onMouseEnter={playHoverSound}
                      className="p-4 rounded text-left transition-all duration-300 relative overflow-hidden"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(139,0,0,0.25), rgba(100,0,0,0.3))'
                          : 'rgba(20,12,12,0.6)',
                        border: `1px solid ${isSelected ? 'rgba(200,50,50,0.6)' : 'rgba(139,0,0,0.18)'}`,
                        boxShadow: isSelected ? '0 0 20px rgba(139,0,0,0.2)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="selected-vote"
                          className="absolute inset-0 opacity-10"
                          style={{ background: 'radial-gradient(circle at center, #ff0000, transparent)' }}
                        />
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                          style={{
                            background: isSelected ? 'rgba(139,0,0,0.3)' : 'rgba(30,15,15,0.6)',
                            border: `1px solid ${isSelected ? 'rgba(200,50,50,0.4)' : 'rgba(139,0,0,0.2)'}`
                          }}
                        >
                          {AVATARS[idx % AVATARS.length]}
                        </div>
                        <div>
                          <p
                            className="font-medium text-sm"
                            style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: isSelected ? '#fff' : '#d4c5a9' }}
                          >
                            {suspect.name}
                          </p>
                          <p className="text-xs" style={{ color: 'rgba(200,160,120,0.5)' }}>
                            {suspect.occupation}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="ml-auto text-sm" style={{ color: 'rgba(255,100,100,0.9)' }}>✓</span>
                        )}
                      </div>
                      {suspect.physicalDescription && (
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(200,160,120,0.45)' }}>
                          {suspect.physicalDescription.slice(0, 80)}{suspect.physicalDescription.length > 80 ? '...' : ''}
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer — Cast Vote */}
          {!hasVoted && (
            <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(139,0,0,0.2)' }}>
              <button
                onClick={handleCastVote}
                disabled={!selectedSuspect}
                onMouseEnter={selectedSuspect ? playHoverSound : undefined}
                className="w-full py-3 rounded tracking-widest uppercase text-sm transition-all duration-300 disabled:opacity-30"
                style={{
                  fontFamily: 'var(--font-family-heading), Cinzel, serif',
                  background: selectedSuspect ? 'linear-gradient(135deg, rgba(139,0,0,0.85), rgba(100,0,0,0.9))' : 'rgba(40,20,20,0.4)',
                  color: '#d4c5a9',
                  border: '1px solid rgba(139,0,0,0.4)',
                  cursor: selectedSuspect ? 'pointer' : 'not-allowed'
                }}
              >
                {selectedSuspect ? `Vote for ${selectedSuspect}` : 'Select a Suspect'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Results Modal ──────────────────────────────────────
function ResultsModal({ votingResults, room, suspects }) {
  const { voteCounts = {}, winner, isTie } = votingResults;
  const murderer = room?.mysteryData?.murderer; // Only available after reveal
  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
    >
      <motion.div
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        className="w-full max-w-lg mx-4 p-8 rounded-lg"
        style={{
          background: 'linear-gradient(160deg, rgba(10,5,5,0.99), rgba(20,10,10,0.99))',
          border: '1px solid rgba(139,0,0,0.4)',
          boxShadow: '0 0 80px rgba(139,0,0,0.25)'
        }}
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-5xl mb-4"
          >
            ⚖️
          </motion.div>
          <h2
            className="text-2xl tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif', color: '#d4c5a9' }}
          >
            {isTie ? 'The Vote is Split' : 'The Jury Has Spoken'}
          </h2>
          {isTie && (
            <p className="text-sm mt-2" style={{ color: 'rgba(200,160,120,0.6)' }}>
              No clear majority — the truth remains veiled...
            </p>
          )}
        </div>

        {/* Vote bars */}
        <div className="space-y-4 mb-8">
          {suspects
            .sort((a, b) => (voteCounts[b.name] || 0) - (voteCounts[a.name] || 0))
            .map((suspect, idx) => {
              const count = voteCounts[suspect.name] || 0;
              const pct = (count / maxVotes) * 100;
              const isWinner = suspect.name === winner;
              return (
                <motion.div
                  key={suspect.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: 'var(--font-family-heading), Cinzel, serif',
                        color: isWinner ? '#daa520' : '#d4c5a9'
                      }}
                    >
                      {suspect.name} {isWinner && '⚖️'}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'rgba(200,160,120,0.6)' }}>
                      {count} vote{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 + 0.3 }}
                      style={{
                        background: isWinner
                          ? 'linear-gradient(90deg, rgba(218,165,32,0.8), rgba(180,130,20,0.9))'
                          : 'linear-gradient(90deg, rgba(139,0,0,0.6), rgba(100,0,0,0.7))'
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm"
          style={{ color: 'rgba(200,160,120,0.5)', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}
        >
          Prepare yourself for the truth...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
