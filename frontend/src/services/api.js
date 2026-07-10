const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://syntaxsquad-jj3u.onrender.com' : 'http://localhost:3001');

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Mystery Generation
  async generateMystery(roomCode) {
    return this.request(`/api/room/${roomCode}/generate-mystery`, {
      method: 'POST',
    });
  }

  async fetchMystery(roomCode) {
    return this.request(`/api/room/${roomCode}/mystery`);
  }

  // Character Assignment
  async fetchMyCharacter(roomCode) {
    return this.request(`/api/room/${roomCode}/my-character`);
  }

  // AI Game Master
  async askGM(roomCode, question) {
    return this.request(`/api/room/${roomCode}/gm-ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Room Data
  async fetchRoomData(roomCode, roomId) {
    return this.request(`/api/room/${roomCode}/room/${roomId}`);
  }

  // Clue Discovery
  async discoverClue(roomCode, clueId) {
    return this.request(`/api/room/${roomCode}/clue/${clueId}/discover`, {
      method: 'POST',
    });
  }

  // Game State
  async fetchGameState(roomCode) {
    return this.request(`/api/room/${roomCode}/state`);
  }
}

const api = new ApiService();
export default api;
