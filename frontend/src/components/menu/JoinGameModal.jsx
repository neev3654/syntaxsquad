import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import { playClickSound, playHoverSound } from '../../audio/audioEngine.js';
import modalBg from '../../assets/modal-bg.png';

function JoinGameModal({ onClose }) {
  const { actions, state } = useGame();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    playerName: '',
    roomCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClickSound();
    if (!form.playerName.trim() || !form.roomCode.trim()) return;
    
    setLoading(true);
    await actions.joinRoom(form);
    setLoading(false);
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setForm(prev => ({ ...prev, roomCode: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl w-[90vw] md:w-[80vw]"
        style={{ 
          backgroundImage: `linear-gradient(rgba(12, 10, 10, 0.88), rgba(12, 10, 10, 0.92)), url(${modalBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(139, 0, 0, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)',
          padding: '3rem'
        }}
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="text-4xl md:text-5xl text-stone-100 tracking-[0.2em] mb-4 uppercase" style={{ fontFamily: 'var(--font-family-heading), Cinzel, serif' }}>
            Join Game
          </h2>
          <p className="text-base text-stone-400 italic tracking-wider" style={{ fontFamily: 'var(--font-family-body), Cormorant Garamond, serif' }}>
            Enter your details and the room code to connect with the investigators...
          </p>
        </div>

        <div style={{ height: '1px', background: 'rgba(139, 0, 0, 0.3)', marginBottom: '2rem' }} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Player Name */}
          <div>
            <label className="block mb-3 text-sm text-stone-400 uppercase tracking-[0.25em]" style={{ fontFamily: 'var(--font-family-old), IM Fell English, serif' }}>
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter name..."
              maxLength={20}
              value={form.playerName}
              onChange={(e) => setForm(prev => ({ ...prev, playerName: e.target.value }))}
              onMouseEnter={playHoverSound}
              autoFocus
              required
              className="w-full bg-stone-950/80 outline-none text-xl py-4 px-5 text-stone-100 border border-stone-800 focus:border-red-900/80 transition-colors placeholder:text-stone-700 placeholder:italic focus:bg-stone-900"
              style={{ 
                fontFamily: 'var(--font-family-old), IM Fell English, serif'
              }}
            />
          </div>

          {/* Room Code */}
          <div>
            <label className="block mb-3 text-sm text-stone-400 uppercase tracking-[0.25em] text-center" style={{ fontFamily: 'var(--font-family-old), IM Fell English, serif' }}>
              Room Code
            </label>
            <input
              type="text"
              placeholder="_ _ _ _"
              maxLength={4}
              value={form.roomCode}
              onChange={handleCodeChange}
              onMouseEnter={playHoverSound}
              required
              className="w-full bg-stone-950/80 outline-none text-center py-6 text-stone-100 border border-stone-800 focus:border-red-900/80 transition-colors placeholder:text-stone-700 focus:bg-stone-900"
              style={{ 
                fontFamily: 'var(--font-family-heading), Cinzel, serif',
                fontSize: '3rem',
                letterSpacing: '0.6em',
                textIndent: '0.6em'
              }}
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  className="text-base text-red-600 text-center"
                  style={{ fontFamily: 'var(--font-family-body), Cormorant Garamond, serif' }}
                >
                  {state.error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider and Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
            <div style={{ height: '1px', background: 'rgba(139, 0, 0, 0.3)' }} />
            <div className="flex justify-between items-center w-full" style={{ paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { playClickSound(); onClose(); }}
                onMouseEnter={playHoverSound}
                className="text-xl text-stone-500 hover:text-stone-200 transition-colors uppercase tracking-[0.2em]"
                style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-family-heading), Cinzel, serif' }}
              >
                [ Cancel ]
              </button>
              <button
                type="submit"
                disabled={loading || !form.playerName.trim() || form.roomCode.length !== 4}
                onMouseEnter={playHoverSound}
                className="text-xl uppercase tracking-[0.2em] transition-colors"
                style={{ 
                  color: loading || !form.playerName.trim() || form.roomCode.length !== 4 ? 'rgba(255,255,255,0.15)' : 'rgba(210, 190, 160, 0.9)',
                  cursor: loading ? 'wait' : 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-family-heading), Cinzel, serif',
                  textShadow: loading || !form.playerName.trim() || form.roomCode.length !== 4 ? 'none' : '0 0 10px rgba(139, 0, 0, 0.6)'
                }}
              >
                {loading ? '[ Joining... ]' : '[ Join Room ]'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default memo(JoinGameModal);
