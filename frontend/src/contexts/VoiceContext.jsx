import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import socket from '../socket/socket.js';
import { useGame } from './GameContext.jsx';

const VoiceContext = createContext(null);

// STUN + free TURN servers for production NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export function VoiceProvider({ children }) {
  const { state: gameState } = useGame();
  const { room, playerId: myPlayerId, roomCode } = gameState;

  const [isMuted, setIsMuted] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micError, setMicError] = useState(null);

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const micAttemptedRef = useRef(false);
  const pendingSignalsRef = useRef([]);
  const initiatorMapRef = useRef({}); // track who is initiator for renegotiation

  // ─── Initialize Microphone ───
  const initMicrophone = useCallback(async () => {
    if (localStreamRef.current || micAttemptedRef.current) return null;
    micAttemptedRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // Always start muted
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicError(null);
      console.log('[Voice] Microphone initialized');
      return stream;
    } catch (err) {
      console.error('[Voice] Microphone error:', err);
      setMicError('Microphone access denied or unavailable.');
      return null;
    }
  }, []); // no deps — never recreated

  // ─── Toggle Mute ───
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
        });
      }
      console.log('[Voice] Mic', newMuted ? 'muted' : 'unmuted');
      return newMuted;
    });
  }, []);

  // ─── Process a single WebRTC signal ───
  const processSignal = useCallback(async (data) => {
    const { callerId, signal } = data;
    console.log(`[Voice] Signal: ${signal.type} from ${callerId}`);

    let pc = peersRef.current[callerId];

    if (!pc && signal.type === 'offer') {
      // We are receiving an offer — we are NOT the initiator
      pc = createPeer(callerId, false);
    }

    if (!pc) {
      console.warn('[Voice] No peer for signal, dropping');
      return;
    }

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-signal', {
          roomCode,
          targetPlayerId: callerId,
          callerId: myPlayerId,
          signal: { type: 'answer', sdp: pc.localDescription }
        });
        console.log('[Voice] Sent answer to', callerId);
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('[Voice] Got answer from', callerId);
      } else if (signal.type === 'candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.error('[Voice] Signal processing error:', err);
    }
  }, [myPlayerId, roomCode]);

  // ─── Create a single peer connection ───
  const createPeer = useCallback((targetPlayerId, isInitiator) => {
    if (peersRef.current[targetPlayerId]) return peersRef.current[targetPlayerId];

    console.log(`[Voice] Creating peer → ${targetPlayerId} (initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetPlayerId] = pc;
    initiatorMapRef.current[targetPlayerId] = isInitiator;

    // Add local audio tracks if mic is ready
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
      console.log('[Voice] Added local tracks');
    }

    // Receive remote audio
    pc.ontrack = (event) => {
      console.log(`[Voice] Got remote track from ${targetPlayerId}`);
      setRemoteStreams(prev => ({
        ...prev,
        [targetPlayerId]: event.streams[0]
      }));
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          roomCode,
          targetPlayerId,
          callerId: myPlayerId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE ${targetPlayerId}: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Conn ${targetPlayerId}: ${pc.connectionState}`);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[targetPlayerId];
          return next;
        });
        delete peersRef.current[targetPlayerId];
        delete initiatorMapRef.current[targetPlayerId];
      }
    };

    // If we are the initiator, create and send the offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc-signal', {
            roomCode,
            targetPlayerId,
            callerId: myPlayerId,
            signal: { type: 'offer', sdp: pc.localDescription }
          });
          console.log('[Voice] Sent offer to', targetPlayerId);
        })
        .catch(err => console.error('[Voice] Offer error:', err));
    }

    return pc;
  }, [myPlayerId, roomCode]);

  // ─── Socket listener for WebRTC signals ───
  useEffect(() => {
    const handleSignal = (data) => {
      // If mic isn't ready yet, queue the signal
      if (!localStreamRef.current) {
        console.log('[Voice] Mic not ready, queuing signal');
        pendingSignalsRef.current.push(data);
        return;
      }
      processSignal(data);
    };

    socket.on('webrtc-signal', handleSignal);
    return () => {
      socket.off('webrtc-signal', handleSignal);
    };
  }, [processSignal]);

  // ─── When mic becomes ready: add tracks to existing peers + process queued signals ───
  useEffect(() => {
    if (!localStream || !localStreamRef.current) return;

    console.log('[Voice] Mic ready — adding tracks to existing peers & processing queue');

    // Add tracks to any peer connections that were created before mic was ready
    Object.entries(peersRef.current).forEach(([peerId, pc]) => {
      const senders = pc.getSenders();
      const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');
      if (!hasAudio && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
        console.log(`[Voice] Late-added tracks to peer ${peerId}`);

        // Renegotiate if we are the initiator
        if (initiatorMapRef.current[peerId]) {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('webrtc-signal', {
                roomCode,
                targetPlayerId: peerId,
                callerId: myPlayerId,
                signal: { type: 'offer', sdp: pc.localDescription }
              });
              console.log('[Voice] Renegotiation offer to', peerId);
            })
            .catch(err => console.error('[Voice] Renegotiation error:', err));
        }
      }
    });

    // Process any queued signals
    if (pendingSignalsRef.current.length > 0) {
      console.log(`[Voice] Processing ${pendingSignalsRef.current.length} queued signals`);
      const queued = [...pendingSignalsRef.current];
      pendingSignalsRef.current = [];
      queued.forEach(data => processSignal(data));
    }
  }, [localStream, myPlayerId, roomCode, processSignal]);

  // ─── Connect to peers when room updates (only after mic is ready) ───
  useEffect(() => {
    if (!room || !myPlayerId || !localStreamRef.current) return;

    room.players.forEach(p => {
      if (p.playerId === myPlayerId || !p.isConnected) return;

      // Tie-breaker: higher ID initiates
      if (!peersRef.current[p.playerId] && myPlayerId > p.playerId) {
        createPeer(p.playerId, true);
      }
    });

    // Clean up peers for disconnected players
    const activeIds = room.players.filter(p => p.isConnected).map(p => p.playerId);
    Object.keys(peersRef.current).forEach(id => {
      if (!activeIds.includes(id)) {
        peersRef.current[id].close();
        delete peersRef.current[id];
        delete initiatorMapRef.current[id];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
  }, [room, myPlayerId, localStream, createPeer]);

  // ─── Init mic when entering a room ───
  useEffect(() => {
    if (roomCode && !localStreamRef.current) {
      initMicrophone();
    }
  }, [roomCode, initMicrophone]);

  // ─── Full cleanup when leaving room ───
  useEffect(() => {
    if (!roomCode) {
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      initiatorMapRef.current = {};
      pendingSignalsRef.current = [];
      setRemoteStreams({});

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      micAttemptedRef.current = false;
    }
  }, [roomCode]);

  const value = {
    isMuted,
    toggleMute,
    remoteStreams,
    micError,
    initMicrophone
  };

  return (
    <VoiceContext.Provider value={value}>
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

export default VoiceContext;
