"use client";
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileText, 
  SwatchBook, 
  RotateCcw, 
  CheckCircle2, 
  Users, 
  Trash2, 
  FileSpreadsheet,
  LayoutDashboard,
  Layers
} from 'lucide-react';
import KataSection from '@/components/KataSection';
import KumiteSection from '@/components/KumiteSection';
import PlayersManager, { PlayerItem } from '@/components/PlayersManager';
import { ConfirmationModal } from '@/components/ConfirmationModal';

const STORAGE_KEY = 'karate_os_players_data';

export default function KarateApp() {
  const [data, setData] = useState<PlayerItem[]>([]);
  const [view, setView] = useState<'upload' | 'players' | 'kata' | 'kumite'>('upload');
  const [isLoaded, setIsLoaded] = useState(false);
  const [championshipTitle, setChampionshipTitle] = useState('COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025');

  // Confirmation modal state for safe data resets and overwrites
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

  // Load persisted players from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed);
          setIsLoaded(true);
          if (parsed[0]?.championship) {
            setChampionshipTitle(parsed[0].championship);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load saved tournament data from localStorage', e);
    }
  }, []);

  // Centralized function to update state and persist to localStorage
  const savePlayersData = (newPlayers: PlayerItem[]) => {
    setData(newPlayers);
    if (newPlayers.length > 0) {
      setIsLoaded(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlayers));
      } catch (e) {
        console.error('Failed to save tournament data to localStorage', e);
      }
    } else {
      setIsLoaded(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear localStorage', e);
      }
    }
  };

  // Process and load file data
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        const formattedData: PlayerItem[] = jsonData.map((item: any, idx: number) => {
          // Robust column extraction supporting common variations
          const rawEvent = (
            item["Event Type"] || item["Event"] || item["EventType"] || item["Discipline"] || item["Event Name"] || ""
          ).toString().trim();

          const rawCategory = (
            item["Category"] || item["Event Category"] || item["Division"] || item["Kata Category"] || ""
          ).toString().trim();

          const rawName = (
            item["Player Name"] || item["Athlete Name"] || item["Name"] || item["Competitor"] || item["Team Name"] || item["Athlete"] || ""
          ).toString().trim();

          const rawClub = (
            item["Club / Association"] || item["Club"] || item["Association"] || item["Dojo"] || item["Team"] || item["School"] || ""
          ).toString().trim();

          const rawAge = (
            item["Age Group / Grade"] || item["Age Group"] || item["Age"] || item["Grade"] || item["Division Age"] || ""
          ).toString().trim();

          const rawWeight = (
            item["Weight Class"] || item["Weight"] || item["WeightClass"] || ""
          ).toString().trim();

          const rawGender = (
            item["Gender"] || item["Sex"] || ""
          ).toString().trim();

          const rawChampionship = (
            item["Championship Name"] || item["Championship"] || item["Tournament"] || item["Tournament Name"] || ""
          ).toString().trim();

          const lowerEvent = rawEvent.toLowerCase();
          const lowerCategory = rawCategory.toLowerCase();

          // Check if this row is Team Kata (either Event Type or Category specifies Team Kata)
          const isTeamKata = 
            lowerEvent === 'team kata' ||
            lowerEvent === 'teamkata' ||
            lowerEvent === 'team-kata' ||
            (lowerEvent.includes('team') && lowerEvent.includes('kata')) ||
            lowerCategory.includes('team kata') ||
            lowerCategory.includes('team-kata');

          let eventType = "Kumite";
          if (isTeamKata) {
            eventType = "Team Kata";
          } else if (lowerEvent.includes('kata') || lowerCategory.includes('kata')) {
            eventType = "Kata";
          } else if (lowerEvent.includes('kumite') || lowerCategory.includes('kumite')) {
            eventType = "Kumite";
          } else if (rawEvent) {
            eventType = rawEvent;
          }

          // Category normalization
          let category = rawCategory || (isTeamKata ? 'Team Kata' : 'Open');
          // If event is Team Kata, ensure category clearly contains "Team Kata" so it does not collide with individual kata
          if (isTeamKata && !category.toLowerCase().includes('team')) {
            category = `Team Kata - ${category}`;
          }

          return {
            id: `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
            championship: rawChampionship || championshipTitle,
            eventType: eventType,
            category: category,
            ageGroup: rawAge || "All Ages",
            weight: (eventType === 'Kata' || eventType === 'Team Kata') ? "" : rawWeight,
            gender: rawGender || "Male",
            club: rawClub || "Independent",
            name: rawName || (isTeamKata ? `Team ${idx + 1}` : `Athlete ${idx + 1}`)
          };
        });

        if (formattedData[0]?.championship) {
          setChampionshipTitle(formattedData[0].championship);
        }

        savePlayersData(formattedData);
        setView('players');
      } catch (err) {
        console.error('Error parsing uploaded file', err);
        alert('Could not parse Excel file. Please ensure it is a valid .xlsx or .csv.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle uploading and parsing Excel file (with overwrite protection)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again if cancelled
    e.target.value = '';

    if (isLoaded && data.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Overwrite Tournament Data?',
        message: `Active tournament data with ${data.length} athletes is currently saved in the system.`,
        details: 'Uploading a new Excel file will replace all existing athlete rosters, Kata scores, and Kumite match progress.',
        confirmText: 'Yes, Overwrite & Upload',
        variant: 'danger',
        onConfirm: () => {
          processUploadedFile(file);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    processUploadedFile(file);
  };

  // Reset / Clear tournament data with confirmation modal
  const handleClearData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Tournament Data?',
      message: `Are you sure you want to clear all ${data.length} athletes from the system?`,
      details: 'This will reset the system back to the initial upload dashboard. Export your roster to Excel first if you wish to keep a copy.',
      confirmText: 'Yes, Clear All Data',
      variant: 'danger',
      onConfirm: () => {
        savePlayersData([]);
        setView('upload');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const kumiteCount = data.filter((p) => (p.eventType || '').toLowerCase().includes('kumite')).length;
  const teamKataCount = data.filter((p) => {
    const ev = (p.eventType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return ev === 'team kata' || ev.includes('team kata') || cat.includes('team kata');
  }).length;
  const indivKataCount = data.filter((p) => {
    const ev = (p.eventType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return (ev === 'kata' || ev.includes('kata')) && !ev.includes('team') && !cat.includes('team kata');
  }).length;
  const totalKataCount = indivKataCount + teamKataCount;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans print:bg-white print:min-h-0">
      
      {/* ======================================================== */}
      {/* TOP STICKY HEADER                                        */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200 py-3 px-6 sm:px-8 sticky top-0 z-20 print:hidden shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & System Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('upload')}>
            <div className="bg-black p-2 rounded-xl shadow-xs">
              <SwatchBook className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase leading-none">
                Karate<span className="text-green-600">OS</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Tournament Manager
              </span>
            </div>
          </div>

          {/* Navigation Tabs (When loaded) */}
          {isLoaded && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setView('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  view === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>

              <button
                onClick={() => setView('players')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  view === 'players' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                <Users size={14} />
                Athletes ({data.length})
              </button>

              <button
                onClick={() => setView('kata')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  view === 'kata' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                <FileText size={14} />
                Kata Sheets
              </button>

              <button
                onClick={() => setView('kumite')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  view === 'kumite' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                <SwatchBook size={14} />
                Kumite Draws
              </button>
            </div>
          )}

          {/* Right Status Badge & Reset */}
          <div className="flex items-center gap-2.5">
            {isLoaded ? (
              <>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                  <CheckCircle2 size={14} />
                  <span>{data.length} Saved in System</span>
                </div>

                <button
                  onClick={handleClearData}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-600 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  title="Clear tournament and upload new file"
                >
                  <Trash2 size={13} />
                  Reset
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Ready for upload</span>
            )}
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN APPLICATION CONTENT                                 */}
      {/* ======================================================== */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 print:p-0 print:m-0 print:max-w-none">
        
        {/* VIEW 1: DASHBOARD / UPLOAD */}
        {view === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
            
            {/* Header Title */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {isLoaded ? 'Tournament Hub' : 'Tournament Dashboard'}
              </h2>
              <p className="text-slate-500 text-sm max-w-xl mx-auto">
                {isLoaded
                  ? `${championshipTitle} is active. Manage participants or generate official match sheets below.`
                  : 'Upload your Excel entry list to save and manage tournament rosters, Kata score sheets, and Kumite draw brackets.'}
              </p>
            </div>

            {/* When loaded: Showcase the 3 Primary Tournament Modules */}
            {isLoaded && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Module 1: Manage Athletes (CRUD) */}
                <div
                  onClick={() => setView('players')}
                  className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        Manage Athletes
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Add, edit, or delete athletes directly in the system. Search and export updated rosters.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>{data.length} Athletes Loaded</span>
                    <span className="group-hover:translate-x-1 transition-transform">Manage →</span>
                  </div>
                </div>

                {/* Module 2: Kata Sheets */}
                <div
                  onClick={() => setView('kata')}
                  className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xs">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                        Kata Sheets
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Official 5-judge Kata scoring sheets, live ranking totals, and print-ready forms.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                    <span>
                      {totalKataCount} Kata {teamKataCount > 0 ? `(${indivKataCount} Indiv, ${teamKataCount} Teams)` : 'Competitors'}
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">View Sheets →</span>
                  </div>
                </div>

                {/* Module 3: Kumite Draws */}
                <div
                  onClick={() => setView('kumite')}
                  className="group bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                      <SwatchBook size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Kumite Draws
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        WKF standard tournament brackets with smart club separation and manual slot editing.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>{kumiteCount} Kumite Fighters</span>
                    <span className="group-hover:translate-x-1 transition-transform">Open Bracket →</span>
                  </div>
                </div>

              </div>
            )}

            {/* Upload Box (Main if not loaded, or Collapsible if already loaded) */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="p-8 sm:p-12 text-center">
                <label className="group cursor-pointer block">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-50/50 transition-all rounded-xl p-8 sm:p-10 relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          {isLoaded ? 'Upload new Excel file to replace tournament roster' : 'Click to upload Excel tournament sheet'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Drag and drop .xlsx or .csv here</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <footer className="px-6 py-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-medium">
              <p>© {new Date().getFullYear()} Seishinwakai Karate-Do Association.</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>KarateOS Official Tournament Management Engine</span>
              </div>
            </footer>
          </div>
        )}

        {/* VIEW 2: PLAYERS DIRECTORY (CRUD) */}
        {view === 'players' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between print:hidden">
              <button 
                onClick={() => setView('upload')} 
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-black font-bold transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                Back to Dashboard
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px]">
              <PlayersManager 
                players={data} 
                onUpdatePlayers={savePlayersData} 
                onNavigate={setView} 
              />
            </div>
          </div>
        )}

        {/* VIEW 3: KATA SHEETS */}
        {view === 'kata' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between print:hidden">
              <button 
                onClick={() => setView('upload')} 
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-black font-bold transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                Back to Dashboard
              </button>

              <button
                onClick={() => setView('players')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
              >
                <Users size={13} />
                Manage Athletes ({data.length})
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] print:border-none print:shadow-none print:rounded-none print:min-h-0 print:p-0 print:m-0">
              <KataSection data={data} />
            </div>
          </div>
        )}

        {/* VIEW 4: KUMITE DRAWS */}
        {view === 'kumite' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between print:hidden">
              <button 
                onClick={() => setView('upload')} 
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-black font-bold transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                Back to Dashboard
              </button>

              <button
                onClick={() => setView('players')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
              >
                <Users size={13} />
                Manage Athletes ({data.length})
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] print:border-none print:shadow-none print:rounded-none print:min-h-0 print:p-0 print:m-0">
              <KumiteSection data={data} />
            </div>
          </div>
        )}

      </main>

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
}