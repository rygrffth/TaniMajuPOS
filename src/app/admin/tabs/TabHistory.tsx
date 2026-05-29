import React from 'react';
import { ExternalLink, Trash2 } from "lucide-react";

export function TabHistory({
  histPeriod, setHistPeriod, histCustomFrom, setHistCustomFrom,
  histCustomTo, setHistCustomTo, selectedTrxIds, setSelectedTrxIds,
  filteredHistory, handleDeleteTransactions, setViewingTrx
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Riwayat Transaksi</h2>
          <p className="text-gray-500 font-medium">Pantau semua penjualan dan status pembayaran</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          {['today', 'week', 'month', 'custom'].map((p) => (
            <button key={p} onClick={() => setHistPeriod(p as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${histPeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
              {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Kustom'}
            </button>
          ))}
        </div>
      </div>

      {histPeriod === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 animate-in slide-in-from-top-2">
          <div className="flex-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Dari Tanggal</label>
            <input type="date" className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-500 transition-all" value={histCustomFrom} onChange={e => setHistCustomFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Sampai Tanggal</label>
            <input type="date" className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-500 transition-all" value={histCustomTo} onChange={e => setHistCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
           <div className="flex items-center gap-2">
             <input type="checkbox" className="w-5 h-5 rounded-lg" checked={selectedTrxIds.length === filteredHistory.length && filteredHistory.length > 0} onChange={e => {
               if (e.target.checked) setSelectedTrxIds(filteredHistory.map((t: any) => t.id));
               else setSelectedTrxIds([]);
             }} />
             <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedTrxIds.length} Terpilih</span>
           </div>
           {selectedTrxIds.length > 0 && (
             <button onClick={handleDeleteTransactions} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2">
               <Trash2 size={14} /> HAPUS PERMANEN
             </button>
           )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-widest">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredHistory.map((trx: any) => (
                <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="w-4 h-4 rounded" checked={selectedTrxIds.includes(trx.id)} onChange={e => {
                      if (e.target.checked) setSelectedTrxIds((prev: any) => [...prev, trx.id]);
                      else setSelectedTrxIds((prev: any) => prev.filter((id: any) => id !== trx.id));
                    }} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">{new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm">{trx.customer_name || 'UMUM'}</td>
                  <td className="px-6 py-4 font-black text-blue-700 text-sm">Rp {(trx.total_amount || 0).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-600 uppercase">{trx.payment_method || 'Tunai'}</span></td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${trx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : trx.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                      {trx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setViewingTrx(trx)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><ExternalLink size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
