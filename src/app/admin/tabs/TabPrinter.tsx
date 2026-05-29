import React from 'react';
import { Smartphone, ScanLine, Info } from "lucide-react";

export function TabPrinter() {
  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Smartphone size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Printer Thermal</h2>
        <p className="text-slate-500 text-sm mb-8 text-center px-4">Hubungkan perangkat Anda dengan printer thermal Bluetooth untuk mencetak struk secara instan.</p>
        
        <button 
          onClick={async () => {
            try {
              const nav = navigator as any;
              if (!nav.bluetooth) {
                 alert("❌ Browser Anda tidak mendukung Bluetooth!");
                 return;
              }
              const device = await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] });
              alert(`✅ Terhubung ke: ${device.name}`);
            } catch (err: any) {
              if (err.name !== 'NotFoundError') alert("❌ Gagal terhubung: " + err.message);
            }
          }}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
        >
          <ScanLine size={20} /> CARI PERANGKAT PRINTER
        </button>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
        <h4 className="font-black text-blue-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={14} /> Panduan Koneksi</h4>
        <ul className="text-[11px] text-blue-700/70 space-y-2 font-bold">
          <li>1. Pastikan Bluetooth Printer dalam posisi ON</li>
          <li>2. Klik 'Cari Perangkat' dan pilih nama printer Anda</li>
          <li>3. Jika diminta PIN, biasanya adalah '0000' atau '1234'</li>
        </ul>
      </div>
    </div>
  );
}
