"use client";
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, SwatchBook, RotateCcw, CheckCircle2 } from 'lucide-react';
import KataSection from '@/components/KataSection';
import KumiteSection from '@/components/KumiteSection';

export default function KarateApp() {
  const [data, setData] = useState<any[]>([]);
  const [view, setView] = useState<'upload' | 'kata' | 'kumite'>('upload');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

      const formattedData = jsonData.map((item: any) => ({
        championship: item["Championship Name"],
        eventType: item["Event Type"],
        category: item["Category"],
        ageGroup: item["Age Group / Grade"],
        weight: item["Weight Class"],
        gender: item["Gender"],
        club: item["Club / Association"],
        name: item["Player Name"]
      }));

      setData(formattedData);
      setIsLoaded(true);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-black p-2 rounded-lg">
              <SwatchBook className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight uppercase">
              Karate<span className="text-blue-600">OS</span>
            </h1>
          </div>
          
          {isLoaded && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
              <CheckCircle2 size={16} />
              {data.length} Players Loaded
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {view === 'upload' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-slate-900">Tournament Dashboard</h2>
              <p className="text-slate-500">Upload your entry list and generate official tournament sheets instantly.</p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
              <div className="p-12 text-center">
                <label className="group cursor-pointer block">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-50 transition-all rounded-xl p-10 relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Click to upload Excel file</p>
                        <p className="text-sm text-slate-400">Drag and drop .xlsx or .csv here</p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* Quick Actions */}
                <div className={`grid grid-cols-2 gap-4 mt-10 transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <button 
                    onClick={() => setView('kata')}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all"
                  >
                    <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <FileText size={24} />
                    </div>
                    <span className="font-bold uppercase tracking-wider text-sm">Kata Sheets</span>
                  </button>

                  <button 
                    onClick={() => setView('kumite')}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <SwatchBook size={24} />
                    </div>
                    <span className="font-bold uppercase tracking-wider text-sm">Kumite Draws</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view !== 'upload' && (
          <div className="space-y-6">
            <button 
              onClick={() => setView('upload')} 
              className="flex items-center gap-2 text-slate-500 hover:text-black font-semibold transition-colors print:hidden"
            >
              <RotateCcw size={18} />
              Back to Dashboard
            </button>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px]">
              {view === 'kata' && <KataSection data={data} />}
              {view === 'kumite' && <KumiteSection data={data} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}