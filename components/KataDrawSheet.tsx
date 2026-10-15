"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ManualKataEditorModal } from './ManualKataEditorModal';
import { ConfirmationModal } from './ConfirmationModal';
import { OFFICIAL_KATA_LIST } from '../lib/kata-list';

/**
 * Auto-format Kata scores:
 * - Range: 1.0 to 9.9
 * - Automatically appends '.' when user types a digit 1-9 (e.g. typing '7' -> '7.')
 * - Prevents adding a second '.' if user types '.' again (e.g. typing '.' after '7.' stays '7.')
 * - Fast two-digit typing e.g. '75' automatically formats to '7.5'
 */
export const formatKataScore = (raw: string, prev: string = ''): string => {
  if (!raw || raw.trim() === '') return '';

  // Handle backspace / deletion
  if (prev && raw.length < prev.length) {
    if (prev.endsWith('.') && raw === prev.slice(0, -1)) {
      return '';
    }
    if (prev.startsWith(raw)) {
      return raw;
    }
  }

  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return '';

  // Scores must be between 1.0 and 9.9
  if (cleaned.startsWith('0') || cleaned.startsWith('.')) {
    return '';
  }

  // 1. Single digit 1-9: auto append dot
  if (/^[1-9]$/.test(cleaned)) {
    return `${cleaned}.`;
  }

  // 2. Contains dot: '7.', '7..', '7.5', '7..5'
  const dotIdx = cleaned.indexOf('.');
  if (dotIdx !== -1) {
    const intPart = cleaned.slice(0, dotIdx);
    const decPart = cleaned.slice(dotIdx + 1).replace(/\./g, '');
    const d1 = intPart.charAt(0);
    if (!d1 || d1 < '1' || d1 > '9') return '';

    if (!decPart) {
      return `${d1}.`;
    }
    return `${d1}.${decPart.charAt(0)}`;
  }

  // 3. Multiple digits without dot: '75', '82' -> '7.5', '8.2'
  if (/^[1-9][0-9]+$/.test(cleaned)) {
    return `${cleaned[0]}.${cleaned[1]}`;
  }

  return cleaned.slice(0, 3);
};

export interface KataScoreCalculation {
  total: number;
  droppedMinIndex: number | null;
  droppedMaxIndex: number | null;
  validScoresCount: number;
  isFiveJudgeDropped: boolean;
}

/**
 * Calculates Kata total score based on official rules:
 * - When all 5 judges enter scores: drops the lowest and highest score, summing the remaining 3 middle scores.
 * - When 3 judges enter scores (or fewer than 5): sums all entered scores directly.
 */
export const computeKataScores = (scores: string[]): KataScoreCalculation => {
  const numericItems: { val: number; idx: number }[] = [];

  scores.forEach((s, idx) => {
    const val = parseFloat(s);
    if (!isNaN(val) && val > 0) {
      numericItems.push({ val, idx });
    }
  });

  const count = numericItems.length;

  if (count === 0) {
    return {
      total: 0,
      droppedMinIndex: null,
      droppedMaxIndex: null,
      validScoresCount: 0,
      isFiveJudgeDropped: false,
    };
  }

  // 1. If all 5 judges have entered scores: drop minimum and maximum, sum middle 3
  if (count === 5) {
    let minIdx = 0;
    for (let i = 1; i < 5; i++) {
      if (numericItems[i].val < numericItems[minIdx].val) {
        minIdx = i;
      }
    }

    let maxIdx = -1;
    for (let i = 0; i < 5; i++) {
      if (i === minIdx) continue;
      if (maxIdx === -1 || numericItems[i].val > numericItems[maxIdx].val) {
        maxIdx = i;
      }
    }

    const droppedMinIdx = numericItems[minIdx].idx;
    const droppedMaxIdx = numericItems[maxIdx].idx;

    let middleSum = 0;
    for (let i = 0; i < 5; i++) {
      if (i !== minIdx && i !== maxIdx) {
        middleSum += numericItems[i].val;
      }
    }

    middleSum = Math.round(middleSum * 10) / 10;

    return {
      total: middleSum,
      droppedMinIndex: droppedMinIdx,
      droppedMaxIndex: droppedMaxIdx,
      validScoresCount: 5,
      isFiveJudgeDropped: true,
    };
  }

  // 2. If 3 judges (or < 5 judges): sum all valid scores directly
  let directSum = 0;
  numericItems.forEach((item) => {
    directSum += item.val;
  });
  directSum = Math.round(directSum * 10) / 10;

  return {
    total: directSum,
    droppedMinIndex: null,
    droppedMaxIndex: null,
    validScoresCount: count,
    isFiveJudgeDropped: false,
  };
};

