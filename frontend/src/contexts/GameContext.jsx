import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import socket from '../socket/socket.js';

const GameContext = createContext(null);

const initialState = {
  screen: 'intro', // intro | menu | host | join | lobby | countdown | game
  playerId: null,
  playerName: '',
  room: null,
  roomCode: null,
  error: null,
  isConnected: false,
  ping: 0,
  countdown: null,
  kicked: false
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload, error: null };
    case 'SET_PLAYER':
      return { ...state, playerId: action.payload.playerId, playerName: action.payload.playerName };
    case 'SET_ROOM':
      return { ...state, room: action.payload, roomCode: action.payload?.roomCode };
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_PING':
      return { ...state, ping: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdown: action.payload };
    case 'SET_KICKED':
      return { ...state, kicked: true, screen: 'menu', room: null, roomCode: null };
    case 'RESET':
      return { ...initialState, isConnected: state.isConnected, screen: 'menu' };
    case 'ADD_CHAT_MESSAGE':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          messages: [...(state.room.messages || []), action.payload]
        }
      };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const pingIntervalRef = useRef(null);

  // Connect socket
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      console.log('[Socket] Disconnected');
    });

    socket.on('room-update', (room) => {
      dispatch({ type: 'SET_ROOM', payload: room });
    });

    socket.on('countdown', (data) => {
      dispatch({ type: 'SET_COUNTDOWN', payload: data.count });
    });

    socket.on('generating-mystery', () => {
      dispatch({ type: 'SET_SCREEN', payload: 'generating' });
    });

    socket.on('game-started', (data) => {
      dispatch({ type: 'SET_ROOM', payload: data.room });
      dispatch({ type: 'SET_SCREEN', payload: 'game' });
    });

    socket.on('kicked', () => {
      dispatch({ type: 'SET_KICKED' });
    });

    socket.on('room-closed', () => {
      dispatch({ type: 'RESET' });
    });

    socket.on('chat-message', (message) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-update');
      socket.off('countdown');
      socket.off('generating-mystery');
      socket.off('game-started');
      socket.off('kicked');
      socket.off('room-closed');
      socket.off('chat-message');
    };
  }, []);

  // Ping measurement
  useEffect(() => {
    if (state.isConnected && state.room) {
      pingIntervalRef.current = setInterval(() => {
        const start = Date.now();
        socket.emit('ping-check', {}, () => {
          dispatch({ type: 'SET_PING', payload: Date.now() - start });
        });
      }, 5000);
    }
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [state.isConnected, state.room]);

  // ─── Actions ───
  const createRoom = useCallback((settings) => {
    return new Promise((resolve) => {
      socket.emit('create-room', settings, (response) => {
        if (response.success) {
          dispatch({ type: 'SET_PLAYER', payload: { playerId: response.playerId, playerName: settings.hostName } });
          dispatch({ type: 'SET_ROOM', payload: response.room });
          dispatch({ type: 'SET_SCREEN', payload: 'lobby' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error });
        }
        resolve(response);
      });
    });
  }, []);

  const joinRoom = useCallback((data) => {
    return new Promise((resolve) => {
      socket.emit('join-room', data, (response) => {
        if (response.success) {
          dispatch({ type: 'SET_PLAYER', payload: { playerId: response.playerId, playerName: data.playerName } });
          dispatch({ type: 'SET_ROOM', payload: response.room });
          dispatch({ type: 'SET_SCREEN', payload: 'lobby' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error });
        }
        resolve(response);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (state.roomCode && state.playerId) {
      socket.emit('leave-room', { roomCode: state.roomCode, playerId: state.playerId });
    }
    dispatch({ type: 'RESET' });
  }, [state.roomCode, state.playerId]);

  const setReady = useCallback((ready) => {
    const event = ready ? 'player-ready' : 'player-unready';
    socket.emit(event, { roomCode: state.roomCode, playerId: state.playerId });
  }, [state.roomCode, state.playerId]);

  const sendMessage = useCallback((content) => {
    socket.emit('chat-message', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      playerName: state.playerName,
      content
    });
  }, [state.roomCode, state.playerId, state.playerName]);

  const sendTyping = useCallback(() => {
    socket.emit('typing', { roomCode: state.roomCode, playerName: state.playerName });
  }, [state.roomCode, state.playerName]);

  const kickPlayer = useCallback((targetPlayerId) => {
    socket.emit('kick-player', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      targetPlayerId
    });
  }, [state.roomCode, state.playerId]);

  const transferHost = useCallback((targetPlayerId) => {
    socket.emit('transfer-host', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      targetPlayerId
    });
  }, [state.roomCode, state.playerId]);

  const lockRoom = useCallback((locked) => {
    socket.emit('lock-room', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      locked
    });
  }, [state.roomCode, state.playerId]);

  const changeSettings = useCallback((settings) => {
    socket.emit('change-settings', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      settings
    });
  }, [state.roomCode, state.playerId]);

  const startGame = useCallback(() => {
    return new Promise((resolve) => {
      socket.emit('start-game', {
        roomCode: state.roomCode,
        playerId: state.playerId
      }, (response) => {
        if (response.success) {
          dispatch({ type: 'SET_SCREEN', payload: 'countdown' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error });
        }
        resolve(response);
      });
    });
  }, [state.roomCode, state.playerId]);

  const closeRoom = useCallback(() => {
    socket.emit('close-room', {
      roomCode: state.roomCode,
      playerId: state.playerId
    });
    dispatch({ type: 'RESET' });
  }, [state.roomCode, state.playerId]);

  const value = {
    state,
    dispatch,
    actions: {
      createRoom,
      joinRoom,
      leaveRoom,
      setReady,
      sendMessage,
      sendTyping,
      kickPlayer,
      transferHost,
      lockRoom,
      changeSettings,
      startGame,
      closeRoom
    }
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
