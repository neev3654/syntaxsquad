// In-memory mock of Mongoose Room model to avoid MongoDB dependency
const roomsDB = [];

class Room {
  constructor(data) {
    Object.assign(this, data);
    this.players = this.players || [];
    this.messages = this.messages || [];
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  async save() {
    this.updatedAt = new Date();
    const existingIndex = roomsDB.findIndex(r => r.roomCode === this.roomCode);
    if (existingIndex >= 0) {
      roomsDB[existingIndex] = this;
    } else {
      roomsDB.push(this);
    }
    return this;
  }

  static async findOne(query) {
    if (!query) return null;
    
    return roomsDB.find(room => {
      let match = true;
      if (query.roomCode && room.roomCode !== query.roomCode) match = false;
      
      if (query.status && query.status.$nin) {
        if (query.status.$nin.includes(room.status)) match = false;
      } else if (query.status && room.status !== query.status) {
        match = false;
      }
      
      return match;
    }) || null;
  }
}

export default Room;
