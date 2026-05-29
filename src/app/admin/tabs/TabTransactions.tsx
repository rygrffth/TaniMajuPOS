import React from 'react';
import { Receipt, Clock, CheckCircle } from "lucide-react";

export function TabTransactions({
  transactions, setViewingTrx
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex justify-between items-center">
          <div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Antrean Pesanan</h2>
             <p className="text-gray-500 font-medium">Lengkapi pembayaran untuk pesanan yang masih tertunda</p>
          </div>
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl font-black text-xs animate-pulse">
             TOTAL PENDING: {transactions.filter((t: any) => t.status === 'pending').length}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transactions.filter((t: any) => t.status === 'pending').map((trx: any) => (
            <div key={trx.id} onClick={() => setViewingTrx(trx)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-blue-200 transition-all cursor-pointer group">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-500"><Receipt size={24} /></div>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-tighter">Status: {trx.status}</span>
               </div>
               <h4 className="font-black text-slate-800 text-xl mb-1 uppercase tracking-tight line-clamp-1">{trx.customer_name || 'UMUM'}</h4>
               <p className="text-xs text-slate-400 font-bold mb-6 flex items-center gap-1.5"><Clock size={12} /> {new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {trx.transaction_items?.length || 0} Item</p>
               
               <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Billing</p>
                  <p className="text-xl font-black text-blue-600">Rp {(trx.total_amount || 0).toLocaleString('id-ID')}</p>
               </div>
            </div>
          ))}
          {transactions.filter((t: any) => t.status === 'pending').length === 0 && (
            <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
               <CheckCircle size={64} className="mb-4" />
               <p className="font-black uppercase tracking-[0.3em] text-sm">Tidak Ada Antrean Pembayaran</p>
            </div>
          )}
       </div>
    </div>
  );
}
