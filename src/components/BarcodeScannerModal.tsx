"use client";

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ScanLine } from 'lucide-react';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScannerModal({ 
  isOpen, 
  onClose, 
  onScan, 
  title = "SCAN BARCODE",
  description = "Arahkan kamera ke barcode produk. Pastikan pencahayaan cukup terang."
}: BarcodeScannerModalProps) {
  const scannerRef = useRef<any>(null);

  const handleClose = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stopScanner();
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <ScanLine className="text-emerald-600" size={20} /> {title}
          </h3>
          <button 
            onClick={handleClose} 
            className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 bg-slate-100">
          <Scanner 
            ref={scannerRef} 
            onScan={(code) => { 
              onScan(code); 
              handleClose(); 
            }} 
          />
          <p className="text-center text-xs font-bold text-slate-500 mt-4 px-4">{description}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
