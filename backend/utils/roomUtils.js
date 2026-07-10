import Room from '../models/Room.js';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueRoomCode() {
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const code = generateCode();
    const existing = await Room.findOne({ roomCode: code, status: { $nin: ['closed', 'finished'] } });
    if (!existing) return code;
    attempts++;
  }
  
  throw new Error('Failed to generate unique room code after maximum attempts');
}

export function sanitizeString(str, maxLen = 20) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '').substring(0, maxLen);
}

export function validateRoomSettings(settings) {
  const errors = [];
  
  if (!settings.hostName || settings.hostName.trim().length === 0) {
    errors.push('Host name is required');
  }
  if (!settings.roomName || settings.roomName.trim().length === 0) {
    errors.push('Room name is required');
  }
  if (![4, 6, 8].includes(settings.maxPlayers)) {
    errors.push('Max players must be 4, 6, or 8');
  }
  if (!['easy', 'medium', 'hard'].includes(settings.difficulty)) {
    errors.push('Invalid difficulty');
  }
  if (!['haunted-manor', 'abandoned-hospital', 'forest-cabin', 'ancient-church', 'random'].includes(settings.environment)) {
    errors.push('Invalid environment');
  }
  
  return errors;
}
