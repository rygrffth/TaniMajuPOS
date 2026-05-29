import React from 'react';
import { Users, DollarSign, BarChart3, Search, Edit } from "lucide-react";

export function TabCustomers({
  customerSubTab, setCustomerSubTab, setEditingCustomer, setCustomerName,
  setCustomerPhone, setCustomerAddress, setIsMember, setShowCustomerForm,
  customers, setSelectedCustomerForPayment, setDebtPaymentAmount,
  setShowDebtPaymentModal, customerSearchQuery, setCustomerSearchQuery
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Database Pelanggan & Piutang</h2>
          <p className="text-gray-500 font-medium">Manajemen data member, pencatatan kasbon pelanggan, dan pelunasan piutang</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setIsMember(false); setShowCustomerForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Users size={20} /> Tambah Pelanggan
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setCustomerSubTab("list")} 
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${customerSubTab === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          👤 DAFTAR MEMBER
        </button>
        <button 
          onClick={() => setCustomerSubTab("receivables")} 
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${customerSubTab === "receivables" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          📊 BUKU PIUTANG (KASBON)
        </button>
      </div>

      {customerSubTab === "list" && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Nama Pelanggan</th>
                <th className="px-6 py-4">No. Telp</th>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Total Hutang</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50/50 group">
                  <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{c.phone}</td>
                  <td className="px-6 py-4">
                    {c.is_member ? <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">MEMBER ⭐</span> : <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">REGULER</span>}
                  </td>
                  <td className="px-6 py-4 font-black text-red-600">Rp {(c.total_debt || 0).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    {(c.total_debt || 0) > 0 && (
                      <button 
                        onClick={() => { 
                          setSelectedCustomerForPayment(c); 
                          setDebtPaymentAmount(""); 
                          setShowDebtPaymentModal(true); 
                        }} 
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all"
                        title="Bayar Kasbon"
                      >
                        <DollarSign size={12} />
                        Bayar
                      </button>
                    )}
                    <button onClick={() => { setEditingCustomer(c); setCustomerName(c.name); setCustomerPhone(c.phone); setCustomerAddress(c.address); setIsMember(c.is_member); setShowCustomerForm(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customerSubTab === "receivables" && (() => {
        // Calculate receivables stats
        const debtors = customers.filter((c: any) => (c.total_debt || 0) > 0);
        const totalReceivables = debtors.reduce((sum: number, c: any) => sum + (c.total_debt || 0), 0);
        const totalDebtorsCount = debtors.length;
        const avgReceivables = totalDebtorsCount > 0 ? Math.round(totalReceivables / totalDebtorsCount) : 0;

        // Filter debtors based on search query
        const filteredDebtors = debtors
          .filter((c: any) => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone || "").includes(customerSearchQuery))
          .sort((a: any, b: any) => (b.total_debt || 0) - (a.total_debt || 0));

        return (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><DollarSign size={24} /></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Piutang Aktif</span>
                  <span className="text-xl font-black text-red-600">Rp {totalReceivables.toLocaleString('id-ID')}</span>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><Users size={24} /></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Jumlah Debitur (Pelanggan)</span>
                  <span className="text-xl font-black text-slate-800">{totalDebtorsCount} Pelanggan</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><BarChart3 size={24} /></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Rata-rata Piutang</span>
                  <span className="text-xl font-black text-slate-800">Rp {avgReceivables.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Search and Debtors Table */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-lg font-black text-slate-800">Buku Pembantu Piutang (Debitur Terbesar)</h3>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari nama / nomor telepon..." 
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Peringkat</th>
                      <th className="px-6 py-4">Nama Pelanggan</th>
                      <th className="px-6 py-4">Kontak / No. Telp</th>
                      <th className="px-6 py-4">Total Piutang (Kasbon)</th>
                      <th className="px-6 py-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDebtors.map((debtor: any, index: number) => (
                      <tr key={debtor.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-red-100 text-red-600' : index === 1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {debtor.name}
                          {debtor.is_member && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Member</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {debtor.phone || <span className="text-slate-300 font-bold">-</span>}
                        </td>
                        <td className="px-6 py-4 font-black text-red-600">
                          Rp {debtor.total_debt.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { 
                              setSelectedCustomerForPayment(debtor); 
                              setDebtPaymentAmount(""); 
                              setShowDebtPaymentModal(true); 
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/10 inline-flex items-center gap-1 transition-all active:scale-95"
                          >
                            <DollarSign size={14} /> Bayar Kasbon
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredDebtors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                          Tidak ada debitur kasbon aktif yang ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
