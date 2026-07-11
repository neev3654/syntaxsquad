import { DEFAULT_ROOMS } from '../config/rooms.js';

const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_ENDPOINT = `${ollamaUrl.replace(/\/$/, '')}/api/generate`;
const OLLAMA_MODEL = 'llama3.2';

/**
 * Shared helper – sends a prompt to Ollama and returns parsed JSON.
 * Includes performance-tuning options so every call benefits.
 */
async function queryOllama(prompt, maxTokens = 2048) {
  const response = await fetch(OLLAMA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.7,       // slightly lower → faster convergence
        num_predict: maxTokens,  // cap output tokens
      },
      keep_alive: '10m'          // keep model loaded in VRAM between calls
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let cleanResponse = data.response.trim();
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return JSON.parse(cleanResponse);
}

// ── Prompt 1: Core mystery (suspects, victim, murderer, timeline) ──────────
function buildCorePrompt(playerCount) {
  return `Generate a murder mystery game in JSON. EXACTLY ${playerCount} suspects.
Pick one suspect as the murderer. Include a supernatural red herring but the real solution must be logical.

Return ONLY this JSON:
{
  "victim":{"name":"string","backstory":"string"},
  "location":{"name":"string","description":"string with supernatural rumors"},
  "suspects":[{"name":"string","age":0,"occupation":"string","physicalDescription":"string","publicBackground":"string","privateObjective":"string","hiddenInformation":"string","secretRelationship":"string"}],
  "timeline":[{"time":"string","event":"string"}],
  "initialClues":[{"name":"string","description":"string"}],
  "murderer":"string (MUST match a suspect name)",
  "motive":"string",
  "method":"string",
  "opportunity":"string",
  "hiddenEvents":[{"trigger":"string","eventDescription":"string"}]
}`;
}

// ── Prompt 2: Room descriptions + clues ────────────────────────────────────
function buildRoomsPrompt() {
  const roomIds = DEFAULT_ROOMS.map(r => r.id);
  return `Generate horror-themed room descriptions and clues for a haunted manor murder mystery.
Rooms: ${roomIds.join(', ')}. For each room generate 3-5 investigative clues (mix supernatural red herrings and logical evidence).

Return ONLY this JSON:
{"rooms":[{"id":"string (one of: ${roomIds.join(', ')})","name":"string","description":"string","clues":[{"name":"string","description":"string","isSupernatural":false}]}]}`;
}

/**
 * Main entry point – runs BOTH prompts in parallel via Promise.all,
 * then merges results. Roughly 2× faster than sequential generation.
 */
export async function generateMysteryData(players) {
  const playerCount = players.length;

  try {
    // Fire both requests at the same time
    const [core, roomsData] = await Promise.all([
      queryOllama(buildCorePrompt(playerCount), 2048),
      queryOllama(buildRoomsPrompt(), 2048)
    ]);

    // Merge: attach room data from the second call into the core mystery
    core.rooms = mergeRooms(roomsData?.rooms);

    return core;
  } catch (error) {
    console.error('Error generating mystery from Llama 3.2:', error);
    return getFallbackMystery(playerCount);
  }
}

function mergeRooms(aiRooms) {
  const mergedRooms = [];

  for (const defaultRoom of DEFAULT_ROOMS) {
    const aiRoom = Array.isArray(aiRooms) ? aiRooms.find(r => r && r.id === defaultRoom.id) : null;
    
    mergedRooms.push({
      id: defaultRoom.id,
      name: aiRoom?.name || defaultRoom.name,
      description: aiRoom?.description || defaultRoom.description,
      position: defaultRoom.position,
      connections: defaultRoom.connections,
      clues: Array.isArray(aiRoom?.clues) ? aiRoom.clues : []
    });
  }

  return mergedRooms;
}

function getFallbackMystery(playerCount) {
  // Simple fallback in case Ollama is unreachable
  return {
    victim: { name: "Lord Alistair Blackwood", backstory: "Wealthy aristocrat with many enemies." },
    location: { name: "Blackwood Manor", description: "A dark, looming estate rumoured to be haunted." },
    suspects: Array.from({ length: playerCount }).map((_, i) => ({
      name: `Guest ${i + 1}`,
      age: 30 + i,
      occupation: "Socialite",
      physicalDescription: "Suspiciously well-dressed.",
      publicBackground: "An old friend of the victim.",
      privateObjective: "Hide your massive debts.",
      hiddenInformation: "You heard a scream at midnight.",
      secretRelationship: "You were blackmailing the victim."
    })),
    timeline: [{ time: "23:00", event: "The lights went out." }],
    initialClues: [{ name: "Shattered Glass", description: "Found near the body." }],
    rooms: DEFAULT_ROOMS.map(room => ({
      ...room,
      clues: getFallbackCluesForRoom(room.id)
    })),
    murderer: "Guest 1",
    motive: "Money.",
    method: "Poison.",
    opportunity: "Was alone with the victim's drink.",
    hiddenEvents: [{ trigger: "Investigate study", eventDescription: "A painting falls off the wall." }]
  };
}

function getFallbackCluesForRoom(roomId) {
  const cluesByRoom = {
    hallway: [
      { name: "Flickering Chandelier", description: "The chain appears rusted through, almost as if deliberately cut.", isSupernatural: false },
      { name: "Muddy Footprints", description: "Someone walked through here recently, tracking in soil.", isSupernatural: false },
      { name: "Cold Draft", description: "An unnatural breeze chills you to the bone.", isSupernatural: true }
    ],
    library: [
      { name: "Tattered Diary Entry", description: "Spooky ramblings mentioning shadows that move on their own.", isSupernatural: true },
      { name: "Missing Book", description: "A gap in the shelf where a book on poisons used to be.", isSupernatural: false },
      { name: "Burnt Letter", description: "Only the words 'meet me tonight' are legible.", isSupernatural: false }
    ],
    study: [
      { name: "Unsent Blackmail Letter", description: "A threatening note written by Guest 1 targeting the victim's debts.", isSupernatural: false },
      { name: "Hidden Safe", description: "The safe is wide open and empty.", isSupernatural: false },
      { name: "Bleeding Ink", description: "The ink well seems to be filled with fresh blood.", isSupernatural: true }
    ],
    kitchen: [
      { name: "Empty Vials of Cyanide", description: "Hidden behind the rotting wooden drawers.", isSupernatural: false },
      { name: "Half-Eaten Meal", description: "Someone left in a rush.", isSupernatural: false },
      { name: "Rattling Knives", description: "The knives in the block seem to vibrate on their own.", isSupernatural: true }
    ],
    garden: [
      { name: "Cracked Gravestone", description: "The glowing soil surrounding it hums with eerie, otherworldly whispers.", isSupernatural: true },
      { name: "Footprints in Dirt", description: "Leading towards the window.", isSupernatural: false },
      { name: "Poisonous Plant", description: "A rare, toxic flower has been recently harvested.", isSupernatural: false }
    ],
    dining_room: [
      { name: "Tipped Wine Glass", description: "A white residue is visible on the rim, smelling faintly of almonds.", isSupernatural: false },
      { name: "Torn Place Card", description: "Guest 2's name was crossed out violently.", isSupernatural: false },
      { name: "Cold Breath", description: "You see your breath, though the room is warm.", isSupernatural: true }
    ]
  };

  return cluesByRoom[roomId] || [];
}
