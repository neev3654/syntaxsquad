import { useEffect, memo } from 'react';
import { useGame } from './contexts/GameContext.jsx';
import BackgroundScene from './components/BackgroundScene.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import AudioControls from './components/AudioControls.jsx';
import IntroScreen from './components/IntroScreen.jsx';
import MainMenu from './components/menu/MainMenu.jsx';
import Lobby from './components/lobby/Lobby.jsx';
import GameScreen from './components/game/GameScreen.jsx';
import RevealScreen from './components/game/RevealScreen.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { playClickSound, playHoverSound } from './audio/audioEngine.js';

function AppContent() {
  const { state, actions, dispatch } = useGame();

  // Handle URL params for joining via invite link
  useEffect(() => {
    if (state.screen !== 'intro') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code && code.length === 4 && state.screen === 'menu') {
        // We could auto-open join modal here, but for simplicity we'll let user click
        // Or better yet, we can intercept and show a specialized join prompt
        console.log('Invited to room:', code);
      }
    }
  }, [state.screen]);

  return (
    <>
      <BackgroundScene intensify={state.screen === 'countdown' || state.screen === 'game'} />
      <CustomCursor />
      
      {state.screen !== 'intro' && <AudioControls />}

      <AnimatePresence mode="wait">
        {state.screen === 'intro' && (
          <IntroScreen key="intro" onComplete={() => dispatch({ type: 'SET_SCREEN', payload: 'menu' })} />
        )}
        
        {state.screen === 'menu' && (
          <MainMenu key="menu" />
        )}

        {(state.screen === 'lobby' || state.screen === 'countdown') && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Lobby />
          </motion.div>
        )}

        {state.screen === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 text-white font-mono text-center px-4"
          >
            <div className="w-16 h-16 border-t-2 border-red-500 rounded-full animate-spin mb-8 mx-auto opacity-70" />
            <h1 className="text-xl md:text-2xl tracking-widest text-red-400">
              The AI is weaving the story...
            </h1>
            <p className="mt-4 text-gray-500 text-sm">
              Gathering clues, assigning roles, awakening the spirits.
            </p>
          </motion.div>
        )}

        {state.screen === 'game' && <GameScreen key="game" />}

        {state.screen === 'reveal' && <RevealScreen key="reveal" />}
      </AnimatePresence>

      {/* Global Kicked Overlay */}
      <AnimatePresence>
        {state.kicked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.95)', fontFamily: 'monospace' }}
          >
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl mb-4 tracking-wider" style={{ color: 'rgba(200,50,50,0.7)' }}>
                Removed
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                You have been removed from the session.
              </p>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="mt-8 text-sm transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'monospace' }}
              >
                [ok]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return <AppContent />;
}

export default memo(App);
