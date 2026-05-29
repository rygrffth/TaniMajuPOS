import React from 'react';
import { Search, ScanLine, PackageSearch, Cloud, Loader2, ShoppingCart, ChevronDown, UserPlus, Trash2, Minus, Plus, DollarSign, ExternalLink, Clock } from "lucide-react";

export function TabPos({
  posManualCode, setPosManualCode, handlePosScan, setScanMode,
  newProductCategory, setNewProductCategory, inventory, addItemToPosCart,
  posCart, updatePosQuantity, syncTime, selectedCustomer, setSelectedCustomer,
  customers, setShowCustomerForm, setPosCart, posPaymentMethod, setPosPaymentMethod,
  setIsConfirmingPos, lowStockThreshold, loadingInv
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Left Col: Menu & Search */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col h-auto lg:h-[calc(100vh-110px)] overflow-hidden">
          <div className="relative mb-6 shrink-0">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input 
              type="text" 
              placeholder="Scan Barcode atau Cari Nama Produk..." 
              className="w-full bg-slate-50/50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-[1.5rem] py-5 pl-16 pr-6 text-base font-black text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-inner"
              value={posManualCode}
              onChange={e => setPosManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { handlePosScan(posManualCode); setPosManualCode(""); } }}
            />
            <button onClick={() => setScanMode(true)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"><ScanLine size={22} /></button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
            {['Semua', 'Sembako', 'Makanan', 'Minuman', 'Bumbu', 'Kebersihan', 'Lainnya'].map(cat => (
              <button key={cat} onClick={() => setNewProductCategory(cat)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all border-2 whitespace-nowrap shadow-sm ${newProductCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-200 hover:text-slate-800'}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar relative content-start">
            {inventory
              .filter((i: any) => {
                 const itemCat = (i.category || "Lainnya").toString().trim().toLowerCase();
                 const activeCat = newProductCategory.trim().toLowerCase();
                 const catMatch = activeCat === 'semua' || itemCat === activeCat;
                 
                 const searchMatch = (i.variant_name || i.products?.name || "").toLowerCase().includes(posManualCode.toLowerCase()) ||
                                    (i.barcode || "").toLowerCase().includes(posManualCode.toLowerCase());
                 return catMatch && searchMatch;
              })
              .map((item: any) => (
                <button 
                  key={item.id} 
                  onClick={() => addItemToPosCart(item)} 
                  className="bg-white p-2.5 rounded-[2.5rem] border-2 border-slate-50 hover:border-emerald-400 hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.2)] hover:-translate-y-1.5 transition-all group relative overflow-hidden flex flex-col text-left active:scale-95"
                >
                  <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] mb-3 overflow-hidden relative shadow-inner border border-slate-100">
                    {item.image_url ? (
                      <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                        <PackageSearch size={32} strokeWidth={1.5} />
                        <p className="text-[7px] font-black uppercase tracking-widest mt-2">No Image</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[8px] font-black px-2 py-1 rounded-full text-slate-600 shadow-sm border border-slate-100">{item.unit || 'Pcs'}</div>
                  </div>
                  
                  <div className="px-1 flex-1 flex flex-col">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 opacity-70">{item.category || 'Umum'}</p>
                    <h4 className="font-black text-slate-800 text-[11px] line-clamp-2 leading-tight mb-3 flex-1">{item.variant_name || item.products?.name}</h4>
                    
                    <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 leading-none mb-1">Rp</p>
                         <p className="font-black text-emerald-600 text-sm leading-none">{(item.price || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${item.stock <= lowStockThreshold ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'}`}>
                        <span className="text-[10px] font-black">{item.stock || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interactive Overlay */}
                  <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </button>
              ))}

            {inventory.length > 0 && inventory.filter((i: any) => {
                const itemCat = (i.category || "Lainnya").toString().trim().toLowerCase();
                const activeCat = newProductCategory.trim().toLowerCase();
                const catMatch = activeCat === 'semua' || itemCat === activeCat;
                const searchMatch = (i.variant_name || i.products?.name || "").toLowerCase().includes(posManualCode.toLowerCase());
                return catMatch && searchMatch;
            }).length === 0 && (
              <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center">
                 <PackageSearch size={48} className="mb-4" />
                 <p className="font-black uppercase tracking-widest text-sm">Produk Tidak Ditemukan</p>
                 <p className="text-xs font-bold mt-2">Coba kategori lain atau hapus pencarian</p>
              </div>
            )}

            {inventory.length === 0 && !loadingInv && (
              <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center">
                 <Cloud size={48} className="mb-4" />
                 <p className="font-black uppercase tracking-widest text-sm">Database Kosong</p>
                 <p className="text-xs font-bold mt-2">Silakan tambah produk di tab Manajemen Produk</p>
              </div>
            )}

            {loadingInv && (
              <div className="col-span-full py-20 text-center flex flex-col items-center text-emerald-600">
                 <Loader2 size={48} className="animate-spin mb-4" />
                 <p className="font-black uppercase tracking-widest text-sm">Memuat Data...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Col: Cart & Checkout */}
      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col h-auto lg:h-[calc(100vh-110px)] overflow-hidden sticky top-0">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
             <div>
               <h3 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={20} className="text-emerald-600" /> KERANJANG</h3>
               {syncTime && <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Synced: {new Date(syncTime).toLocaleTimeString('id-ID')}</p>}
             </div>
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <select 
                    className="w-full text-[9px] font-black border-2 border-slate-200 rounded-xl pl-3 pr-8 py-2 outline-none bg-white text-slate-800 shadow-sm focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => {
                      const c = customers.find((cust: any) => cust.id === e.target.value);
                      setSelectedCustomer(c || null);
                    }}
                  >
                    <option value="">UMUM</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                </div>
                <button 
                  onClick={() => setShowCustomerForm(true)}
                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                  title="Tambah Pelanggan Baru"
                >
                  <UserPlus size={14} />
                </button>
                <button onClick={() => setPosCart([])} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                  <Trash2 size={14} />
                </button>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-8">
                 <ShoppingCart size={48} className="mb-3 text-slate-300" />
                 <p className="font-black uppercase tracking-[0.2em] text-[11px] text-slate-500">Keranjang Kosong</p>
              </div>
            ) : posCart.map((item: any) => (
              <div key={`${item.variant.id}-${item.unit?.id || 'base'}`} className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                 <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                    <img src={item.variant.image_url || "https://placehold.co/100x100?text=P"} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h5 className="text-[10px] font-black text-slate-800 uppercase line-clamp-1">{item.variant.variant_name || item.variant.products?.name}</h5>
                    <p className="text-[10px] font-bold text-emerald-600">
                      Rp {(item.unit_price || item.variant.price).toLocaleString('id-ID')} 
                      <span className="text-slate-400 font-medium"> x {item.quantity} {item.unit?.unit_name || item.variant.unit || 'Pcs'}</span>
                    </p>
                 </div>
                 <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                    <button onClick={() => updatePosQuantity(item.variant.id, -1, item.unit?.id)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Minus size={12} /></button>
                    <span className="text-[11px] font-black text-slate-800 w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updatePosQuantity(item.variant.id, 1, item.unit?.id)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Plus size={12} /></button>
                 </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900 text-white rounded-t-[1.5rem] shadow-2xl space-y-3 no-print">
             <div className="grid grid-cols-4 gap-1.5">
                {[
                  { name: 'Tunai', color: 'bg-emerald-600', icon: <DollarSign size={12} /> },
                  { name: 'QRIS', color: 'bg-indigo-600', icon: <ScanLine size={12} /> },
                  { name: 'Transfer', color: 'bg-emerald-600', icon: <ExternalLink size={12} /> },
                  { name: 'Kasbon', color: 'bg-orange-600', icon: <Clock size={12} /> }
                ].map(m => (
                  <button 
                    key={m.name}
                    onClick={() => setPosPaymentMethod(m.name)}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all border ${posPaymentMethod === m.name ? `${m.color} border-white shadow-lg` : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700'}`}
                  >
                    <span className={posPaymentMethod === m.name ? 'text-white' : 'text-slate-400'}>{m.icon}</span>
                    <span className="text-[7px] font-black uppercase tracking-tighter">{m.name}</span>
                  </button>
                ))}
             </div>

             <div className="flex justify-between items-center py-2 px-1 border-t border-slate-800">
                <div>
                   <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">TOTAL</p>
                   <h2 className="text-lg font-black text-white tracking-tighter">Rp {posCart.reduce((s: number, i: any) => s + ((i.unit_price || i.variant.price) * i.quantity), 0).toLocaleString('id-ID')}</h2>
                </div>
                <button 
                  onClick={() => setIsConfirmingPos(true)}
                  disabled={posCart.length === 0 || (posPaymentMethod === 'Kasbon' && !selectedCustomer)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white font-black py-3 px-5 rounded-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-[10px] tracking-widest uppercase"
                >
                  {posPaymentMethod === 'Kasbon' && !selectedCustomer ? 'PILIH PELANGGAN' : 'BAYAR'}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
