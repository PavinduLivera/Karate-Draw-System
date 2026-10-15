"use client";
import React, { useState, useEffect } from 'react';
import { Player, DrawSlot, generateKumiteDrawSlots } from '@/lib/tournament-logic';
import { 
  X, 
  ArrowLeftRight, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  UserPlus, 
  Save, 
  RotateCcw,
  SlidersHorizontal,
  Info,
  ShieldCheck
} from 'lucide-react';

interface ManualDrawEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlots: DrawSlot[];
  allPlayers: Player[];
  categoryTitle: string;
  size?: 8 | 16;
  onApply: (newSlots: DrawSlot[]) => void;
}

export const ManualDrawEditorModal: React.FC<ManualDrawEditorModalProps> = ({
  isOpen,
  onClose,
  initialSlots,
  allPlayers,
  categoryTitle,
  size = 16,
  onApply,
}) => {
  // Working draft of slots inside the modal
  const [draftSlots, setDraftSlots] = useState<DrawSlot[]>([]);
  
  // Interactive click-to-swap tracking: index of first slot selected for swapping
  const [swappingSlotIdx, setSwappingSlotIdx] = useState<number | null>(null);

  // Quick swap dropdowns
  const [quickSwapA, setQuickSwapA] = useState<number>(1);
  const [quickSwapB, setQuickSwapB] = useState<number>(2);

  // Custom inline editor state (for typing custom name/club)
  const [editingCustomSlot, setEditingCustomSlot] = useState<number | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customClub, setCustomClub] = useState<string>('');

  // Sync draftSlots whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSlots(initialSlots.map((s) => ({ ...s, player: s.player ? { ...s.player } : null })));
      setSwappingSlotIdx(null);
      setEditingCustomSlot(null);
    }
  }, [isOpen, initialSlots]);

  if (!isOpen) return null;

  // Swap two slots
  const handleSwap = (idx1: number, idx2: number) => {
    if (idx1 === idx2 || idx1 < 0 || idx2 < 0 || idx1 >= size || idx2 >= size) return;
    setDraftSlots((prev) => {
      const next = [...prev];
      const p1 = next[idx1].player;
      const b1 = next[idx1].isBye;
      const p2 = next[idx2].player;
      const b2 = next[idx2].isBye;

      next[idx1] = { ...next[idx1], player: p2, isBye: b2 };
      next[idx2] = { ...next[idx2], player: p1, isBye: b1 };
      return next;
    });
    setSwappingSlotIdx(null);
  };

  // Click on a slot's swap button
  const handleSlotSwapClick = (idx: number) => {
    if (swappingSlotIdx === null) {
      setSwappingSlotIdx(idx);
    } else if (swappingSlotIdx === idx) {
      setSwappingSlotIdx(null);
    } else {
      handleSwap(swappingSlotIdx, idx);
    }
  };

  // Change slot player from dropdown
  const handleSlotPlayerChange = (slotIdx: number, selectedVal: string) => {
    if (selectedVal === '__BYE__') {
      setDraftSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = { ...next[slotIdx], player: null, isBye: true };
        return next;
      });
      return;
    }

    if (selectedVal === '__CUSTOM__') {
      const cur = draftSlots[slotIdx]?.player;
      setCustomName(cur?.name || '');
      setCustomClub(cur?.club || '');
      setEditingCustomSlot(slotIdx);
      return;
    }

    // Selected an existing player from allPlayers (value is player name + club)
    const [pName, pClub] = selectedVal.split(':::');
    const matched = allPlayers.find(
      (p) => p.name === pName && (p.club || '') === (pClub || '')
    );

    if (!matched) return;

    setDraftSlots((prev) => {
      const next = [...prev];
      // Check if this player is already in another slot -> vacate the old slot to avoid duplicates!
      const oldIdx = next.findIndex(
        (s, i) => i !== slotIdx && s.player && s.player.name === matched.name && s.player.club === matched.club
      );

      if (oldIdx !== -1) {
        // Swap: previous slot takes what this slot had
        next[oldIdx] = { ...next[oldIdx], player: next[slotIdx].player, isBye: next[slotIdx].isBye };
      }

      next[slotIdx] = { ...next[slotIdx], player: { ...matched }, isBye: false };
      return next;
    });
  };

  // Save custom name and club
  const handleSaveCustom = (slotIdx: number) => {
    if (!customName.trim()) {
      setEditingCustomSlot(null);
      return;
    }
    setDraftSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = {
        ...next[slotIdx],
        player: {
          name: customName.trim(),
          club: customClub.trim() || 'Independent',
          category: allPlayers[0]?.category || 'Kumite',
          gender: allPlayers[0]?.gender || 'Open',
        },
        isBye: false,
      };
      return next;
    });
    setEditingCustomSlot(null);
    setCustomName('');
    setCustomClub('');
  };

  // Clear slot to BYE
  const handleClearSlot = (slotIdx: number) => {
    setDraftSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], player: null, isBye: true };
      return next;
    });
  };

  // Reset to auto-generated WKF algorithm
  const handleResetToAuto = () => {
    const fresh = generateKumiteDrawSlots(allPlayers, size);
    setDraftSlots(fresh);
    setSwappingSlotIdx(null);
    setEditingCustomSlot(null);
  };

  // Clear all slots to BYE
  const handleClearAll = () => {
    setDraftSlots(
      Array.from({ length: size }, (_, i) => ({
        slotNumber: i + 1,
        player: null,
        corner: i % 2 === 0 ? 'AKA' : 'AO',
        isBye: true,
      }))
    );
    setSwappingSlotIdx(null);
  };

  // Assign an unplaced player into the first available BYE slot
  const handleAssignUnplaced = (p: Player) => {
    const emptyIdx = draftSlots.findIndex((s) => s.player === null);
    if (emptyIdx === -1) {
      alert("All slots are currently occupied. Please clear or swap a slot first.");
      return;
    }
    setDraftSlots((prev) => {
      const next = [...prev];
      next[emptyIdx] = { ...next[emptyIdx], player: { ...p }, isBye: false };
      return next;
    });
  };

  // Real-time Diagnostics
  const numMatches = size / 2;
  const halfSize = size / 2;
  const topHalfSlots = draftSlots.slice(0, halfSize);
  const botHalfSlots = draftSlots.slice(halfSize);

  const topCount = topHalfSlots.filter((s) => s.player !== null).length;
  const botCount = botHalfSlots.filter((s) => s.player !== null).length;
  const isHalvesBalanced = Math.abs(topCount - botCount) <= 1;

  // Round 1 same-club clash check
  const r1Clashes: string[] = [];
  for (let m = 0; m < numMatches; m++) {
    const p1 = draftSlots[m * 2]?.player;
    const p2 = draftSlots[m * 2 + 1]?.player;
    if (p1 && p2 && p1.club && p2.club) {
      const c1 = p1.club.trim().toLowerCase();
      const c2 = p2.club.trim().toLowerCase();
      if (c1 === c2 && c1 !== '' && c1 !== 'independent') {
        r1Clashes.push(
          `Match ${m + 1} (Slots ${m * 2 + 1} & ${m * 2 + 2}): "${p1.name}" vs "${p2.name}" (Same Club: ${p1.club})`
        );
      }
    }
  }

  // Club half distribution warning (if a club has 2 players, both shouldn't be in same half)
  const clubHalfCounts: Record<string, { top: number; bot: number }> = {};
  draftSlots.forEach((s, idx) => {
    const p = s.player;
    if (p && p.club) {
      const key = p.club.trim().toLowerCase();
      if (key && key !== 'independent') {
        if (!clubHalfCounts[key]) clubHalfCounts[key] = { top: 0, bot: 0 };
        if (idx < halfSize) clubHalfCounts[key].top++;
        else clubHalfCounts[key].bot++;
      }
    }
  });

  const clubHalfWarnings: string[] = [];
  for (const [cKey, counts] of Object.entries(clubHalfCounts)) {
    const total = counts.top + counts.bot;
    if (total === 2 && (counts.top === 2 || counts.bot === 2)) {
      const originalClubName = draftSlots.find((s) => s.player?.club?.trim().toLowerCase() === cKey)?.player?.club || cKey;
      clubHalfWarnings.push(
        `Club "${originalClubName}" has both players in the ${counts.top === 2 ? 'Top Half (Pool A)' : 'Bottom Half (Pool B)'}`
      );
    }
  }

  // Unplaced players
  const unplacedPlayers = allPlayers.filter((ap) => {
    return !draftSlots.some(
      (s) => s.player && s.player.name === ap.name && (s.player.club || '') === (ap.club || '')
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ======================================================== */}
        {/* 1. MODAL HEADER                                          */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">MANUAL DRAW EDITOR</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {size}-Bracket
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {categoryTitle} • {allPlayers.length} Category Players
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
        {/* 2. DIAGNOSTICS & STATUS BANNER                           */}
        {/* ======================================================== */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Half balance status */}
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-slate-600">Distribution:</span>
            <span className={`px-2 py-0.5 rounded-md font-bold ${
              isHalvesBalanced ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              Top Half: {topCount} | Bottom Half: {botCount} {isHalvesBalanced ? '✓ Balanced' : '⚠️ Imbalanced'}
            </span>
          </div>

          {/* Quick Swap Controls */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Swap:</span>
            <select
              value={quickSwapA}
              onChange={(e) => setQuickSwapA(parseInt(e.target.value))}
              className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 bg-slate-50"
            >
              {draftSlots.map((_, i) => (
                <option key={`qA_${i + 1}`} value={i + 1}>
                  Slot {i + 1}
                </option>
              ))}
            </select>
            <span className="text-slate-400">↔</span>
            <select
              value={quickSwapB}
              onChange={(e) => setQuickSwapB(parseInt(e.target.value))}
              className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 bg-slate-50"
            >
              {draftSlots.map((_, i) => (
                <option key={`qB_${i + 1}`} value={i + 1}>
                  Slot {i + 1}
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

          {/* Conflict indicator summary */}
          <div className="flex items-center gap-1.5">
            {r1Clashes.length === 0 && clubHalfWarnings.length === 0 ? (
              <span className="flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                <ShieldCheck size={13} />
                Club Separation Valid
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                <AlertTriangle size={13} />
                {r1Clashes.length > 0 ? `${r1Clashes.length} Round 1 Clash!` : `${clubHalfWarnings.length} Club Separation Alert`}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Warnings Details (if any) */}
        {(r1Clashes.length > 0 || clubHalfWarnings.length > 0) && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800 flex flex-col gap-1">
            {r1Clashes.map((c, i) => (
              <div key={`rc_${i}`} className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={13} className="text-red-600 shrink-0" />
                <span>Round 1 Club Clash: {c}</span>
              </div>
            ))}
            {clubHalfWarnings.map((w, i) => (
              <div key={`hw_${i}`} className="flex items-center gap-1.5 text-amber-800 font-medium">
                <Info size={13} className="text-amber-600 shrink-0" />
                <span>Club Half Notice: {w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned Players Bar (if any) */}
        {unplacedPlayers.length > 0 && (
          <div className="px-6 py-2 bg-amber-50/80 border-b border-amber-200 text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">Unplaced Players ({unplacedPlayers.length}):</span>
              <div className="flex flex-wrap gap-1.5">
                {unplacedPlayers.map((p, i) => (
                  <button
                    key={`up_${i}`}
                    onClick={() => handleAssignUnplaced(p)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-800 font-semibold border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                    title="Click to assign into first open slot"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({p.club})</span>
                    <span className="text-blue-600 font-bold text-[10px]">+Add</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Click-to-swap active alert banner */}
        {swappingSlotIdx !== null && (
          <div className="px-6 py-2 bg-blue-500 text-white text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="animate-pulse" />
              <span>
                Slot {swappingSlotIdx + 1} ({draftSlots[swappingSlotIdx]?.player?.name || 'BYE'}) selected. Click ANY other slot to swap!
              </span>
            </div>
            <button
              onClick={() => setSwappingSlotIdx(null)}
              className="text-white hover:text-blue-100 underline text-xs font-semibold cursor-pointer"
            >
              Cancel Swap
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SLOTS GRID BODY (POOL A & POOL B COLUMNS)             */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* --- POOL A (TOP HALF: SLOTS 1 to 8) --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-300 pb-1.5">
                <span className="font-black text-sm tracking-wide uppercase text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  POOL A (TOP HALF)
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Slots 1 – {halfSize} ({topCount} Players)
                </span>
              </div>

              {Array.from({ length: numMatches / 2 }).map((_, matchIdx) => {
                const s1Idx = matchIdx * 2;
                const s2Idx = matchIdx * 2 + 1;
                return renderMatchPair(matchIdx, s1Idx, s2Idx);
              })}
            </div>

            {/* --- POOL B (BOTTOM HALF: SLOTS 9 to 16) --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-300 pb-1.5">
                <span className="font-black text-sm tracking-wide uppercase text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  POOL B (BOTTOM HALF)
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Slots {halfSize + 1} – {size} ({botCount} Players)
                </span>
              </div>

              {Array.from({ length: numMatches / 2 }).map((_, i) => {
                const matchIdx = numMatches / 2 + i;
                const s1Idx = matchIdx * 2;
                const s2Idx = matchIdx * 2 + 1;
                return renderMatchPair(matchIdx, s1Idx, s2Idx);
              })}
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. MODAL FOOTER ACTIONS                                  */}
        {/* ======================================================== */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToAuto}
              className="flex items-center gap-1.5 text-slate-700 hover:text-black font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset slots to smart WKF algorithmic placement"
            >
              <Sparkles size={14} className="text-amber-500" />
              Reset to Auto Draw
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50 transition-colors cursor-pointer"
              title="Clear all 16 slots to BYE"
            >
              <Trash2 size={13} />
              Clear All Slots
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
                onApply(draftSlots);
                onClose();
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save size={14} />
              Apply & Save Draw
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  // Helper to render a 2-slot Match card (AKA vs AO)
  function renderMatchPair(matchIdx: number, s1Idx: number, s2Idx: number) {
    const s1 = draftSlots[s1Idx];
    const s2 = draftSlots[s2Idx];

    const p1 = s1?.player;
    const p2 = s2?.player;

    const isMatchClash =
      p1 &&
      p2 &&
      p1.club &&
      p2.club &&
      p1.club.trim().toLowerCase() === p2.club.trim().toLowerCase() &&
      p1.club.trim().toLowerCase() !== 'independent';

    return (
      <div 
        key={`match_card_${matchIdx}`}
        className={`rounded-xl border p-2.5 bg-white shadow-2xs transition-all ${
          isMatchClash ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
            Match {matchIdx + 1}
          </span>
          {isMatchClash && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              ⚠️ Same Club Clash
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {renderSlotItem(s1Idx, s1, 'AKA')}
          {renderSlotItem(s2Idx, s2, 'AO')}
        </div>
      </div>
    );
  }

  // Helper to render individual slot inside a match card
  function renderSlotItem(slotIdx: number, slot: DrawSlot, corner: 'AKA' | 'AO') {
    const isAka = corner === 'AKA';
    const isSwappingThis = swappingSlotIdx === slotIdx;
    const isTargetForSwap = swappingSlotIdx !== null && swappingSlotIdx !== slotIdx;
    const isCustom = editingCustomSlot === slotIdx;

    const assignedPlayer = slot?.player;
    const slotNumber = slotIdx + 1;

    // Dropdown value
    const selectValue = assignedPlayer
      ? `${assignedPlayer.name}:::${assignedPlayer.club || ''}`
      : '__BYE__';

    return (
      <div
        key={`slot_card_${slotIdx}`}
        onClick={() => {
          if (isTargetForSwap) {
            handleSwap(swappingSlotIdx!, slotIdx);
          }
        }}
        className={`rounded-lg border px-2.5 py-1.5 flex flex-col gap-1 transition-all ${
          isSwappingThis
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
            : isTargetForSwap
            ? 'border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-100/60 cursor-pointer'
            : isAka
            ? 'border-red-200 bg-red-50/30'
            : 'border-blue-200 bg-blue-50/30'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Slot Number & Corner Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-700 w-5 text-center">
              #{slotNumber}
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider text-white ${
                isAka ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              {corner}
            </span>
          </div>

          {/* Player Selector or Custom Mode */}
          {!isCustom ? (
            <div className="flex-1 min-w-0">
              <select
                value={selectValue}
                onChange={(e) => handleSlotPlayerChange(slotIdx, e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="__BYE__">-- BYE / EMPTY --</option>
                <optgroup label="Category Roster">
                  {allPlayers.map((p, pIdx) => {
                    const alreadyInIdx = draftSlots.findIndex(
                      (s, i) => i !== slotIdx && s.player && s.player.name === p.name && s.player.club === p.club
                    );
                    const tag = alreadyInIdx !== -1 ? ` [Already in Slot ${alreadyInIdx + 1}]` : '';
                    return (
                      <option key={`p_${pIdx}`} value={`${p.name}:::${p.club || ''}`}>
                        {p.name} ({p.club || 'Independent'}){tag}
                      </option>
                    );
                  })}
                </optgroup>
                <option value="__CUSTOM__">✍️ Custom Player Name / Walk-in...</option>
              </select>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="text"
                placeholder="Player Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-1/2 text-xs border border-slate-300 rounded px-1.5 py-0.5 font-bold"
                autoFocus
              />
              <input
                type="text"
                placeholder="Club / Dojo"
                value={customClub}
                onChange={(e) => setCustomClub(e.target.value)}
                className="w-1/2 text-xs border border-slate-300 rounded px-1.5 py-0.5"
              />
              <button
                onClick={() => handleSaveCustom(slotIdx)}
                className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setEditingCustomSlot(null)}
                className="text-xs text-slate-500 hover:text-black px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick slot action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSlotSwapClick(slotIdx);
              }}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                isSwappingThis
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title={isSwappingThis ? "Click another slot to swap" : "Swap this slot with another"}
            >
              <ArrowLeftRight size={13} />
            </button>
            {assignedPlayer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSlot(slotIdx);
                }}
                className="p-1 rounded text-xs text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear player to BYE"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Player Club Subtitle */}
        {assignedPlayer && !isCustom && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 pl-7">
            <span className="italic font-medium truncate">Club: {assignedPlayer.club || 'Independent'}</span>
          </div>
        )}
      </div>
    );
  }
};

export default ManualDrawEditorModal;