interface Player {
  name: string;
  club: string;
  category?: string;
  ageGroup?: string;
  gender?: string;
  championship?: string;
}

interface KataDrawSheetProps {
  groupKey: string;
  players: (Player | null)[];
  startNumber?: number;
  championshipTitle?: string;
  tatamiNumber?: string;
  pageNumber?: string;
  poolName?: string;
  isBlankMode?: boolean;
  printOrientation?: 'portrait' | 'landscape';
  categoryPlayers?: Player[];
}

export const KataDrawSheet: React.FC<KataDrawSheetProps> = ({
  groupKey,
  players,
  startNumber = 1,
  championshipTitle = "COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025",
  tatamiNumber = "Tatami 1",
  pageNumber = "1/1",
  poolName,
  isBlankMode = false,
  printOrientation = 'portrait',
  categoryPlayers,
}) => {
  // Parse groupKey info (e.g. "Intermediate | Under 15 | Female")
  const parts = groupKey.split('|').map((s) => s.trim());
  const categoryName = parts[0] || 'Open';
  const ageGroup = parts[1] || 'All Ages';
  const gender = parts[2] || 'All';

  // Unique datalist ID for official Kata suggestions
  const kataDatalistId = useMemo(() => {
    return `kata-list-${groupKey.replace(/[^a-zA-Z0-9]/g, '_')}-${pageNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [groupKey, pageNumber]);

  // Local state for sheet competitor rows (allows manual reorder, swap, and assignment)
  const [sheetPlayers, setSheetPlayers] = useState<(Player | null)[]>(players);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);

  // Confirmation modal state
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

  // Stable hash of sheet players: only changes when the actual athletes list changes!
  // This guarantees changing orientation, printing, or parent re-renders will NEVER clear entered scores!
  const playersHash = useMemo(() => {
    return players
      .map((p) => (p ? `${p.name}:::${p.club || ''}` : '__null__'))
      .join('|');
  }, [players]);

  const prevPlayersHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPlayersHashRef.current !== playersHash) {
      prevPlayersHashRef.current = playersHash;
      setSheetPlayers(players);
      setIsCustomized(false);
      setRowState((prev) => {
        const next: Record<number, { customName: string; customClub: string; kata: string; scores: string[] }> = {};
        players.forEach((_, idx) => {
          next[idx] = prev[idx] || {
            customName: '',
            customClub: '',
            kata: '',
            scores: ['', '', '', '', ''],
          };
        });
        return next;
      });
    }
  }, [playersHash, players]);

  const hasEnteredScores = () => {
    return Object.values(rowState).some((r) => r.scores.some((s) => s.trim() !== ''));
  };

  const executeApplyManualDraw = (newRows: (Player | null)[]) => {
    setSheetPlayers(newRows);
    setIsCustomized(true);
  };

  const handleApplyManualDraw = (newRows: (Player | null)[]) => {
    if (hasEnteredScores()) {
      setConfirmModal({
        isOpen: true,
        title: 'Modify Kata Performance Order?',
        message: 'Scores have already been entered for competitors on this sheet.',
        details: 'Modifying the order will apply the new competitors but keep scoring slots aligned with the updated rows.',
        confirmText: 'Apply Order',
        variant: 'warning',
        onConfirm: () => {
          executeApplyManualDraw(newRows);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    executeApplyManualDraw(newRows);
  };

  // Scoring state: Map of player index -> { customName: string, customClub: string, kata: string, scores: [j1, j2, j3, j4, j5] }
  const [rowState, setRowState] = useState<
    Record<number, { customName: string; customClub: string; kata: string; scores: string[] }>
  >({});

  const handleScoreChange = (rowIdx: number, judgeIdx: number, rawVal: string) => {
    setRowState((prev) => {
      const current = prev[rowIdx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
      const prevScore = current.scores[judgeIdx] || '';
      const formatted = formatKataScore(rawVal, prevScore);
      const nextScores = [...current.scores];
      nextScores[judgeIdx] = formatted;
      return {
        ...prev,
        [rowIdx]: { ...current, scores: nextScores },
      };
    });
  };

  const handleScoreBlur = (rowIdx: number, judgeIdx: number) => {
    setRowState((prev) => {
      const current = prev[rowIdx];
      if (!current) return prev;
      const val = current.scores[judgeIdx];
      if (val && val.endsWith('.')) {
        const nextScores = [...current.scores];
        nextScores[judgeIdx] = `${val}0`; // Auto-complete e.g. "7." to "7.0" on blur
        return {
          ...prev,
          [rowIdx]: { ...current, scores: nextScores },
        };
      }
      return prev;
    });
  };

  const handleKataNameChange = (rowIdx: number, val: string) => {
    setRowState((prev) => {
      const current = prev[rowIdx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
      return {
        ...prev,
        [rowIdx]: { ...current, kata: val },
      };
    });
  };

  const handleCustomNameChange = (rowIdx: number, val: string) => {
    setRowState((prev) => {
      const current = prev[rowIdx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
      return {
        ...prev,
        [rowIdx]: { ...current, customName: val },
      };
    });
  };

  const executeResetScores = () => {
    const initial: Record<number, { customName: string; customClub: string; kata: string; scores: string[] }> = {};
    players.forEach((_, idx) => {
      initial[idx] = { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
    });
    setRowState(initial);
  };

  const handleResetScores = () => {
    if (hasEnteredScores()) {
      setConfirmModal({
        isOpen: true,
        title: 'Reset All Judge Scores?',
        message: 'Judge scores have already been entered for competitors on this sheet.',
        details: 'Resetting will clear all 5 judge scores and auto-calculated total rankings.',
        confirmText: 'Yes, Reset Scores',
        variant: 'danger',
        onConfirm: () => {
          executeResetScores();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    executeResetScores();
  };

  const calculateTotal = (scores: string[]): number => {
    return computeKataScores(scores).total;
  };

  // Rank players by total score (drops lowest/highest for 5 judges, sums all for 3 judges)
  const activeRows = sheetPlayers.map((p, idx) => {
    const data = rowState[idx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
    const name = p?.name || data.customName;
    const club = p?.club || data.customClub;
    const calc = computeKataScores(data.scores);
    const hasScores = data.scores.some((s) => s.trim() !== '');
    return {
      index: idx,
      name,
      club,
      isAssigned: p !== null || name.trim() !== '',
      total: calc.total,
      hasScores,
      kata: data.kata,
      calc,
    };
  });

  const rankedCompetitors = activeRows
    .filter((r) => r.isAssigned && r.hasScores)
    .sort((a, b) => b.total - a.total);

  const podium1st = !isBlankMode ? rankedCompetitors[0]?.name : null;
  const podium2nd = !isBlankMode ? rankedCompetitors[1]?.name : null;
  const podium3rd_1 = !isBlankMode ? rankedCompetitors[2]?.name : null;
  const podium3rd_2 = !isBlankMode ? rankedCompetitors[3]?.name : null;

  return (
    <div className="official-sheet bg-white rounded-none shadow-none print:shadow-none p-4 sm:p-6 mb-8 max-w-[1200px] mx-auto print:border-none print:m-0 print:p-0 print:max-w-none">
      
      {/* 1. Official Header Title (Centered Large Uppercase) */}
      <div className="text-center pb-2 print:pb-1">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900 font-serif print:text-lg print:leading-tight">
          {championshipTitle}
        </h2>
      </div>

      {/* 2. Official Metadata Grid Bar (Exact match to Kumite Sheet) */}
      <div className="border-2 border-slate-900 grid grid-cols-12 text-xs font-bold uppercase tracking-tight divide-x-2 divide-slate-900 bg-slate-50/50 print:bg-white mb-6 print:mb-2 print:text-[10px]">
        <div className="col-span-3 px-3 py-2 print:py-1 print:px-2 flex items-center bg-slate-100 print:bg-slate-100/50">
          <span className="font-extrabold text-slate-900">SCORING SYSTEM (KATA)</span>
        </div>
        <div className="col-span-5 px-3 py-2 print:py-1 print:px-2 flex items-center truncate">
          <span className="text-slate-500 mr-1.5 font-medium">EVENT:</span>
          <span className="text-slate-900 font-black truncate">
            KATA INDIVIDUAL {categoryName} ({gender}) {poolName ? `[${poolName}]` : ''}
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

      {/* Interactive Controls Bar for Live Kata Scoring (Hidden during Print) */}
      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 print:hidden text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700 uppercase">
            Scoring System ({sheetPlayers.length} Fixed Rows)
          </span>
          <span className="text-slate-400">
            | 5 judges: drops min & max (middle 3 sum) • 3 judges: sums all
          </span>
          {isCustomized && (
            <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
              Custom Order Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 text-orange-700 hover:text-orange-900 font-bold px-3 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md shadow-xs transition-all cursor-pointer"
            title="Manually customize, swap, or reorder Kata draw slots"
          >
            <SlidersHorizontal size={13} />
            Edit Draw (Manual)
          </button>
          <button
            onClick={handleResetScores}
            className="flex items-center gap-1 text-slate-600 hover:text-black font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-100 transition-all cursor-pointer"
            title="Reset all entered scores"
          >
            <RotateCcw size={12} />
            Reset Scores
          </button>
        </div>
      </div>

      {/* 3. Official Kata Scoring Table with Fixed Rows */}
      <div className="w-full overflow-hidden print:overflow-visible">
        <table className="w-full table-fixed border-collapse border-2 border-slate-900 text-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[10px] sm:text-[11px] print:bg-slate-100 print:text-black">
              <th className="border-2 border-slate-900 py-2 px-1 w-[5%] text-center">NO.</th>
              <th className="border-2 border-slate-900 py-2 px-2 text-left w-[27%]">COMPETITOR NAME</th>
              <th className="border-2 border-slate-900 py-2 px-2 text-left w-[21%]">CLUB / ASSOCIATION</th>
              <th className="border-2 border-slate-900 py-2 px-1 text-left w-[17%]">KATA PERFORMED</th>
              {[1, 2, 3, 4, 5].map((j) => (
                <th key={j} className="border-2 border-slate-900 py-2 px-0.5 w-[5%] text-center">
                  J{j}
                </th>
              ))}
              <th className="border-2 border-slate-900 py-2 px-1 w-[7%] text-center bg-slate-800 text-amber-300 print:bg-slate-200 print:text-black">
                TOTAL
              </th>
              <th className="border-2 border-slate-900 py-2 px-1 w-[6%] text-center">
                RANK
              </th>
            </tr>
          </thead>
          <tbody>
            {sheetPlayers.map((p, idx) => {
              const currentData = rowState[idx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
              const playerName = p?.name || currentData.customName;
              const playerClub = p?.club || currentData.customClub;
              const isAssigned = p !== null || playerName.trim() !== '';

              const calcResult = computeKataScores(currentData.scores);
              const totalScore = calcResult.total;
              const hasScores = currentData.scores.some((s) => s.trim() !== '');
              const rankIdx = rankedCompetitors.findIndex((r) => r.index === idx);

              let rankBadge = null;
              if (hasScores && !isBlankMode && isAssigned) {
                if (rankIdx === 0 && totalScore > 0) {
                  rankBadge = (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-950 font-black text-[10px]">
                      1st
                    </span>
                  );
                } else if (rankIdx === 1 && totalScore > 0) {
                  rankBadge = (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-[10px]">
                      2nd
                    </span>
                  );
                } else if (rankIdx === 2 && totalScore > 0) {
                  rankBadge = (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-600 text-white font-black text-[10px]">
                      3rd
                    </span>
                  );
                } else if (rankIdx === 3 && totalScore > 0) {
                  rankBadge = (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500 text-white font-black text-[10px]">
                      3rd
                    </span>
                  );
                } else if (totalScore > 0) {
                  rankBadge = <span className="font-bold text-slate-500">{rankIdx + 1}</span>;
                }
              }

              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors h-11 print:h-7">
                  {/* Order Number (Always Fixed & Sequential) */}
                  <td className="border-2 border-slate-900 text-center font-black bg-slate-50 print:bg-white text-slate-700">
                    {startNumber + idx}
                  </td>

                  {/* Competitor Name */}
                  <td className="border-2 border-slate-900 px-2 py-1 overflow-hidden">
                    {p ? (
                      <p className="font-black text-slate-900 uppercase text-xs truncate">
                        {p.name}
                      </p>
                    ) : (
                      <input
                        type="text"
                        placeholder="—"
                        value={currentData.customName}
                        onChange={(e) => handleCustomNameChange(idx, e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-900 uppercase focus:outline-blue-500 text-xs truncate print:placeholder:text-transparent"
                      />
                    )}
                  </td>

                  {/* Club */}
                  <td className="border-2 border-slate-900 px-2 py-1 overflow-hidden font-semibold text-slate-600 uppercase italic text-[11px] truncate">
                    {p ? (
                      p.club
                    ) : (
                      <span className="text-slate-300 print:hidden">—</span>
                    )}
                  </td>

                  {/* Kata Name Input with Autocomplete Suggestions */}
                  <td className="border-2 border-slate-900 px-1 py-1 overflow-hidden">
                    {isBlankMode ? (
                      <div className="h-5"></div>
                    ) : (
                      <input
                        type="text"
                        list={kataDatalistId}
                        autoComplete="off"
                        placeholder={isAssigned ? "e.g. Bassai Dai" : "—"}
                        value={currentData.kata}
                        onChange={(e) => handleKataNameChange(idx, e.target.value)}
                        className="w-full px-1 py-0.5 bg-transparent font-semibold text-slate-800 border-0 focus:outline-blue-500 text-[11px] truncate print:placeholder:text-transparent"
                      />
                    )}
                  </td>

                  {/* 5 Judge Score Cells */}
                  {[0, 1, 2, 3, 4].map((jIdx) => {
                    const isDroppedMin = calcResult.isFiveJudgeDropped && jIdx === calcResult.droppedMinIndex;
                    const isDroppedMax = calcResult.isFiveJudgeDropped && jIdx === calcResult.droppedMaxIndex;
                    const isDropped = isDroppedMin || isDroppedMax;

                    return (
                      <td
                        key={jIdx}
                        className={`border-2 border-slate-900 p-0.5 text-center overflow-hidden transition-colors ${
                          isDropped ? 'bg-rose-50/70 print:bg-slate-100/80' : ''
                        }`}
                        title={
                          isDroppedMin
                            ? 'Lowest score: Dropped from 5-Judge Total'
                            : isDroppedMax
                            ? 'Highest score: Dropped from 5-Judge Total'
                            : undefined
                        }
                      >
                        {isBlankMode ? (
                          <div className="h-5"></div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={currentData.scores[jIdx]}
                            onChange={(e) => handleScoreChange(idx, jIdx, e.target.value)}
                            onBlur={() => handleScoreBlur(idx, jIdx)}
                            className={`w-full text-center py-0.5 px-0 bg-transparent font-bold focus:outline-blue-500 text-xs print:placeholder:text-transparent ${
                              isDropped
                                ? 'line-through text-slate-400 font-semibold decoration-rose-600 decoration-2 print:decoration-slate-700'
                                : 'text-slate-900'
                            }`}
                            placeholder={isAssigned ? "—" : ""}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Total Score */}
                  <td className="border-2 border-slate-900 text-center font-black text-xs bg-slate-50/80 print:bg-white text-slate-900 py-1">
                    {isBlankMode || !hasScores || !isAssigned ? (
                      ""
                    ) : (
                      <div>
                        <span>{totalScore.toFixed(1)}</span>
                        {calcResult.isFiveJudgeDropped && (
                          <span className="block text-[8px] font-bold text-emerald-700 print:text-[7px] print:text-slate-500 leading-none mt-0.5 uppercase tracking-tight">
                            Mid 3
                          </span>
                        )}
                        {!calcResult.isFiveJudgeDropped && calcResult.validScoresCount === 3 && (
                          <span className="block text-[8px] font-bold text-blue-700 print:text-[7px] print:text-slate-500 leading-none mt-0.5 uppercase tracking-tight">
                            3-Judge
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Rank */}
                  <td className="border-2 border-slate-900 text-center font-bold">
                    {rankBadge}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Row: Places Table (LEFT) & Single Signature (RIGHT) */}
      <div className="mt-4 pt-3 border-t-2 border-slate-900 flex flex-row justify-between items-end gap-6 print:mt-2 print:pt-2">
        {/* LEFT: Places Table */}
        <div className="w-64 sm:w-72">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1">
            Places / Results
          </p>
          <table className="w-full border-collapse border-2 border-slate-900 text-xs">
            <tbody>
              <tr className="border-b border-slate-900 h-8 print:h-7">
                <td className="w-12 border-r-2 border-slate-900 text-center font-black bg-slate-50 print:bg-white text-slate-900">
                  1ˢᵗ
                </td>
                <td className="px-2.5 font-extrabold uppercase text-slate-900 truncate">
                  {podium1st || ""}
                </td>
              </tr>
              <tr className="border-b border-slate-900 h-8 print:h-7">
                <td className="w-12 border-r-2 border-slate-900 text-center font-black bg-slate-50 print:bg-white text-slate-900">
                  2ⁿᵈ
                </td>
                <td className="px-2.5 font-extrabold uppercase text-slate-900 truncate">
                  {podium2nd || ""}
                </td>
              </tr>
              <tr className="border-b border-slate-900 h-8 print:h-7">
                <td className="w-12 border-r-2 border-slate-900 text-center font-black bg-slate-50 print:bg-white text-slate-900">
                  3ʳᵈ
                </td>
                <td className="px-2.5 font-extrabold uppercase text-slate-900 truncate">
                  {podium3rd_1 || ""}
                </td>
              </tr>
              <tr className="h-8 print:h-7">
                <td className="w-12 border-r-2 border-slate-900 text-center font-black bg-slate-50 print:bg-white text-slate-900">
                  3ʳᵈ
                </td>
                <td className="px-2.5 font-extrabold uppercase text-slate-900 truncate">
                  {podium3rd_2 || ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT: Single Signature (Tatami Manager / Chief Referee) */}
        <div className="w-64 sm:w-80 text-center space-y-1.5 print:space-y-0.5 pb-1">
          <div className="border-b border-dashed border-slate-400 mx-4 mb-2 print:mb-1"></div>
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

      {/* Manual Kata Draw Editor Modal */}
      <ManualKataEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialRows={sheetPlayers}
        categoryPlayers={categoryPlayers || sheetPlayers.filter((p): p is Player => p !== null)}
        categoryTitle={`KATA INDIVIDUAL ${categoryName} (${gender}) ${poolName ? `[${poolName}]` : ''}`}
        startNumber={startNumber}
        poolName={poolName}
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

      {/* Official WKF 102 Kata Autocomplete Datalist */}
      <datalist id={kataDatalistId}>
        {OFFICIAL_KATA_LIST.map((kataName) => (
          <option key={kataName} value={kataName} />
        ))}
      </datalist>
    </div>
  );
};

export default KataDrawSheet;
