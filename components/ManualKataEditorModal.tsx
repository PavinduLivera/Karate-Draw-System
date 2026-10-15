"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Trash2, 
  Shuffle, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  RotateCcw, 
  SlidersHorizontal,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export interface KataPlayer {
  name: string;
  club: string;
  category?: string;
  ageGroup?: string;
  gender?: string;
  championship?: string;
}

interface ManualKataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRows: (KataPlayer | null)[];
  categoryPlayers: KataPlayer[];
  categoryTitle: string;
  startNumber?: number;
  poolName?: string;
  onApply: (newRows: (KataPlayer | null)[]) => void;
}

export const ManualKataEditorModal: React.FC<ManualKataEditorModalProps> = ({
  isOpen,
  onClose,
  initialRows,
  categoryPlayers,
  categoryTitle,
  startNumber = 1,
  poolName,
  onApply,
}) => {
  const [draftRows, setDraftRows] = useState<(KataPlayer | null)[]>([]);
  const [swappingRowIdx, setSwappingRowIdx] = useState<number | null>(null);

  // Quick swap dropdowns
  const [quickSwapA, setQuickSwapA] = useState<number>(1);
  const [quickSwapB, setQuickSwapB] = useState<number>(2);

  // Custom inline editor state
  const [editingCustomIdx, setEditingCustomIdx] = useState<number | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customClub, setCustomClub] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDraftRows(initialRows.map((r) => (r ? { ...r } : null)));
      setSwappingRowIdx(null);
      setEditingCustomIdx(null);
    }
  }, [isOpen, initialRows]);

  if (!isOpen) return null;

  const totalRows = draftRows.length;

  // Swap two rows
  const handleSwap = (idx1: number, idx2: number) => {
    if (idx1 === idx2 || idx1 < 0 || idx2 < 0 || idx1 >= totalRows || idx2 >= totalRows) return;
    setDraftRows((prev) => {
      const next = [...prev];
      const temp = next[idx1];
      next[idx1] = next[idx2];
      next[idx2] = temp;
      return next;
    });
    setSwappingRowIdx(null);
  };

  // Move row up
  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    handleSwap(idx, idx - 1);
  };

  // Move row down
  const handleMoveDown = (idx: number) => {
    if (idx >= totalRows - 1) return;
    handleSwap(idx, idx + 1);
  };

  // Random Draw / Shuffle (WKF standard random draw)
  const handleRandomDraw = () => {
    // Extract non-null players
    const active = draftRows.filter((p): p is KataPlayer => p !== null);
    if (active.length === 0) return;

    // Fisher-Yates shuffle
    const shuffled = [...active];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Place into draftRows sequentially, pad with null
    const newRows: (KataPlayer | null)[] = Array(totalRows).fill(null);
    shuffled.forEach((p, i) => {
      if (i < totalRows) newRows[i] = p;
    });

    setDraftRows(newRows);
    setSwappingRowIdx(null);
  };

  // Player selection dropdown
  const handleSelectPlayer = (rowIdx: number, val: string) => {
    if (val === '__BLANK__') {
      setDraftRows((prev) => {
        const next = [...prev];
        next[rowIdx] = null;
        return next;
      });
      return;
    }

    if (val === '__CUSTOM__') {
      const cur = draftRows[rowIdx];
      setCustomName(cur?.name || '');
      setCustomClub(cur?.club || '');
      setEditingCustomIdx(rowIdx);
      return;
    }

    const [pName, pClub] = val.split(':::');
    const matched = categoryPlayers.find(
      (p) => p.name === pName && (p.club || '') === (pClub || '')
    );
    if (!matched) return;

    setDraftRows((prev) => {
      const next = [...prev];
      // Check if this player is already in another row -> vacate or swap to prevent duplicates
      const oldIdx = next.findIndex(
        (p, i) => i !== rowIdx && p && p.name === matched.name && p.club === matched.club
      );

      if (oldIdx !== -1) {
        next[oldIdx] = next[rowIdx];
      }

      next[rowIdx] = { ...matched };
      return next;
    });
  };

  // Save custom athlete
  const handleSaveCustom = (rowIdx: number) => {
    if (!customName.trim()) {
      setEditingCustomIdx(null);
      return;
    }
    setDraftRows((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        name: customName.trim(),
        club: customClub.trim() || 'Independent',
        category: categoryPlayers[0]?.category,
        gender: categoryPlayers[0]?.gender,
        championship: categoryPlayers[0]?.championship,
      };
      return next;
    });
    setEditingCustomIdx(null);
    setCustomName('');
    setCustomClub('');
  };

  // Assign an unplaced category athlete into first available blank row
  const handleAssignUnplaced = (p: KataPlayer) => {
    const emptyIdx = draftRows.findIndex((r) => r === null);
    if (emptyIdx === -1) {
      alert("All rows on this sheet are occupied. Please blank or swap a row first.");
      return;
    }
    setDraftRows((prev) => {
      const next = [...prev];
      next[emptyIdx] = { ...p };
      return next;
    });
  };

  // Clear single row
  const handleClearRow = (rowIdx: number) => {
    setDraftRows((prev) => {
      const next = [...prev];
      next[rowIdx] = null;
      return next;
    });
  };

  // Clear all rows
  const handleClearAll = () => {
    setDraftRows(Array(totalRows).fill(null));
    setSwappingRowIdx(null);
  };

  // Reset to original
  const handleReset = () => {
    setDraftRows(initialRows.map((r) => (r ? { ...r } : null)));
    setSwappingRowIdx(null);
    setEditingCustomIdx(null);
  };

  // Find unplaced category athletes
  const unplacedAthletes = categoryPlayers.filter((cp) => {
    return !draftRows.some((r) => r && r.name === cp.name && (r.club || '') === (cp.club || ''));
  });

  const assignedCount = draftRows.filter((r) => r !== null).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ======================================================== */}
        {/* 1. HEADER                                                */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">MANUAL KATA DRAW EDITOR</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {poolName || 'Order of Performance'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {categoryTitle} • {assignedCount} of {totalRows} Rows Assigned
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close editor"
          >
            <X size={18} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. TOOLBAR (RANDOM DRAW, QUICK SWAP, STATS)              */}
        {/* ======================================================== */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Random Draw Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomDraw}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Randomly shuffle the performance order of all competitors (WKF Kata Draw)"
            >
              <Shuffle size={13} />
              Random Draw (Shuffle)
            </button>

            <span className="text-slate-400">|</span>

            {/* Quick Swap */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Swap:</span>
              <select
                value={quickSwapA}
                onChange={(e) => setQuickSwapA(parseInt(e.target.value))}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 bg-slate-50"
              >
                {draftRows.map((_, i) => (
                  <option key={`qa_${i}`} value={i + 1}>
                    Row {startNumber + i}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">↔</span>
              <select
                value={quickSwapB}
                onChange={(e) => setQuickSwapB(parseInt(e.target.value))}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 bg-slate-50"
              >
                {draftRows.map((_, i) => (
                  <option key={`qb_${i}`} value={i + 1}>
                    Row {startNumber + i}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSwap(quickSwapA - 1, quickSwapB - 1)}
                className="ml-1 flex items-center gap-1 bg-slate-800 hover:bg-black text-white px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors"
              >
                <ArrowLeftRight size={11} />
                Swap
              </button>
            </div>
          </div>

          <div className="text-slate-600 font-semibold text-xs">
            Assigned: <strong className="text-slate-900">{assignedCount}</strong> / {totalRows}
          </div>
        </div>

        {/* Unplaced category athletes banner */}
        {unplacedAthletes.length > 0 && (
          <div className="px-6 py-2 bg-amber-50/80 border-b border-amber-200 text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">Unplaced Athletes ({unplacedAthletes.length}):</span>
              <div className="flex flex-wrap gap-1.5">
                {unplacedAthletes.map((p, i) => (
                  <button
                    key={`up_${i}`}
                    onClick={() => handleAssignUnplaced(p)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-800 font-semibold border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                    title="Click to assign into first open row"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({p.club})</span>
                    <span className="text-orange-600 font-bold text-[10px]">+Add</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active click-to-swap alert */}
        {swappingRowIdx !== null && (
          <div className="px-6 py-2 bg-orange-600 text-white text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="animate-pulse" />
              <span>
                Row #{startNumber + swappingRowIdx} ({draftRows[swappingRowIdx]?.name || 'Blank'}) selected. Click ANY other row to swap!
              </span>
            </div>
            <button
              onClick={() => setSwappingRowIdx(null)}
              className="text-white hover:text-orange-100 underline text-xs font-semibold cursor-pointer"
            >
              Cancel Swap
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. ROWS LIST                                             */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-2">
          {draftRows.map((player, idx) => {
            const orderNum = startNumber + idx;
            const isSwappingThis = swappingRowIdx === idx;
            const isTargetForSwap = swappingRowIdx !== null && swappingRowIdx !== idx;
            const isCustom = editingCustomIdx === idx;

            const selectValue = player
              ? `${player.name}:::${player.club || ''}`
              : '__BLANK__';

            return (
              <div
                key={`row_card_${idx}`}
                onClick={() => {
                  if (isTargetForSwap) {
                    handleSwap(swappingRowIdx!, idx);
                  }
                }}
                className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all ${
                  isSwappingThis
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-300'
                    : isTargetForSwap
                    ? 'border-dashed border-orange-400 bg-orange-50/40 hover:bg-orange-100/60 cursor-pointer'
                    : player
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-dashed border-slate-300 bg-slate-100/50'
                }`}
              >
                {/* Order Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                    #{orderNum}
                  </div>
                </div>

                {/* Athlete Dropdown or Custom Inputs */}
                {!isCustom ? (
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectValue}
                      onChange={(e) => handleSelectPlayer(idx, e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 truncate focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    >
                      <option value="__BLANK__">-- BLANK / UNASSIGNED ROW --</option>
                      <optgroup label="Category Roster">
                        {categoryPlayers.map((cp, cpIdx) => {
                          const alreadyIn = draftRows.findIndex(
                            (r, i) => i !== idx && r && r.name === cp.name && r.club === cp.club
                          );
                          const tag = alreadyIn !== -1 ? ` [Row #${startNumber + alreadyIn}]` : '';
                          return (
                            <option key={`cp_${cpIdx}`} value={`${cp.name}:::${cp.club || ''}`}>
                              {cp.name} ({cp.club || 'Independent'}){tag}
                            </option>
                          );
                        })}
                      </optgroup>
                      <option value="__CUSTOM__">✍️ Custom Walk-in Athlete...</option>
                    </select>

                    {player && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5 pl-1 truncate">
                        Club: <strong>{player.club || 'Independent'}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Athlete Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-1/2 text-xs border border-slate-300 rounded px-2 py-1 font-bold uppercase"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Club / Dojo"
                      value={customClub}
                      onChange={(e) => setCustomClub(e.target.value)}
                      className="w-1/2 text-xs border border-slate-300 rounded px-2 py-1 font-medium"
                    />
                    <button
                      onClick={() => handleSaveCustom(idx)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCustomIdx(null)}
                      className="text-xs text-slate-400 hover:text-black px-1.5 cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Actions: Move Up, Move Down, Swap, Clear */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(idx);
                    }}
                    disabled={idx === 0}
                    className="p-1.5 rounded text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    title="Move athlete up"
                  >
                    <ArrowUp size={13} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(idx);
                    }}
                    disabled={idx === totalRows - 1}
                    className="p-1.5 rounded text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    title="Move athlete down"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (swappingRowIdx === null) setSwappingRowIdx(idx);
                      else if (swappingRowIdx === idx) setSwappingRowIdx(null);
                      else handleSwap(swappingRowIdx, idx);
                    }}
                    className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                      isSwappingThis
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-500 hover:text-orange-600 hover:bg-slate-100'
                    }`}
                    title={isSwappingThis ? "Click another row to swap" : "Swap this row"}
                  >
                    <ArrowLeftRight size={13} />
                  </button>

                  {player && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearRow(idx);
                      }}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Clear to blank row"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* 4. FOOTER                                                */}
        {/* ======================================================== */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-slate-600 hover:text-black font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset to original order"
            >
              <RotateCcw size={13} />
              Reset Order
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50 transition-colors cursor-pointer"
              title="Clear all rows to blank"
            >
              <Trash2 size={13} />
              Clear All Rows
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply(draftRows);
                onClose();
              }}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save size={14} />
              Apply & Save Kata Draw
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManualKataEditorModal;
