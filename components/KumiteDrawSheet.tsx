"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, DrawSlot, generateKumiteDrawSlots } from '@/lib/tournament-logic';
import { Trophy, Award, CheckCircle2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ManualDrawEditorModal } from './ManualDrawEditorModal';
import { ConfirmationModal } from './ConfirmationModal';

interface KumiteDrawSheetProps {
  groupKey: string;
  players: Player[];
  championshipTitle?: string;
  tatamiNumber?: string;
  pageNumber?: string;
  bracketSize?: 8 | 16;
  isBlankMode?: boolean;
  printOrientation?: 'portrait' | 'landscape';
}

export const KumiteDrawSheet: React.FC<KumiteDrawSheetProps> = ({
  groupKey,
  players,
  championshipTitle = "COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025",
  tatamiNumber = "Tatami 1",
  pageNumber = "1/1",
  bracketSize: forcedSize = 16,
  isBlankMode = false,
  printOrientation = 'landscape',
}) => {
  // Parse groupKey info (e.g. "Novice | Under 12 | -35kg | Male")
  const parts = groupKey.split('|').map((s) => s.trim());
  const categoryName = parts[0] || 'Open';
  const ageGroup = parts[1] || 'All Ages';
  const weightClass = parts[2] || 'Open Weight';
  const gender = parts[3] || 'All';

  const size = forcedSize; // default 16
  const [slots, setSlots] = useState<DrawSlot[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);

  // Bracket match winner states
  // Round 1 -> Round 2 winners (8 for 16-draw, 4 for 8-draw)
  const [r2Slots, setR2Slots] = useState<(Player | null)[]>([]);
  // Round 2 -> Round 3 winners (4 for 16-draw, 2 for 8-draw)
  const [r3Slots, setR3Slots] = useState<(Player | null)[]>([]);
  // Round 3 -> Round 4 (Finals) winners (2 for 16-draw, 1 for 8-draw)
  const [r4Slots, setR4Slots] = useState<(Player | null)[]>([]);
  // Champion and Podium
  const [champion, setChampion] = useState<Player | null>(null);
  const [runnerUp, setRunnerUp] = useState<Player | null>(null);
  const [bronze1, setBronze1] = useState<Player | null>(null);
  const [bronze2, setBronze2] = useState<Player | null>(null);

  // Scores map: key = `r{round}_m{match}`, value = { aka: string, ao: string }
  const [scores, setScores] = useState<Record<string, { aka: string; ao: string }>>({});

  // Confirmation modal state for safe match winner & draw changes
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Helper to compute initial state with auto-advanced uncontested byes
  const computeInitialDrawState = (generated: DrawSlot[]) => {
    // Initial round 2 slots (8 for 16-draw, 4 for 8-draw)
    const initialR2: (Player | null)[] = Array(size / 2).fill(null);
    for (let i = 0; i < size / 2; i++) {
      const pAka = generated[i * 2]?.player;
      const isAkaBye = generated[i * 2]?.isBye;
      const pAo = generated[i * 2 + 1]?.player;
      const isAoBye = generated[i * 2 + 1]?.isBye;

      if (pAka && isAoBye) {
        initialR2[i] = pAka;
      } else if (pAo && isAkaBye) {
        initialR2[i] = pAo;
      }
    }

    // Auto-advance uncontested byes to Round 3 (Semi-Finals)
    const initialR3: (Player | null)[] = Array(size / 4).fill(null);
    for (let i = 0; i < size / 4; i++) {
      const pTop = initialR2[i * 2];
      const pBot = initialR2[i * 2 + 1];
      const matchTopEmpty = !generated[i * 4]?.player && !generated[i * 4 + 1]?.player;
      const matchBotEmpty = !generated[i * 4 + 2]?.player && !generated[i * 4 + 3]?.player;

      if (pTop && matchBotEmpty) {
        initialR3[i] = pTop;
      } else if (pBot && matchTopEmpty) {
        initialR3[i] = pBot;
      }
    }

    // Auto-advance uncontested byes to Round 4 (Grand Finals)
    const initialR4: (Player | null)[] = Array(size / 8).fill(null);
    for (let i = 0; i < size / 8; i++) {
      const pTop = initialR3[i * 2];
      const pBot = initialR3[i * 2 + 1];
      const qTopEmpty = [0, 1, 2, 3].every((idx) => !generated[i * 8 + idx]?.player);
      const qBotEmpty = [4, 5, 6, 7].every((idx) => !generated[i * 8 + idx]?.player);

      if (pTop && qBotEmpty) {
        initialR4[i] = pTop;
      } else if (pBot && qTopEmpty) {
        initialR4[i] = pBot;
      }
    }

    return { initialR2, initialR3, initialR4 };
  };

  // Stable key of players in this category: only changes when actual athletes change, NOT when orientation changes!
  const playersHash = useMemo(() => {
    return players
      .map((p) => `${p.name}:::${p.club || ''}`)
      .join('|');
  }, [players]);

  const prevPlayersHashRef = useRef<string | null>(null);

  // Initialize slots only when actual players or bracket size change
  useEffect(() => {
    const key = `${playersHash}_size${size}`;
    if (prevPlayersHashRef.current !== key) {
      prevPlayersHashRef.current = key;
      const generated = generateKumiteDrawSlots(players, size);
      setSlots(generated);
      setIsCustomized(false);

      const { initialR2, initialR3, initialR4 } = computeInitialDrawState(generated);
      setR2Slots(initialR2);
      setR3Slots(initialR3);
      setR4Slots(initialR4);
      setChampion(null);
      setRunnerUp(null);
      setBronze1(null);
      setBronze2(null);
      setScores({});
    }
  }, [playersHash, size, players]);

  // Detect if any ongoing match progress exists in this category
  const hasMatchProgress = () => {
    if (champion !== null || runnerUp !== null || bronze1 !== null || bronze2 !== null) return true;
    for (let i = 0; i < size / 2; i++) {
      const pAka = slots[i * 2]?.player;
      const pAo = slots[i * 2 + 1]?.player;
      const winner = r2Slots[i];
      if (pAka && pAo && winner) return true;
    }
    if (r3Slots.some((p) => p !== null)) return true;
    if (r4Slots.some((p) => p !== null)) return true;
    return false;
  };

  const executeReset = () => {
    const generated = generateKumiteDrawSlots(players, size);
    setSlots(generated);
    setIsCustomized(false);

    const { initialR2, initialR3, initialR4 } = computeInitialDrawState(generated);
    setR2Slots(initialR2);
    setR3Slots(initialR3);
    setR4Slots(initialR4);
    setChampion(null);
    setRunnerUp(null);
    setBronze1(null);
    setBronze2(null);
    setScores({});
  };

  const handleReset = () => {
    if (hasMatchProgress()) {
      setConfirmModal({
        isOpen: true,
        title: 'Reset Tournament Bracket?',
        message: 'Match winners and progression have already been recorded for this category.',
        details: 'Resetting the draw will clear all selected match winners, semi-finalists, finalists, and podium medals.',
        confirmText: 'Yes, Reset Bracket',
        variant: 'danger',
        onConfirm: () => {
          executeReset();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    executeReset();
  };

  const executeApplyManualDraw = (newSlots: DrawSlot[]) => {
    setSlots(newSlots);
    setIsCustomized(true);

    const { initialR2, initialR3, initialR4 } = computeInitialDrawState(newSlots);
    setR2Slots(initialR2);
    setR3Slots(initialR3);
    setR4Slots(initialR4);
    setChampion(null);
    setRunnerUp(null);
    setBronze1(null);
    setBronze2(null);
    setScores({});
  };

  const handleApplyManualDraw = (newSlots: DrawSlot[]) => {
    if (hasMatchProgress()) {
      setConfirmModal({
        isOpen: true,
        title: 'Apply Draw Slot Changes?',
        message: 'Match winners have already been recorded for this category.',
        details: 'Applying new slot assignments will reset existing match progression and re-advance uncontested BYEs.',
        confirmText: 'Apply & Reset Results',
        variant: 'warning',
        onConfirm: () => {
          executeApplyManualDraw(newSlots);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    executeApplyManualDraw(newSlots);
  };

  // Helper to safely clear downstream references if a previous winner is changed
  const clearDownstream = (oldPlayerName: string) => {
    setR3Slots((prev) => prev.map((p) => (p && p.name === oldPlayerName ? null : p)));
    setR4Slots((prev) => prev.map((p) => (p && p.name === oldPlayerName ? null : p)));
    setChampion((prev) => (prev && prev.name === oldPlayerName ? null : prev));
    setRunnerUp((prev) => (prev && prev.name === oldPlayerName ? null : prev));
    setBronze1((prev) => (prev && prev.name === oldPlayerName ? null : prev));
    setBronze2((prev) => (prev && prev.name === oldPlayerName ? null : prev));
  };

  // Winner selection handlers with change confirmations
  const applyR1Winner = (matchIdx: number, winnerPlayer: Player, oldWinner?: Player | null) => {
    const nextR2 = [...r2Slots];
    nextR2[matchIdx] = winnerPlayer;
    setR2Slots(nextR2);
    if (oldWinner && oldWinner.name !== winnerPlayer.name) {
      clearDownstream(oldWinner.name);
    }
  };

  const handleSelectR1Winner = (matchIdx: number, winnerPlayer: Player | null) => {
    if (!winnerPlayer || isBlankMode) return;
    const currentWinner = r2Slots[matchIdx];
    if (currentWinner && currentWinner.name !== winnerPlayer.name) {
      setConfirmModal({
        isOpen: true,
        title: 'Change Round 1 Winner?',
        message: `Match ${matchIdx + 1} already has "${currentWinner.name}" recorded as the winner. Are you sure you want to change the winner to "${winnerPlayer.name}"?`,
        details: 'Changing this winner will update subsequent rounds and clear any later matches played by the previous winner.',
        confirmText: 'Change Winner',
        variant: 'warning',
        onConfirm: () => {
          applyR1Winner(matchIdx, winnerPlayer, currentWinner);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    applyR1Winner(matchIdx, winnerPlayer);
  };

  const applyR2Winner = (matchIdx: number, winnerPlayer: Player, oldWinner?: Player | null) => {
    const nextR3 = [...r3Slots];
    nextR3[matchIdx] = winnerPlayer;
    setR3Slots(nextR3);
    if (oldWinner && oldWinner.name !== winnerPlayer.name) {
      clearDownstream(oldWinner.name);
    }
  };

  const handleSelectR2Winner = (matchIdx: number, winnerPlayer: Player | null) => {
    if (!winnerPlayer || isBlankMode) return;
    const currentWinner = r3Slots[matchIdx];
    if (currentWinner && currentWinner.name !== winnerPlayer.name) {
      setConfirmModal({
        isOpen: true,
        title: 'Change Quarter-Final Winner?',
        message: `Quarter-Final Match ${matchIdx + 1} already has "${currentWinner.name}" recorded as the winner. Do you want to change the winner to "${winnerPlayer.name}"?`,
        details: 'Changing this winner will clear subsequent semi-final and final matches played by the previous winner.',
        confirmText: 'Change Winner',
        variant: 'warning',
        onConfirm: () => {
          applyR2Winner(matchIdx, winnerPlayer, currentWinner);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    applyR2Winner(matchIdx, winnerPlayer);
  };

  const applyR3Winner = (matchIdx: number, winnerPlayer: Player, oldWinner?: Player | null) => {
    const nextR4 = [...r4Slots];
    nextR4[matchIdx] = winnerPlayer;
    setR4Slots(nextR4);

    // Semifinal loser becomes bronze medalist
    const p1 = r3Slots[matchIdx * 2];
    const p2 = r3Slots[matchIdx * 2 + 1];
    const loser = p1?.name === winnerPlayer.name ? p2 : p1;
    if (matchIdx === 0) setBronze1(loser || null);
    if (matchIdx === 1) setBronze2(loser || null);

    if (oldWinner && oldWinner.name !== winnerPlayer.name) {
      setChampion((prev) => (prev && prev.name === oldWinner.name ? null : prev));
      setRunnerUp((prev) => (prev && prev.name === oldWinner.name ? null : prev));
    }
  };

  const handleSelectR3Winner = (matchIdx: number, winnerPlayer: Player | null) => {
    if (!winnerPlayer || isBlankMode) return;
    const currentWinner = r4Slots[matchIdx];
    if (currentWinner && currentWinner.name !== winnerPlayer.name) {
      setConfirmModal({
        isOpen: true,
        title: 'Change Semi-Final Winner?',
        message: `Semi-Final Match ${matchIdx + 1} already has "${currentWinner.name}" advancing to Finals. Do you want to change the finalist to "${winnerPlayer.name}"?`,
        details: 'This will update the Bronze medal and reset the Grand Final champion if already decided.',
        confirmText: 'Change Finalist',
        variant: 'warning',
        onConfirm: () => {
          applyR3Winner(matchIdx, winnerPlayer, currentWinner);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    applyR3Winner(matchIdx, winnerPlayer);
  };

  const applyFinalWinner = (winnerPlayer: Player) => {
    setChampion(winnerPlayer);
    const finalist1 = r4Slots[0];
    const finalist2 = r4Slots[1];
    const runner = finalist1?.name === winnerPlayer.name ? finalist2 : finalist1;
    setRunnerUp(runner || null);
  };

  const handleSelectFinalWinner = (winnerPlayer: Player | null) => {
    if (!winnerPlayer || isBlankMode) return;
    if (champion && champion.name !== winnerPlayer.name) {
      setConfirmModal({
        isOpen: true,
        title: 'Change 1st Place Champion?',
        message: `"${champion.name}" is currently recorded as 1st Place Champion. Do you want to change the 1st Place Champion to "${winnerPlayer.name}"?`,
        details: `"${winnerPlayer.name}" will become 1st Place, and "${champion.name}" will become 2nd Place Runner-Up.`,
        confirmText: 'Change Champion',
        variant: 'warning',
        onConfirm: () => {
          applyFinalWinner(winnerPlayer);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    applyFinalWinner(winnerPlayer);
  };

  // Dimensions & Coordinates for 16-Draw
  // Standard SVG canvas: 1100 width, 820 height
  const H = 800;
  const W = 1100;
  const col1X = 20; // R1 start
  const col1W = 270; // R1 card width
  const col2X = 350; // R2
  const col2W = 160;
  const col3X = 560; // R3
  const col3W = 160;
  const col4X = 760; // Finals
  const col4W = 150;
  const goldX = 945; // Champion box

  // Y-coordinates for 16 slots
  const r1SlotY = Array.from({ length: 16 }, (_, i) => 30 + i * 47);

  // Match midpoints
  const r1MatchMidY = Array.from({ length: 8 }, (_, i) => (r1SlotY[i * 2] + r1SlotY[i * 2 + 1]) / 2);
  const r2MatchMidY = Array.from({ length: 4 }, (_, i) => (r1MatchMidY[i * 2] + r1MatchMidY[i * 2 + 1]) / 2);
  const r3MatchMidY = Array.from({ length: 2 }, (_, i) => (r2MatchMidY[i * 2] + r2MatchMidY[i * 2 + 1]) / 2);
  const finalMidY = (r3MatchMidY[0] + r3MatchMidY[1]) / 2; // 382.5 (exact center)

  return (
    <div className="official-sheet bg-white rounded-none shadow-none print:shadow-none p-4 sm:p-6 mb-8 max-w-[1200px] mx-auto print:border-none print:m-0 print:p-0 print:max-w-none">
      
      {/* 1. Official Header Title (Centered Large Uppercase) */}
      <div className="text-center pb-2 print:pb-1">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900 font-serif print:text-lg print:leading-tight">
          {championshipTitle}
        </h2>
      </div>

      {/* 2. Official Metadata Grid Bar (Exact match to photograph) */}
      <div className="border-2 border-slate-900 grid grid-cols-12 text-xs font-bold uppercase tracking-tight divide-x-2 divide-slate-900 bg-slate-50/50 print:bg-white mb-6 print:mb-2 print:text-[10px]">
        <div className="col-span-3 px-3 py-2 print:py-1 print:px-2 flex items-center bg-slate-100 print:bg-slate-100/50">
          <span className="font-extrabold text-slate-900">
            {groupKey.toLowerCase().includes('team') ? 'DRAW SYSTEM (TEAM KUMITE)' : 'DRAW SYSTEM (KUMITE)'}
          </span>
        </div>
        <div className="col-span-5 px-3 py-2 print:py-1 print:px-2 flex items-center truncate">
          <span className="text-slate-500 mr-1.5 font-medium">EVENT:</span>
          <span className="text-slate-900 font-black truncate">
            {groupKey.toLowerCase().includes('team') ? 'KUMITE TEAM' : 'KUMITE INDIVIDUAL'} {categoryName} {weightClass} ({gender})
          </span>
        </div>
        <div className="col-span-2 px-3 py-2 print:py-1 print:px-2 flex items-center">
          <span className="text-slate-500 mr-1.5 font-medium">AGE:</span>
          <span className="text-slate-900 font-black">{ageGroup}</span>
        </div>
        <div className="col-span-2 px-3 py-2 print:py-1 print:px-2 flex items-center justify-between">
          <span className="text-slate-900 font-black">{tatamiNumber}</span>
          <span className="text-slate-500 font-bold">PAGE: {pageNumber}</span>
        </div>
      </div>

      {/* Interactive Toolbar for Live Match Management (Hidden during Print) */}
      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 print:hidden text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> AKA (Red)
          </span>
          <span className="text-slate-300">vs</span>
          <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> AO (Blue)
          </span>
          <span className="text-slate-400 pl-2">| Click competitor to advance winner</span>
          {isCustomized && (
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Custom Draw Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shadow-xs transition-all cursor-pointer"
            title="Manually customize, swap, or reassign draw slots"
          >
            <SlidersHorizontal size={13} />
            Edit Draw (Manual)
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-600 hover:text-black font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-100 transition-all cursor-pointer"
            title="Reset draw to initial algorithmic state"
          >
            <RotateCcw size={12} />
            Reset Draw
          </button>
        </div>
      </div>

      {/* 3. Official Tournament Tree Bracket */}
      <div className="relative w-full overflow-x-auto select-none print:overflow-visible flex justify-center items-center print:w-full print:my-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="kumite-svg-bracket w-full h-auto min-w-[980px] print:min-w-0 print:w-full print:max-h-[160mm] print:h-auto mx-auto"
          style={{ maxHeight: '820px' }}
        >
          {/* DEFINITIONS FOR GRADIENTS & MARKERS */}
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>

          {/* ======================================================== */}
          {/* ROUND 1: 16 COMPETITORS (8 MATCHES)                      */}
          {/* ======================================================== */}
          {Array.from({ length: 8 }).map((_, matchIdx) => {
            const slotAkaIdx = matchIdx * 2;
            const slotAoIdx = matchIdx * 2 + 1;
            const slotAka = slots[slotAkaIdx];
            const slotAo = slots[slotAoIdx];
            const yAka = r1SlotY[slotAkaIdx];
            const yAo = r1SlotY[slotAoIdx];
            const midY = r1MatchMidY[matchIdx];

            const pAka = isBlankMode ? null : slotAka?.player;
            const pAo = isBlankMode ? null : slotAo?.player;

            const isAkaWinner = !isBlankMode && r2Slots[matchIdx]?.name === pAka?.name && pAka !== null;
            const isAoWinner = !isBlankMode && r2Slots[matchIdx]?.name === pAo?.name && pAo !== null;

            return (
              <g key={`r1_match_${matchIdx}`}>
                {/* --- Slot AKA (Red - Top) --- */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pAka && handleSelectR1Winner(matchIdx, pAka)}
                >
                  {/* Card Background Box */}
                  <rect
                    x={col1X}
                    y={yAka - 14}
                    width={col1W}
                    height={28}
                    rx={2}
                    fill={isAkaWinner ? "#fef2f2" : "#ffffff"}
                    stroke="#dc2626"
                    strokeWidth={isAkaWinner ? "2" : "1.2"}
                  />
                  {/* Number & Checkbox */}
                  <rect x={col1X + 4} y={yAka - 10} width={18} height={20} fill="#f1f5f9" stroke="#cbd5e1" rx={1} />
                  <text x={col1X + 13} y={yAka + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#334155">
                    {slotAkaIdx + 1}
                  </text>
                  {/* Player Name & Club */}
                  <text x={col1X + 28} y={yAka - 1} fontSize="11" fontWeight="800" fill="#0f172a" className="uppercase font-sans">
                    {pAka ? pAka.name : slotAka?.isBye ? "--" : ""}
                  </text>
                  <text x={col1X + 28} y={yAka + 10} fontSize="8.5" fontWeight="600" fill="#64748b" className="italic font-sans">
                    {pAka ? pAka.club : ""}
                  </text>
                  {/* Red AKA Badge */}
                  <rect x={col1X + col1W - 38} y={yAka - 12} width={34} height={24} rx={2} fill="#dc2626" />
                  <text x={col1X + col1W - 21} y={yAka + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff">
                    AKA
                  </text>
                </g>

                {/* --- Slot AO (Blue - Bottom) --- */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pAo && handleSelectR1Winner(matchIdx, pAo)}
                >
                  <rect
                    x={col1X}
                    y={yAo - 14}
                    width={col1W}
                    height={28}
                    rx={2}
                    fill={isAoWinner ? "#eff6ff" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={isAoWinner ? "2" : "1.2"}
                  />
                  {/* Number & Checkbox */}
                  <rect x={col1X + 4} y={yAo - 10} width={18} height={20} fill="#f1f5f9" stroke="#cbd5e1" rx={1} />
                  <text x={col1X + 13} y={yAo + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#334155">
                    {slotAoIdx + 1}
                  </text>
                  {/* Player Name & Club */}
                  <text x={col1X + 28} y={yAo - 1} fontSize="11" fontWeight="800" fill="#0f172a" className="uppercase font-sans">
                    {pAo ? pAo.name : slotAo?.isBye ? "--" : ""}
                  </text>
                  <text x={col1X + 28} y={yAo + 10} fontSize="8.5" fontWeight="600" fill="#64748b" className="italic font-sans">
                    {pAo ? pAo.club : ""}
                  </text>
                  {/* Blue AO Badge */}
                  <rect x={col1X + col1W - 38} y={yAo - 12} width={34} height={24} rx={2} fill="#2563eb" />
                  <text x={col1X + col1W - 21} y={yAo + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff">
                    AO
                  </text>
                </g>

                {/* --- Vector Bracket Connector (R1 -> R2) --- */}
                {/* Horizontal line from AKA card */}
                <line x1={col1X + col1W} y1={yAka} x2={col1X + col1W + 35} y2={yAka} stroke="#dc2626" strokeWidth="2" />
                {/* Horizontal line from AO card */}
                <line x1={col1X + col1W} y1={yAo} x2={col1X + col1W + 35} y2={yAo} stroke="#2563eb" strokeWidth="2" />
                {/* Vertical bracket line: Top half Red, Bottom half Blue */}
                <line x1={col1X + col1W + 35} y1={yAka} x2={col1X + col1W + 35} y2={midY} stroke="#dc2626" strokeWidth="2" />
                <line x1={col1X + col1W + 35} y1={midY} x2={col1X + col1W + 35} y2={yAo} stroke="#2563eb" strokeWidth="2" />
                {/* Connector line towards Round 2 */}
                <line x1={col1X + col1W + 35} y1={midY} x2={col2X} y2={midY} stroke="#0f172a" strokeWidth="2" />
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* ROUND 2: QUARTER-FINALS (4 MATCHES)                      */}
          {/* ======================================================== */}
          {Array.from({ length: 4 }).map((_, qfIdx) => {
            const slotTopIdx = qfIdx * 2;
            const slotBotIdx = qfIdx * 2 + 1;
            const yTop = r1MatchMidY[slotTopIdx];
            const yBot = r1MatchMidY[slotBotIdx];
            const midY = r2MatchMidY[qfIdx];

            const pTop = isBlankMode ? null : r2Slots[slotTopIdx];
            const pBot = isBlankMode ? null : r2Slots[slotBotIdx];

            const isTopWinner = !isBlankMode && r3Slots[qfIdx]?.name === pTop?.name && pTop !== null;
            const isBotWinner = !isBlankMode && r3Slots[qfIdx]?.name === pBot?.name && pBot !== null;

            return (
              <g key={`r2_match_${qfIdx}`}>
                {/* R2 Top Slot (Red AKA) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pTop && handleSelectR2Winner(qfIdx, pTop)}
                >
                  <rect
                    x={col2X}
                    y={yTop - 12}
                    width={col2W}
                    height={24}
                    rx={2}
                    fill={isTopWinner ? "#fef2f2" : "#ffffff"}
                    stroke="#dc2626"
                    strokeWidth={isTopWinner ? "2" : "1.2"}
                  />
                  <text x={col2X + 8} y={yTop + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {pTop ? pTop.name : ""}
                  </text>
                  <rect x={col2X + col2W - 28} y={yTop - 10} width={24} height={20} rx={2} fill="#dc2626" />
                  <text x={col2X + col2W - 16} y={yTop + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AKA
                  </text>
                </g>

                {/* R2 Bottom Slot (Blue AO) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pBot && handleSelectR2Winner(qfIdx, pBot)}
                >
                  <rect
                    x={col2X}
                    y={yBot - 12}
                    width={col2W}
                    height={24}
                    rx={2}
                    fill={isBotWinner ? "#eff6ff" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={isBotWinner ? "2" : "1.2"}
                  />
                  <text x={col2X + 8} y={yBot + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {pBot ? pBot.name : ""}
                  </text>
                  <rect x={col2X + col2W - 28} y={yBot - 10} width={24} height={20} rx={2} fill="#2563eb" />
                  <text x={col2X + col2W - 16} y={yBot + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AO
                  </text>
                </g>

                {/* Connector lines R2 -> R3 */}
                <line x1={col2X + col2W} y1={yTop} x2={col2X + col2W + 28} y2={yTop} stroke="#dc2626" strokeWidth="2" />
                <line x1={col2X + col2W} y1={yBot} x2={col2X + col2W + 28} y2={yBot} stroke="#2563eb" strokeWidth="2" />
                <line x1={col2X + col2W + 28} y1={yTop} x2={col2X + col2W + 28} y2={midY} stroke="#dc2626" strokeWidth="2" />
                <line x1={col2X + col2W + 28} y1={midY} x2={col2X + col2W + 28} y2={yBot} stroke="#2563eb" strokeWidth="2" />
                <line x1={col2X + col2W + 28} y1={midY} x2={col3X} y2={midY} stroke="#0f172a" strokeWidth="2" />
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* ROUND 3: SEMI-FINALS (2 MATCHES)                         */}
          {/* ======================================================== */}
          {Array.from({ length: 2 }).map((_, sfIdx) => {
            const slotTopIdx = sfIdx * 2;
            const slotBotIdx = sfIdx * 2 + 1;
            const yTop = r2MatchMidY[slotTopIdx];
            const yBot = r2MatchMidY[slotBotIdx];
            const midY = r3MatchMidY[sfIdx];

            const pTop = isBlankMode ? null : r3Slots[slotTopIdx];
            const pBot = isBlankMode ? null : r3Slots[slotBotIdx];

            const isTopWinner = !isBlankMode && r4Slots[sfIdx]?.name === pTop?.name && pTop !== null;
            const isBotWinner = !isBlankMode && r4Slots[sfIdx]?.name === pBot?.name && pBot !== null;

            return (
              <g key={`r3_match_${sfIdx}`}>
                {/* SF Top Slot (Red AKA) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pTop && handleSelectR3Winner(sfIdx, pTop)}
                >
                  <rect
                    x={col3X}
                    y={yTop - 12}
                    width={col3W}
                    height={24}
                    rx={2}
                    fill={isTopWinner ? "#fef2f2" : "#ffffff"}
                    stroke="#dc2626"
                    strokeWidth={isTopWinner ? "2" : "1.2"}
                  />
                  <text x={col3X + 8} y={yTop + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {pTop ? pTop.name : ""}
                  </text>
                  <rect x={col3X + col3W - 28} y={yTop - 10} width={24} height={20} rx={2} fill="#dc2626" />
                  <text x={col3X + col3W - 16} y={yTop + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AKA
                  </text>
                </g>

                {/* SF Bottom Slot (Blue AO) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => pBot && handleSelectR3Winner(sfIdx, pBot)}
                >
                  <rect
                    x={col3X}
                    y={yBot - 12}
                    width={col3W}
                    height={24}
                    rx={2}
                    fill={isBotWinner ? "#eff6ff" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={isBotWinner ? "2" : "1.2"}
                  />
                  <text x={col3X + 8} y={yBot + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {pBot ? pBot.name : ""}
                  </text>
                  <rect x={col3X + col3W - 28} y={yBot - 10} width={24} height={20} rx={2} fill="#2563eb" />
                  <text x={col3X + col3W - 16} y={yBot + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AO
                  </text>
                </g>

                {/* Connector lines R3 -> Finals */}
                <line x1={col3X + col3W} y1={yTop} x2={col3X + col3W + 24} y2={yTop} stroke="#dc2626" strokeWidth="2" />
                <line x1={col3X + col3W} y1={yBot} x2={col3X + col3W + 24} y2={yBot} stroke="#2563eb" strokeWidth="2" />
                <line x1={col3X + col3W + 24} y1={yTop} x2={col3X + col3W + 24} y2={midY} stroke="#dc2626" strokeWidth="2" />
                <line x1={col3X + col3W + 24} y1={midY} x2={col3X + col3W + 24} y2={yBot} stroke="#2563eb" strokeWidth="2" />
                <line x1={col3X + col3W + 24} y1={midY} x2={col4X} y2={midY} stroke="#0f172a" strokeWidth="2" />
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* ROUND 4: GRAND FINALS                                    */}
          {/* ======================================================== */}
          {(() => {
            const yTop = r3MatchMidY[0];
            const yBot = r3MatchMidY[1];
            const midY = finalMidY; // 382.5

            const finalist1 = isBlankMode ? null : r4Slots[0];
            const finalist2 = isBlankMode ? null : r4Slots[1];

            const isF1Winner = !isBlankMode && champion?.name === finalist1?.name && finalist1 !== null;
            const isF2Winner = !isBlankMode && champion?.name === finalist2?.name && finalist2 !== null;

            return (
              <g key="r4_finals">
                {/* Finalist 1 (AKA - Top) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => finalist1 && handleSelectFinalWinner(finalist1)}
                >
                  <rect
                    x={col4X}
                    y={yTop - 12}
                    width={col4W}
                    height={24}
                    rx={2}
                    fill={isF1Winner ? "#fef2f2" : "#ffffff"}
                    stroke="#dc2626"
                    strokeWidth={isF1Winner ? "2.5" : "1.5"}
                  />
                  <text x={col4X + 8} y={yTop + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {finalist1 ? finalist1.name : ""}
                  </text>
                  <rect x={col4X + col4W - 28} y={yTop - 10} width={24} height={20} rx={2} fill="#dc2626" />
                  <text x={col4X + col4W - 16} y={yTop + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AKA
                  </text>
                </g>

                {/* Finalist 2 (AO - Bottom) */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => finalist2 && handleSelectFinalWinner(finalist2)}
                >
                  <rect
                    x={col4X}
                    y={yBot - 12}
                    width={col4W}
                    height={24}
                    rx={2}
                    fill={isF2Winner ? "#eff6ff" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={isF2Winner ? "2.5" : "1.5"}
                  />
                  <text x={col4X + 8} y={yBot + 4} fontSize="10" fontWeight="bold" fill="#0f172a" className="uppercase font-sans">
                    {finalist2 ? finalist2.name : ""}
                  </text>
                  <rect x={col4X + col4W - 28} y={yBot - 10} width={24} height={20} rx={2} fill="#2563eb" />
                  <text x={col4X + col4W - 16} y={yBot + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
                    AO
                  </text>
                </g>

                {/* Finalist connector lines meeting at champion line */}
                <line x1={col4X + col4W} y1={yTop} x2={col4X + col4W + 20} y2={yTop} stroke="#dc2626" strokeWidth="2.5" />
                <line x1={col4X + col4W} y1={yBot} x2={col4X + col4W + 20} y2={yBot} stroke="#2563eb" strokeWidth="2.5" />
                <line x1={col4X + col4W + 20} y1={yTop} x2={col4X + col4W + 20} y2={midY} stroke="#dc2626" strokeWidth="2.5" />
                <line x1={col4X + col4W + 20} y1={midY} x2={col4X + col4W + 20} y2={yBot} stroke="#2563eb" strokeWidth="2.5" />
                {/* Horizontal line extending to Gold Box */}
                <line x1={col4X + col4W + 20} y1={midY} x2={goldX} y2={midY} stroke="#0f172a" strokeWidth="2.5" />

                {/* 1st Place / Champion Box in Kumite Draw */}
                <g 
                  className="cursor-pointer group"
                  onClick={() => {
                    if (isBlankMode) return;
                    if (finalist1 && finalist2) {
                      if (champion?.name === finalist1.name) handleSelectFinalWinner(finalist2);
                      else handleSelectFinalWinner(finalist1);
                    } else if (finalist1) {
                      handleSelectFinalWinner(finalist1);
                    } else if (finalist2) {
                      handleSelectFinalWinner(finalist2);
                    }
                  }}
                >
                  {/* Outer Card Background */}
                  <rect
                    x={goldX}
                    y={midY - 18}
                    width={145}
                    height={36}
                    rx={3}
                    fill={champion ? "#fffdf5" : "#ffffff"}
                    stroke={champion ? "#b45309" : "#0f172a"}
                    strokeWidth={champion ? "2" : "1.5"}
                    strokeDasharray={champion ? undefined : "3 3"}
                  />

                  {/* Gold "1" Square inside the Card */}
                  <rect
                    x={goldX + 3}
                    y={midY - 15}
                    width={30}
                    height={30}
                    rx={2}
                    fill="url(#goldGrad)"
                    stroke="#b45309"
                    strokeWidth="1.5"
                  />
                  <text
                    x={goldX + 18}
                    y={midY + 5}
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="900"
                    fill="#78350f"
                    className="font-sans"
                  >
                    1
                  </text>

                  {/* 1st Place Champion Name & Club */}
                  {champion && (
                    <>
                      <text
                        x={goldX + 38}
                        y={midY - 2}
                        fontSize="10"
                        fontWeight="900"
                        fill="#0f172a"
                        className="uppercase font-sans"
                      >
                        {champion.name.length > 16 ? champion.name.slice(0, 15) + '…' : champion.name}
                      </text>
                      <text
                        x={goldX + 38}
                        y={midY + 10}
                        fontSize="8"
                        fontWeight="700"
                        fill="#b45309"
                        className="uppercase font-sans italic"
                      >
                        {champion.club ? (champion.club.length > 18 ? champion.club.slice(0, 17) + '…' : champion.club) : 'CHAMPION'}
                      </text>
                    </>
                  )}
                </g>
              </g>
            );
          })()}

          {/* ======================================================== */}
          {/* OFFICIAL PLACES TABLE (RIGHT SIDE BOTTOM CORNER)         */}
          {/* ======================================================== */}
          <g transform={`translate(${col4X}, 640)`}>
            {/* Outer Box */}
            <rect x="0" y="0" width="200" height="104" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
            
            {/* Vertical Column Divider */}
            <line x1="42" y1="0" x2="42" y2="104" stroke="#000000" strokeWidth="1.2" />
            
            {/* Horizontal Row Dividers */}
            <line x1="0" y1="26" x2="200" y2="26" stroke="#000000" strokeWidth="1.2" />
            <line x1="0" y1="52" x2="200" y2="52" stroke="#000000" strokeWidth="1.2" />
            <line x1="0" y1="78" x2="200" y2="78" stroke="#000000" strokeWidth="1.2" />

            {/* Row 1: 1st */}
            <g
              className="cursor-pointer group"
              onClick={() => {
                if (isBlankMode) return;
                const f1 = r4Slots[0];
                const f2 = r4Slots[1];
                if (f1 && f2) {
                  if (champion?.name === f1.name) handleSelectFinalWinner(f2);
                  else handleSelectFinalWinner(f1);
                } else if (f1) {
                  handleSelectFinalWinner(f1);
                } else if (f2) {
                  handleSelectFinalWinner(f2);
                }
              }}
            >
              <rect x="0" y="0" width="42" height="26" fill={champion ? "#fef08a" : "#f8fafc"} />
              <text x="21" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fill="#000000" className="font-sans">1ˢᵗ</text>
              <text x="50" y="17" fontSize="10" fontWeight="800" fill="#000000" className="uppercase font-sans">
                {champion ? champion.name : ""}
              </text>
            </g>

            {/* Row 2: 2nd */}
            <rect x="0" y="26" width="42" height="26" fill="#f8fafc" />
            <text x="21" y="43" textAnchor="middle" fontSize="11" fontWeight="900" fill="#000000" className="font-sans">2ⁿᵈ</text>
            <text x="50" y="43" fontSize="10" fontWeight="800" fill="#000000" className="uppercase font-sans">
              {runnerUp ? runnerUp.name : ""}
            </text>

            {/* Row 3: 3rd */}
            <rect x="0" y="52" width="42" height="26" fill="#f8fafc" />
            <text x="21" y="69" textAnchor="middle" fontSize="11" fontWeight="900" fill="#000000" className="font-sans">3ʳᵈ</text>
            <text x="50" y="69" fontSize="10" fontWeight="800" fill="#000000" className="uppercase font-sans">
              {bronze1 ? bronze1.name : ""}
            </text>

            {/* Row 4: 3rd (Bronze 2) */}
            <rect x="0" y="78" width="42" height="26" fill="#f8fafc" />
            <text x="21" y="95" textAnchor="middle" fontSize="11" fontWeight="900" fill="#000000" className="font-sans">3ʳᵈ</text>
            <text x="50" y="95" fontSize="10" fontWeight="800" fill="#000000" className="uppercase font-sans">
              {bronze2 ? bronze2.name : ""}
            </text>
          </g>
        </svg>
      </div>

      {/* 4. Official Signature Footer (Tatami Manager / Chief Referee - Centered) */}
      <div className="mt-4 flex justify-center items-center print:mt-1">
        <div className="w-80 text-center space-y-1.5 print:space-y-0.5 pb-1">
          <div className="border-b border-dashed border-slate-400 mx-6 mb-2 print:mb-1"></div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-[10px]">
            Tatami Manager / Chief Referee
          </p>
          <p className="text-[10px] text-slate-400 italic print:text-[8px]">Signature & Date</p>
        </div>
      </div>

      {/* Page break styling & orientation for print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 ${printOrientation};
          margin: 5mm 6mm;
        }
      `}} />

      {/* Manual Draw Editor Modal */}
      <ManualDrawEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialSlots={slots}
        allPlayers={players}
        categoryTitle={`KUMITE INDIVIDUAL ${categoryName} ${weightClass} (${gender})`}
        size={size}
        onApply={handleApplyManualDraw}
      />

      {/* Safety Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default KumiteDrawSheet;
