/**
 * Fetches a LiveKit access token from the backend.
 * @param {string} roomCode - The room code
 * @param {string} playerId - The player ID
 * @param {string} playerName - The player name
 * @returns {Promise<{token: string, url: string}>}
 */
export async function fetchVoiceToken(roomCode, playerId, playerName) {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? 'https://syntaxsquad-jj3u.onrender.com' : 'http://localhost:3001');

  try {
    const response = await fetch(`${BACKEND_URL}/api/voice/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomCode, playerId, playerName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[VoiceApi] Failed to fetch token:', error);
    throw error;
  }
}
