"use client";
import React from 'react';
import { Printer, GitBranch, Trophy, ShieldCheck, Users } from 'lucide-react';
import { generateKumiteDraw } from '@/lib/tournament-logic';

const KumiteSection = ({ data }: { data: any[] }) => {
  const kumitePlayers = data.filter(p => p.eventType === 'Kumite');

  const groupedData = kumitePlayers.reduce((groups: any, player) => {
    const key = `${player.category} | ${player.ageGroup} | ${player.weight} | ${player.gender}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(player);
    return groups;
  }, {});

  return (
    <div className="space-y-8 p-1 animate-in fade-in duration-500 bg-slate-50/50 min-h-screen print:bg-white print:p-0">
      
      {/* Modern Header / Action Bar */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-6 mb-6 print:hidden bg-white p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <GitBranch className="text-blue-600 rotate-90" />
            Kumite Tournament Brackets
          </h2>
          <p className="text-slate-500 text-sm mt-1">Automated bracket generation for all kumite weight classes.</p>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
        >
          <Printer size={18} />
          Print All Brackets
        </button>
      </div>

      {Object.keys(groupedData).length > 0 ? (
        Object.keys(groupedData).map((groupKey, index) => {
          const bracket = generateKumiteDraw(groupedData[groupKey]);

          return (
            <div 
              key={index} 
              className="page-break bg-white rounded-3xl border border-slate-200 shadow-xl mb-12 p-10 print:shadow-none print:border-none print:m-0 print:p-0"
            >
              {/* Professional Sheet Header */}
              <div className="text-center mb-12 border-b-4 border-double border-slate-900 pb-6 print:mb-8">
                <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">
                  {groupedData[groupKey][0]?.championship || "Tournament"}
                </h3>
                <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-800 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">
                  <ShieldCheck size={18} />
                  <span>KUMITE DRAW</span>
                  <span className="opacity-30">|</span>
                  <span>{groupKey}</span>
                </div>
              </div>

              {/* Tournament Tree Structure */}
              <div className="grid grid-cols-3 items-stretch min-h-[600px] gap-0">
                
                {/* --- ROUND 01 (Eliminations) --- */}
                <div className="flex flex-col justify-around pr-2">
                  <div className="text-center mb-4 uppercase text-[10px] font-black tracking-[0.2em] text-slate-400">Eliminations</div>
                  {Array.from({ length: bracket.length / 2 }).map((_, i) => (
                    <div key={i} className="flex items-center h-full group">
                      <div className="w-full border-2 border-slate-900 rounded-lg overflow-hidden bg-white shadow-sm transition-transform">
                        <div className="h-10 border-b border-slate-100 flex items-center px-3 gap-2">
                          <span className="text-[10px] font-bold text-slate-300 w-4">{(i * 2) + 1}</span>
                          <p className="text-[11px] font-black uppercase truncate">{bracket[i * 2]?.name || "--- BYE ---"}</p>
                        </div>
                        <div className="h-10 flex items-center px-3 gap-2 bg-slate-50/50">
                          <span className="text-[10px] font-bold text-slate-300 w-4">{(i * 2) + 2}</span>
                          <p className="text-[11px] font-black uppercase truncate">{bracket[i * 2 + 1]?.name || "--- BYE ---"}</p>
                        </div>
                      </div>
                      {/* Connector Line to Semi */}
                      <div className="w-8 h-0.5 bg-slate-900"></div>
                    </div>
                  ))}
                </div>

                {/* --- SEMI FINALS & CONNECTORS --- */}
                <div className="flex flex-col justify-around relative border-l-4 border-slate-900 -ml-[2px]">
                  <div className="text-center mb-4 uppercase text-[10px] font-black tracking-[0.2em] text-slate-400">Semi Finals</div>
                  {Array.from({ length: bracket.length / 4 }).map((_, i) => (
                    <div key={i} className="h-1/2 flex items-center relative py-10">
                      {/* Visual Bracket Curve */}
                      <div className="absolute left-0 h-1/2 w-10 border-y-4 border-slate-900 top-1/4 rounded-r-2xl"></div>
                      
                      <div className="ml-10 w-full">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl h-14 flex items-center px-4 bg-white/50">
                          <p className="text-[10px] font-black text-slate-300 italic uppercase">Winner Match {i + 1}</p>
                        </div>
                        <div className="w-full h-1 bg-slate-900"></div>
                      </div>
                      <div className="w-8 h-1 bg-slate-900"></div>
                    </div>
                  ))}
                </div>

                {/* --- GRAND FINALS --- */}
                <div className="flex flex-col justify-center pl-10">
                  <div className="text-center mb-6 uppercase text-[10px] font-black tracking-[0.2em] text-red-600">Final Match</div>
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-600 to-slate-900 rounded-2xl blur opacity-10 group-hover:opacity-20 transition"></div>
                    <div className="relative border-4 border-slate-900 rounded-2xl p-8 bg-white shadow-2xl">
                      <div className="text-center space-y-4">
                        <Trophy className="mx-auto text-yellow-500 mb-2" size={32} />
                        <div className="h-12 border-2 border-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-200 italic uppercase">Finalist 1</div>
                        <div className="font-black text-xl text-slate-900 italic">VS</div>
                        <div className="h-12 border-2 border-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-200 italic uppercase">Finalist 2</div>
                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Gold Medal Match</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Signatures Section */}
              <div className="mt-20 hidden print:grid grid-cols-4 gap-8 px-10">
                 {["Referee", "Judge", "Arbitrator", "Official Steward"].map(title => (
                   <div key={title} className="text-center border-t-2 border-slate-900 pt-3">
                     <p className="text-[9px] font-black uppercase tracking-tighter text-slate-900">{title}</p>
                   </div>
                 ))}
              </div>

              <style jsx>{`
                @media print {
                  .page-break { 
                    page-break-after: always;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                  }
                  body { background: white !important; }
                }
              `}</style>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Users size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Kumite players found</p>
        </div>
      )}
    </div>
  );
};

export default KumiteSection;