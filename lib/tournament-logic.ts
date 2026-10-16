export interface Player {
  name: string;
  club: string;
  category: string;
  eventType?: string;
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
 * Helper to determine which tournament round two slots would meet
 * 16-Bracket: 4 = Finals, 3 = Semi-Finals, 2 = Quarter-Finals, 1 = Round 1
 * 8-Bracket:  3 = Finals, 2 = Semi-Finals, 1 = Round 1
 */
export const getMeetingRound = (s1: number, s2: number, size: 8 | 16): number => {
  if (size === 16) {
    if (Math.floor(s1 / 8) !== Math.floor(s2 / 8)) return 4; // Finals (Opposite halves)
    if (Math.floor(s1 / 4) !== Math.floor(s2 / 4)) return 3; // Semi-Finals (Opposite quarters)
    if (Math.floor(s1 / 2) !== Math.floor(s2 / 2)) return 2; // Quarter-Finals (Opposite matches)
    return 1; // Round 1 (Same match)
  } else {
    if (Math.floor(s1 / 4) !== Math.floor(s2 / 4)) return 3; // Finals (Opposite halves)
    if (Math.floor(s1 / 2) !== Math.floor(s2 / 2)) return 2; // Semi-Finals (Opposite matches)
    return 1; // Round 1 (Same match)
  }
};

/**
 * WKF Karate Standard Kumite Draw Generation
 * - Seed placement with opposite halves & quarters
 * - Club / Dojo separation:
 *   * 2 competitors from same club -> Placed in opposite halves (Top & Bottom / Pool A & B)
 *     so they can only meet in the Grand Final.
 *   * 3 competitors from same club -> Placed in 3 separate quarters so they only meet
 *     in the Semi-Finals & Grand Final, strictly avoiding Round 1 & Round 2 clashes.
 *   * 4+ competitors -> Evenly distributed across quarters to meet as late as possible.
 * - Symmetric Bye placement following WKF seeding priorities.
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
    slots.forEach((s) => {
      s.isBye = true;
    });
    return slots;
  }

  const numPlayers = Math.min(players.length, size);
  const activePlayers = players.slice(0, numPlayers);

  // WKF standard seed priority order
  const seedSlots16 = [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
  const seedSlots8 = [0, 7, 4, 3, 2, 5, 6, 1];
  const preferredSlots = size === 8 ? seedSlots8 : seedSlots16;

  // Group players by normalized club name
  const clubGroups = new Map<string, Player[]>();
  activePlayers.forEach((p, idx) => {
    const rawClub = p.club ? p.club.trim() : '';
    const clubKey = rawClub.toLowerCase();
    const isIndependent = !clubKey || clubKey === 'independent' || clubKey === 'no club';
    const groupKey = isIndependent ? `indep_${idx}` : clubKey;
    if (!clubGroups.has(groupKey)) {
      clubGroups.set(groupKey, []);
    }
    clubGroups.get(groupKey)!.push(p);
  });

  // Sort clubs by player count descending so larger clubs are distributed first
  const sortedClubs = Array.from(clubGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Order players club-by-club (largest clubs first)
  // Placing all players of multi-member clubs first guarantees that clubs with 2 or more players
  // are distributed across opposite halves (Pool A & Pool B) and quarters before single-member clubs take up slots.
  const orderedPlayers: Player[] = [];
  for (const [_, cPlayers] of sortedClubs) {
    for (const p of cPlayers) {
      orderedPlayers.push(p);
    }
  }

  // Global bracket capacities
  const numQuarters = size === 8 ? 2 : 4;
  const numMatches = size / 2;
  const maxPerHalf = Math.ceil(numPlayers / 2);
  const maxPerQuarter = Math.ceil(numPlayers / numQuarters);
  const maxPerMatch = Math.ceil(numPlayers / numMatches);

  // Track each club's total size in this category
  const clubTotalSizes = new Map<string, number>();
  for (const [key, cPlayers] of clubGroups) {
    clubTotalSizes.set(key, cPlayers.length);
  }

  const assignedPlayers: (Player | null)[] = Array(size).fill(null);

  const getHalf = (s: number) => Math.floor(s / (size / 2));
  const getQuarter = (s: number) => Math.floor(s / (size / numQuarters));
  const getMatch = (s: number) => Math.floor(s / 2);

  for (const player of orderedPlayers) {
    const rawClub = player.club ? player.club.trim() : '';
    const clubKey = rawClub.toLowerCase();
    const isIndependent = !clubKey || clubKey === 'independent' || clubKey === 'no club';
    const clubTotal = isIndependent ? 1 : (clubTotalSizes.get(clubKey) || 1);

    // Club-specific capacities for early-round separation
    const maxClubPerHalf = isIndependent ? maxPerHalf : Math.ceil(clubTotal / 2);
    const maxClubPerQuarter = isIndependent ? maxPerQuarter : Math.ceil(clubTotal / numQuarters);
    const maxClubPerMatch = isIndependent ? maxPerMatch : Math.ceil(clubTotal / numMatches);

    // Tiered placement search:
    // Level 0: Strict all (match, quarter, half, global half, global quarter)
    // Level 1: Relax club quarter (allow same quarter only if necessary, meeting in R2 rather than R1)
    // Level 2: Relax global quarter capacity
    // Level 3: Relax club half (allow same half only if necessary, meeting in R3)
    // CRITICAL: NEVER allow same match (Round 1 clash) if club <= 8!
    let bestSlot = -1;

    for (let level = 0; level <= 3; level++) {
      let bestScore = Infinity;

      for (let s = 0; s < size; s++) {
        if (assignedPlayers[s] !== null) continue;

        const half = getHalf(s);
        const quarter = getQuarter(s);
        const match = getMatch(s);

        let halfCount = 0;
        let quarterCount = 0;
        let matchCount = 0;

        let clubHalfCount = 0;
        let clubQuarterCount = 0;
        let clubMatchCount = 0;

        for (let os = 0; os < size; os++) {
          const other = assignedPlayers[os];
          if (!other) continue;

          if (getHalf(os) === half) halfCount++;
          if (getQuarter(os) === quarter) quarterCount++;
          if (getMatch(os) === match) matchCount++;

          if (!isIndependent) {
            const otherClub = (other.club || '').trim().toLowerCase();
            if (otherClub === clubKey) {
              if (getHalf(os) === half) clubHalfCount++;
              if (getQuarter(os) === quarter) clubQuarterCount++;
              if (getMatch(os) === match) clubMatchCount++;
            }
          }
        }

        // HARD CONSTRAINT AT ALL LEVELS: NEVER ALLOW SAME-MATCH (ROUND 1 FIGHT) IF CLUB <= 8
        if (clubMatchCount >= maxClubPerMatch) continue;

        // Half capacity: ALWAYS enforce strictly equal halves
        if (halfCount >= maxPerHalf) continue;

        // Level-based constraints
        if (level === 0 && quarterCount >= maxPerQuarter) continue;
        if (level === 0 && matchCount >= maxPerMatch) continue;

        if (level < 3 && clubHalfCount >= maxClubPerHalf) continue;
        if (level === 0 && clubQuarterCount >= maxClubPerQuarter) continue;

        let score = 0;
        const seedIdx = preferredSlots.indexOf(s);
        score += seedIdx * 10;

        if (!isIndependent) {
          for (let otherSlot = 0; otherSlot < size; otherSlot++) {
            const other = assignedPlayers[otherSlot];
            if (!other) continue;
            const otherClub = (other.club || '').trim().toLowerCase();
            if (otherClub === clubKey) {
              const r = getMeetingRound(s, otherSlot, size);
              if (r === 1) score += 10000000;
              else if (r === 2) score += 200000;
              else if (r === 3) score += 5000;
            }
          }
        }

        score += halfCount * 500;
        score += quarterCount * 100;

        if (score < bestScore) {
          bestScore = score;
          bestSlot = s;
        }
      }

      if (bestSlot !== -1) break;
    }

    // Ultimate fallback safety: pick any open slot that does NOT have a clubmate in the same match
    if (bestSlot === -1) {
      for (let s = 0; s < size; s++) {
        if (assignedPlayers[s] !== null) continue;
        const oppSlot = s % 2 === 0 ? s + 1 : s - 1;
        const opp = assignedPlayers[oppSlot];
        const oppClub = opp?.club ? opp.club.trim().toLowerCase() : '';
        if (!oppClub || oppClub !== clubKey) {
          bestSlot = s;
          break;
        }
      }
      if (bestSlot === -1) {
        bestSlot = assignedPlayers.indexOf(null);
      }
    }

    if (bestSlot !== -1) {
      assignedPlayers[bestSlot] = player;
    }
  }

  // Populate slots
  slots.forEach((s, idx) => {
    s.player = assignedPlayers[idx];
    s.isBye = assignedPlayers[idx] === null;
  });

  return slots;
};

// Legacy compatibility helper
export const generateKumiteDraw = (players: Player[]) => {
  const slots = generateKumiteDrawSlots(players, 16);
  return slots.map((s) => s.player);
};