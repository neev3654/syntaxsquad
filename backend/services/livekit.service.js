import { AccessToken } from 'livekit-server-sdk';
import livekitConfig from '../config/livekit.js';

/**
 * Generate a LiveKit access token for a player to join a specific room.
 * @param {string} roomCode - The game room code (becomes the LiveKit room name).
 * @param {string} playerId - Unique player identifier (becomes the LiveKit participant identity).
 * @param {string} playerName - Display name for the participant.
 * @returns {Promise<{token: string, url: string}>}
 */
export async function generateVoiceToken(roomCode, playerId, playerName) {
  const { apiKey, apiSecret, wsUrl } = livekitConfig;

  if (!apiKey || !apiSecret || !wsUrl) {
    throw new Error('LiveKit credentials are not configured on the server.');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: playerId,
    name: playerName,
    ttl: '6h',
  });

  at.addGrant({
    roomJoin: true,
    room: roomCode,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return { token, url: wsUrl };
}
