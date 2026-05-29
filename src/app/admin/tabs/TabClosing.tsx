import React from 'react';
import { X, Printer, CheckCircle, Save, History, Loader2 } from "lucide-react";

export function TabClosing({
  showClosingForm, setShowClosingForm, history, closingCashActual,
  setClosingCashActual, closingNotes, setClosingNotes, handleSaveClosing,
  isSavingClosing, loadingClosing, closingHistory
}: any) {
  const today = history.filter((t: any) => t.status === 'paid' && new Date(t.created_at).toDateString() === new Date().toDateString());
  const total = today.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
  const cash = today.filter((t: any) => t.payment_method === 'Tunai').reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
  const qris = today.filter((t: any) => t.payment_method === 'QRIS').reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
  const transfer = today.filter((t: any) => t.payment_method === 'Transfer').reduce((s: number, t: any) => s + (t.total_amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Today's Stats Summary */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Status Kas Harian</p>
              <h2 className="text-3xl font-black">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            </div>
            <button onClick={() => setShowClosingForm(!showClosingForm)} className="bg-white text-slate-900 font-black px-6 py-3 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2">
              {showClosingForm ? <X size={20} /> : <Printer size={20} />}
              {showClosingForm ? 'Batal' : 'Buat Laporan Tutup'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Total Omzet</p>
              <p className="text-xl font-black">Rp {total.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-emerald-500/20 p-4 rounded-2xl backdrop-blur-sm border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-300 uppercase mb-1">Ekspektasi Tunai</p>
              <p className="text-xl font-black text-emerald-400">Rp {cash.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total QRIS</p>
              <p className="text-xl font-black">Rp {qris.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Transfer</p>
              <p className="text-xl font-black">Rp {transfer.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {showClosingForm && (
            <div className="mt-8 p-8 bg-white text-slate-900 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 space-y-6">
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-black text-slate-800">Form Rekonsiliasi Kas</h3>
                <p className="text-sm text-slate-400">Hitung uang fisik di laci dan masukkan di bawah ini</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Uang Fisik (Tunai)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">Rp</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 pl-16 text-3xl font-black text-slate-800 focus:border-blue-500 focus:ring-0 outline-none transition-all"
                      value={closingCashActual}
                      onChange={e => setClosingCashActual(Number(e.target.value) || "")}
                    />
                  </div>
                </div>

                {closingCashActual !== "" && (
                  <div className={`p-4 rounded-2xl flex items-center justify-between font-black ${Number(closingCashActual) - cash >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span>Selisih (Varian):</span>
                    <span className="text-xl">Rp {(Number(closingCashActual) - cash).toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Catatan Tambahan</label>
                  <textarea 
                    placeholder="Contoh: Ada selisih karena pengembalian manual / uang kembalian kurang" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 text-sm font-medium outline-none focus:border-blue-500 transition-all min-h-[100px]"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                  />
                </div>

                <button 
                  onClick={() => handleSaveClosing({ total, cash, qris, transfer, count: today.length })}
                  disabled={isSavingClosing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                >
                  {isSavingClosing ? <Loader2 className="animate-spin" /> : <Save />}
                  Simpan Laporan & Tutup Shift
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      </div>

      {/* History Section */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <History className="text-blue-500" /> Riwayat Tutup Toko
        </h3>
        
        {loadingClosing ? (
          <div className="text-center py-10 opacity-50"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : closingHistory.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <CheckCircle size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 font-medium">Belum ada laporan tutup toko.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {closingHistory.map((report: any) => (
              <div key={report.id} className="p-5 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-blue-100 border border-transparent rounded-[2rem] transition-all group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600 font-black text-xl">
                      {new Date(report.created_at).getDate()}
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{new Date(report.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • OLEH: {report.closed_by}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cash (Sistem / Fisik)</p>
                      <p className="text-sm font-black text-slate-700">Rp {report.cash_expected.toLocaleString('id-ID')} / {report.cash_actual.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Selisih</p>
                      <p className={`text-sm font-black ${report.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.difference >= 0 ? '+' : ''}Rp {report.difference.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
                {report.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-200/50 italic text-[11px] text-slate-500 font-medium">
                    💬 "{report.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
