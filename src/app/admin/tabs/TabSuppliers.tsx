import React from 'react';
import { Truck, Plus, Edit, CheckCircle, Loader2, DollarSign } from "lucide-react";

export function TabSuppliers({
  supplierSubTab, setSupplierSubTab, setEditingSupplier, setSupplierName,
  setSupplierContact, setSupplierPhone, setSupplierAddress, setShowSupplierForm,
  setSelectedPoSupplier, setPoItems, setPoPaymentTerms, setPoDueDate, setPoNotes,
  setShowPoForm, suppliers, supplierDebts, setPoFilterPayment, setPoFilterSupplier,
  poFilterSupplier, poFilterStatus, setPoFilterStatus, poFilterPayment, purchaseOrders, getPoPaymentMeta,
  receivePO, handlePayPoTempo, isProcessingPoPayment
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Supplier & Kulakan</h2>
          <p className="text-gray-500 font-medium">Daftar pemasok barang, pencatatan PO kulakan, dan jatuh tempo pembayaran</p>
        </div>
        
        {supplierSubTab === "suppliers" ? (
          <button onClick={() => { setEditingSupplier(null); setSupplierName(""); setSupplierContact(""); setSupplierPhone(""); setSupplierAddress(""); setShowSupplierForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Truck size={20} /> Tambah Supplier
          </button>
        ) : (
          <button 
            onClick={() => {
              setSelectedPoSupplier("");
              setPoItems([]);
              setPoPaymentTerms("cash");
              setPoDueDate("");
              setPoNotes("");
              setShowPoForm(true);
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <Plus size={20} /> Buat PO Baru
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setSupplierSubTab("suppliers")} 
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${supplierSubTab === "suppliers" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          📦 DAFTAR SUPPLIER
        </button>
        <button 
          onClick={() => setSupplierSubTab("pos")} 
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${supplierSubTab === "pos" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          📝 KULAKAN & TEMPO (PO)
        </button>
      </div>

      {supplierSubTab === "suppliers" && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Nama Supplier</th>
                <th className="px-6 py-4">Kontak Person</th>
                <th className="px-6 py-4">No. Telp</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4">Total Utang Aktif (Tempo)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map((s: any) => {
                const debt = supplierDebts[s.id] || 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 group">
                    <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{s.contact_person}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{s.phone}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{s.address}</td>
                    <td className="px-6 py-4">
                      {debt > 0 ? (
                        <button 
                          onClick={() => {
                            setSupplierSubTab("pos");
                            setPoFilterPayment("tempo_unpaid");
                            setPoFilterSupplier(s.id);
                          }}
                          className="text-left group/btn"
                        >
                          <span className="font-black text-amber-600 block group-hover/btn:underline">
                            Rp {debt.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 block group-hover/btn:text-blue-600 transition-colors uppercase">
                            Detail Utang ↗
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">Rp 0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditingSupplier(s); setSupplierName(s.name); setSupplierContact(s.contact_person); setSupplierPhone(s.phone); setSupplierAddress(s.address); setShowSupplierForm(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {supplierSubTab === "pos" && (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="flex gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
              <select 
                value={poFilterStatus} 
                onChange={e => setPoFilterStatus(e.target.value)} 
                className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending (Belum Diterima)</option>
                <option value="received">Diterima</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase">Pembayaran:</span>
              <select 
                value={poFilterPayment} 
                onChange={e => setPoFilterPayment(e.target.value)} 
                className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
              >
                <option value="all">Semua Pembayaran</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="tempo_unpaid">Tempo (Belum Lunas)</option>
                <option value="tempo_paid">Tempo (Lunas)</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase">Supplier:</span>
              <select 
                value={poFilterSupplier} 
                onChange={e => setPoFilterSupplier(e.target.value)} 
                className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
              >
                <option value="all">Semua Supplier</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">ID / Tanggal</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Daftar Barang</th>
                  <th className="px-6 py-4">Total Belanja</th>
                  <th className="px-6 py-4">Status Barang</th>
                  <th className="px-6 py-4">Status Pembayaran</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchaseOrders
                  .filter((po: any) => {
                    if (poFilterStatus === "pending" && po.status !== "pending") return false;
                    if (poFilterStatus === "received" && po.status !== "received") return false;
                    if (poFilterSupplier !== "all" && po.supplier_id !== poFilterSupplier) return false;

                    const meta = getPoPaymentMeta(po.notes);
                    if (poFilterPayment === "cash" && meta.payment_terms !== "cash") return false;
                    if (poFilterPayment === "tempo_unpaid" && (meta.payment_terms !== "tempo" || meta.payment_status !== "unpaid")) return false;
                    if (poFilterPayment === "tempo_paid" && (meta.payment_terms !== "tempo" || meta.payment_status !== "paid")) return false;

                    return true;
                  })
                  .map((po: any) => {
                    const meta = getPoPaymentMeta(po.notes);
                    const isTempoExpired = meta.payment_terms === "tempo" && meta.payment_status === "unpaid" && meta.due_date && new Date(meta.due_date) < new Date();
                    
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-black text-xs text-blue-600 block">#{po.id.substring(0, 8).toUpperCase()}</span>
                          <span className="text-[10px] font-bold text-slate-400">{po.order_date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 text-sm block">{po.suppliers?.name || "Supplier"}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500 max-w-xs">
                          <div className="space-y-1">
                            {po.purchase_order_items?.map((it: any, index: number) => (
                              <div key={index} className="flex justify-between gap-4">
                                <span className="truncate">{it.product_variants?.variant_name || it.product_variants?.products?.name || "Barang"}</span>
                                <span className="font-bold text-slate-700 whitespace-nowrap">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800 text-sm">
                          Rp {(po.total_amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          {po.status === "received" ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase">Diterima</span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-yellow-100 text-yellow-700 uppercase">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {meta.payment_terms === "cash" ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 uppercase">Tunai (Lunas)</span>
                          ) : meta.payment_status === "paid" ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase">Tempo (Lunas)</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 uppercase">Tempo (Belum Lunas)</span>
                              {meta.due_date && (
                                <span className={`block text-[9px] font-black ${isTempoExpired ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                  Jatuh Tempo: {meta.due_date}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {po.status === "pending" && (
                              <button 
                                onClick={() => receivePO(po)} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-[10px] shadow-md shadow-emerald-500/10 flex items-center gap-1 transition-all"
                              >
                                <CheckCircle size={12} /> Terima Barang
                              </button>
                            )}
                            {meta.payment_terms === "tempo" && meta.payment_status === "unpaid" && (
                              <button 
                                disabled={isProcessingPoPayment[po.id]}
                                onClick={() => handlePayPoTempo(po)} 
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black px-3 py-1.5 rounded-xl text-[10px] shadow-md shadow-blue-500/10 flex items-center gap-1 transition-all"
                              >
                                {isProcessingPoPayment[po.id] ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <DollarSign size={12} />
                                )}
                                Bayar Hutang
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                      Belum ada Purchase Order (PO) kulakan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
