export const DEFAULT_ROOMS = [
  {
    id: 'hallway',
    name: 'Hallway',
    position: { left: 1000, top: 200 },
    connections: ['garage', 'library', 'study', 'room_1', 'conservatory', 'observatory', 'basement', 'kitchen', 'dining_room', 'bathroom', 'room_2', 'room_3'],
    description: 'The dark, echoing entrance hallway of the estate. A grand but decaying chandelier hangs from the high ceiling, casting long shadows. Blood red carpets line the floor, damp and rotting.'
  },
  {
    id: 'garage',
    name: 'Garage',
    position: { left: 200, top: 200 },
    connections: ['hallway'],
    description: 'A dusty, abandoned garage with a rusted old car in the center. Tools hang on the walls, some looking disturbingly like weapons.'
  },
  {
    id: 'basement',
    name: 'Basement',
    position: { left: 1400, top: 200 },
    connections: ['hallway'],
    description: 'A damp, stone-walled basement with dripping water and rusted barrels. The air is thick with the smell of mildew and something more ancient.'
  },
  {
    id: 'library',
    name: 'Library',
    position: { left: 200, top: 800 },
    connections: ['hallway'],
    description: 'Bramble-strangled bookshelves line the walls of this massive repository. Thousands of ancient, leather-bound books decay silently. A smell of dust and damp paper permeates the room.'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    position: { left: 1400, top: 800 },
    connections: ['hallway'],
    description: 'Rusting cleavers and copper pots hang from the ceiling like torture devices. Cold iron stoves dominate one wall, and the smell of ancient grease and copper hangs heavy.'
  },
  {
    id: 'study',
    name: 'Study',
    position: { left: 200, top: 1400 },
    connections: ['hallway'],
    description: 'A heavy mahogany desk sits stained with dark inks and mysterious spots. Drafty windows rattle in their sockets, and the whispers of past thoughts seem to linger in the corners.'
  },
  {
    id: 'dining_room',
    name: 'Dining Room',
    position: { left: 1400, top: 1400 },
    connections: ['hallway'],
    description: 'A long dining table set for guests who never left. Silver candelabras are draped in cobwebs, and the air is stale with the smell of centuries-old feasts.'
  },
  {
    id: 'room_1',
    name: 'Bedroom',
    position: { left: 200, top: 2000 },
    connections: ['hallway'],
    description: 'A dusty bedroom with an unmade bed and old, faded curtains. The wardrobe door hangs slightly ajar, as if someone was just inside.'
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    position: { left: 1400, top: 2000 },
    connections: ['hallway'],
    description: 'A grimy, old bathroom with cracked tiles and a rusted tub. The mirror is fogged, even though no one has been here in years.'
  },
  {
    id: 'conservatory',
    name: 'Conservatory',
    position: { left: 200, top: 2600 },
    connections: ['hallway'],
    description: 'A glass-walled conservatory filled with dead and dying plants. Vines twist up the walls, almost as if they are reaching for something.'
  },
  {
    id: 'room_2',
    name: 'Billiard Room',
    position: { left: 1400, top: 2600 },
    connections: ['hallway'],
    description: 'A gaming room with a felt billiards table in the center. Balls are scattered across the floor, as if someone left in a hurry mid-game.'
  },
  {
    id: 'observatory',
    name: 'Observatory',
    position: { left: 200, top: 3200 },
    connections: ['hallway'],
    description: 'A domed observatory with a large telescope pointed at the night sky. The floor is scattered with old star charts and astronomical notes.'
  },
  {
    id: 'room_3',
    name: 'Master Bedroom',
    position: { left: 1400, top: 3200 },
    connections: ['hallway'],
    description: 'A grand master bedroom with a huge four-poster bed and ornate furniture. The air feels heavy, and the silence is oppressive.'
  }
];
