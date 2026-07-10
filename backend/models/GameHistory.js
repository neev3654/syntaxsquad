// In-memory mock of Mongoose GameHistory model
const historyDB = [];

class GameHistory {
  constructor(data) {
    Object.assign(this, data);
    this.createdAt = new Date();
  }

  async save() {
    historyDB.push(this);
    return this;
  }
}

export default GameHistory;
