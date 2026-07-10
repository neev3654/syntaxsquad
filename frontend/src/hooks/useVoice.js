import { useState, useCallback } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

/**
 * Custom hook to abstract microphone controls.
 * Designed to be used INSIDE the LiveKitRoom context.
 */
export function useVoiceControls() {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState(null);

  const toggleMute = useCallback(async () => {
    if (!localParticipant) {
      console.warn('[useVoiceControls] Local participant not ready');
      return;
    }

    try {
      const nextMuted = !isMuted;
      await localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
      setMicError(null);
      console.log(`[Voice] Microphone ${nextMuted ? 'Muted' : 'Unmuted'}`);
    } catch (error) {
      console.error('[Voice] Failed to toggle microphone:', error);
      
      // Handle common permission errors gracefully
      if (error.name === 'NotAllowedError') {
        setMicError('Microphone permission denied.');
      } else if (error.name === 'NotFoundError') {
        setMicError('No microphone detected.');
      } else {
        setMicError('Failed to access microphone.');
      }
      
      // Force UI state to muted on error
      setIsMuted(true);
    }
  }, [localParticipant, isMuted]);

  return {
    isMuted,
    toggleMute,
    micError,
    // Exposed so we can force reset when leaving room
    setIsMuted 
  };
}
