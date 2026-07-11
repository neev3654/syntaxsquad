/**
 * revealService.js
 * Generates the dramatic final reveal narrative using Ollama (Llama 3.2).
 * Falls back to a template if AI is unavailable.
 */

const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * generateReveal(room)
 * @param {Object} room - The full room object (with mysteryData, votes, accusation, players, discoveredClueIds)
 * @returns {Promise<{ narrative: string, statistics: Object }>}
 */
export async function generateReveal(room) {
  const mystery = room.mysteryData;
  if (!mystery) {
    return { narrative: getFallbackNarrative(null, room), statistics: compileStatistics(room) };
  }

  // Build vote tally
  const voteCounts = {};
  Object.values(room.votes || {}).forEach(suspectName => {
    voteCounts[suspectName] = (voteCounts[suspectName] || 0) + 1;
  });
  const winnerEntry = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
  const mostVoted = winnerEntry ? winnerEntry[0] : 'Unknown';

  // Determine which clues were discovered vs ignored
  const allClueIds = [];
  (mystery.rooms || []).forEach(room => {
    (room.clues || []).forEach((clue, idx) => {
      allClueIds.push(`${room.id}_${idx}`);
    });
  });
  const discoveredIds = new Set(room.discoveredClueIds || []);
  const discoveredClues = [];
  const ignoredClues = [];
  (mystery.rooms || []).forEach(r => {
    (r.clues || []).forEach((clue, idx) => {
      const id = `${r.id}_${idx}`;
      if (discoveredIds.has(id)) {
        discoveredClues.push(clue.name);
      } else {
        ignoredClues.push(clue.name);
      }
    });
  });

  const prompt = `You are the Game Master of a gothic murder mystery game. The investigation is over. Write a dramatic final reveal narrative with the following sections. Be atmospheric, literary, and gothic in tone.

MYSTERY CONTEXT:
- Victim: ${mystery.victim?.name} — ${mystery.victim?.backstory}
- Location: ${mystery.location?.name}
- The True Murderer: ${mystery.murderer}
- Motive: ${mystery.motive}
- Method: ${mystery.method}
- Opportunity: ${mystery.opportunity}

SUSPECTS:
${(mystery.suspects || []).map(s => `- ${s.name} (${s.occupation}): Private objective: ${s.privateObjective}`).join('\n')}

TIMELINE:
${(mystery.timeline || []).map(e => `${e.time}: ${e.event}`).join('\n')}

CLUES DISCOVERED BY PLAYERS: ${discoveredClues.join(', ') || 'None'}
CLUES MISSED BY PLAYERS: ${ignoredClues.join(', ') || 'None'}

PLAYER VOTE TALLY: ${JSON.stringify(voteCounts)}
PLAYER VOTED FOR: ${mostVoted}
CORRECT ANSWER: ${mystery.murderer}
PLAYERS WERE ${mostVoted === mystery.murderer ? 'CORRECT' : 'WRONG'}

Write EXACTLY the following 7 sections. Label each section with its title on its own line:

THE MURDERER:
[Dramatically reveal who committed the murder and explain why, with atmospheric detail]

THE TIMELINE:
[Walk through the events of the evening step by step, filling in what really happened]

THE CLUES:
[Explain which discovered clues were crucial and how they pointed to the murderer]

THE IGNORED CLUES:
[Mention clues the players missed and what they would have revealed]

THE LIES:
[Reveal which characters lied (based on their private objectives) and why]

THE VERDICT:
[If players voted correctly, congratulate them dramatically; if wrong, gently but chillingly explain the truth]

EPILOGUE:
[A single haunting sentence that leaves a chill — a gothic horror twist ending]

Write in plain text only. No markdown. Under 600 words total. Gothic, atmospheric, literary prose.`;

  try {
    const endpoint = `${ollamaUrl.replace(/\/$/, '')}/api/generate`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(60000) // 60s timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const narrative = (data.response || '').trim();

    if (!narrative) throw new Error('Empty response from Ollama');

    return {
      narrative,
      statistics: compileStatistics(room, voteCounts, mostVoted)
    };
  } catch (error) {
    console.error('[RevealService] AI generation failed, using fallback:', error.message);
    return {
      narrative: getFallbackNarrative(mystery, room, voteCounts, mostVoted),
      statistics: compileStatistics(room, voteCounts, mostVoted)
    };
  }
}

