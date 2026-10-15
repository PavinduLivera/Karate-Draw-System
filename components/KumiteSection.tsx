"use client";
import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  GitBranch, 
  ShieldCheck, 
  Users, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Edit3, 
  Flame,
  LayoutGrid,
  Layers
} from 'lucide-react';
import KumiteDrawSheet from './KumiteDrawSheet';

interface KumiteSectionProps {
  data: any[];
}

const KumiteSection: React.FC<KumiteSectionProps> = ({ data }) => {
  const kumitePlayers = useMemo(() => data.filter((p) => p.eventType === 'Kumite'), [data]);

  // Group players by unique category key
  const groupedData = useMemo(() => {
    return kumitePlayers.reduce((groups: Record<string, any[]>, player) => {
      const key = `${player.category} | ${player.ageGroup} | ${player.weight} | ${player.gender}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(player);
      return groups;
    }, {});
  }, [kumitePlayers]);

  const categoryKeys = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Championship title from data or default
  const defaultChampionship = kumitePlayers[0]?.championship || "COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025";
  const [championshipTitle, setChampionshipTitle] = useState(defaultChampionship);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryKeys[0] || "");
  const [viewAll, setViewAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tatamiNumber, setTatamiNumber] = useState("Tatami 1");
  const [isBlankMode, setIsBlankMode] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Filter categories by search
  const filteredCategoryKeys = useMemo(() => {
    return categoryKeys.filter((key) =>
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categoryKeys, searchQuery]);

  const handlePrint = (singleOnly = false) => {
    if (singleOnly && !viewAll) {
      window.print();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-slate-100/60 min-h-screen print:bg-white print:p-0 print:m-0 print:space-y-0">
      
      {/* ======================================================== */}
      {/* CONTROL & ACTION HEADER (Print Hidden)                   */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:hidden space-y-6">
        
        {/* Top Row: Title, Stats & Primary Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shadow-red-200">
                <GitBranch className="rotate-90" size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Kumite Tournament Brackets
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Draw System with Red (AKA) & Blue (AO) brackets, seeded by clubs and weight.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Print Orientation Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <span className="text-slate-500 px-2 flex items-center gap-1">
                Print:
              </span>
              <button
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-black hover:bg-white/60'
                }`}
                title="Print in Landscape mode (Recommended for brackets)"
              >
                Landscape
              </button>
              <button
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-black hover:bg-white/60'
                }`}
                title="Print in Portrait mode"
              >
                Portrait
              </button>
            </div>

            {/* Blank Sheet Mode Toggle */}
            <button
              onClick={() => setIsBlankMode(!isBlankMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isBlankMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle blank sheet mode for hand-written referee scoring"
            >
              {isBlankMode ? <CheckSquare size={16} className="text-amber-600" /> : <Square size={16} className="text-slate-400" />}
              <span>Blank Referee Sheet</span>
            </button>

            {/* View Mode Toggle */}
            <button
              onClick={() => setViewAll(!viewAll)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              {viewAll ? <Layers size={16} className="text-blue-600" /> : <LayoutGrid size={16} className="text-blue-600" />}
              <span>{viewAll ? "Show Single Category" : "Show All Categories"}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => handlePrint()}
              className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-slate-300 transition-all active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              {viewAll ? "Print All Sheets" : "Print Current Sheet"}
            </button>
          </div>
        </div>

        {/* Second Row: Tournament Customization Inputs & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Championship Title Input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 size={13} className="text-slate-400" /> Championship Name
            </label>
            <input
              type="text"
              value={championshipTitle}
              onChange={(e) => setChampionshipTitle(e.target.value)}
              placeholder="e.g. COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-blue-500"
            />
          </div>

          {/* Tatami / Ring Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={13} className="text-slate-400" /> Tatami / Ring No
            </label>
            <input
              type="text"
              value={tatamiNumber}
              onChange={(e) => setTatamiNumber(e.target.value)}
              placeholder="e.g. Tatami 1"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-blue-500"
            />
          </div>

          {/* Search Category */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={13} className="text-slate-400" /> Filter Categories
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search age, weight, gender..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Category Pills Navigation */}
        {!viewAll && filteredCategoryKeys.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Select Category to View / Manage ({filteredCategoryKeys.length} available):</span>
              <span>Total Kumite Competitors: <strong className="text-slate-900">{kumitePlayers.length}</strong></span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {filteredCategoryKeys.map((key) => {
                const isSelected = selectedCategory === key;
                const count = groupedData[key]?.length || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{key}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* KUMITE OFFICIAL DRAW SHEETS RENDERING                    */}
      {/* ======================================================== */}
      {filteredCategoryKeys.length > 0 ? (
        viewAll ? (
          // Render All Categories sequentially (ideal for batch printing)
          filteredCategoryKeys.map((groupKey, index) => (
            <KumiteDrawSheet
              key={groupKey}
              groupKey={groupKey}
              players={groupedData[groupKey]}
              championshipTitle={championshipTitle}
              tatamiNumber={tatamiNumber}
              pageNumber={`${index + 1}/${filteredCategoryKeys.length}`}
              bracketSize={16}
              isBlankMode={isBlankMode}
              printOrientation={printOrientation}
            />
          ))
        ) : (
          // Render Single Selected Category
          selectedCategory && groupedData[selectedCategory] ? (
            <KumiteDrawSheet
              key={selectedCategory}
              groupKey={selectedCategory}
              players={groupedData[selectedCategory]}
              championshipTitle={championshipTitle}
              tatamiNumber={tatamiNumber}
              pageNumber={`${categoryKeys.indexOf(selectedCategory) + 1}/${categoryKeys.length}`}
              bracketSize={16}
              isBlankMode={isBlankMode}
              printOrientation={printOrientation}
            />
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 font-bold">Please select a category from above.</p>
            </div>
          )
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Kumite Players Found</h3>
          <p className="text-slate-400 text-sm mt-1">Please ensure your Excel file contains entries with Event Type = "Kumite".</p>
        </div>
      )}
    </div>
  );
};

export default KumiteSection;