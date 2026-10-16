"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Trophy, 
  Users, 
  Search, 
  CheckSquare, 
  Square, 
  Edit3, 
  Flame,
  LayoutGrid,
  Layers,
  ListOrdered
} from 'lucide-react';
import KataDrawSheet from './KataDrawSheet';

interface KataSectionProps {
  data: any[];
}

const KataSection: React.FC<KataSectionProps> = ({ data }) => {
  const kataPlayers = useMemo(() => {
    return data.filter((p) => {
      const ev = (p.eventType || '').trim().toLowerCase();
      const cat = (p.category || '').trim().toLowerCase();
      return ev === 'kata' || ev === 'team kata' || ev.includes('kata') || cat.includes('team kata');
    });
  }, [data]);

  // Group players by unique category key (Category | Age Group | Gender)
  const groupedData = useMemo(() => {
    return kataPlayers.reduce((groups: Record<string, any[]>, player) => {
      const isTeam = (player.eventType || '').toLowerCase() === 'team kata' || (player.category || '').toLowerCase().includes('team kata');
      let catName = player.category || (isTeam ? 'Team Kata' : 'Open');
      // Prefix with "Team Kata - " if not already containing team to guarantee separate sheets from individual kata
      if (isTeam && !catName.toLowerCase().includes('team')) {
        catName = `Team Kata - ${catName}`;
      }
      const key = `${catName} | ${player.ageGroup || 'All Ages'} | ${player.gender || 'Mixed'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(player);
      return groups;
    }, {});
  }, [kataPlayers]);

  const categoryKeys = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Sub-filter: all, individual, team
  const [eventSubFilter, setEventSubFilter] = useState<'all' | 'individual' | 'team'>('all');

  // Championship title from data or default
  const defaultChampionship = kataPlayers[0]?.championship || "COIMBATORE DISTRICT KARATE CHAMPIONSHIP 2025";
  const [championshipTitle, setChampionshipTitle] = useState(defaultChampionship);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryKeys[0] || "");
  const [viewAll, setViewAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tatamiNumber, setTatamiNumber] = useState("Tatami 1");
  const [isBlankMode, setIsBlankMode] = useState(false);

  // Fixed player row count per sheet (e.g. 8, 10, 12, 16)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Print orientation (portrait or landscape)
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Filter categories by search and event sub-filter (individual vs team)
  const filteredCategoryKeys = useMemo(() => {
    return categoryKeys.filter((key) => {
      const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      const isTeam = key.toLowerCase().includes('team');
      if (eventSubFilter === 'individual') return !isTeam;
      if (eventSubFilter === 'team') return isTeam;
      return true;
    });
  }, [categoryKeys, searchQuery, eventSubFilter]);

  // Keep selectedCategory valid when filtering
  useEffect(() => {
    if (filteredCategoryKeys.length > 0 && !filteredCategoryKeys.includes(selectedCategory)) {
      setSelectedCategory(filteredCategoryKeys[0]);
    }
  }, [filteredCategoryKeys, selectedCategory]);

  const handlePrint = () => {
    window.print();
  };

  /**
   * Memoized chunking of players for categories into fixed-size pages.
   * Preserves exact page/slots object references across printOrientation toggles!
   */
  const categoryPagesMap = useMemo(() => {
    const map: Record<
      string,
      Array<{
        pageNumber: string;
        poolName: string | undefined;
        startNumber: number;
        slots: (any | null)[];
      }>
    > = {};

    categoryKeys.forEach((key) => {
      const catPlayers = groupedData[key] || [];
      const totalPages = Math.ceil(catPlayers.length / rowsPerPage) || 1;
      map[key] = Array.from({ length: totalPages }, (_, pageIdx) => {
        const start = pageIdx * rowsPerPage;
        const pagePlayers = catPlayers.slice(start, start + rowsPerPage);

        const filledSlots: (any | null)[] = [...pagePlayers];
        while (filledSlots.length < rowsPerPage) {
          filledSlots.push(null);
        }

        return {
          pageNumber: `${pageIdx + 1}/${totalPages}`,
          poolName: totalPages > 1 ? `Pool ${pageIdx + 1}` : undefined,
          startNumber: start + 1,
          slots: filledSlots,
        };
      });
    });

    return map;
  }, [categoryKeys, groupedData, rowsPerPage]);

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
              <div className="p-2.5 bg-orange-600 text-white rounded-xl shadow-md shadow-orange-200">
                <Trophy size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Kata Scoring Sheets
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  5-Judge scoring (drops lowest & highest) & 3-Judge scoring with automated totals & podium awards.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Fixed Rows Per Page Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <span className="text-slate-500 px-2 flex items-center gap-1">
                <ListOrdered size={14} /> Fixed Rows:
              </span>
              {[8, 10, 12, 16].map((count) => (
                <button
                  key={count}
                  onClick={() => setRowsPerPage(count)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    rowsPerPage === count
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-black hover:bg-white/60'
                  }`}
                  title={`${count} fixed player rows per page`}
                >
                  {count}
                </button>
              ))}
            </div>

            {/* Print Orientation Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <span className="text-slate-500 px-2 flex items-center gap-1">
                Print:
              </span>
              <button
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-black hover:bg-white/60'
                }`}
                title="Print in Portrait orientation"
              >
                Portrait
              </button>
              <button
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-black hover:bg-white/60'
                }`}
                title="Print in Landscape orientation"
              >
                Landscape
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
              {viewAll ? <Layers size={16} className="text-orange-600" /> : <LayoutGrid size={16} className="text-orange-600" />}
              <span>{viewAll ? "Show Single Category" : "Show All Categories"}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
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
                placeholder="Search age, grade, gender..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Category Pills Navigation & Sub-Filter */}
        {!viewAll && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              {/* Filter Tabs: All / Individual / Team Kata */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEventSubFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    eventSubFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  All ({categoryKeys.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEventSubFilter('individual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    eventSubFilter === 'individual'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  Individual ({categoryKeys.filter((k) => !k.toLowerCase().includes('team')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setEventSubFilter('team')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    eventSubFilter === 'team'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  <Users size={13} className="text-purple-600" />
                  Team Kata ({categoryKeys.filter((k) => k.toLowerCase().includes('team')).length})
                </button>
              </div>

              <div className="text-slate-500 font-semibold text-[11px]">
                Total Kata Athletes & Teams: <strong className="text-slate-900 font-black">{kataPlayers.length}</strong>
              </div>
            </div>

            {filteredCategoryKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredCategoryKeys.map((key) => {
                  const isSelected = selectedCategory === key;
                  const count = groupedData[key]?.length || 0;
                  const isTeam = key.toLowerCase().includes('team');

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? isTeam
                            ? 'bg-purple-900 text-white border-purple-900 shadow-sm'
                            : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : isTeam
                            ? 'bg-purple-50/50 text-purple-900 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {isTeam && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider flex items-center gap-1 ${
                          isSelected ? 'bg-purple-800 text-purple-200' : 'bg-purple-200/80 text-purple-800'
                        }`}>
                          <Users size={10} /> Team
                        </span>
                      )}
                      <span>{key}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isTeam
                            ? 'bg-purple-200/60 text-purple-800'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count} {isTeam ? (count === 1 ? 'team' : 'teams') : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No Kata categories found matching filter.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* KATA OFFICIAL SCORE SHEETS RENDERING                     */}
      {/* ======================================================== */}
      {filteredCategoryKeys.length > 0 ? (
        viewAll ? (
          // Render All Categories with pagination (ideal for batch printing)
          filteredCategoryKeys.map((groupKey) => {
            const pages = categoryPagesMap[groupKey] || [];
            return pages.map((page, pIdx) => (
              <KataDrawSheet
                key={`${groupKey}_page_${pIdx}`}
                groupKey={groupKey}
                players={page.slots}
                startNumber={page.startNumber}
                championshipTitle={championshipTitle}
                tatamiNumber={tatamiNumber}
                pageNumber={page.pageNumber}
                poolName={page.poolName}
                isBlankMode={isBlankMode}
                printOrientation={printOrientation}
                categoryPlayers={groupedData[groupKey]}
              />
            ));
          })
        ) : (
          // Render Single Selected Category (with its paginated sheets)
          selectedCategory && categoryPagesMap[selectedCategory] ? (
            categoryPagesMap[selectedCategory].map((page, pIdx) => (
              <KataDrawSheet
                key={`${selectedCategory}_page_${pIdx}`}
                groupKey={selectedCategory}
                players={page.slots}
                startNumber={page.startNumber}
                championshipTitle={championshipTitle}
                tatamiNumber={tatamiNumber}
                pageNumber={page.pageNumber}
                poolName={page.poolName}
                isBlankMode={isBlankMode}
                printOrientation={printOrientation}
                categoryPlayers={groupedData[selectedCategory]}
              />
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 font-bold">Please select a category from above.</p>
            </div>
          )
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Kata Players Found</h3>
          <p className="text-slate-400 text-sm mt-1">Please ensure your Excel file contains entries with Event Type = "Kata".</p>
        </div>
      )}
    </div>
  );
};

export default KataSection;