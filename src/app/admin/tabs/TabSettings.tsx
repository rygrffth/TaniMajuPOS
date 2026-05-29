import React from 'react';

export function TabSettings({
  lowStockThreshold, setLowStockThreshold, analysisLimit, setAnalysisLimit,
  taxRate, setTaxRate, saveSyncSettings, remindMidday, remindEvening, remindClosing
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
         <h3 className="text-xl font-black text-gray-800 mb-6">Pengaturan Aplikasi</h3>
         <div className="space-y-4">
            <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Threshold Stok Menipis</label>
              <input type="number" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value))} />
            </div>
            <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Limit Analisis Produk (Top/Worst)</label>
              <input type="number" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={analysisLimit} onChange={e => setAnalysisLimit(Number(e.target.value))} />
            </div>
            <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tarif Pajak Final UMKM (%)</label>
              <input type="number" step="0.1" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
            </div>
            <button 
              onClick={() => saveSyncSettings(remindMidday, remindEvening, remindClosing, lowStockThreshold, analysisLimit, taxRate)}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              SIMPAN PENGATURAN
            </button>
         </div>
      </div>
    </div>
  );
}
