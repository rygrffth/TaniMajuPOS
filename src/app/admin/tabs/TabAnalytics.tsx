import React from 'react';
import { DollarSign, TrendingUp, Receipt, BarChart3, PackageSearch, Smartphone, Printer, FileSpreadsheet, Send } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export function TabAnalytics({
  chartsReady, analyticsData, analyticsPeriod, setAnalyticsPeriod,
  analyticsCustomFrom, setAnalyticsCustomFrom, analyticsCustomTo, setAnalyticsCustomTo,
  taxRate, analyticsSubTab, setAnalyticsSubTab, formatGrowthLine,
  exportFullReportXlsx, history, inventory, expenses, analysisLimit,
  setWaReportParams, setShowWaModal, isSharingWa, groupedExpenses
}: any) {
  if (!chartsReady) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Analytics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Business Analytics</h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-600" /> Performa Toko: <span className="text-blue-600">{analyticsData.rangeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          {['today', 'thisWeek', 'thisMonth', 'thisYear', 'custom'].map((p) => (
            <button key={p} onClick={() => setAnalyticsPeriod(p as any)} className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all uppercase tracking-wider ${analyticsPeriod === p ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              {p === 'today' ? 'Hari Ini' : p === 'thisWeek' ? 'Minggu' : p === 'thisMonth' ? 'Bulan' : p === 'thisYear' ? 'Tahun' : 'Kustom'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Range Selector */}
      {analyticsPeriod === 'custom' && (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="flex-1"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Dari Tanggal</label><input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700" value={analyticsCustomFrom} onChange={e => setAnalyticsCustomFrom(e.target.value)} /></div>
          <div className="flex-1"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Sampai Tanggal</label><input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700" value={analyticsCustomTo} onChange={e => setAnalyticsCustomTo(e.target.value)} /></div>
        </div>
      )}

      {/* Top Cards: Financial Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Omzet Penjualan", val: analyticsData.omzet, growth: analyticsData.growthOmzet, icon: <DollarSign />, color: "blue", bg: "bg-blue-600" },
          { title: "Laba Kotor", val: analyticsData.omzet - analyticsData.hpp, growth: analyticsData.growthOmzet, icon: <TrendingUp />, color: "emerald", bg: "bg-emerald-600" },
          { title: "Biaya Operasional", val: analyticsData.expense, growth: analyticsData.growthExpense, icon: <Receipt />, color: "rose", bg: "bg-rose-600" },
          { title: "Laba Bersih", val: analyticsData.netProfit, growth: analyticsData.growthNet, icon: <BarChart3 />, color: "slate", bg: "bg-slate-900", isLabaBersih: true }
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 gap-3">
                <div className={`w-12 h-12 shrink-0 ${card.bg} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>{card.icon}</div>
                {formatGrowthLine(card.growth)}
              </div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.title}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">Rp {card.val.toLocaleString('id-ID')}</p>
            </div>
            {card.isLabaBersih && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[10px] text-slate-500 font-bold">
                <div className="flex justify-between">
                  <span>Pajak UMKM ({taxRate}%):</span>
                  <span className="text-red-500">-Rp {(analyticsData.omzet * (taxRate / 100)).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-black text-slate-800">
                  <span>Setelah Pajak:</span>
                  <span className="text-emerald-600">Rp {(card.val - (analyticsData.omzet * (taxRate / 100))).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-Tab Selector */}
      <div className="flex gap-4 border-b border-slate-100 pb-2 no-print">
        <button 
          onClick={() => setAnalyticsSubTab("charts")}
          className={`pb-3 font-black text-sm tracking-tight border-b-4 transition-all uppercase ${analyticsSubTab === "charts" ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          📊 Visual Grafik
        </button>
        <button 
          onClick={() => setAnalyticsSubTab("pandl")}
          className={`pb-3 font-black text-sm tracking-tight border-b-4 transition-all uppercase ${analyticsSubTab === "pandl" ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          📋 Laporan Laba Rugi (P&L)
        </button>
      </div>

      {analyticsSubTab === "charts" ? (
        <>
          {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
               <h3 className="text-xl font-black text-slate-800">Tren Pendapatan</h3>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Penjualan harian dalam periode terpilih</p>
            </div>
            <div className="flex gap-2"><span className="w-3 h-3 bg-blue-600 rounded-full"></span><span className="text-[10px] font-black text-slate-400 uppercase">Revenue</span></div>
          </div>
          <div className="h-[350px] w-full min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={analyticsData.chartElements}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `Rp ${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                  formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, "Pendapatan"]}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
             <h3 className="text-xl font-black text-slate-800 mb-1 text-center">Metode Bayar</h3>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest text-center mb-8">Dominasi Transaksi</p>
             <div className="h-[250px] w-full relative min-h-0 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie data={analyticsData.payMethodChart} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                      {analyticsData.payMethodChart.map((entry: any, index: number) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">AOV</p>
                      <p className="text-lg font-black text-slate-800 tracking-tighter">Rp {Math.round(analyticsData.aov).toLocaleString('id-ID')}</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="space-y-3 mt-4">
             {analyticsData.payMethodChart.map((item: any, idx: number) => (
               <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                     <span className="text-xs font-black text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">Rp {item.value.toLocaleString('id-ID')}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Smart Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Top Products */}
         <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center"><PackageSearch size={20} /></div>
                  <h3 className="text-xl font-black">Produk Terlaris (Qty)</h3>
               </div>
               <div className="space-y-4">
                  {analyticsData.bestSellerChart.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group">
                       <div className="flex items-center gap-4 flex-1">
                          <span className="text-xs font-black text-slate-500 w-4">{idx+1}.</span>
                          <div className="flex-1">
                             <div className="flex justify-between text-xs font-black mb-1.5">
                                <span className="uppercase tracking-tight">{item.name}</span>
                                <span className="text-blue-400">{item.value} {analyticsData.deadStock.find((i: any) => i.variant_name === item.name)?.unit || 'Pcs'}</span>
                             </div>
                             <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.value / analyticsData.bestSellerChart[0].value) * 100}%` }}></div>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full translate-x-20 translate-y-20 blur-3xl"></div>
         </div>

         {/* Top Profitability */}
         <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><TrendingUp size={20} /></div>
               <h3 className="text-xl font-black text-slate-800">Kontribusi Laba Tertinggi</h3>
            </div>
            <div className="space-y-5">
               {analyticsData.topProfitProducts.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl transition-all border border-transparent hover:border-emerald-100">
                     <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${idx === 0 ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'}`}>{idx+1}</span>
                        <div>
                           <p className="text-xs font-black text-slate-800 uppercase line-clamp-1">{item.name}</p>
                           <p className="text-[10px] text-emerald-600 font-bold tracking-widest">REVENUE: Rp {item.revenue.toLocaleString('id-ID')}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-slate-900">Rp {item.profit.toLocaleString('id-ID')}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">NET PROFIT</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Procurement Strategy (AI Recommendations) */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100"><Smartphone size={32} /></div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800">Rekomendasi Kulakan</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Prediksi Stok untuk 14 Hari Kedepan</p>
               </div>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analyticsData.velocityRecommendation.slice(0, 8).map((item: any, idx: number) => (
              <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative group overflow-hidden">
                 <div className="relative z-10">
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Speed: {item.velocity.toFixed(1)} / hari</p>
                    <h4 className="font-black text-slate-800 uppercase text-sm mb-4 line-clamp-2">{item.name}</h4>
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Saran Order</p>
                          <p className="text-2xl font-black text-indigo-600">{item.needed}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Stok Sisa</p>
                          <p className="text-sm font-black text-slate-800">{item.stock}</p>
                       </div>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 transform translate-x-2 group-hover:translate-x-0 transition-transform"></div>
              </div>
            ))}
         </div>
       </div>
     </>
      ) : (
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase">Laporan Laba Rugi</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">POS TANI MAJU • Periode {analyticsData.rangeLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] px-5 py-3 rounded-xl tracking-wider uppercase transition-all flex items-center gap-1.5 border border-slate-200 active:scale-95 no-print"
              >
                <Printer size={12} /> Cetak PDF
              </button>
              <button 
                onClick={() => exportFullReportXlsx(history, inventory, analyticsData.variantSold, expenses, analysisLimit, {
                  omzet: analyticsData.omzet,
                  hpp: analyticsData.hpp,
                  expense: analyticsData.expense,
                  netProfit: analyticsData.netProfit,
                  range: analyticsData.rangeLabel,
                  taxRate: taxRate / 100
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-5 py-3 rounded-xl tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10 active:scale-95 no-print"
              >
                <FileSpreadsheet size={12} /> Ekspor Excel
              </button>
              <button 
                onClick={() => {
                  setWaReportParams({
                    history,
                    inventory,
                    soldMap: analyticsData.variantSold,
                    expenses,
                    summary: {
                      omzet: analyticsData.omzet,
                      hpp: analyticsData.hpp,
                      expense: analyticsData.expense,
                      netProfit: analyticsData.netProfit,
                      range: analyticsData.rangeLabel,
                      taxRate: taxRate / 100
                    }
                  });
                  setShowWaModal(true);
                }}
                disabled={isSharingWa}
                className="bg-green-500 hover:bg-green-600 text-white font-black text-[10px] px-5 py-3 rounded-xl tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-lg shadow-green-500/10 active:scale-95 disabled:opacity-50 no-print"
              >
                {isSharingWa ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Kirim WA
              </button>
            </div>
          </div>

          <div className="space-y-6 text-slate-800">
            {/* PENDAPATAN */}
            <div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-b-2 border-slate-200 pb-1">
                <span>I. PENDAPATAN (REVENUE)</span>
                <span></span>
              </div>
              <div className="space-y-2 mt-2 pl-4 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Penjualan Kotor (Gross Sales)</span>
                  <span>Rp {analyticsData.omzet.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Diskon & Potongan Jual</span>
                  <span>Rp 0</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t border-dashed border-slate-100 pt-1">
                  <span>PENDAPATAN BERSIH (NET REVENUE)</span>
                  <span>Rp {analyticsData.omzet.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* COGS / HPP */}
            <div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-b-2 border-slate-200 pb-1">
                <span>II. BEBAN POKOK PENJUALAN (COGS)</span>
                <span></span>
              </div>
              <div className="space-y-2 mt-2 pl-4 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Beban Pokok Penjualan (HPP FIFO)</span>
                  <span className="text-red-500">Rp {analyticsData.hpp.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t border-dashed border-slate-100 pt-1">
                  <span>TOTAL BEBAN POKOK PENJUALAN</span>
                  <span className="text-red-500">Rp {analyticsData.hpp.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* LABA KOTOR */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl flex justify-between items-center font-black text-sm text-emerald-800">
              <div className="flex flex-col">
                <span>III. LABA KOTOR (GROSS PROFIT)</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Persentase Margin Laba Kotor: {analyticsData.omzet > 0 ? ((analyticsData.omzet - analyticsData.hpp) / analyticsData.omzet * 100).toFixed(1) : 0}%</span>
              </div>
              <span className="text-lg">Rp {(analyticsData.omzet - analyticsData.hpp).toLocaleString('id-ID')}</span>
            </div>

            {/* BIAYA OPERASIONAL */}
            <div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-b-2 border-slate-200 pb-1">
                <span>IV. BEBAN OPERASIONAL (OPERATING EXPENSES)</span>
                <span></span>
              </div>
              <div className="space-y-2 mt-2 pl-4 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Beban Kulakan Langsung (Tunai)</span>
                  <span className="text-red-500">Rp {groupedExpenses.Kulakan.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beban Gaji Karyawan</span>
                  <span className="text-red-500">Rp {groupedExpenses.Gaji.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beban Listrik & Air</span>
                  <span className="text-red-500">Rp {groupedExpenses.Listrik.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beban Operasional Lainnya</span>
                  <span className="text-red-500">Rp {groupedExpenses.Lainnya.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t border-dashed border-slate-100 pt-1">
                  <span>TOTAL BEBAN OPERASIONAL</span>
                  <span className="text-red-500">Rp {analyticsData.expense.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* LABA SEBELUM PAJAK */}
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center font-black text-sm text-slate-900">
              <span>V. LABA BERSIH SEBELUM PAJAK (EBT)</span>
              <span className="text-lg">Rp {analyticsData.netProfit.toLocaleString('id-ID')}</span>
            </div>

            {/* PAJAK */}
            <div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-b-2 border-slate-200 pb-1">
                <span>VI. PAJAK PENGHASILAN (UMKM)</span>
                <span></span>
              </div>
              <div className="space-y-2 mt-2 pl-4 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Pajak Final UMKM ({taxRate}% dari Omzet)</span>
                  <span className="text-red-500">Rp {(analyticsData.omzet * (taxRate / 100)).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* LABA BERSIH SETELAH PAJAK */}
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex justify-between items-center font-black">
              <div>
                <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] mb-1">LABA BERSIH AKHIR</p>
                <h4 className="text-xl">VI. LABA BERSIH SETELAH PAJAK</h4>
              </div>
              <span className="text-2xl text-emerald-400">Rp {(analyticsData.netProfit - (analyticsData.omzet * (taxRate / 100))).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
