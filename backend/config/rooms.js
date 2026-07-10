export const DEFAULT_ROOMS = [
  {
    id: 'hallway',
    name: 'Hallway',
    position: { left: 50, top: 50 },
    connections: ['library', 'study', 'kitchen', 'garden', 'dining_room'],
    description: 'The dark, echoing entrance hallway of the estate. A grand but decaying chandelier hangs from the high ceiling, casting long shadows. Blood red carpets line the floor, damp and rotting.'
  },
  {
    id: 'library',
    name: 'Library',
    position: { left: 20, top: 20 },
    connections: ['hallway'],
    description: 'Bramble-strangled bookshelves line the walls of this massive repository. Thousands of ancient, leather-bound books decay silently. A smell of dust and damp paper permeates the room.'
  },
  {
    id: 'study',
    name: 'Study',
    position: { left: 20, top: 80 },
    connections: ['hallway'],
    description: 'A heavy mahogany desk sits stained with dark inks and mysterious spots. Drafty windows rattle in their sockets, and the whispers of past thoughts seem to linger in the corners.'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    position: { left: 80, top: 20 },
    connections: ['hallway'],
    description: 'Rusting cleavers and copper pots hang from the ceiling like torture devices. Cold iron stoves dominate one wall, and the smell of ancient grease and copper hangs heavy.'
  },
  {
    id: 'garden',
    name: 'Garden',
    position: { left: 80, top: 80 },
    connections: ['hallway'],
    description: 'Overgrown maze of dead thorn bushes and cracked marble gravestones. The pale moonlight barely penetrates the mist, making the statues seem to watch your every move.'
  },
  {
    id: 'dining_room',
    name: 'Dining Room',
    position: { left: 50, top: 5 },
    connections: ['hallway'],
    description: 'A long dining table set for guests who never left. Silver candelabras are draped in cobwebs, and the air is stale with the smell of centuries-old feasts.'
  }
];
