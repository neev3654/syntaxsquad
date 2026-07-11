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
  kicked: false,
  // Private chat state
  privateChatRequest: null, // { fromPlayerId, fromPlayerName, toPlayerId }
  activePrivateChat: null, // { otherPlayerId, otherPlayerName }
  privateMessages: [] // Array of { fromPlayerId, toPlayerId, fromPlayerName, content, timestamp }
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
      // Only update the messages array inside room, keeping everything else by reference
      const existingMsgs = state.room.messages || [];
      // Deduplicate: skip if last message has same content + playerId + close timestamp
      const last = existingMsgs[existingMsgs.length - 1];
      if (last && last.content === action.payload.content && last.playerId === action.payload.playerId) {
        // Already present (from room-update), skip duplicate
        return state;
      }
      const newMessages = [...existingMsgs, action.payload];
      return {
        ...state,
        room: {
          ...state.room,
          messages: newMessages
        }
      };
    // Private chat actions
    case 'SET_PRIVATE_CHAT_REQUEST':
      return { ...state, privateChatRequest: action.payload };
    case 'CLEAR_PRIVATE_CHAT_REQUEST':
      return { ...state, privateChatRequest: null };
    case 'START_PRIVATE_CHAT':
      return { ...state, activePrivateChat: action.payload, privateChatRequest: null };
    case 'END_PRIVATE_CHAT':
      return { ...state, activePrivateChat: null };
    case 'ADD_PRIVATE_MESSAGE':
      return {
        ...state,
        privateMessages: [...state.privateMessages, action.payload]
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
      console.log('[GameContext] chat-message received:', message);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
    });

    // Private chat events
    socket.on('private-chat-request', (data) => {
      console.log('[GameContext] private-chat-request received:', data);
      dispatch({ type: 'SET_PRIVATE_CHAT_REQUEST', payload: data });
    });

    socket.on('private-chat-started', (data) => {
      console.log('[GameContext] private-chat-started received:', data);
      dispatch({ type: 'START_PRIVATE_CHAT', payload: data });
    });

    socket.on('private-message', (message) => {
      console.log('[GameContext] private-message received:', message);
      dispatch({ type: 'ADD_PRIVATE_MESSAGE', payload: message });
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
      socket.off('private-chat-request');
      socket.off('private-chat-started');
      socket.off('private-message');
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

  // Private chat actions
    const requestPrivateChat = useCallback((toPlayerId) => {
      console.log('[GameContext] requestPrivateChat called with:', toPlayerId, {
        roomCode: state.roomCode,
        fromPlayerId: state.playerId,
        toPlayerId,
        fromPlayerName: state.playerName
      });
      socket.emit('request-private-chat', {
        roomCode: state.roomCode,
        fromPlayerId: state.playerId,
        toPlayerId,
        fromPlayerName: state.playerName
      });
    }, [state.roomCode, state.playerId, state.playerName]);

    const acceptPrivateChat = useCallback((fromPlayerId, fromPlayerName) => {
      console.log('[GameContext] acceptPrivateChat called with:', fromPlayerId, fromPlayerName);
      socket.emit('accept-private-chat', {
        roomCode: state.roomCode,
        fromPlayerId,
        toPlayerId: state.playerId,
        toPlayerName: state.playerName
      });
    }, [state.roomCode, state.playerId, state.playerName]);

    const rejectPrivateChat = useCallback(() => {
      console.log('[GameContext] rejectPrivateChat called');
      dispatch({ type: 'CLEAR_PRIVATE_CHAT_REQUEST' });
    }, []);

    const sendPrivateMessage = useCallback((content) => {
      console.log('[GameContext] sendPrivateMessage called with:', content);
      if (!state.activePrivateChat) return;
      socket.emit('private-message', {
        roomCode: state.roomCode,
        fromPlayerId: state.playerId,
        toPlayerId: state.activePrivateChat.otherPlayerId,
        fromPlayerName: state.playerName,
        content
      });
      // Also add the message to our own local state
      const newMessage = {
        fromPlayerId: state.playerId,
        toPlayerId: state.activePrivateChat.otherPlayerId,
        fromPlayerName: state.playerName,
        content,
        timestamp: new Date()
      };
      console.log('[GameContext] Adding message to local state:', newMessage);
      dispatch({
        type: 'ADD_PRIVATE_MESSAGE',
        payload: newMessage
      });
    }, [state.roomCode, state.playerId, state.playerName, state.activePrivateChat]);

  const endPrivateChat = useCallback(() => {
    dispatch({ type: 'END_PRIVATE_CHAT' });
  }, []);

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
      closeRoom,
      // Private chat actions
      requestPrivateChat,
      acceptPrivateChat,
      rejectPrivateChat,
      sendPrivateMessage,
      endPrivateChat
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
