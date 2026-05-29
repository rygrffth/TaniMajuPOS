import React from 'react';
import { MinusCircle, Edit } from "lucide-react";

export function TabExpenses({
  setEditingExpense, setExpenseDesc, setExpenseAmount, setExpenseCategory,
  setShowExpenseForm, expenses
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Biaya Operasional</h2>
          <p className="text-gray-500 font-medium">Catat semua pengeluaran toko (Listrik, Gaji, Kulakan)</p>
        </div>
        <button onClick={() => { setEditingExpense(null); setExpenseDesc(""); setExpenseAmount(""); setExpenseCategory("Kulakan"); setShowExpenseForm(true); }} className="bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2">
          <MinusCircle size={20} /> Catat Pengeluaran
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Jumlah</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 group">
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{new Date(exp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-6 py-4"><span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-1 rounded-lg uppercase">{exp.category}</span></td>
                  <td className="px-6 py-4 font-bold text-slate-700 text-sm">{exp.description}</td>
                  <td className="px-6 py-4 font-black text-red-600 text-sm">Rp {(exp.amount || 0).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingExpense(exp); setExpenseDesc(exp.description); setExpenseAmount(exp.amount); setExpenseCategory(exp.category); setShowExpenseForm(true); }} className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Total Biaya (Bulan Ini)</p>
             <h3 className="text-2xl font-black relative z-10">Rp {expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString('id-ID')}</h3>
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl"></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tips Efisiensi</h4>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">Catat setiap pengeluaran sekecil apapun untuk mendapatkan laporan laba bersih yang akurat di tab Analytics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
