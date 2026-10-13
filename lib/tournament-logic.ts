export interface Player {
  name: string;
  club: string;
  category: string;
  weight?: string;
  gender: string;
  ageGroup?: string;
  championship?: string;
}

export interface DrawSlot {
  slotNumber: number; // 1-indexed (1..16 or 1..8)
  player: Player | null;
  corner: 'AKA' | 'AO'; // Odd = AKA (Red), Even = AO (Blue)
  isBye: boolean;
}

export interface MatchRound {
  id: string;
  roundName: string;
  roundIndex: number;
  matches: MatchNode[];
}

export interface MatchNode {
  matchId: string;
  matchNumber: number;
  akaPlayer: Player | null;
  aoPlayer: Player | null;
  akaScore?: string;
  aoScore?: string;
  winner: 'AKA' | 'AO' | null;
  winnerPlayer: Player | null;
  isByeMatch?: boolean;
}

// ඊළඟ සුදුසු Bracket ප්‍රමාණය තීරණය කිරීම (8 හෝ 16)
export const getBracketSize = (count: number): 8 | 16 => {
  if (count <= 8) return 8;
  return 16;
};

/**
 * WKF Karate Standard Kumite Draw Generation
 * - Seed placement with opposite halves & quarters
 * - Club / Dojo separation to prevent club-mates meeting in early rounds
 * - Symmetric Bye placement
 */
export const generateKumiteDrawSlots = (
  players: Player[], 
  forcedSize?: 8 | 16
): DrawSlot[] => {
  const size = forcedSize || (players.length <= 8 ? 8 : 16);
  const slots: DrawSlot[] = Array.from({ length: size }, (_, i) => ({
    slotNumber: i + 1,
    player: null,
    corner: i % 2 === 0 ? 'AKA' : 'AO',
    isBye: false,
  }));

  if (!players || players.length === 0) {
    return slots;
  }

  // Seeding order for 16-draw and 8-draw (WKF standard)
  const seedSlots16 = [
    0,  // Seed 1 (Match 1, Top)
    15, // Seed 2 (Match 8, Bottom)
    8,  // Seed 3 (Match 5, Bottom Pool Top)
    7,  // Seed 4 (Match 4, Top Pool Bottom)
    4,  // Seed 5 (Match 3)
    11, // Seed 6 (Match 6)
    12, // Seed 7 (Match 7)
    3,  // Seed 8 (Match 2)
    2,  // Seed 9
    13, // Seed 10
    10, // Seed 11
    5,  // Seed 12
    6,  // Seed 13
    9,  // Seed 14
    14, // Seed 15
    1,  // Seed 16
  ];

  const seedSlots8 = [
    0, // Seed 1
    7, // Seed 2
    4, // Seed 3
    3, // Seed 4
    2, // Seed 5
    5, // Seed 6
    6, // Seed 7
    1, // Seed 8
  ];

  const seedSlots = size === 8 ? seedSlots8 : seedSlots16;

  // Club separation: Group players by club
  const clubGroups: Record<string, Player[]> = {};
  players.forEach((p) => {
    const club = p.club || 'Independent';
    if (!clubGroups[club]) clubGroups[club] = [];
    clubGroups[club].push(p);
  });

  // Sort clubs by player count descending so biggest clubs get separated first
  const sortedClubs = Object.keys(clubGroups).sort(
    (a, b) => clubGroups[b].length - clubGroups[a].length
  );

  // Distribute players across seeds ensuring club mates don't cluster
  const distributedPlayers: Player[] = [];
  const maxClubSize = Math.max(...sortedClubs.map((c) => clubGroups[c].length));

  for (let i = 0; i < maxClubSize; i++) {
    for (const club of sortedClubs) {
      if (clubGroups[club][i]) {
        distributedPlayers.push(clubGroups[club][i]);
      }
    }
  }

  // Populate slots according to seed order
  distributedPlayers.forEach((player, idx) => {
    if (idx < size) {
      const slotIndex = seedSlots[idx];
      slots[slotIndex].player = player;
    }
  });

  // Mark empty slots as BYE if total players is less than bracket size
  slots.forEach((s) => {
    if (!s.player) {
      s.isBye = true;
    }
  });

  return slots;
};

// Legacy compatibility helper
export const generateKumiteDraw = (players: Player[]) => {
  const slots = generateKumiteDrawSlots(players, 16);
  return slots.map((s) => s.player);
};