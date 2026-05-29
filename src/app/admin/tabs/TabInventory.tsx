import React from 'react';
import { PlusCircle, Search, AlertCircle, Edit, Plus, Ban, Tag } from "lucide-react";

export function TabInventory({
  setIsNewProduct, manualBarcode, setManualBarcode, filteredInventory,
  lowStockThreshold, openEditProduct, openAddStock, openReportDamaged, openLabelPrinter
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Produk</h2>
          <p className="text-gray-500 font-medium">Atur stok, harga, dan pendaftaran barang baru</p>
        </div>
        <button onClick={() => setIsNewProduct(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
          <PlusCircle size={20} /> Tambah Produk Baru
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama produk atau scan barcode..." 
            className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item: any) => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-300 hover:bg-white hover:shadow-xl transition-all group">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden relative">
                  <img src={item.image_url || "https://placehold.co/200x200?text=Produk"} className="w-full h-full object-cover" />
                  {item.stock <= (item.min_stock || lowStockThreshold) && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg shadow-lg animate-pulse"><AlertCircle size={12} /></div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{item.category || 'LAINNYA'}</p>
                    <h4 className="font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase">{item.variant_name || item.products?.name}</h4>
                    <p className="text-xs text-gray-400 font-bold font-mono">{item.barcode || 'TANPA SKU'}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="font-black text-lg text-slate-900">Rp {(item.price || 0).toLocaleString('id-ID')}</p>
                    <div className={`px-2 py-1 rounded-lg font-black text-[10px] ${item.stock <= (item.min_stock || lowStockThreshold) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      STOK: {item.stock || 0} {item.unit || 'Pcs'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap md:flex-nowrap">
                <button onClick={() => openEditProduct(item)} className="flex-1 bg-white border border-gray-200 hover:bg-blue-50 text-blue-600 font-black py-2 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1"><Edit size={12} /> EDIT</button>
                <button onClick={() => openAddStock(item)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/10"><Plus size={12} /> STOK</button>
                <button onClick={() => openReportDamaged(item)} className="flex-1 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 font-black py-2 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1"><Ban size={12} /> RUSAK</button>
                <button onClick={() => openLabelPrinter(item)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1"><Tag size={12} /> LABEL</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
