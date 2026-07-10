import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room.js';
import GameHistory from '../models/GameHistory.js';
import { generateUniqueRoomCode, sanitizeString, validateRoomSettings } from '../utils/roomUtils.js';
import { generateMysteryData } from '../utils/aiService.js';

// Track socket -> player mapping for reconnection
const socketPlayerMap = new Map();

export default function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── CREATE ROOM ───
    socket.on('create-room', async (data, callback) => {
      try {
        const errors = validateRoomSettings(data);
        if (errors.length > 0) {
          return callback({ success: false, error: errors[0] });
        }

        const hostName = sanitizeString(data.hostName, 20);
        const roomName = sanitizeString(data.roomName, 30);
        const playerId = uuidv4();
        const roomCode = await generateUniqueRoomCode();

        const room = new Room({
          roomCode,
          roomName,
          hostId: playerId,
          hostName,
          maxPlayers: data.maxPlayers || 4,
          difficulty: data.difficulty || 'medium',
          environment: data.environment || 'haunted-manor',
          isPrivate: !!data.isPrivate,
          players: [{
            playerId,
            socketId: socket.id,
            name: hostName,
            isHost: true,
            isReady: false,
            isConnected: true,
            avatar: Math.floor(Math.random() * 8)
          }],
          messages: [{
            playerId: 'system',
            playerName: 'System',
            content: `${hostName} has opened the gates...`,
            type: 'system'
          }]
        });

        await room.save();

        socketPlayerMap.set(socket.id, { playerId, roomCode });
        socket.join(roomCode);

        console.log(`[Room] Created: ${roomCode} by ${hostName}`);

        callback({
          success: true,
          roomCode,
          playerId,
          room: formatRoomData(room)
        });
      } catch (error) {
        console.error('[Socket] create-room error:', error);
        callback({ success: false, error: 'Failed to create room. The darkness consumes...' });
      }
    });

    // ─── JOIN ROOM ───
    socket.on('join-room', async (data, callback) => {
      try {
        const playerName = sanitizeString(data.playerName, 20);
        const roomCode = (data.roomCode || '').toUpperCase().trim();

        if (!playerName) {
          return callback({ success: false, error: 'A name is required to enter...' });
        }
        if (!roomCode || roomCode.length !== 4) {
          return callback({ success: false, error: 'Invalid room code...' });
        }

        const room = await Room.findOne({ roomCode, status: { $nin: ['closed', 'finished'] } });

        if (!room) {
          return callback({ success: false, error: 'The signal has vanished into the darkness...' });
        }
        if (room.status === 'in-progress' || room.status === 'countdown') {
          return callback({ success: false, error: 'You have arrived too late...' });
        }
        if (room.isLocked) {
          return callback({ success: false, error: 'The gates are sealed...' });
        }
        if (room.players.filter(p => p.isConnected).length >= room.maxPlayers) {
          return callback({ success: false, error: 'The mansion refuses another soul...' });
        }

        // Check for duplicate names
        const nameExists = room.players.some(
          p => p.name.toLowerCase() === playerName.toLowerCase() && p.isConnected
        );
        if (nameExists) {
          return callback({ success: false, error: 'That identity has already been claimed...' });
        }

        const playerId = uuidv4();
        const newPlayer = {
          playerId,
          socketId: socket.id,
          name: playerName,
          isHost: false,
          isReady: false,
          isConnected: true,
          avatar: Math.floor(Math.random() * 8)
        };

        room.players.push(newPlayer);
        room.messages.push({
          playerId: 'system',
          playerName: 'System',
          content: `${playerName} has entered the mansion...`,
          type: 'join'
        });

        await room.save();

        socketPlayerMap.set(socket.id, { playerId, roomCode });
        socket.join(roomCode);

        // Notify everyone in the room
        io.to(roomCode).emit('room-update', formatRoomData(room));
        io.to(roomCode).emit('chat-message', {
          playerId: 'system',
          playerName: 'System',
          content: `${playerName} has entered the mansion...`,
          type: 'join',
          timestamp: new Date()
        });

        console.log(`[Room] ${playerName} joined ${roomCode}`);

        callback({
          success: true,
          playerId,
          roomCode,
          room: formatRoomData(room)
        });
      } catch (error) {
        console.error('[Socket] join-room error:', error);
        callback({ success: false, error: 'The darkness rejects your entry...' });
      }
    });

    // ─── PLAYER READY ───
    socket.on('player-ready', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false });

        const player = room.players.find(p => p.playerId === playerId);
        if (!player) return callback?.({ success: false });

        player.isReady = true;
        await room.save();

        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] player-ready error:', error);
        callback?.({ success: false });
      }
    });

    // ─── PLAYER UNREADY ───
    socket.on('player-unready', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false });

        const player = room.players.find(p => p.playerId === playerId);
        if (!player) return callback?.({ success: false });

        player.isReady = false;
        await room.save();

        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] player-unready error:', error);
        callback?.({ success: false });
      }
    });

    // ─── CHAT MESSAGE ───
    socket.on('chat-message', async (data) => {
      try {
        const { roomCode, playerId, playerName, content } = data;
        if (!content || content.trim().length === 0) return;

        const sanitizedContent = sanitizeString(content, 500);
        const room = await Room.findOne({ roomCode });
        if (!room) return;

        const player = room.players.find(p => p.playerId === playerId);
        if (!player) return;

        const message = {
          playerId,
          playerName: player.name,
          content: sanitizedContent,
          type: 'chat',
          timestamp: new Date()
        };

        room.messages.push(message);
        if (room.messages.length > 200) {
          room.messages = room.messages.slice(-100);
        }
        await room.save();

        io.to(roomCode).emit('chat-message', message);
      } catch (error) {
        console.error('[Socket] chat-message error:', error);
      }
    });

    // ─── TYPING ───
    socket.on('typing', (data) => {
      const { roomCode, playerName } = data;
      socket.to(roomCode).emit('typing', { playerName });
    });

    // ─── KICK PLAYER ───
    socket.on('kick-player', async (data, callback) => {
      try {
        const { roomCode, playerId, targetPlayerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false, error: 'Room not found' });

        // Verify requester is host
        if (room.hostId !== playerId) {
          return callback?.({ success: false, error: 'Only the host can banish souls...' });
        }

        const targetPlayer = room.players.find(p => p.playerId === targetPlayerId);
        if (!targetPlayer) return callback?.({ success: false, error: 'Player not found' });

        // Remove player
        room.players = room.players.filter(p => p.playerId !== targetPlayerId);
        room.messages.push({
          playerId: 'system',
          playerName: 'System',
          content: `${targetPlayer.name} has been banished from the mansion...`,
          type: 'kick'
        });
        await room.save();

        // Notify kicked player
        const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
        if (targetSocket) {
          targetSocket.emit('kicked', { message: 'You have been banished from the mansion...' });
          targetSocket.leave(roomCode);
          socketPlayerMap.delete(targetPlayer.socketId);
        }

        io.to(roomCode).emit('room-update', formatRoomData(room));
        io.to(roomCode).emit('chat-message', {
          playerId: 'system',
          playerName: 'System',
          content: `${targetPlayer.name} has been banished from the mansion...`,
          type: 'kick',
          timestamp: new Date()
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] kick-player error:', error);
        callback?.({ success: false });
      }
    });

    // ─── TRANSFER HOST ───
    socket.on('transfer-host', async (data, callback) => {
      try {
        const { roomCode, playerId, targetPlayerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false });

        if (room.hostId !== playerId) {
          return callback?.({ success: false, error: 'Only the host can transfer power...' });
        }

        const targetPlayer = room.players.find(p => p.playerId === targetPlayerId);
        if (!targetPlayer || !targetPlayer.isConnected) {
          return callback?.({ success: false, error: 'Target player not found or disconnected' });
        }

        // Update host
        const oldHost = room.players.find(p => p.playerId === playerId);
        if (oldHost) oldHost.isHost = false;
        targetPlayer.isHost = true;
        room.hostId = targetPlayerId;
        room.hostName = targetPlayer.name;

        room.messages.push({
          playerId: 'system',
          playerName: 'System',
          content: `${targetPlayer.name} is now the keeper of the mansion...`,
          type: 'system'
        });

        await room.save();
        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] transfer-host error:', error);
        callback?.({ success: false });
      }
    });

    // ─── LOCK/UNLOCK ROOM ───
    socket.on('lock-room', async (data, callback) => {
      try {
        const { roomCode, playerId, locked } = data;
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) {
          return callback?.({ success: false });
        }

        room.isLocked = locked;
        await room.save();
        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false });
      }
    });

    // ─── CHANGE SETTINGS ───
    socket.on('change-settings', async (data, callback) => {
      try {
        const { roomCode, playerId, settings } = data;
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) {
          return callback?.({ success: false });
        }

        if (settings.difficulty && ['easy', 'medium', 'hard'].includes(settings.difficulty)) {
          room.difficulty = settings.difficulty;
        }
        if (settings.environment && ['haunted-manor', 'abandoned-hospital', 'forest-cabin', 'ancient-church', 'random'].includes(settings.environment)) {
          room.environment = settings.environment;
        }

        await room.save();
        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false });
      }
    });

    // ─── START GAME (COUNTDOWN) ───
    socket.on('start-game', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false, error: 'Room not found' });

        if (room.hostId !== playerId) {
          return callback?.({ success: false, error: 'Only the host can begin the ritual...' });
        }

        const connectedPlayers = room.players.filter(p => p.isConnected);
        if (connectedPlayers.length < 2) {
          return callback?.({ success: false, error: 'At least 2 souls are needed...' });
        }

        // Ensure all non-host players are ready
        const notReadyPlayers = connectedPlayers.filter(p => !p.isReady && !p.isHost);
        if (notReadyPlayers.length > 0) {
          return callback?.({ success: false, error: 'All souls must be ready to begin...' });
        }

        room.status = 'countdown';
        await room.save();

        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true });

        // Kick off AI generation immediately
        let aiResolved = false;
        const aiPromise = generateMysteryData(room.players)
          .then(mystery => {
            aiResolved = true;
            if (mystery && mystery.suspects) {
              mystery.suspects.forEach((suspect, index) => {
                if (room.players[index]) {
                  suspect.playerId = room.players[index].playerId;
                }
              });
            }
            return mystery;
          })
          .catch(err => {
            aiResolved = true;
            console.error('[Socket] AI Generation error:', err);
            return null;
          });

        // Countdown
        let count = 10;
        const countdownInterval = setInterval(async () => {
          io.to(roomCode).emit('countdown', { count });
          count--;

          if (count < 0) {
            clearInterval(countdownInterval);
            
            // If AI is still thinking, tell the clients to show the loading screen
            if (!aiResolved) {
              io.to(roomCode).emit('generating-mystery', { message: 'The AI is weaving the mystery...' });
            }

            // Wait for it to finish (if it already finished, this resolves instantly)
            room.mysteryData = await aiPromise;

            room.status = 'in-progress';
            room.gameStartedAt = new Date();
            await room.save();

            io.to(roomCode).emit('game-started', { 
              message: 'The ritual has begun...',
              room: formatRoomData(room)
            });
          }
        }, 1000);
      } catch (error) {
        console.error('[Socket] start-game error:', error);
        callback?.({ success: false, error: 'The ritual failed...' });
      }
    });

    // ─── LEAVE ROOM ───
    socket.on('leave-room', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        await handlePlayerLeave(io, socket, roomCode, playerId);
        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] leave-room error:', error);
        callback?.({ success: false });
      }
    });

    // ─── CLOSE ROOM ───
    socket.on('close-room', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) {
          return callback?.({ success: false });
        }

        room.status = 'closed';
        await room.save();

        io.to(roomCode).emit('room-closed', { message: 'The mansion has sealed its doors forever...' });

        // Disconnect all sockets from room
        const sockets = await io.in(roomCode).fetchSockets();
        for (const s of sockets) {
          s.leave(roomCode);
          socketPlayerMap.delete(s.id);
        }

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false });
      }
    });

    // ─── PING ───
    socket.on('ping-check', (data, callback) => {
      callback?.({ timestamp: Date.now() });
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const mapping = socketPlayerMap.get(socket.id);
      if (mapping) {
        const { playerId, roomCode } = mapping;
        
        // Mark player as disconnected but don't remove immediately
        try {
          const room = await Room.findOne({ roomCode });
          if (room) {
            const player = room.players.find(p => p.playerId === playerId);
            if (player) {
              player.isConnected = false;
              room.messages.push({
                playerId: 'system',
                playerName: 'System',
                content: `${player.name} lost connection to the spirit realm...`,
                type: 'leave'
              });
              await room.save();
              io.to(roomCode).emit('room-update', formatRoomData(room));
              io.to(roomCode).emit('chat-message', {
                playerId: 'system',
                playerName: 'System',
                content: `${player.name} lost connection to the spirit realm...`,
                type: 'leave',
                timestamp: new Date()
              });

              // If host disconnected, transfer to next connected player after delay
              if (player.isHost) {
                setTimeout(async () => {
                  const updatedRoom = await Room.findOne({ roomCode });
                  if (!updatedRoom) return;
                  const hostPlayer = updatedRoom.players.find(p => p.playerId === playerId);
                  if (hostPlayer && !hostPlayer.isConnected) {
                    const nextHost = updatedRoom.players.find(p => p.isConnected && p.playerId !== playerId);
                    if (nextHost) {
                      hostPlayer.isHost = false;
                      nextHost.isHost = true;
                      updatedRoom.hostId = nextHost.playerId;
                      updatedRoom.hostName = nextHost.name;
                      updatedRoom.messages.push({
                        playerId: 'system',
                        playerName: 'System',
                        content: `${nextHost.name} is now the keeper of the mansion...`,
                        type: 'system'
                      });
                      await updatedRoom.save();
                      io.to(roomCode).emit('room-update', formatRoomData(updatedRoom));
                    } else {
                      updatedRoom.status = 'closed';
                      await updatedRoom.save();
                      io.to(roomCode).emit('room-closed', { message: 'The mansion crumbles without its keeper...' });
                    }
                  }
                }, 15000);
              }
            }
          }
        } catch (error) {
          console.error('[Socket] disconnect handling error:', error);
        }

        socketPlayerMap.delete(socket.id);
      }
    });

    // ─── RECONNECT ───
    socket.on('reconnect-player', async (data, callback) => {
      try {
        const { roomCode, playerId } = data;
        const room = await Room.findOne({ roomCode });
        if (!room) return callback?.({ success: false, error: 'Room no longer exists...' });

        const player = room.players.find(p => p.playerId === playerId);
        if (!player) return callback?.({ success: false, error: 'Player not found...' });

        player.isConnected = true;
        player.socketId = socket.id;
        room.messages.push({
          playerId: 'system',
          playerName: 'System',
          content: `${player.name} has returned from the void...`,
          type: 'join'
        });
        await room.save();

        socketPlayerMap.set(socket.id, { playerId, roomCode });
        socket.join(roomCode);

        io.to(roomCode).emit('room-update', formatRoomData(room));
        callback?.({ success: true, room: formatRoomData(room) });
      } catch (error) {
        callback?.({ success: false });
      }
    });
  });
}

