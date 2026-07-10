import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useGame } from './GameContext.jsx';
import { fetchVoiceToken } from '../services/voiceApi.js';
import { useVoiceControls } from '../hooks/useVoice.js';

// Outer context to expose token/connection status if needed
const VoiceContext = createContext(null);

// Inner wrapper that has access to LiveKit hooks
function VoiceController({ children }) {
  const { isMuted, toggleMute, micError, setIsMuted } = useVoiceControls();

  const value = useMemo(() => ({
    isMuted,
    toggleMute,
    micError,
    // Provide a no-op initMicrophone since LiveKit handles permissions on un-mute
    initMicrophone: () => Promise.resolve(null),
    // Dummy remoteStreams for legacy compatibility with UI (they are now handled by RoomAudioRenderer)
    remoteStreams: {}
  }), [isMuted, toggleMute, micError]);

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function VoiceProvider({ children }) {
  const { state } = useGame();
  const { roomCode, playerId, playerName, room } = state;
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState(null);

  // Automatically fetch token when joining a room
  useEffect(() => {
    // Only connect if we are genuinely in a room with valid state
    if (roomCode && playerId && playerName && room) {
      let active = true;

      const connectVoice = async () => {
        try {
          console.log('[Voice] Requesting token for room:', roomCode);
          const data = await fetchVoiceToken(roomCode, playerId, playerName);
          
          if (active) {
            setToken(data.token);
            setServerUrl(data.url);
            setError(null);
            console.log('[Voice] Token acquired, joining LiveKit room...');
          }
        } catch (err) {
          if (active) {
            console.error('[Voice] Failed to initialize voice connection:', err);
            setError(err.message);
          }
        }
      };

      connectVoice();

      // Cleanup when leaving room
      return () => {
        active = false;
        console.log('[Voice] Leaving room, clearing tokens...');
        setToken('');
        setServerUrl('');
      };
    }
  }, [roomCode, playerId, playerName, room]); // Re-run if these core identifiers change

  // If we have a token, render the LiveKit environment
  if (token && serverUrl) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        // Enable audio automatically upon joining
        audio={true}
        video={false}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          }
        }}
        onDisconnected={() => {
          console.log('[Voice] Disconnected from LiveKit edge.');
          setToken(''); // Reset to prevent phantom connections
        }}
      >
        <VoiceController>
          {children}
        </VoiceController>
        {/* Invisible component that plays all remote audio tracks automatically */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    );
  }

  // Fallback context provider when not in a room, or waiting for token
  const fallbackValue = {
    isMuted: false,
    toggleMute: () => console.log('[Voice] Cannot unmute outside a room'),
    micError: error,
    initMicrophone: () => Promise.resolve(null),
    remoteStreams: {}
  };

  return (
    <VoiceContext.Provider value={fallbackValue}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
