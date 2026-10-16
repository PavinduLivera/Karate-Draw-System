"use client";
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Download, 
  Plus, 
  X, 
  Check, 
  AlertTriangle, 
  RotateCcw,
  ShieldAlert,
  Save,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export interface PlayerItem {
  id?: string;
  championship?: string;
  eventType: 'Kata' | 'Kumite' | 'Team Kata' | string;
  category: string;
  ageGroup?: string;
  weight?: string;
  gender: string;
  club: string;
  name: string;
}

interface PlayersManagerProps {
  players: PlayerItem[];
  onUpdatePlayers: (newPlayers: PlayerItem[]) => void;
  onNavigate: (view: 'upload' | 'players' | 'kata' | 'kumite') => void;
}

export const PlayersManager: React.FC<PlayersManagerProps> = ({
  players,
  onUpdatePlayers,
  onNavigate,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterClub, setFilterClub] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formClub, setFormClub] = useState('');
  const [formEvent, setFormEvent] = useState<'Kumite' | 'Kata' | 'Team Kata'>('Kumite');
  const [formCategory, setFormCategory] = useState('');
  const [formAgeGroup, setFormAgeGroup] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formChampionship, setFormChampionship] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation modal state
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerItem | null>(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Unique clubs, categories, age groups for dropdowns & datalists
  const uniqueClubs = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => {
      if (p.club && p.club.trim()) set.add(p.club.trim());
    });
    return Array.from(set).sort();
  }, [players]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [players]);

  const uniqueAgeGroups = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => {
      if (p.ageGroup && p.ageGroup.trim()) set.add(p.ageGroup.trim());
    });
    return Array.from(set).sort();
  }, [players]);

  const defaultChampionship = players[0]?.championship || 'COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025';

  // Stats
  const kumiteCount = useMemo(() => players.filter((p) => (p.eventType || '').toLowerCase().includes('kumite')).length, [players]);
  const teamKataCount = useMemo(() => players.filter((p) => {
    const ev = (p.eventType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return ev === 'team kata' || ev.includes('team kata') || cat.includes('team kata');
  }).length, [players]);
  const kataCount = useMemo(() => players.filter((p) => {
    const ev = (p.eventType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return (ev === 'kata' || ev.includes('kata')) && !ev.includes('team') && !cat.includes('team kata');
  }).length, [players]);

  // Filtered Players list
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesClub = (p.club || '').toLowerCase().includes(q);
        const matchesCategory = (p.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesClub && !matchesCategory) return false;
      }

      if (filterEvent !== 'all') {
        const ev = (p.eventType || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        if (filterEvent === 'team kata') {
          if (ev !== 'team kata' && !cat.includes('team kata')) return false;
        } else if (filterEvent === 'kata') {
          if ((ev !== 'kata' && !ev.includes('kata')) || ev.includes('team') || cat.includes('team kata')) return false;
        } else if (filterEvent === 'kumite') {
          if (!ev.includes('kumite')) return false;
        }
      }

      if (filterGender !== 'all' && (p.gender || '').toLowerCase() !== filterGender.toLowerCase()) {
        return false;
      }

      if (filterClub !== 'all' && (p.club || '').toLowerCase() !== filterClub.toLowerCase()) {
        return false;
      }

      if (filterCategory !== 'all' && (p.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [players, searchQuery, filterEvent, filterGender, filterClub, filterCategory]);

  // Open modal for Adding
  const handleOpenAdd = () => {
    setEditingPlayerId(null);
    setFormName('');
    setFormClub(uniqueClubs[0] || '');
    setFormEvent('Kumite');
    setFormCategory(uniqueCategories[0] || 'Cadet');
    setFormAgeGroup(uniqueAgeGroups[0] || '14-15');
    setFormWeight('-52kg');
    setFormGender('Male');
    setFormChampionship(defaultChampionship);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (player: PlayerItem) => {
    setEditingPlayerId(player.id || null);
    setFormName(player.name || '');
    setFormClub(player.club || '');
    setFormEvent((player.eventType as 'Kumite' | 'Kata' | 'Team Kata') || 'Kumite');
    setFormCategory(player.category || '');
    setFormAgeGroup(player.ageGroup || '');
    setFormWeight(player.weight || '');
    setFormGender((player.gender as 'Male' | 'Female') || 'Male');
    setFormChampionship(player.championship || defaultChampionship);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Player (Add or Edit)
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Player Name is required');
      return;
    }
    if (!formClub.trim()) {
      setFormError('Club / Dojo is required');
      return;
    }

    const isTeam = formEvent === 'Team Kata';
    let cat = formCategory.trim() || (isTeam ? 'Team Kata' : 'Open');
    if (isTeam && !cat.toLowerCase().includes('team')) {
      cat = `Team Kata - ${cat}`;
    }

    if (editingPlayerId) {
      // Update existing
      const updated = players.map((p) => {
        if (p.id === editingPlayerId) {
          return {
            ...p,
            name: formName.trim(),
            club: formClub.trim(),
            eventType: formEvent,
            category: cat,
            ageGroup: formAgeGroup.trim() || 'All Ages',
            weight: formEvent === 'Kumite' ? formWeight.trim() || 'Open Weight' : '',
            gender: formGender,
            championship: formChampionship.trim() || defaultChampionship,
          };
        }
        return p;
      });
      onUpdatePlayers(updated);
      showToast(`Updated athlete "${formName.trim()}"`);
    } else {
      // Add new
      const newPlayer: PlayerItem = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: formName.trim(),
        club: formClub.trim(),
        eventType: formEvent,
        category: cat,
        ageGroup: formAgeGroup.trim() || 'All Ages',
        weight: formEvent === 'Kumite' ? formWeight.trim() || 'Open Weight' : '',
        gender: formGender,
        championship: formChampionship.trim() || defaultChampionship,
      };
      onUpdatePlayers([newPlayer, ...players]);
      showToast(`Added new athlete "${formName.trim()}"`);
    }

    setIsModalOpen(false);
  };

  // Confirm delete
  const handleDeleteConfirm = () => {
    if (!deletingPlayer) return;
    const updated = players.filter((p) => p.id !== deletingPlayer.id);
    onUpdatePlayers(updated);
    showToast(`Removed athlete "${deletingPlayer.name}"`);
    setDeletingPlayer(null);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (players.length === 0) return;
    const exportRows = players.map((p) => ({
      'Championship Name': p.championship || defaultChampionship,
      'Event Type': p.eventType,
      'Category': p.category,
      'Age Group / Grade': p.ageGroup || '',
      'Weight Class': p.weight || '',
      'Gender': p.gender,
      'Club / Association': p.club,
      'Player Name': p.name,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    const safeTitle = defaultChampionship.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    XLSX.writeFile(wb, `${safeTitle}_Updated_Roster.xlsx`);
    showToast('Excel roster downloaded successfully!');
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">ATHLETES DIRECTORY</h2>
            <span className="bg-green-100 text-green-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-green-200">
              SAVED IN SYSTEM
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Add, update, or remove competitors. All modifications automatically synchronize with Kata and Kumite draw brackets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-white text-slate-700 hover:text-black hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Download updated roster as Excel (.xlsx)"
          >
            <Download size={14} className="text-slate-500" />
            Export Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <UserPlus size={15} />
            + Add New Athlete
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black">
            <Users size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{players.length}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Athletes</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-black">
            🥊
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{kumiteCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kumite</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black">
            🥋
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{kataCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Indiv. Kata</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black">
            <Users size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-purple-900">{teamKataCount}</div>
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Team Kata</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
            🏛️
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{uniqueClubs.length}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clubs / Dojos</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search athlete by name, club, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Event Filter */}
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Events</option>
            <option value="kumite">Kumite</option>
            <option value="kata">Individual Kata</option>
            <option value="team kata">Team Kata</option>
          </select>

          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          {/* Club Filter */}
          <select
            value={filterClub}
            onChange={(e) => setFilterClub(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 max-w-[140px] truncate"
          >
            <option value="all">All Clubs ({uniqueClubs.length})</option>
            {uniqueClubs.map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 max-w-[140px] truncate"
          >
            <option value="all">All Categories ({uniqueCategories.length})</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th className="py-3 px-4">Athlete Name</th>
                <th className="py-3 px-4">Club / Dojo</th>
                <th className="py-3 px-3 text-center">Event</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Age Group</th>
                <th className="py-3 px-3">Weight Class</th>
                <th className="py-3 px-3 text-center">Gender</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((p, idx) => {
                  const isKumite = (p.eventType || '').toLowerCase() === 'kumite';
                  const isMale = (p.gender || '').toLowerCase() === 'male';

                  return (
                    <tr 
                      key={p.id || `p_row_${idx}`}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-bold text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase">
                          {p.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {p.club || 'Independent'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {((p.eventType || '').toLowerCase() === 'team kata' || (p.category || '').toLowerCase().includes('team kata')) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                            <Users size={10} /> Team Kata
                          </span>
                        ) : isKumite ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                            Kumite
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                            Kata
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {p.category}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {p.ageGroup || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {p.weight || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMale
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {p.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit athlete details"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingPlayer(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete athlete from roster"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-slate-600">No matching athletes found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 text-slate-500 text-xs flex justify-between items-center font-medium">
          <span>Showing {filteredPlayers.length} of {players.length} athletes</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('kumite')}
              className="text-blue-600 hover:underline font-bold"
            >
              Go to Kumite Draws →
            </button>
            <button
              onClick={() => onNavigate('kata')}
              className="text-orange-600 hover:underline font-bold"
            >
              Go to Kata Sheets →
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT PLAYER MODAL                                  */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  {editingPlayerId ? <Edit3 size={16} /> : <UserPlus size={16} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingPlayerId ? 'Edit Athlete Details' : 'Add New Athlete'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingPlayerId ? 'Modify participant entry in tournament roster' : 'Add a new competitor to the roster'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Player Name */}
              {/* Player / Team Name */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  {formEvent === 'Team Kata' ? 'Team Name / Competitors' : 'Athlete Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={formEvent === 'Team Kata' ? "e.g. Team A (Kasun, Nuwan, Amal)" : "e.g. Shamlan Shabeer"}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                />
              </div>

              {/* Club / Dojo */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Club / Association <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="club_suggestions"
                  placeholder="e.g. Thabari, Khaldun, Shotokan"
                  value={formClub}
                  onChange={(e) => setFormClub(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <datalist id="club_suggestions">
                  {uniqueClubs.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Event Type & Gender (2-col) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formEvent}
                    onChange={(e) => setFormEvent(e.target.value as 'Kumite' | 'Kata' | 'Team Kata')}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Kumite">Kumite (Sparring)</option>
                    <option value="Kata">Kata (Individual)</option>
                    <option value="Team Kata">Team Kata (Team)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Male' | 'Female')}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Category & Age Group (2-col) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category_suggestions"
                    placeholder="e.g. Cadet, Junior, Novice"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="category_suggestions">
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Age Group / Grade
                  </label>
                  <input
                    type="text"
                    list="age_suggestions"
                    placeholder="e.g. 14-15, Under 12"
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="age_suggestions">
                    {uniqueAgeGroups.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Weight Class (Only for Kumite) */}
              {formEvent === 'Kumite' && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Weight Class
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. -52kg, -57kg, +70kg, Open Weight"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Championship Name (Hidden or Read-only preview) */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Championship
                </label>
                <input
                  type="text"
                  value={formChampionship}
                  onChange={(e) => setFormChampionship(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-black px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Save size={14} />
                  {editingPlayerId ? 'Save Changes' : 'Add Athlete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION DIALOG                               */}
      {/* ======================================================== */}
      {deletingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Delete Athlete?</h3>
                <p className="text-xs text-slate-500 font-medium">This action will remove the athlete from the tournament roster.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 uppercase">{deletingPlayer.name}</div>
              <div className="text-slate-500 font-semibold">Club: {deletingPlayer.club}</div>
              <div className="text-slate-500">Event: {deletingPlayer.eventType} ({deletingPlayer.category} {deletingPlayer.weight || ''})</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingPlayer(null)}
                className="text-xs font-bold text-slate-600 hover:text-black px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                Delete Athlete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlayersManager;
