import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import setupSocketHandlers from './socket/socketHandler.js';
import Room from './models/Room.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://tales-beyond-the-tomb-syntax-squad.vercel.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tales-beyond-the-tomb-syntax-squad.vercel.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'alive', message: 'The mansion awaits...', timestamp: Date.now() });
});

// Get room info (for QR/share validation)
app.get('/api/rooms/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ 
      roomCode: req.params.code.toUpperCase(),
      status: { $nin: ['closed', 'finished'] }
    });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({
      roomCode: room.roomCode,
      roomName: room.roomName,
      hostName: room.hostName,
      playerCount: room.players.filter(p => p.isConnected).length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      environment: room.environment,
      difficulty: room.difficulty,
      isLocked: room.isLocked
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Setup socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`\n⚰️  TALES BEYOND THE TOMB`);
    console.log(`🕯️  Server risen on port ${PORT}`);
    console.log(`🌑 The mansion awaits...\n`);
  });
}

startServer().catch(console.error);