async function handlePlayerLeave(io, socket, roomCode, playerId) {
  const room = await Room.findOne({ roomCode });
  if (!room) return;

  const player = room.players.find(p => p.playerId === playerId);
  if (!player) return;

  const playerName = player.name;
  const wasHost = player.isHost;

  room.players = room.players.filter(p => p.playerId !== playerId);
  room.messages.push({
    playerId: 'system',
    playerName: 'System',
    content: `${playerName} has fled the mansion...`,
    type: 'leave'
  });

  socket.leave(roomCode);
  socketPlayerMap.delete(socket.id);

  if (wasHost && room.players.length > 0) {
    const newHost = room.players.find(p => p.isConnected) || room.players[0];
    newHost.isHost = true;
    room.hostId = newHost.playerId;
    room.hostName = newHost.name;
    room.messages.push({
      playerId: 'system',
      playerName: 'System',
      content: `${newHost.name} is now the keeper of the mansion...`,
      type: 'system'
    });
  }

  if (room.players.filter(p => p.isConnected).length === 0) {
    room.status = 'closed';
  }

  await room.save();
  io.to(roomCode).emit('room-update', formatRoomData(room));
  io.to(roomCode).emit('chat-message', {
    playerId: 'system',
    playerName: 'System',
    content: `${playerName} has fled the mansion...`,
    type: 'leave',
    timestamp: new Date()
  });
}

function formatRoomData(room) {
  return {
    roomCode: room.roomCode,
    roomName: room.roomName,
    hostId: room.hostId,
    hostName: room.hostName,
    maxPlayers: room.maxPlayers,
    difficulty: room.difficulty,
    environment: room.environment,
    isPrivate: room.isPrivate,
    isLocked: room.isLocked,
    status: room.status,
    players: room.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      isConnected: p.isConnected,
      avatar: p.avatar,
      joinedAt: p.joinedAt
    })),
    messages: room.messages.slice(-50).map(m => ({
      playerId: m.playerId,
      playerName: m.playerName,
      content: m.content,
      type: m.type,
      timestamp: m.timestamp
    })),
    mysteryData: room.mysteryData,
    createdAt: room.createdAt
  };
}
