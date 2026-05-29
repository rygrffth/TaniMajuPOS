import React from 'react';
import { DollarSign, Plus, Trash2, Tag } from "lucide-react";

export function TabPromotions({
  wsVariantId, setWsVariantId, inventory, wsMinQty, setWsMinQty,
  wsPrice, setWsPrice, handleSaveWholesalePrice, wholesalePrices,
  handleDeleteWholesalePrice
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Promosi & Diskon</h2>
          <p className="text-gray-500 font-medium">Pengaturan otomatis harga grosir dan promo member</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Wholesale Prices Section */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><DollarSign className="text-emerald-500" /> Harga Grosir Otomatis</h3>
          
          <div className="bg-slate-50 p-6 rounded-3xl mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Pilih Produk</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" value={wsVariantId} onChange={e => setWsVariantId(e.target.value)}>
                  <option value="">-- Pilih Varian --</option>
                  {inventory.map((v: any) => <option key={v.id} value={v.id}>{v.variant_name || v.products?.name} (Rp {v.price})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Min. Qty</label>
                <input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={wsMinQty} onChange={e => setWsMinQty(Number(e.target.value) || "")} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Harga Grosir</label>
                <input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" value={wsPrice} onChange={e => setWsPrice(Number(e.target.value) || "")} />
              </div>
            </div>
            <button onClick={handleSaveWholesalePrice} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
              <Plus size={18} /> Tambah Aturan Grosir
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {wholesalePrices.map((wp: any) => (
              <div key={wp.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-all">
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase">{wp.product_variants?.variant_name || wp.product_variants?.products?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Min. Beli {wp.min_quantity} → <span className="text-emerald-600">Rp {wp.price.toLocaleString('id-ID')}</span></p>
                </div>
                <button onClick={() => handleDeleteWholesalePrice(wp.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Special Promotions (Placeholders for now) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center opacity-60">
           <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6"><Tag size={40} /></div>
           <h3 className="text-xl font-black text-slate-800 mb-2">Promo Campaign</h3>
           <p className="text-sm text-slate-500 max-w-[250px]">Fitur "Buy 1 Get 1" dan diskon periodik sedang dalam pengembangan.</p>
        </div>
      </div>
    </div>
  );
}
