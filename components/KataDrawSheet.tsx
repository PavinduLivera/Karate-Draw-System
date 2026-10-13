"use client";
import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

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
}) => {
  // Parse groupKey info (e.g. "Intermediate | Under 15 | Female")
  const parts = groupKey.split('|').map((s) => s.trim());
  const categoryName = parts[0] || 'Open';
  const ageGroup = parts[1] || 'All Ages';
  const gender = parts[2] || 'All';

  // Scoring state: Map of player index -> { customName: string, customClub: string, kata: string, scores: [j1, j2, j3, j4, j5] }
  const [rowState, setRowState] = useState<
    Record<number, { customName: string; customClub: string; kata: string; scores: string[] }>
  >({});

  // Initialize row state
  useEffect(() => {
    const initial: Record<number, { customName: string; customClub: string; kata: string; scores: string[] }> = {};
    players.forEach((_, idx) => {
      initial[idx] = {
        customName: '',
        customClub: '',
        kata: '',
        scores: ['', '', '', '', ''],
      };
    });
    setRowState(initial);
  }, [players]);

  const handleScoreChange = (rowIdx: number, judgeIdx: number, val: string) => {
    setRowState((prev) => {
      const current = prev[rowIdx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
      const nextScores = [...current.scores];
      nextScores[judgeIdx] = val;
      return {
        ...prev,
        [rowIdx]: { ...current, scores: nextScores },
      };
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

  const handleResetScores = () => {
    const initial: Record<number, { customName: string; customClub: string; kata: string; scores: string[] }> = {};
    players.forEach((_, idx) => {
      initial[idx] = { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
    });
    setRowState(initial);
  };

  const calculateTotal = (scores: string[]): number => {
    return scores.reduce((sum, s) => {
      const num = parseFloat(s);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  // Rank players by total score
  const activeRows = players.map((p, idx) => {
    const data = rowState[idx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
    const name = p?.name || data.customName;
    const club = p?.club || data.customClub;
    const total = calculateTotal(data.scores);
    const hasScores = data.scores.some((s) => s.trim() !== '');
    return {
      index: idx,
      name,
      club,
      isAssigned: p !== null || name.trim() !== '',
      total,
      hasScores,
      kata: data.kata,
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
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 uppercase">
            5-Judge Scoring System ({players.length} Fixed Rows)
          </span>
          <span className="text-slate-400">| Enter judge scores (e.g. 7.5, 8.0) to auto-calculate totals & ranks</span>
        </div>
        <button
          onClick={handleResetScores}
          className="flex items-center gap-1 text-slate-600 hover:text-black font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-100 transition-all cursor-pointer"
          title="Reset all entered scores"
        >
          <RotateCcw size={12} />
          Reset Scores
        </button>
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
            {players.map((p, idx) => {
              const currentData = rowState[idx] || { customName: '', customClub: '', kata: '', scores: ['', '', '', '', ''] };
              const playerName = p?.name || currentData.customName;
              const playerClub = p?.club || currentData.customClub;
              const isAssigned = p !== null || playerName.trim() !== '';

              const totalScore = calculateTotal(currentData.scores);
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

                  {/* Kata Name Input */}
                  <td className="border-2 border-slate-900 px-1 py-1 overflow-hidden">
                    {isBlankMode ? (
                      <div className="h-5"></div>
                    ) : (
                      <input
                        type="text"
                        placeholder={isAssigned ? "e.g. Bassai Dai" : "—"}
                        value={currentData.kata}
                        onChange={(e) => handleKataNameChange(idx, e.target.value)}
                        className="w-full px-1 py-0.5 bg-transparent font-semibold text-slate-800 border-0 focus:outline-blue-500 text-[11px] truncate print:placeholder:text-transparent"
                      />
                    )}
                  </td>

                  {/* 5 Judge Score Cells */}
                  {[0, 1, 2, 3, 4].map((jIdx) => (
                    <td key={jIdx} className="border-2 border-slate-900 p-0.5 text-center overflow-hidden">
                      {isBlankMode ? (
                        <div className="h-5"></div>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentData.scores[jIdx]}
                          onChange={(e) => handleScoreChange(idx, jIdx, e.target.value)}
                          className="w-full text-center py-0.5 px-0 bg-transparent font-bold text-slate-900 focus:outline-blue-500 text-xs print:placeholder:text-transparent"
                          placeholder={isAssigned ? "—" : ""}
                        />
                      )}
                    </td>
                  ))}

                  {/* Total Score */}
                  <td className="border-2 border-slate-900 text-center font-black text-xs bg-slate-50/80 print:bg-white text-slate-900">
                    {isBlankMode || !hasScores || !isAssigned ? "" : totalScore.toFixed(1)}
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
    </div>
  );
};

export default KataDrawSheet;
