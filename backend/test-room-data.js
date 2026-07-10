import { generateMysteryData } from './utils/aiService.js';

async function test() {
  console.log('🕯️  Starting mystery room data generation test...\n');
  
  const mockPlayers = [
    { playerId: '1', name: 'Detective Holmes' },
    { playerId: '2', name: 'Dr. Watson' }
  ];

  try {
    const mystery = await generateMysteryData(mockPlayers);
    
    console.log('✅  Generation succeeded!\n');
    console.log('================ Victim Info ================');
    console.log(JSON.stringify(mystery.victim, null, 2));
    
    console.log('\n================ Room Grid Config (Merged/Fallback) ================');
    mystery.rooms.forEach(room => {
      console.log(`\n🚪 [${room.id.toUpperCase()}] - "${room.name}"`);
      console.log(`   Position: left: ${room.position.left}%, top: ${room.position.top}%`);
      console.log(`   Adjacency / Connections: ${room.connections.join(', ')}`);
      console.log(`   Atmosphere Description: ${room.description}`);
      console.log(`   Room Clues:`);
      if (room.clues.length === 0) {
        console.log('     (No clues generated for this room)');
      } else {
        room.clues.forEach(clue => {
          console.log(`     🔍 "${clue.name}" (Supernatural Red Herring? ${clue.isSupernatural ? '👻 Yes' : '❌ No'})`);
          console.log(`        └─ Description: ${clue.description}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
