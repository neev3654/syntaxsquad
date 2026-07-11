# 🕯️ Tales Beyond the Tomb - Multiplayer Horror Game

Welcome to **Tales Beyond the Tomb**, an immersive, real-time multiplayer horror mystery game. Players join haunted lobbies, communicate via live voice chat, explore chilling environments, uncover AI-generated clues, and vote to accuse the suspect hiding among them.

---

## 🔗 Live Links

- **🎮 Play the Game (Frontend):** [tales-beyond-the-tomb-syntax-squad.vercel.app](https://tales-beyond-the-tomb-syntax-squad.vercel.app/)
- **⚙️ API Server (Backend):** [syntaxsquad-jj3u.onrender.com](https://syntaxsquad-jj3u.onrender.com)
- **🐙 GitHub Repository:** [codinggita/syntaxsquad](https://github.com/codinggita/syntaxsquad)

---

## ✨ Features

- **Real-Time Multiplayer:** Powered by Socket.IO for seamless lobby creation, state synchronization, and live voting.
- **Proximity & Global Voice Chat:** Integrated with LiveKit for crystal-clear, low-latency audio communication.
- **Dynamic AI Mysteries:** Powered by Gemini AI, every game generates unique narratives, suspect profiles, and clues.
- **Premium Glassmorphism UI:** A sleek, horror-themed user interface utilizing dark backgrounds, blur effects, and cinematic typography.
- **Cross-Device Responsive:** Playable on desktop and mobile browsers.

---

## 🚀 Technologies Used

### Frontend (Client)
- **React 19** & **Vite** for blazing fast performance.
- **Tailwind CSS 4** & **Framer Motion** for styling and fluid animations.
- **Socket.IO Client** for real-time game events.
- **LiveKit React Components** for voice chat integration.

### Backend (Server)
- **Node.js** & **Express** providing a robust REST API.
- **Socket.IO Server** handling multiplayer state logic.
- **MongoDB** & **Mongoose** for persistent data storage.
- **LiveKit Server SDK** for managing audio rooms.
- **Gemini AI API** for dynamic content generation.

---

## 📁 Project Structure

The project is structured as a monorepo containing both the frontend and backend applications.

```text
syntaxsquad/
├── backend/                  # Node.js Express Server & Socket.IO
│   ├── config/               # Database and LiveKit configurations
│   ├── controllers/          # Route controllers
│   ├── models/               # MongoDB schemas (Room, GameHistory)
│   ├── routes/               # API route definitions
│   ├── services/             # External service integrations (LiveKit)
│   ├── socket/               # Real-time game logic and Socket.IO handlers
│   ├── utils/                # Helper functions (AI Service, Reveal Logic)
│   ├── server.js             # Main backend entry point
│   └── package.json          # Backend dependencies
│
├── frontend/                 # React Vite Application
│   ├── src/                  # Source code
│   │   ├── assets/           # Static assets (images, icons)
│   │   ├── audio/            # Game audio and sound effects
│   │   ├── components/       # Reusable React components
│   │   │   ├── game/         # In-game UI (Exploration, Voting, Reveal)
│   │   │   ├── lobby/        # Pre-game lobby, Player List, Chat
│   │   │   └── menu/         # Main menu (Create/Join Game)
│   │   ├── contexts/         # React Contexts (Game state, Voice state)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API and external service calls
│   │   ├── socket/           # Client-side Socket.IO management
│   │   ├── App.jsx           # Root application component
│   │   └── index.css         # Global styles and Tailwind configuration
│   └── package.json          # Frontend dependencies
│
└── README.md                 # Project documentation
```

---

## 🛠️ Local Setup & Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas)
- LiveKit Cloud account (for voice chat)
- Google Gemini API Key (for AI generation)

### 1. Clone the repository
```bash
git clone https://github.com/codinggita/syntaxsquad.git
cd syntaxsquad
```

### 2. Setup the Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=your_livekit_url
GEMINI_API_KEY=your_gemini_key
CORS_ORIGIN=http://localhost:5173
```
Start the backend server:
```bash
npm run dev
```

### 3. Setup the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```

### 4. Play
Open your browser and navigate to `http://localhost:5173`. Create a room, share the code with friends, and start investigating!

---
*Built by SyntaxSquad.*