import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext.jsx';
import socket from '../../socket/socket.js';
import useGameLoop from '../../hooks/useGameLoop.js';
import { LAYOUT, generateWalls, MAP_WIDTH, MAP_HEIGHT } from './mapLayout.js';
import { startFootsteps, stopFootsteps, playEvidenceSound } from '../../audio/audioEngine.js';

import woodFloor from '../../assets/wood_floor.png';
import stoneFloor from '../../assets/stone_floor.png';
import wallTexture from '../../assets/wall_texture.png';
import playerSprite from '../../assets/player_sprite.png';

import libraryBg from '../../assets/library_bg.png';
import studyBg from '../../assets/study_bg.png';
import kitchenBg from '../../assets/kitchen_bg.png';
import diningBg from '../../assets/dining_bg.png';
import bedroomBg from '../../assets/bedroom_bg.png';
import bathroomBg from '../../assets/bathroom_bg.png';

import hallwayDecor from '../../assets/hallway_decor.png';
import garageDecor from '../../assets/garage_decor.png';
import basementDecor from '../../assets/basement_decor.png';
import conservatoryDecor from '../../assets/conservatory_decor.png';
import observatoryDecor from '../../assets/observatory_decor.png';

import furnBookshelf from '../../assets/furniture_bookshelf.png';
import furnDesk from '../../assets/furniture_desk.png';
import furnStove from '../../assets/furniture_stove.png';
import furnCounter from '../../assets/furniture_counter.png';
import furnDiningTable from '../../assets/furniture_dining_table.png';

// Texture lookup for tiled floors
const floorTextures = {
  'wood_floor.png': woodFloor,
  'stone_floor.png': stoneFloor
};

// Decoration image lookup
const decorationImages = {
  'hallway_decor.png': hallwayDecor,
  'garage_decor.png': garageDecor,
  'basement_decor.png': basementDecor,
  'conservatory_decor.png': conservatoryDecor,
  'observatory_decor.png': observatoryDecor,
  'bedroom_bg.png': bedroomBg,
  'bathroom_bg.png': bathroomBg,
  'dining_bg.png': diningBg,
  'library_bg.png': libraryBg,
  'study_bg.png': studyBg,
  'kitchen_bg.png': kitchenBg,
};

const furnitureImages = {
  'furniture_bookshelf.png': furnBookshelf,
  'furniture_desk.png': furnDesk,
  'furniture_stove.png': furnStove,
  'furniture_counter.png': furnCounter,
  'furniture_dining_table.png': furnDiningTable
};

const PLAYER_SIZE = 40;
const CLUE_SIZE = 30;
const INTERACTION_RADIUS = 80;

