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
  // Predefined rich gothic suspects to ensure variety when AI is unreachable
  const PREDEFINED_SUSPECTS = [
    {
      name: "Evelyn Sinclair",
      occupation: "Antiquarian",
      physicalDescription: "A pale woman in a high-collared velvet dress, constantly adjusting wire-rimmed spectacles.",
      publicBackground: "The victim's personal curator, known to have argued over a rare grimoire.",
      privateObjective: "Conceal that you stole a forbidden text from the victim's study.",
      hiddenInformation: "You saw someone running from the conservatory at 11:30 PM.",
      secretRelationship: "Secretly hired by a rival house to retrieve occult artifacts."
    },
    {
      name: "Arthur Pendelton",
      occupation: "Family Solicitor",
      physicalDescription: "A stout man with a nervous twitch, wearing a worn tweed suit smelling of stale tobacco.",
      publicBackground: "Drafted the victim's new secret will just three days ago.",
      privateObjective: "Make sure no one discovers the forgery in the inheritance papers.",
      hiddenInformation: "You overheard the victim arguing about blackmail in the library.",
      secretRelationship: "The victim's secret debtor, facing ruin if exposed."
    },
    {
      name: "Dr. Victor Thorne",
      occupation: "Apothecary",
      physicalDescription: "Tall, thin, with silvering temples and sharp, cold, analytical eyes.",
      publicBackground: "Supplied the victim with experimental sleep draughts.",
      privateObjective: "Find your missing journal before someone reads your toxic experiments.",
      hiddenInformation: "A bottle of nightshade went missing from your doctor's bag earlier.",
      secretRelationship: "The victim's secret supplier of illicit, mind-altering tinctures."
    },
    {
      name: "Lady Beatrice Vance",
      occupation: "Spiritualist",
      physicalDescription: "Draped in black lace and heavy jade amulets, smelling faintly of lavender and incense.",
      publicBackground: "Conducted a private, tense séance with the victim the night before.",
      privateObjective: "Keep the secret that you are a fraud and the victim found out.",
      hiddenInformation: "You felt an icy draft and heard floorboards creak outside the study at midnight.",
      secretRelationship: "Ex-lover of the victim from many decades ago."
    },
    {
      name: "Julian Crane",
      occupation: "Disgraced Artist",
      physicalDescription: "Wild dark hair, paint-stained fingers, and a paint-splattered black frock coat.",
      publicBackground: "Painted the victim's portrait; rumored to be deeply infatuated with the victim's spouse.",
      privateObjective: "Frame another guest to protect your secret lover.",
      hiddenInformation: "You saw a figure sneaking poison vials into a goblet in the dining room.",
      secretRelationship: "Secretly having an affair with the victim's spouse."
    },
    {
      name: "Meredith Gable",
      occupation: "Head Housekeeper",
      physicalDescription: "Stern countenance, hair pinned back tightly, wearing a spotless black uniform.",
      publicBackground: "Worked at the manor for twenty years; knows every secret passage and hidden drawer.",
      privateObjective: "Hide the fact that you stole the victim's expensive family heirloom.",
      hiddenInformation: "The secret passage from the library to the study was left open at 11 PM.",
      secretRelationship: "Half-sibling of the victim, unrecognized in the family lineage."
    },
    {
      name: "Father Thomas",
      occupation: "Parish Priest",
      physicalDescription: "Slightly disheveled cassock, clutches a silver rosary, eyes dark with worry.",
      publicBackground: "Received a final confession from the victim hours before the death.",
      privateObjective: "Ensure the confession secret never leaves the room.",
      hiddenInformation: "The victim confessed that one of the guests was trying to poison him.",
      secretRelationship: "The victim's spiritual advisor and keeper of dark family secrets."
    },
    {
      name: "Clara Harlow",
      occupation: "Orphan Ward",
      physicalDescription: "Nervous disposition, clad in a dark mourning gown, pale skin.",
      publicBackground: "The victim's ward; stood to lose her entire inheritance upon marriage.",
      privateObjective: "Conceal your secret engagement to a rival heir.",
      hiddenInformation: "You heard the victim's voice pleading with someone shortly before midnight.",
      secretRelationship: "The victim's illegitimate child, kept as a ward to avoid scandal."
    }
  ];

  // Dynamically assign names and details based on pre-defined lists
  const selectedSuspects = Array.from({ length: playerCount }).map((_, i) => {
    const template = PREDEFINED_SUSPECTS[i % PREDEFINED_SUSPECTS.length];
    return {
      name: template.name,
      age: 20 + (i * 5),
      occupation: template.occupation,
      physicalDescription: template.physicalDescription,
      publicBackground: template.publicBackground,
      privateObjective: template.privateObjective,
      hiddenInformation: template.hiddenInformation,
      secretRelationship: template.secretRelationship
    };
  });

  return {
    victim: { name: "Lord Alistair Blackwood", backstory: "Wealthy aristocrat with many dark secrets." },
    location: { name: "Blackwood Manor", description: "A dark, looming estate rumoured to be haunted." },
    suspects: selectedSuspects,
    timeline: [
      { time: "22:00", event: "The guests arrived for dinner." },
      { time: "23:00", event: "A sudden power outage plunged the mansion into darkness." },
      { time: "23:30", event: "A muffled scream echoed from the study." },
      { time: "00:00", event: "Lord Blackwood was found lifeless in his chair." }
    ],
    initialClues: [
      { name: "Shattered Wine Goblet", description: "Found spilled near the victim's desk, smelling of bitter almonds." },
      { name: "Muddy Shoe Print", description: "A heavy footprint tracked onto the study rug from the gardens." }
    ],
    rooms: [
      { id: 'hallway', name: 'Hallway', description: 'A dark, echoing entrance hallway.' },
      { id: 'garage', name: 'Garage', description: 'Oil stains and rusty tools.' },
      { id: 'basement', name: 'Basement', description: 'Cold stone and forgotten barrels.' },
      { id: 'library', name: 'Library', description: 'Towering shelves of decaying books.' },
      { id: 'kitchen', name: 'Kitchen', description: 'Smells of rotting meat and iron.' },
      { id: 'study', name: 'Study', description: 'A messy desk covered in frantic writings.' },
      { id: 'dining_room', name: 'Dining Room', description: 'A long table set for a feast that never happened.' },
      { id: 'room_1', name: 'Master Bedroom', description: 'An ornate bed with torn velvet curtains.' },
      { id: 'bathroom', name: 'Bathroom', description: 'A cracked mirror and a rusted tub.' },
      { id: 'conservatory', name: 'Conservatory', description: 'Overgrown dead plants.' },
      { id: 'room_2', name: 'Billiard Room', description: 'A dusty pool table.' },
      { id: 'observatory', name: 'Observatory', description: 'A large brass telescope pointed at the stars.' },
      { id: 'room_3', name: 'Guest Bedroom', description: 'An unsettlingly neat bed.' }
    ].map(room => ({
      ...room,
      clues: getFallbackCluesForRoom(room.id)
    })),
    murderer: selectedSuspects[0].name,
    motive: "Greed and revenge.",
    method: "Cyanide poison in the wine goblet.",
    opportunity: "Had private access to the study during the power outage.",
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
