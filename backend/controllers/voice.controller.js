import Room from '../models/Room.js';
import { generateVoiceToken } from '../services/livekit.service.js';

/**
 * POST /api/voice/token
 * Generate a LiveKit token for a validated player in a valid room.
 */
export async function getVoiceToken(req, res) {
  try {
    const { roomCode, playerId, playerName } = req.body;

    if (!roomCode || !playerId || !playerName) {
      return res.status(400).json({ error: 'Missing required fields: roomCode, playerId, playerName' });
    }

    // Validate the room exists and is active
    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase(),
      status: { $nin: ['closed', 'finished'] },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or already closed.' });
    }

    // Validate the player belongs to this room
    const player = room.players.find(p => p.playerId === playerId);
    if (!player) {
      return res.status(403).json({ error: 'Player does not belong to this room.' });
    }

    // Generate the token
    const { token, url } = await generateVoiceToken(roomCode.toUpperCase(), playerId, playerName);

    return res.json({ token, room: roomCode.toUpperCase(), url });
  } catch (error) {
    console.error('[Voice] Token generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate voice token.' });
  }
}
