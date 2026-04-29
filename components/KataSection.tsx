"use client";
import React from 'react';
import { Printer, User, Trophy, Users } from 'lucide-react';

const KataSection = ({ data }: { data: any[] }) => {
  const kataPlayers = data.filter(p => p.eventType === 'Kata');

  const groupedData = kataPlayers.reduce((groups: any, player) => {
    const key = `${player.category} | ${player.ageGroup} | ${player.gender}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(player);
    return groups;
  }, {});

  return (
    <div className="space-y-8 p-1 animate-in fade-in duration-500">
      {/* Action Header */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Trophy className="text-orange-500" />
            Kata Scoring Sheets
          </h2>
          <p className="text-slate-500 text-sm mt-1">Review and print official scoring sheets for each category.</p>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
        >
          <Printer size={18} />
          Print All Sheets
        </button>
      </div>

      {Object.keys(groupedData).length > 0 ? (
        Object.keys(groupedData).map((groupKey, index) => (
          <div 
            key={index} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-12 page-break print:shadow-none print:border-none print:m-0 print:p-0"
          >
            {/* Professional Sheet Header */}
            <div className="p-8 text-center border-b border-slate-50 bg-slate-50/50 rounded-t-2xl print:bg-white print:pb-4">
              <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 print:text-2xl">
                {groupedData[groupKey][0]?.championship || "Tournament"}
              </h3>
              <div className="inline-flex items-center gap-3 mt-4 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest print:bg-slate-100 print:text-black">
                <Users size={16} />
                <span>KATA</span>
                <span className="opacity-30">|</span>
                <span>{groupKey}</span>
              </div>
            </div>

            {/* Modern Table Layout */}
            <div className="p-6 print:p-0">
              <table className="w-full border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white print:bg-slate-100 print:text-black">
                    <th className="border-2 border-slate-900 p-4 text-left font-black uppercase text-[10px] tracking-widest w-1/4">Player Name</th>
                    <th className="border-2 border-slate-900 p-4 text-left font-black uppercase text-[10px] tracking-widest w-1/4">Club / Association</th>
                    {[1, 2, 3, 4, 5].map(j => (
                      <th key={j} className="border-2 border-slate-900 p-2 w-14 text-center font-black text-[10px]">J{j}</th>
                    ))}
                    <th className="border-2 border-slate-900 p-2 w-24 text-center font-black text-[10px]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData[groupKey].map((p: any, i: number) => (
                    <tr key={i} className="h-20 hover:bg-slate-50 transition-colors">
                      <td className="border-2 border-slate-900 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded-lg print:hidden">
                            <User size={14} className="text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-900 uppercase text-sm">{p.name}</span>
                        </div>
                      </td>
                      <td className="border-2 border-slate-900 p-4 text-xs font-semibold text-slate-600 uppercase italic">
                        {p.club}
                      </td>
                      {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="border-2 border-slate-900"></td>
                      ))}
                      <td className="border-2 border-slate-900 bg-slate-50/50"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Footer - Matches Kumite Style */}
            <div className="mt-16 pb-12 hidden print:flex justify-around px-10">
               <div className="text-center w-64 border-t-2 border-black pt-3">
                 <p className="font-black uppercase text-[10px] tracking-tighter">Chief Referee</p>
               </div>
               <div className="text-center w-64 border-t-2 border-black pt-3">
                 <p className="font-black uppercase text-[10px] tracking-tighter">Technical Steward</p>
               </div>
            </div>

            <style jsx>{`
              @media print {
                .page-break { 
                  page-break-after: always;
                  clear: both;
                  padding-top: 2rem;
                }
                body { background: white !important; }
              }
            `}</style>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Trophy size={40} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold">No Kata data found in the current sheet.</p>
        </div>
      )}
    </div>
  );
};

export default KataSection;