// Function to get cartoon avatar URL from DiceBear using player's avatar index
function getAvatarUrl(avatarIndex, playerId) {
  const styles = [
    'adventurer',
    'avataaars',
    'fun-emoji',
    'lorelei',
    'notionists',
    'personas',
    'pixel-art',
    'thumbs'
  ];
  const style = styles[avatarIndex % styles.length];
  // Use playerId as seed for consistent avatar
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(playerId)}&backgroundColor=transparent`;
}

export default function RoomExploration2D() {
  const { state, actions } = useGame();
  const mystery = state.room?.mysteryData;
  const rooms = mystery?.rooms || [];
  
  const [otherPlayers, setOtherPlayers] = useState({});
  const [inspectedClue, setInspectedClue] = useState(null);
  const [discoveredClues, setDiscoveredClues] = useState([]);
  const [showSuspects, setShowSuspects] = useState(false);
  const [nearbyPlayer, setNearbyPlayer] = useState(null); // { playerId, name }
  const [privateChatInput, setPrivateChatInput] = useState('');
  const [cluePositions, setCluePositions] = useState({}); // { clueId: { x, y } }
  
  const mapRef = useRef(null);
  const wasMovingRef = useRef(false);

  const walls = useMemo(() => generateWalls(), []);
  
  // All solid objects the player can collide with
  const colliders = useMemo(() => [...walls, ...LAYOUT.furniture], [walls]);

  // We use our hardcoded map geometry, but we pull the clue data from the AI generated rooms
  // by matching room IDs.
  const mappedRooms = useMemo(() => {
    return Object.values(LAYOUT.rooms).map(layoutRoom => {
      const aiRoom = rooms.find(r => r.id === layoutRoom.id);
      return {
        ...layoutRoom,
        clues: aiRoom?.clues || [],
        name: aiRoom?.name || layoutRoom.id
      };
    });
  }, [rooms]);

  // Generate random clue positions when mappedRooms changes
  useEffect(() => {
    const newPositions = {};
    mappedRooms.forEach(room => {
      if (room.clues) {
        room.clues.forEach((clue) => {
          const clueId = `${room.id}-${clue.name}`;
          // Only generate position if it doesn't already exist
          if (!cluePositions[clueId]) {
            // Random position within room, leaving some padding
            const offsetX = 50 + Math.random() * (room.width - 100);
            const offsetY = 50 + Math.random() * (room.height - 100);
            newPositions[clueId] = {
              x: room.x + offsetX,
              y: room.y + offsetY
            };
          }
        });
      }
    });
    if (Object.keys(newPositions).length > 0) {
      setCluePositions(prev => ({ ...prev, ...newPositions }));
    }
  }, [mappedRooms]);

  // Distribute clues within their rooms
  const cluesData = useMemo(() => {
    const allClues = [];
    mappedRooms.forEach(room => {
      if (room.clues) {
        room.clues.forEach((clue) => {
          const clueId = `${room.id}-${clue.name}`;
          const pos = cluePositions[clueId];
          if (pos) {
            allClues.push({
              ...clue,
              id: clueId,
              roomId: room.id,
              x: pos.x,
              y: pos.y
            });
          }
        });
      }
    });
    return allClues;
  }, [mappedRooms, cluePositions]);

  // Handle local player movement
  const handleMove = (x, y, direction, isMoving) => {
    if (socket) {
      socket.emit('player-move', {
        roomCode: state.roomCode,
        playerId: state.playerId,
        x,
        y,
        direction,
        isMoving
      });
    }
  };

  // Start in the hallway
  const hallway = mappedRooms.find(r => r.id === 'hallway');
  const startX = hallway ? hallway.x + 200 : MAP_WIDTH / 2;
  const startY = hallway ? hallway.y + 200 : MAP_HEIGHT / 2;

  const { position: localPos, direction: localDir, isMoving: localIsMoving } = useGameLoop(
    startX, 
    startY, 
    { width: MAP_WIDTH - PLAYER_SIZE, height: MAP_HEIGHT - PLAYER_SIZE },
    colliders,
    handleMove
  );

  // Footstep sounds — start/stop based on movement state
  useEffect(() => {
    if (localIsMoving && !wasMovingRef.current) {
      startFootsteps();
    } else if (!localIsMoving && wasMovingRef.current) {
      stopFootsteps();
    }
    wasMovingRef.current = localIsMoving;

    return () => {
      stopFootsteps();
    };
  }, [localIsMoving]);

  // Listen for other players moving and sync initial positions
  useEffect(() => {
    if (!socket) return;

    // Broadcast my initial spawn location
    socket.emit('player-move', {
      roomCode: state.roomCode,
      playerId: state.playerId,
      x: startX,
      y: startY,
      direction: 'down',
      isMoving: false
    });

    // Ask server for everyone else's last known location
    socket.emit('request-sync-positions', { roomCode: state.roomCode }, (response) => {
      if (response && response.positions) {
        const others = { ...response.positions };
        delete others[state.playerId]; // filter out myself
        setOtherPlayers(others);
      }
    });

    const onPlayerMoved = (data) => {
      if (data.playerId !== state.playerId) {
        setOtherPlayers(prev => ({
          ...prev,
          [data.playerId]: { x: data.x, y: data.y, direction: data.direction, isMoving: data.isMoving }
        }));
      }
    };

    socket.on('player-moved', onPlayerMoved);
    return () => socket.off('player-moved', onPlayerMoved);
  }, [state.playerId, state.roomCode, startX, startY]);

  // Interaction logic
  const [nearbyClue, setNearbyClue] = useState(null);

  useEffect(() => {
    let closest = null;
    let minDistance = Infinity;

    cluesData.forEach(clue => {
      // Calculate center to center distance
      const px = localPos.x + PLAYER_SIZE / 2;
      const py = localPos.y + PLAYER_SIZE / 2;
      const cx = clue.x + CLUE_SIZE / 2;
      const cy = clue.y + CLUE_SIZE / 2;
      
      const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closest = clue;
      }
    });

    if (minDistance <= INTERACTION_RADIUS) {
      setNearbyClue(closest);
    } else {
      setNearbyClue(null);
    }
  }, [localPos, cluesData]);

  // Detect nearby players for private chat
  useEffect(() => {
    let closestPlayer = null;
    let minDistance = Infinity;
    const PROXIMITY_RADIUS = 100;

    Object.entries(otherPlayers).forEach(([playerId, player]) => {
      if (playerId === state.playerId) return;

      const px = localPos.x + PLAYER_SIZE / 2;
      const py = localPos.y + PLAYER_SIZE / 2;
      const otherPx = player.x + PLAYER_SIZE / 2;
      const otherPy = player.y + PLAYER_SIZE / 2;
      
      const dist = Math.sqrt(Math.pow(px - otherPx, 2) + Math.pow(py - otherPy, 2));
      if (dist < minDistance && dist <= PROXIMITY_RADIUS) {
        minDistance = dist;
        const suspectName = mystery?.suspects?.find(s => s.playerId === playerId)?.name || 'Unknown';
        closestPlayer = { playerId, name: suspectName };
      }
    });

    setNearbyPlayer(closestPlayer);
  }, [localPos, otherPlayers, state.playerId, mystery?.suspects]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'e' && nearbyClue && !inspectedClue) {
        playEvidenceSound();
        setInspectedClue(nearbyClue);
        if (!discoveredClues.find(c => c.name === nearbyClue.name)) {
          setDiscoveredClues(prev => [...prev, nearbyClue]);
        }
      } else if (e.key.toLowerCase() === 't' && nearbyPlayer && !state.activePrivateChat && !state.privateChatRequest) {
        console.log('[RoomExploration2D] Pressing [T], requesting private chat with:', nearbyPlayer);
        actions.requestPrivateChat(nearbyPlayer.playerId);
      } else if (e.key === 'Escape') {
        if (inspectedClue) {
          setInspectedClue(null);
        } else if (state.activePrivateChat) {
          actions.endPrivateChat();
        } else if (state.privateChatRequest) {
          actions.rejectPrivateChat();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nearbyClue, inspectedClue, discoveredClues, nearbyPlayer, state.activePrivateChat, state.privateChatRequest, actions]);

  // Camera Follow
  const cameraStyle = {
    transform: `translate(calc(50vw - ${localPos.x + PLAYER_SIZE/2}px), calc(50vh - ${localPos.y + PLAYER_SIZE/2}px))`,
    transition: 'transform 0.1s linear'
  };

  // Get avatar index for a player
  const getPlayerAvatarIndex = (playerId) => {
    const player = state.room?.players?.find(p => p.playerId === playerId);
    return player?.avatar ?? 0;
  };

  // Determine which room the player is currently inside
  const currentRoom = useMemo(() => {
    const px = localPos.x + PLAYER_SIZE / 2;
    const py = localPos.y + PLAYER_SIZE / 2;
    // We check if the player's center is within a room's bounding box
    return mappedRooms.find(r => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height);
  }, [localPos.x, localPos.y, mappedRooms]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden font-mono text-white select-none">
      
      {/* 2D Canvas Container (Camera) */}
      <div className="absolute top-0 left-0" style={{ width: MAP_WIDTH, height: MAP_HEIGHT, ...cameraStyle, backgroundColor: '#0a0a0a' }}>
        
        {/* Rooms Layer (Tiled Floors) */}
        {mappedRooms.map(room => {
          const textureSrc = floorTextures[room.texture] || stoneFloor;
          return (
            <div
              key={room.id}
              className="absolute pointer-events-none"
              style={{
                left: room.x,
                top: room.y,
                width: room.width,
                height: room.height,
                backgroundImage: `url(${textureSrc})`,
                backgroundSize: '200px 200px',
                backgroundRepeat: 'repeat',
                backgroundPosition: 'center',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)'
              }}
            />
          );
        })}

        {/* Decoration Layer (non-collidable room identity images) */}
        {(LAYOUT.decorations || []).map(decor => {
          const imgSrc = decorationImages[decor.image];
          if (!imgSrc) return null;
          return (
            <div
              key={decor.id}
              className="absolute pointer-events-none"
              style={{
                left: decor.x,
                top: decor.y,
                width: decor.width,
                height: decor.height,
                backgroundImage: `url(${imgSrc})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: 0.7,
                zIndex: 2
              }}
            />
          );
        })}

        {/* Walls Layer */}
        {walls.map((wall, i) => (
          <div
            key={`wall-${i}`}
            className="absolute pointer-events-none shadow-[0_0_15px_rgba(0,0,0,1)]"
            style={{
              left: wall.x,
              top: wall.y,
              width: wall.width,
              height: wall.height,
              backgroundImage: `url(${wallTexture})`,
              backgroundSize: '100px',
              zIndex: 5
            }}
          />
        ))}

        {/* Furniture Layer */}
        {LAYOUT.furniture.map(furn => (
          <div
            key={furn.id}
            className="absolute pointer-events-none shadow-[5px_5px_15px_rgba(0,0,0,0.8)]"
            style={{
              left: furn.x,
              top: furn.y,
              width: furn.width,
              height: furn.height,
              backgroundImage: `url(${furnitureImages[furn.image]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
          />
        ))}

        {/* Clues Layer */}
        {cluesData.map(clue => {
          const isNearby = nearbyClue?.id === clue.id;
          const isDiscovered = discoveredClues.some(c => c.name === clue.name);
          
          return (
            <div
              key={clue.id}
              className={`absolute flex items-center justify-center transition-all duration-300 ${isNearby ? 'z-30' : 'z-10'}`}
              style={{
                left: clue.x,
                top: clue.y,
                width: CLUE_SIZE,
                height: CLUE_SIZE,
                transform: isNearby ? 'scale(1.3)' : 'scale(1)',
              }}
            >
              {/* Glowing aura when nearby */}
              {isNearby && (
                <div className="absolute inset-0 bg-[#daa520] opacity-30 rounded-full blur-md animate-pulse"></div>
              )}
              {/* Document Icon styling */}
              <div 
                className="relative bg-[#f4e4bc] border border-[#8b6914] shadow-[2px_2px_5px_rgba(0,0,0,0.8)] flex items-center justify-center"
                style={{
                  width: '70%', 
                  height: '90%', 
                  borderRadius: '2px',
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 4px, rgba(139,105,20,0.2) 4px, rgba(139,105,20,0.2) 5px)',
                  transform: 'rotate(-5deg)'
                }}
              >
                {clue.isSupernatural && (
                   <div className="absolute inset-0 bg-purple-500 opacity-20 animate-pulse mix-blend-overlay"></div>
                )}
                <span className="text-[10px] opacity-70">📝</span>
              </div>
              
              {isDiscovered && (
                <div className="absolute -top-6 whitespace-nowrap text-[10px] text-[rgba(218,165,32,0.9)] bg-black/70 px-1 rounded">
                  {clue.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Other Players Layer */}
      {Object.entries(otherPlayers).map(([id, p]) => {
        const avatarIndex = getPlayerAvatarIndex(id);
        const avatarUrl = getAvatarUrl(avatarIndex, id);
        return (
          <div
            key={id}
            className="absolute transition-all duration-100 ease-linear flex flex-col items-center justify-center"
            style={{
              left: p.x,
              top: p.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              zIndex: 10
            }}
          >
            <img
              src={avatarUrl}
              alt="Player"
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.6))' }}
            />
            <div className="absolute -top-8 bg-black/60 px-2 py-1 rounded text-xs whitespace-nowrap text-gray-300">
              {mystery?.suspects?.find(s => s.playerId === id)?.name || 'Unknown Guest'}
            </div>
          </div>
        );
      })}

      {/* Local Player Layer */}
      {(() => {
        const myAvatarIndex = getPlayerAvatarIndex(state.playerId);
        const myAvatarUrl = getAvatarUrl(myAvatarIndex, state.playerId);
        return (
          <div
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: localPos.x,
              top: localPos.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              zIndex: 20
            }}
          >
            <img
              src={myAvatarUrl}
              alt="Me"
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,100,255,0.6))' }}
            />
            <div className="absolute -top-8 bg-black/60 px-2 py-1 rounded text-xs whitespace-nowrap text-white border border-blue-900/50">
              {mystery?.suspects?.find(s => s.playerId === state.playerId)?.name || 'You'} (You)
            </div>
          </div>
        );
      })()}
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none flex justify-between items-start z-50">
        
        {/* Evidence Panel - Improved Visibility */}
        <div 
          className="bg-[#f4e4bc] p-5 border-4 border-[#8b6914] shadow-[5px_5px_15px_rgba(0,0,0,0.8)] pointer-events-auto min-w-[250px] rounded-sm relative"
          style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 4px, rgba(139,105,20,0.1) 4px, rgba(139,105,20,0.1) 5px)' }}
        >
          {/* Decorative pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-800 rounded-full border border-black shadow-md"></div>
          
          <h3 className="text-red-900 font-bold tracking-widest text-base mb-3 uppercase text-center border-b-2 border-red-900/30 pb-2">Evidence Collected</h3>
          {discoveredClues.length === 0 ? (
            <p className="text-sm text-gray-700 italic text-center py-2">No evidence collected yet.</p>
          ) : (
            <ul className="text-sm text-gray-900 font-medium space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {discoveredClues.map((c, i) => (
                <li 
                  key={i} 
                  className="flex items-center gap-3 cursor-pointer hover:bg-black/10 p-2 rounded transition-colors border border-transparent hover:border-[#8b6914]/30"
                  onClick={() => setInspectedClue(c)}
                  title="Click to read again"
                >
                  <span className="text-[#8b6914] text-lg drop-shadow-sm">📄</span>
                  <span className="truncate">{c.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className="bg-black/80 px-4 py-2 text-sm text-white font-bold rounded-lg border border-gray-600 shadow-lg">
            WASD to move
          </div>
          
          {/* View Profiles Button - Improved Visibility */}
          <button 
            onClick={() => setShowSuspects(true)}
            className="bg-gradient-to-b from-[#daa520] to-[#b8860b] border-2 border-white text-black hover:from-[#ffeb99] hover:to-[#daa520] transition-all px-6 py-3 text-sm rounded-lg shadow-[0_0_20px_rgba(218,165,32,0.6)] uppercase tracking-widest font-black flex items-center gap-2 transform hover:scale-105 animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            <span className="text-xl">👁️</span> View Suspect Profiles
          </button>
        </div>
      </div>

      {/* Interaction Prompt */}
      <AnimatePresence>
        {nearbyClue && !inspectedClue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-black/90 border border-[#daa520] px-6 py-3 rounded text-[#daa520] font-bold tracking-widest"
          >
            PRESS [E] TO INSPECT {nearbyClue.name.toUpperCase()}
          </motion.div>
        )}
        {nearbyPlayer && !state.activePrivateChat && !state.privateChatRequest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/90 border border-purple-500 px-6 py-3 rounded text-purple-400 font-bold tracking-widest"
          >
            PRESS [T] TO TALK TO {nearbyPlayer.name.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Chat Request Modal */}
      <AnimatePresence>
        {state.privateChatRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-[rgba(15,10,8,0.95)] border border-purple-500 p-8 shadow-[0_0_50px_rgba(128,0,128,0.2)]"
              style={{ backgroundImage: `url(${wallTexture})`, backgroundBlendMode: 'overlay', backgroundSize: '200px' }}
            >
              <h2 className="text-2xl text-purple-300 mb-6 font-serif">Private Chat Request</h2>
              <p className="text-[rgba(200,180,150,0.8)] mb-8 leading-relaxed">
                {state.privateChatRequest.fromPlayerName} wants to talk to you privately.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => actions.acceptPrivateChat(state.privateChatRequest.fromPlayerId, state.privateChatRequest.fromPlayerName)}
                  className="flex-1 py-3 bg-purple-900/50 border border-purple-500 text-purple-300 hover:bg-purple-900/70 transition-all uppercase tracking-widest text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={actions.rejectPrivateChat}
                  className="flex-1 py-3 bg-[rgba(139,0,0,0.2)] border border-[rgba(139,0,0,0.4)] text-[rgba(200,160,120,0.8)] hover:bg-[rgba(139,0,0,0.4)] transition-all uppercase tracking-widest text-sm"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Chat Modal */}
      <AnimatePresence>
        {state.activePrivateChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg h-full max-h-[80vh] bg-[rgba(15,10,8,0.95)] border border-purple-500 p-6 shadow-[0_0_50px_rgba(128,0,128,0.2)] flex flex-col"
              style={{ backgroundImage: `url(${wallTexture})`, backgroundBlendMode: 'overlay', backgroundSize: '200px' }}
            >
              <div className="flex justify-between items-center mb-4 border-b border-purple-500/30 pb-3">
                <h2 className="text-xl text-purple-300 font-serif">Private Chat with {state.activePrivateChat.otherPlayerName}</h2>
                <button
                  onClick={actions.endPrivateChat}
                  className="px-3 py-1 bg-[rgba(139,0,0,0.2)] border border-[rgba(139,0,0,0.4)] text-[rgba(200,160,120,0.8)] hover:bg-[rgba(139,0,0,0.4)] transition-all uppercase tracking-widest text-xs"
                >
                  Close
                </button>
              </div>
              
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 custom-scrollbar">
                {state.privateMessages
                  .filter(msg => 
                    (msg.fromPlayerId === state.playerId && msg.toPlayerId === state.activePrivateChat.otherPlayerId) ||
                    (msg.fromPlayerId === state.activePrivateChat.otherPlayerId && msg.toPlayerId === state.playerId)
                  )
                  .map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.fromPlayerId === state.playerId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-lg ${
                          msg.fromPlayerId === state.playerId
                            ? 'bg-purple-900/60 border border-purple-500/50'
                            : 'bg-black/60 border border-gray-700'
                        }`}
                      >
                        <p className="text-xs text-gray-400 mb-1">{msg.fromPlayerName}</p>
                        <p className="text-[rgba(200,180,150,0.9)]">{msg.content}</p>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={privateChatInput}
                  onChange={(e) => setPrivateChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && privateChatInput.trim()) {
                      actions.sendPrivateMessage(privateChatInput);
                      setPrivateChatInput('');
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/60 border border-purple-500/30 px-4 py-2 text-[rgba(200,180,150,0.9)] focus:outline-none focus:border-purple-500 transition-all"
                />
                <button
                  onClick={() => {
                    if (privateChatInput.trim()) {
                      actions.sendPrivateMessage(privateChatInput);
                      setPrivateChatInput('');
                    }
                  }}
                  className="px-4 py-2 bg-purple-900/60 border border-purple-500 text-purple-300 hover:bg-purple-900/80 transition-all"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inspected Clue Modal */}
      <AnimatePresence>
        {inspectedClue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-[rgba(15,10,8,0.95)] border border-[rgba(139,0,0,0.5)] p-8 shadow-[0_0_50px_rgba(139,0,0,0.2)]"
              style={{ backgroundImage: `url(${wallTexture})`, backgroundBlendMode: 'overlay', backgroundSize: '200px' }}
            >
              <h2 className="text-2xl text-[#d4c5a9] mb-4 font-serif">{inspectedClue.name}</h2>
              <p className="text-[rgba(200,180,150,0.8)] mb-8 leading-relaxed">
                {inspectedClue.description}
              </p>
              {inspectedClue.isSupernatural && (
                <p className="text-purple-400/80 text-sm mb-6 italic">
                  An eerie chill accompanies this discovery...
                </p>
              )}
              <button
                onClick={() => setInspectedClue(null)}
                className="w-full py-3 bg-[rgba(139,0,0,0.2)] border border-[rgba(139,0,0,0.4)] text-[rgba(200,160,120,0.8)] hover:bg-[rgba(139,0,0,0.4)] hover:text-white transition-all uppercase tracking-widest text-sm"
              >
                Close (Press ESC)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suspect Profiles Modal */}
      <AnimatePresence>
        {showSuspects && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-8 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-4xl h-full max-h-[80vh] bg-[rgba(15,10,8,0.95)] border border-[rgba(139,0,0,0.5)] p-8 shadow-[0_0_50px_rgba(139,0,0,0.2)] flex flex-col"
              style={{ backgroundImage: `url(${wallTexture})`, backgroundBlendMode: 'overlay', backgroundSize: '200px' }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl text-[#d4c5a9] font-serif uppercase tracking-widest">Suspect Profiles</h2>
                <button
                  onClick={() => setShowSuspects(false)}
                  className="px-4 py-2 bg-[rgba(139,0,0,0.2)] border border-[rgba(139,0,0,0.4)] text-[rgba(200,160,120,0.8)] hover:bg-[rgba(139,0,0,0.4)] hover:text-white transition-all uppercase tracking-widest text-sm"
                >
                  Close
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-4 space-y-6">
                {(mystery?.suspects || []).map((suspect, idx) => (
                  <div key={idx} className="bg-black/40 border border-[#8b6914]/30 p-4 rounded flex flex-col gap-2">
                    <div className="flex items-end justify-between border-b border-[#8b6914]/20 pb-2">
                      <h3 className="text-xl text-[#daa520] font-bold">{suspect.name} {suspect.playerId === state.playerId ? '(You)' : ''}</h3>
                      <span className="text-sm text-gray-400">{suspect.age} yrs • {suspect.occupation}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <span className="text-[rgba(218,165,32,0.6)] uppercase tracking-wider text-xs mr-2">Appearance:</span>
                      {suspect.physicalDescription}
                    </div>
                    <div className="text-sm text-gray-300">
                      <span className="text-[rgba(218,165,32,0.6)] uppercase tracking-wider text-xs mr-2">Public Info:</span>
                      {suspect.publicBackground}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Room Name Overlay */}
      <AnimatePresence mode="wait">
        {currentRoom && (
          <motion.div
            key={currentRoom.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-40"
          >
            <div className="bg-black/90 px-8 py-3 border-y border-[rgba(139,0,0,0.6)] shadow-[0_0_30px_rgba(139,0,0,0.4)] backdrop-blur-sm">
              <span 
                className="text-2xl tracking-[0.3em] uppercase text-[#d4c5a9]"
                style={{ fontFamily: 'var(--font-family-old), IM Fell English, serif' }}
              >
                {currentRoom.name}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