/**
 * compileStatistics(room, voteCounts, mostVoted)
 * Builds game statistics for the reveal screen.
 */
function compileStatistics(room, voteCounts = {}, mostVoted = null) {
  const mystery = room.mysteryData;
  const murderer = mystery?.murderer || null;

  // Count total clues available
  let totalClues = 0;
  (mystery?.rooms || []).forEach(r => {
    totalClues += (r.clues || []).length;
  });
  const discoveredCount = (room.discoveredClueIds || []).length;

  // Who voted correctly
  const correctVoters = [];
  Object.entries(room.votes || {}).forEach(([playerId, suspectName]) => {
    if (suspectName === murderer) {
      const player = (room.players || []).find(p => p.playerId === playerId);
      if (player) correctVoters.push(player.name);
    }
  });

  // MVP: first player to discover the most decisive clue (or most clues)
  // Simplified: the host or first correct voter
  const mvp = correctVoters[0] || (room.players[0]?.name) || 'Unknown';

  // Time taken
  let timeTaken = null;
  if (room.gameStartedAt) {
    const ms = Date.now() - new Date(room.gameStartedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    timeTaken = `${mins}m ${secs}s`;
  }

  return {
    totalClues,
    discoveredClues: discoveredCount,
    correctVoters,
    mostVoted,
    murderer,
    playersWon: mostVoted === murderer,
    voteCounts,
    timeTaken,
    mvp
  };
}

/**
 * getFallbackNarrative — used when Ollama is unavailable
 */
function getFallbackNarrative(mystery, room, voteCounts = {}, mostVoted = null) {
  const murderer = mystery?.murderer || 'an unknown figure';
  const motive = mystery?.motive || 'a dark motive';
  const method = mystery?.method || 'unknown means';
  const victim = mystery?.victim?.name || 'the victim';
  const correct = mostVoted === murderer;

  return `THE MURDERER:
The truth, as it so often does in this wretched manor, emerges from the shadows at last. It was ${murderer} who extinguished the life of ${victim}. The hand that smiled and conversed at dinner was the same hand that delivered death.

THE TIMELINE:
As the clock struck midnight and the last candle guttered low, ${murderer} slipped away from the gathering — unnoticed, or so they believed. The opportunity was carefully planned, the alibi rehearsed, the evidence scattered like breadcrumbs meant to mislead. ${mystery?.opportunity || 'The moment was chosen with cold precision.'}

THE CLUES:
The clues were present for those who looked closely. ${method} left traces that a careful eye might have followed to ${murderer}'s door. The truth was always there, lurking beneath the surface of each discovered artifact.

THE IGNORED CLUES:
Yet some evidence lay undisturbed, unexamined — whispers that went unheard. Had the investigators been more thorough, the path to justice would have been clearer still.

THE LIES:
Every soul in this manor carried their secrets. ${murderer} wove the most elaborate deception of all — a fiction of innocence maintained until this very moment of reckoning.

THE VERDICT:
${correct
    ? 'You saw through the darkness. Your instincts were true, and justice has found its mark. The guilty party stands revealed before you — as you always suspected.'
    : `The truth, it seems, remained veiled from your sight. The players voted for ${mostVoted || 'another'}, but the real killer was ${murderer} all along. Do not be ashamed — they were skilled in deception.`}

EPILOGUE:
As the final candle dies and silence reclaims the manor, you cannot shake the feeling that somewhere in the darkness, something still watches — and it knows that you know.`;
}
