import { DEFAULT_ROOMS } from '../config/rooms.js';

export async function generateMysteryData(players) {
  const playerCount = players.length;
  
  const prompt = `You are a master mystery writer generating a structured murder mystery game.
Generate a complete mystery in JSON format.

REQUIREMENTS:
- There must be EXACTLY ${playerCount} suspects (these correspond to the players).
- The murderer must be chosen randomly among the suspects (it must make narrative sense).
- HORROR TWIST: Weave in a supernatural red herring (e.g., rumors of a ghost, cursed manor). Clues may initially point toward paranormal activity, but the true solution MUST be logical (human-committed). The horror comes from atmosphere and misdirection.
- ROOMS & CLUES: Populate specific, atmospheric horror-themed descriptions and clues for the mansion's rooms.

OUTPUT FORMAT MUST BE STRICT JSON matching this schema:
{
  "victim": {
    "name": "string",
    "backstory": "string"
  },
  "location": {
    "name": "string",
    "description": "string (include supernatural rumors)"
  },
  "suspects": [
    {
      "name": "string",
      "age": "number",
      "occupation": "string",
      "physicalDescription": "string",
      "publicBackground": "string (known to all)",
      "privateObjective": "string (e.g., 'You owe the victim money; you need to frame someone else')",
      "hiddenInformation": "string (e.g., 'You saw the victim arguing with the gardener at 10pm')",
      "secretRelationship": "string (e.g., 'You are the victim\\'s illegitimate child')"
    }
  ],
  "timeline": [
    {
      "time": "string",
      "event": "string (sequence of events with gaps)"
    }
  ],
  "initialClues": [
    {
      "name": "string",
      "description": "string (e.g., a broken watch, a muddy footprint)"
    }
  ],
  "rooms": [
    {
      "id": "string (MUST be one of: hallway, library, study, kitchen, garden, dining_room)",
      "name": "string (e.g., 'Dusty Library')",
      "description": "string (detailed spooky description)",
      "clues": [
        {
          "name": "string (clue name)",
          "description": "string (what the clue reveals)",
          "isSupernatural": "boolean"
        }
      ]
    }
  ],
  "murderer": "string (MUST EXACTLY MATCH one of the suspect names)",
  "motive": "string",
  "method": "string",
  "opportunity": "string",
  "hiddenEvents": [
    {
      "trigger": "string",
      "eventDescription": "string (potential mid-game events)"
    }
  ]
}

DO NOT include any markdown formatting, markdown blocks, or plain text outside the JSON. Return ONLY the JSON object.`;

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const endpoint = `${ollamaUrl.replace(/\/$/, '')}/api/generate`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    try {
      let cleanResponse = data.response.trim();
      // Remove markdown formatting if Llama includes it accidentally
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      }
      const mystery = JSON.parse(cleanResponse);
      
      // Merge AI generated room data with static DEFAULT_ROOMS config
      mystery.rooms = mergeRooms(mystery.rooms);
      
      return mystery;
    } catch (parseError) {
      console.error('Failed to parse JSON from Ollama. Raw response:', data.response);
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating mystery from Llama 3.2:', error);
    // Return a fallback mystery if generation fails
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
      { name: "Flickering Chandelier", description: "The chain appears rusted through, almost as if deliberately cut.", isSupernatural: false }
    ],
    library: [
      { name: "Tattered Diary Entry", description: "Spooky ramblings mentioning shadows that move on their own.", isSupernatural: true }
    ],
    study: [
      { name: "Unsent Blackmail Letter", description: "A threatening note written by Guest 1 targeting the victim's debts.", isSupernatural: false }
    ],
    kitchen: [
      { name: "Empty Vials of Cyanide", description: "Hidden behind the rotting wooden drawers.", isSupernatural: false }
    ],
    garden: [
      { name: "Cracked Gravestone", description: "The glowing soil surrounding it hums with eerie, otherworldly whispers.", isSupernatural: true }
    ],
    dining_room: [
      { name: "Tipped Wine Glass", description: "A white residue is visible on the rim, smelling faintly of almonds.", isSupernatural: false }
    ]
  };

  return cluesByRoom[roomId] || [];
}
