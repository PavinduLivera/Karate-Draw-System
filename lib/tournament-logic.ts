export interface Player {
  name: string;
  club: string;
  category: string;
  weight?: string;
  gender: string;
}

// ඊළඟ 2හි බලය සෙවීම (2, 4, 8, 16...)
export const getBracketSize = (count: number): number => {
  if (count <= 2) return 2;
  if (count <= 4) return 4;
  if (count <= 8) return 8;
  return 16;
};

// Kumite Bracket එක සැකසීම (Club Separation සමඟ)
export const generateKumiteDraw = (players: Player[]) => {
  const size = getBracketSize(players.length);
  const bracket: (Player | null)[] = Array(size).fill(null);
  
  // Clubs අනුව ප්ලේයර්ස්ලා වෙන් කර වැඩිම ප්ලේයර්ස්ලා සිටින ක්ලබ් එක මුලට ගන්න
  const clubGroups: Record<string, Player[]> = {};
  players.forEach(p => {
    if (!clubGroups[p.club]) clubGroups[p.club] = [];
    clubGroups[p.club].push(p);
  });

  const sortedPlayers = Object.values(clubGroups)
    .sort((a, b) => b.length - a.length)
    .flat();

  // Seeding patterns (8 bracket එකක් සඳහා 1st half සහ 2nd half වෙන් කිරීම)
  const seedOrder8 = [0, 7, 3, 4, 1, 6, 2, 5]; // Opposite halves logic
  const seedOrder16 = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];

  const order = size === 8 ? seedOrder8 : seedOrder16;

  sortedPlayers.forEach((player, index) => {
    if (index < size) {
      bracket[order[index]] = player;
    }
  });

  return bracket;
};