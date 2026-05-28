"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle, PackageSearch, ListOrdered, Plus, Minus, Search,
  Save, Printer, Smartphone, Download, X, History, ScanLine, RotateCcw,
  Ban, ShoppingBag, BarChart3, CalendarDays, Trash2, Edit, LayoutGrid, Lock,
  DollarSign, TrendingUp, Receipt, Clock, PlusCircle, MinusCircle, AlertCircle, Settings, Info, Cloud, LogOut,
  FileSpreadsheet, Sheet, ExternalLink, Loader2, ArrowUpRight, ArrowDownRight, Share2, Send,
  ShoppingCart, PieChart as PieChartIcon, Users, Tag, Truck, ChevronDown, UserPlus, Menu
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import ScalingContainer from "@/components/ScalingContainer";
import { exportTransactionsXlsx, exportInventoryXlsx, exportFullReportXlsx, shareFullReportXlsx } from "@/lib/exportXlsx";
import { syncToGoogleSheets } from "@/lib/googleSheets";
import { playBeepSound } from "@/lib/sounds";
 
const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

const CODE39_ENCODING: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
  '$': '100100100101', '/': '100100101002', '+': '100101001001', '%': '101001001001'
};

function generateCode39Pattern(text: string) {
  const cleanText = `*${(text || "123456").toUpperCase()}*`;
  let pattern = "";
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const charPattern = CODE39_ENCODING[char] || CODE39_ENCODING[' '];
    pattern += charPattern + "0";
  }
  return pattern;
}

const BarcodeSVG = ({ value }: { value: string }) => {
  const pattern = generateCode39Pattern(value || "123456");
  const barWidth = 1.5;
  const height = 40;
  const width = pattern.length * barWidth;
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
      {pattern.split('').map((char, idx) => {
        if (char === '1') {
          return (
            <rect
              key={idx}
              x={idx * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="black"
            />
          );
        }
        return null;
      })}
    </svg>
  );
};

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type AnalyticsPeriod =
  | "today"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function getAnalyticsRange(
  period: AnalyticsPeriod,
  customFrom: string,
  customTo: string,
  now: Date = new Date()
): { start: Date; end: Date; label: string } {
  const n = new Date(now);
  switch (period) {
    case "today":
      return { start: startOfDay(n), end: endOfDay(n), label: "Hari Ini" };
    case "thisWeek": {
      const start = startOfWeekMonday(n);
      return { start, end: endOfDay(n), label: "Minggu Ini" };
    }
    case "lastWeek": {
      const thisMon = startOfWeekMonday(n);
      const lastMon = new Date(thisMon);
      lastMon.setDate(lastMon.getDate() - 7);
      const lastSun = new Date(thisMon);
      lastSun.setDate(lastSun.getDate() - 1);
      return { start: startOfDay(lastMon), end: endOfDay(lastSun), label: "Minggu Lalu" };
    }
    case "thisMonth":
      return {
        start: startOfDay(new Date(n.getFullYear(), n.getMonth(), 1)),
        end: endOfDay(n),
        label: "Bulan Ini",
      };
    case "lastMonth": {
      const first = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const last = new Date(n.getFullYear(), n.getMonth(), 0);
      return { start: startOfDay(first), end: endOfDay(last), label: "Bulan Lalu" };
    }
    case "thisYear":
      return {
        start: startOfDay(new Date(n.getFullYear(), 0, 1)),
        end: endOfDay(n),
        label: "Tahun Ini",
      };
    case "custom": {
      const from = customFrom
        ? new Date(customFrom + "T00:00:00")
        : startOfDay(new Date(n.getFullYear(), n.getMonth(), 1));
      const to = customTo
        ? new Date(customTo + "T23:59:59.999")
        : endOfDay(n);
      return {
        start: from,
        end: to,
        label:
          customFrom && customTo
            ? `${new Date(customFrom).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${new Date(customTo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
            : "Rentang Kustom",
      };
    }
  }
}

function previousEqualPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const len = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - len);
  return { start: prevStart, end: prevEnd };
}

function growthPct(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function inferSaleCategory(productName: string, variantName: string): string {
  const s = `${productName} ${variantName}`.toLowerCase();
  if (
    /\b(kopi|teh|jus|susu|minuman|es |air |sprite|coca|fanta|latte|cappuccino|americano|juice|soda|pop ice|boba|matcha|mineral)\b/.test(s)
  )
    return "Minuman";
  if (/\b(kerupuk|keripik|snack|biskuit|permen|coklat|gorengan|kacang|makaroni|chitato)\b/.test(s)) return "Snack";
  if (
    /\b(nasi|mie|ayam|ikan|sate|bakso|gado|rendang|goreng|soto|bakwan|ketoprak|pecel|burger|pizza|roti|sandwich|martabak|lontong|ketupat|opor|nugget)\b/.test(s)
  )
    return "Makanan";
  return "Lainnya";
}

function aggregatePeriodMetrics(
  history: any[],
  expenses: any[],
  start: Date,
  end: Date
) {
  let omzet = 0;
  let hpp = 0;
  let trxCount = 0;
  const payMethodMap: Record<string, number> = { Tunai: 0, QRIS: 0, Transfer: 0, Lainnya: 0 };
  const hourMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;
  const dayMap: Record<number, { revenue: number; count: number }> = {};
  for (let d = 0; d < 7; d++) dayMap[d] = { revenue: 0, count: 0 };
  const sellerMap: Record<string, number> = {};
  const categoryRevenue: Record<string, number> = { Makanan: 0, Minuman: 0, Snack: 0, Lainnya: 0 };
  const categoryProfit: Record<string, number> = { Makanan: 0, Minuman: 0, Snack: 0, Lainnya: 0 };

  history.forEach((trx) => {
    if (trx.status !== "paid") return;
    const tDate = new Date(trx.created_at);
    if (tDate < start || tDate > end) return;
    const amt = trx.total_amount || 0;
    omzet += amt;
    trxCount += 1;

    let trxHpp = 0;
    trx.transaction_items?.forEach((item: any) => {
      const currentHpp = item.hpp || item.product_variants?.hpp || 0;
      const itemModal = currentHpp * item.quantity;
      trxHpp += itemModal;
      const pname = item.product_variants?.products?.name || "";
      const vname = item.product_variants?.variant_name || "";
      const cat = inferSaleCategory(pname, vname);
      const sub = (item.unit_price ?? item.product_variants?.price ?? 0) * item.quantity;
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + sub;
      categoryProfit[cat] = (categoryProfit[cat] || 0) + (sub - itemModal);
    });
    hpp += trxHpp;

    const pm = (trx.payment_method || "Tunai").toLowerCase();
    if (pm.includes("qris")) payMethodMap.QRIS += amt;
    else if (pm.includes("transfer")) payMethodMap.Transfer += amt;
    else if (pm.includes("tunai") || pm.includes("cash") || !trx.payment_method) payMethodMap.Tunai += amt;
    else payMethodMap.Lainnya += amt;

    hourMap[tDate.getHours()] += 1;
    dayMap[tDate.getDay()].revenue += amt;
    dayMap[tDate.getDay()].count += 1;

    trx.transaction_items?.forEach((item: any) => {
      const name = item.product_variants?.variant_name || item.product_variants?.products?.name || "Unknown";
      sellerMap[name] = (sellerMap[name] || 0) + item.quantity;
    });
  });

  let expense = 0;
  expenses.forEach((exp) => {
    const eDate = new Date(exp.created_at);
    if (eDate >= start && eDate <= end) expense += exp.amount || 0;
  });

  const netProfit = omzet - hpp - expense;
  const aov = trxCount > 0 ? omzet / trxCount : 0;

  return { omzet, hpp, expense, netProfit, trxCount, aov, payMethodMap, hourMap, dayMap, sellerMap, categoryRevenue, categoryProfit };
}

function buildTrendChartData(history: any[], start: Date, end: Date): { name: string; total: number }[] {
  const msPerDay = 86400000;
  const nDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  const points: { name: string; total: number }[] = [];
  if (nDays <= 45) {
    const cur = startOfDay(new Date(start));
    const endDay = startOfDay(new Date(end));
    while (cur <= endDay) {
      const label = cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      let total = 0;
      history.forEach((trx) => {
        if (trx.status !== "paid") return;
        const td = startOfDay(new Date(trx.created_at));
        if (td.getTime() === cur.getTime()) total += trx.total_amount || 0;
      });
      points.push({ name: label, total });
      cur.setDate(cur.getDate() + 1);
    }
    return points;
  }
  let cur = startOfDay(new Date(start));
  const endT = end.getTime();
  while (cur.getTime() <= endT) {
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    if (weekEnd.getTime() > endT) weekEnd.setTime(endT);
    const label = `Mgg ${cur.getDate()}/${cur.getMonth() + 1}`;
    let total = 0;
    history.forEach((trx) => {
      if (trx.status !== "paid") return;
      const t = new Date(trx.created_at).getTime();
      if (t >= cur.getTime() && t <= weekEnd.getTime()) total += trx.total_amount || 0;
    });
    points.push({ name: label, total });
    cur.setDate(cur.getDate() + 7);
  }
  return points;
}

type Tab = "pos" | "transactions" | "tables" | "closing" | "inventory" | "expenses" | "history" | "analytics" | "database" | "settings" | "suppliers" | "promotions" | "customers" | "printer";
type Role = "admin";

const SidebarButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl transition-all text-xs font-black uppercase tracking-wider group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}
  >
    <span className={`${active ? 'text-white scale-110' : 'text-slate-500 group-hover:text-slate-300'} transition-all`}>{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [authRole, setAuthRole] = useState<Role | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pos");
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTrx, setLoadingTrx] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [posCart, setPosCart] = useState<any[]>([]);
  const [selectedTrxIds, setSelectedTrxIds] = useState<string[]>([]);
  const [isConfirmingPos, setIsConfirmingPos] = useState(false);

  const handleSecretGateway = () => {
    setTapCount(prev => {
      const nextCount = prev + 1;
      if (nextCount >= 10) {
        window.location.href = "/";
        return 0;
      }
      return nextCount;
    });
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 1500);
  };

  const [posManualCode, setPosManualCode] = useState("");
  const [isProcessingPos, setIsProcessingPos] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState("Tunai");
  const [posReceiptData, setPosReceiptData] = useState<any | null>(null);
  // Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number | "">(0);
  const [chartsReady, setChartsReady] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Kulakan");
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);

  const [viewingTrx, setViewingTrx] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"bill" | "receipt">("bill");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");

  const [inventory, setInventory] = useState<any[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanMode, setScanMode] = useState(false);

  const scannerRef = useRef<any>(null);

  const handleBatalScan = async () => {
    if (scannerRef.current) await scannerRef.current.stopScanner();
    setScanMode(false);
  };
  const [loadingInv, setLoadingInv] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [addStockAmount, setAddStockAmount] = useState<number | "">("");

  // Registration Form State (Enhanced)
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductPrice, setNewProductPrice] = useState<number | "">("");
  const [newProductHpp, setNewProductHpp] = useState<number | "">("");
  const [newProductStock, setNewProductStock] = useState<number | "">("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<string>("Sembako");
  const [newProductUnit, setNewProductUnit] = useState("Pcs");
  const [newProductMinStock, setNewProductMinStock] = useState<number | "">(0);
  const [newProductKeywords, setNewProductKeywords] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductPrice, setEditProductPrice] = useState<number | "">("");
  const [editProductHpp, setEditProductHpp] = useState<number | "">("");
  const [editProductStock, setEditProductStock] = useState<number | "">("");
  const [editProductBarcode, setEditProductBarcode] = useState("");
  const [editProductImage, setEditProductImage] = useState("");
  const [editProductCategory, setEditProductCategory] = useState<string>("Lainnya");
  const [editProductUnit, setEditProductUnit] = useState("Pcs");
  const [editProductMinStock, setEditProductMinStock] = useState<number | "">(0);
  const [editProductKeywords, setEditProductKeywords] = useState("");
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Daily Closing States
  const [showClosingForm, setShowClosingForm] = useState(false);
  const [closingCashActual, setClosingCashActual] = useState<number | "">("");
  const [closingNotes, setClosingNotes] = useState("");
  const [isSavingClosing, setIsSavingClosing] = useState(false);
  const [closingHistory, setClosingHistory] = useState<any[]>([]);
  const [loadingClosing, setLoadingClosing] = useState(false);

  // Google Sheets Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const [isSharingWa, setIsSharingWa] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waPhoneNumber, setWaPhoneNumber] = useState("");
  const [rememberWaNumber, setRememberWaNumber] = useState(true);
  const [waReportParams, setWaReportParams] = useState<any>(null);

  // Sync Reminders & Settings
  const [syncReminder, setSyncReminder] = useState<string | null>(null);
  const [remindMidday, setRemindMidday] = useState(12);
  const [remindEvening, setRemindEvening] = useState(17);
  const [remindClosing, setRemindClosing] = useState(22);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [analysisLimit, setAnalysisLimit] = useState(10);
  const [taxRate, setTaxRate] = useState(0.5); // Default 0.5%

  useEffect(() => {
    const saved = localStorage.getItem("pos_sync_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.midday) setRemindMidday(parsed.midday);
        if (parsed.evening) setRemindEvening(parsed.evening);
        if (parsed.closing) setRemindClosing(parsed.closing);
        if (parsed.lowStockThreshold) setLowStockThreshold(parsed.lowStockThreshold);
        if (parsed.analysisLimit) setAnalysisLimit(parsed.analysisLimit);
        if (parsed.taxRate !== undefined) setTaxRate(parsed.taxRate);
      } catch (e) { console.error("Error loading sync settings", e); }
    }
    const savedWa = localStorage.getItem("pos_wa_report_number");
    if (savedWa) setWaPhoneNumber(savedWa);
  }, []);

  const saveSyncSettings = (mid: number, eve: number, close: number, threshold: number, limit: number, tax: number) => {
    localStorage.setItem("pos_sync_settings", JSON.stringify({ 
      midday: mid, 
      evening: eve, 
      closing: close, 
      lowStockThreshold: threshold,
      analysisLimit: limit,
      taxRate: tax
    }));
    alert("✅ Pengaturan berhasil disimpan!");
  };

  // Business Notes State
  const [businessNotes, setBusinessNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [selectedNoteDate, setSelectedNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // New Features State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [wholesalePrices, setWholesalePrices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [productUnits, setProductUnits] = useState<any[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Customer Debt Payment State
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<any | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<number | "">("");
  const [isProcessingDebtPayment, setIsProcessingDebtPayment] = useState(false);

  // Shrinkage/Damaged Goods State
  const [showDamagedModal, setShowDamagedModal] = useState(false);
  const [selectedVariantForDamaged, setSelectedVariantForDamaged] = useState<any | null>(null);
  const [damagedQty, setDamagedQty] = useState<number | "">("");
  const [damagedReason, setDamagedReason] = useState("Expired");
  const [isSavingDamaged, setIsSavingDamaged] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  // Purchase Order & Accounts Payable (Tempo) State
  const [showPoForm, setShowPoForm] = useState(false);
  const [selectedPoSupplier, setSelectedPoSupplier] = useState("");
  const [poItems, setPoItems] = useState<any[]>([]);
  const [poPaymentTerms, setPoPaymentTerms] = useState<"cash" | "tempo">("cash");
  const [poDueDate, setPoDueDate] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [isSavingPo, setIsSavingPo] = useState(false);
  const [poFilterStatus, setPoFilterStatus] = useState("all");
  const [poFilterPayment, setPoFilterPayment] = useState("all");
  const [isProcessingPoPayment, setIsProcessingPoPayment] = useState<Record<string, boolean>>({});
  const [supplierSubTab, setSupplierSubTab] = useState<"suppliers" | "pos">("suppliers");
  const [poFilterSupplier, setPoFilterSupplier] = useState("all");
  const [customerSubTab, setCustomerSubTab] = useState<"list" | "receivables">("list");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"charts" | "pandl">("charts");

  // Barcode Label Printer State
  const [printingProduct, setPrintingProduct] = useState<any | null>(null);
  const [labelFormat, setLabelFormat] = useState<"shelf" | "sticker">("shelf");
  const [printQty, setPrintQty] = useState<number>(1);
  const [labelStoreName, setLabelStoreName] = useState("TANI MAJU");

  // Supplier Form State
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [isMember, setIsMember] = useState(false);

  // Wholesale Form State
  const [wsVariantId, setWsVariantId] = useState("");
  const [wsMinQty, setWsMinQty] = useState<number | "">("");
  const [wsPrice, setWsPrice] = useState<number | "">("");

  // Multi-UOM Form State
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitMultiplier, setNewUnitMultiplier] = useState<number | "">("");
  const [newUnitBarcode, setNewUnitBarcode] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState<number | "">("");

  const [syncTime, setSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const checkSyncTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const mins = now.getMinutes();

      const hoursToRemind = [remindMidday, remindEvening, remindClosing];
      
      let currentMsg = null;
      for (const h of hoursToRemind) {
        // Small Warning (Persiapan): 10 minutes before the hour
        if (hour === h - 1 && mins >= 50) {
          const type = h === remindClosing ? "Tutup Toko" : h === remindMidday ? "Siang" : "Sore";
          currentMsg = `📢 Persiapan: 10 menit lagi masuk jam sinkronisasi ${type} (${h}:00)`;
          break;
        }
        // Main Warning: first 15 mins of the hour
        if (hour === h && mins < 15) {
          const type = h === remindClosing ? "Tutup Toko 🌙" : h === remindMidday ? "Siang 🕒" : "Sore 🌆";
          currentMsg = `⚠️ Waktunya Sinkronisasi ${type}! Silakan tekan tombol Sync Google Sheets.`;
          break;
        }
      }
      setSyncReminder(currentMsg);
    };

    checkSyncTime();
    const interval = setInterval(checkSyncTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [remindMidday, remindEvening, remindClosing]);

  // Inventory period filter
  const [invPeriod, setInvPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [invCustomFrom, setInvCustomFrom] = useState('');
  const [invCustomTo, setInvCustomTo] = useState('');

  // History period filter
  const [histPeriod, setHistPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [histCustomFrom, setHistCustomFrom] = useState('');
  const [histCustomTo, setHistCustomTo] = useState('');

  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('thisMonth');
  const [analyticsCustomFrom, setAnalyticsCustomFrom] = useState('');
  const [analyticsCustomTo, setAnalyticsCustomTo] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const timer = setTimeout(() => setChartsReady(true), 300);
      return () => { setChartsReady(false); clearTimeout(timer); };
    } else {
      setChartsReady(false);
    }
  }, [activeTab]);

  // Tables / Locations State

  // Table occupancy tracking: 'occupied' | 'confirmed' | 'left'


  const findInventory = (barcode: string) => {
    const item = inventory.find(i => i.barcode === barcode);
    if (item) {
      setSelectedVariant(item);
      setIsNewProduct(false);
    } else {
      setSelectedVariant(null);
      setIsNewProduct(true);
      setManualBarcode(barcode);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductHpp("");
      setNewProductStock("");
      setNewProductImage("");
    }
  };

  useBarcodeScanner((barcode) => {
    if (activeTab === 'pos') {
      handlePosScan(barcode);
    } else if (activeTab === 'inventory') {
      if (!isNewProduct && !editingProduct) {
        if (scanMode) handleBatalScan();
        findInventory(barcode);
      }
    }
  });

  useEffect(() => {
    setMounted(true);
    // Restore auth state
    const savedRole = localStorage.getItem("pos_admin_role") as Role;
    if (savedRole) setAuthRole(savedRole);
    
    // Initial data load
    loadData();

    // Supabase Realtime Listener
    const channel = supabase.channel('realtime_pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
        fetchHistory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => {
        fetchInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchSuppliers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchCustomers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => fetchPromotions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => fetchPurchaseOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_units' }, () => fetchProductUnits())
      .subscribe();

    const handleOnline = () => loadData();
    window.addEventListener('online', handleOnline);

    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Consolidated mount hook

  // ================= DATA FETCHING =================
  const loadData = () => {
    fetchTransactions();
    fetchHistory();
    fetchInventory();
    fetchExpenses();
    fetchClosingHistory();
    fetchBusinessNotes();
    fetchSuppliers();
    fetchCustomers();
    fetchPromotions();
    fetchWholesalePrices();
    fetchPurchaseOrders();
    fetchProductUnits();

    // Load from Cache on Mount
    loadCache();
    const now = new Date().toISOString();
    localStorage.setItem('pos_last_sync', now);
    setSyncTime(now);
  };

  const loadCache = () => {
    try {
      const cachedInv = localStorage.getItem('pos_inventory');
      const cachedUnits = localStorage.getItem('pos_units');
      const cachedCustomers = localStorage.getItem('pos_customers');
      
      if (cachedInv) setInventory(JSON.parse(cachedInv));
      if (cachedUnits) setProductUnits(JSON.parse(cachedUnits));
      if (cachedCustomers) setCustomers(JSON.parse(cachedCustomers));
      
      const lastSync = localStorage.getItem('pos_last_sync');
      if (lastSync) setSyncTime(lastSync);
    } catch (e) { console.error("Cache load error", e); }
  };

  const fetchProductUnits = async () => {
    const { data } = await supabase.from("product_units").select("*");
    if (data) {
      setProductUnits(data);
      localStorage.setItem('pos_units', JSON.stringify(data));
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    if (data) setSuppliers(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*");
    if (data) {
      setCustomers(data);
      localStorage.setItem('pos_customers', JSON.stringify(data));
    }
  };

  const fetchPromotions = async () => {
    const { data } = await supabase.from("promotions").select("*, promotion_rules(*)").order("created_at", { ascending: false });
    if (data) setPromotions(data);
  };

  const fetchInventory = async () => {
    setLoadingInv(true);
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*, products(name)")
        .order("id", { ascending: false });
      
      if (error) {
        console.error("Fetch Inventory Error:", error);
      } else if (data) {
        setInventory(data);
        localStorage.setItem('pos_inventory', JSON.stringify(data));
        const now = new Date().toISOString();
        localStorage.setItem('pos_last_sync', now);
        setSyncTime(now);
      }
    } catch (err) {
      console.error("System Error fetching inventory:", err);
    } finally {
      setLoadingInv(false);
    }
  };

  const fetchWholesalePrices = async () => {
    const { data } = await supabase.from("wholesale_prices").select("*, product_variants(variant_name, products(name))");
    if (data) setWholesalePrices(data);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_items(*, product_variants(variant_name, products(name)))").order("created_at", { ascending: false });
    if (data) setPurchaseOrders(data);
  };

  const handleSaveSupplier = async () => {
    const payload = { name: supplierName, contact_person: supplierContact, phone: supplierPhone, address: supplierAddress };
    if (editingSupplier) {
      await supabase.from("suppliers").update(payload).eq("id", editingSupplier.id);
    } else {
      await supabase.from("suppliers").insert([payload]);
    }
    setShowSupplierForm(false);
    setEditingSupplier(null);
    setSupplierName(""); setSupplierContact(""); setSupplierPhone(""); setSupplierAddress("");
    fetchSuppliers();
  };

  const handleSaveCustomer = async () => {
    const payload = { name: customerName, phone: customerPhone, address: customerAddress, is_member: isMember };
    try {
      if (editingCustomer) {
        await supabase.from("customers").update(payload).eq("id", editingCustomer.id);
      } else {
        const { data, error } = await supabase.from("customers").insert([payload]).select().single();
        if (error) throw error;
        if (data) setSelectedCustomer(data); // Auto-select the new customer
      }
      setShowCustomerForm(false);
      setEditingCustomer(null);
      setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setIsMember(false);
      fetchCustomers();
    } catch (err: any) { alert("Gagal simpan customer: " + err.message); }
  };

  const handlePayCustomerDebt = async () => {
    if (!selectedCustomerForPayment || !debtPaymentAmount || debtPaymentAmount <= 0) return;
    
    if (Number(debtPaymentAmount) > (selectedCustomerForPayment.total_debt || 0)) {
      if (!confirm("Jumlah pembayaran melebihi total hutang. Apakah Anda yakin?")) return;
    }

    setIsProcessingDebtPayment(true);
    try {
      const { error } = await supabase.rpc('update_customer_debt', {
        p_customer_id: selectedCustomerForPayment.id,
        p_amount: -Number(debtPaymentAmount)
      });
      if (error) throw error;
      
      alert(`✅ Berhasil mencatat pelunasan kasbon sebesar Rp ${Number(debtPaymentAmount).toLocaleString('id-ID')} untuk ${selectedCustomerForPayment.name}`);
      
      setShowDebtPaymentModal(false);
      setSelectedCustomerForPayment(null);
      setDebtPaymentAmount("");
      fetchCustomers();
    } catch (err: any) {
      alert("Gagal memproses pembayaran kasbon: " + err.message);
    } finally {
      setIsProcessingDebtPayment(false);
    }
  };

  const openReportDamaged = (item: any) => {
    setSelectedVariantForDamaged(item);
    setDamagedQty("");
    setDamagedReason("Expired");
    setShowDamagedModal(true);
  };

  const handleSaveDamaged = async () => {
    if (!selectedVariantForDamaged || !damagedQty || damagedQty <= 0) return;
    if (Number(damagedQty) > (selectedVariantForDamaged.stock || 0)) {
      alert("Jumlah barang rusak melebihi stok yang tersedia!");
      return;
    }

    setIsSavingDamaged(true);
    try {
      const qty = Number(damagedQty);
      const hpp = selectedVariantForDamaged.hpp || 0;
      const totalLoss = qty * hpp;

      // 1. Update product stock in product_variants
      const { error: stockErr } = await supabase
        .from("product_variants")
        .update({ stock: (selectedVariantForDamaged.stock || 0) - qty })
        .eq("id", selectedVariantForDamaged.id);
      if (stockErr) throw stockErr;

      // 2. Insert record in expenses
      const { error: expErr } = await supabase
        .from("expenses")
        .insert([{
          category: "Lainnya",
          description: `Penyusutan: ${selectedVariantForDamaged.variant_name || selectedVariantForDamaged.products?.name} x${qty} (${damagedReason})`,
          amount: totalLoss
        }]);
      if (expErr) throw expErr;

      alert(`✅ Berhasil mencatat penyusutan barang rusak. Stok berkurang ${qty} dan tercatat beban kerugian sebesar Rp ${totalLoss.toLocaleString('id-ID')}`);
      
      setShowDamagedModal(false);
      setSelectedVariantForDamaged(null);
      setDamagedQty("");
      setDamagedReason("Expired");
      
      fetchInventory();
      fetchExpenses();
    } catch (err: any) {
      alert("Gagal memproses pencatatan penyusutan: " + err.message);
    } finally {
      setIsSavingDamaged(false);
    }
  };

  const handleSaveWholesalePrice = async () => {
    if (!wsVariantId || !wsMinQty || !wsPrice) return;
    await supabase.from("wholesale_prices").insert([{
      variant_id: wsVariantId,
      min_quantity: wsMinQty,
      price: wsPrice
    }]);
    setWsVariantId(""); setWsMinQty(""); setWsPrice("");
    fetchWholesalePrices();
  };

  const handleDeleteWholesalePrice = async (id: string) => {
    if (confirm("Hapus harga grosir ini?")) {
      await supabase.from("wholesale_prices").delete().eq("id", id);
      fetchWholesalePrices();
    }
  };

  const getPoPaymentMeta = (notes: string | null) => {
    let payment_terms: "cash" | "tempo" = "cash";
    let payment_status: "paid" | "unpaid" = "paid";
    let due_date: string | null = null;
    let customNotes = notes || "";

    if (notes && notes.startsWith("{")) {
      try {
        const parsed = JSON.parse(notes);
        payment_terms = parsed.payment_terms || "cash";
        payment_status = parsed.payment_status || "paid";
        due_date = parsed.due_date || null;
        customNotes = parsed.notes || "";
      } catch (e) {}
    }
    return { payment_terms, payment_status, due_date, notes: customNotes };
  };

  const receivePO = async (po: any) => {
    if (!po) return;
    if (confirm(`Tandai PO dari ${po.suppliers?.name} sebagai diterima? Stok akan bertambah secara otomatis.`)) {
      try {
        // 1. Update status PO
        const { error: poErr } = await supabase.from("purchase_orders").update({ status: "received", received_at: new Date().toISOString() }).eq("id", po.id);
        if (poErr) throw poErr;

        // 2. Update Stok Variants & Create FIFO Layers
        for (const item of po.purchase_order_items || []) {
          const { data: vData } = await supabase.from("product_variants").select("stock").eq("id", item.variant_id).single();
          if (vData) {
            const newStock = (vData.stock || 0) + item.quantity;
            await supabase.from("product_variants").update({ stock: newStock }).eq("id", item.variant_id);
            
            // FIFO: Create new stock layer
            await supabase.from("stock_layers").insert([{
              variant_id: item.variant_id,
              quantity_remaining: item.quantity,
              cost_per_unit: item.cost_price || item.product_variants?.hpp || 0,
              purchase_order_id: po.id
            }]);
          }
        }

        // 3. Record Expense if Cash / Paid immediately
        const meta = getPoPaymentMeta(po.notes);
        if (meta.payment_terms === "cash" || meta.payment_status === "paid") {
          await supabase.from("expenses").insert([{
            category: "Kulakan",
            description: `Kulakan: PO #${po.id.substring(0, 8).toUpperCase()} dari ${po.suppliers?.name || 'Supplier'}`,
            amount: po.total_amount || 0,
            created_at: new Date().toISOString()
          }]);
          fetchExpenses();
        }

        alert("✅ PO diterima & Stok berhasil diperbarui!");
        fetchPurchaseOrders();
        fetchInventory();
      } catch (err: any) { alert("Gagal: " + err.message); }
    }
  };

  const handlePayPoTempo = async (po: any) => {
    if (!po) return;
    if (confirm(`Catat pelunasan hutang kulakan PO #${po.id.substring(0, 8).toUpperCase()} sebesar Rp ${(po.total_amount || 0).toLocaleString('id-ID')} kepada ${po.suppliers?.name}?`)) {
      setIsProcessingPoPayment(prev => ({ ...prev, [po.id]: true }));
      try {
        const meta = getPoPaymentMeta(po.notes);
        const newNotes = JSON.stringify({
          payment_terms: meta.payment_terms,
          payment_status: "paid",
          due_date: meta.due_date,
          notes: meta.notes,
          paid_at: new Date().toISOString()
        });

        // 1. Update PO notes
        const { error: poErr } = await supabase.from("purchase_orders").update({ notes: newNotes }).eq("id", po.id);
        if (poErr) throw poErr;

        // 2. Record Expense
        const { error: expErr } = await supabase.from("expenses").insert([{
          category: "Kulakan",
          description: `Bayar Hutang: PO #${po.id.substring(0, 8).toUpperCase()} kepada ${po.suppliers?.name || 'Supplier'}`,
          amount: po.total_amount || 0,
          created_at: new Date().toISOString()
        }]);
        if (expErr) throw expErr;

        alert("✅ Pembayaran hutang kulakan berhasil dicatat sebagai pengeluaran!");
        fetchPurchaseOrders();
        fetchExpenses();
      } catch (err: any) {
        alert("Gagal mencatat pembayaran: " + err.message);
      } finally {
        setIsProcessingPoPayment(prev => ({ ...prev, [po.id]: false }));
      }
    }
  };

  const handleFillPoRecommendations = () => {
    if (!selectedPoSupplier) {
      alert("⚠️ Silakan pilih Supplier terlebih dahulu!");
      return;
    }
    
    // Find variants historically purchased from this supplier
    const supplierVariantIds = new Set<string>();
    purchaseOrders
      .filter(po => po.supplier_id === selectedPoSupplier)
      .forEach(po => {
        po.purchase_order_items?.forEach((it: any) => {
          if (it.variant_id) supplierVariantIds.add(it.variant_id);
        });
      });

    // Filter inventory variants that are low stock
    const lowStockItems = inventory.filter(v => {
      const isLow = v.stock <= (v.min_stock || lowStockThreshold);
      const matchesSupplier = supplierVariantIds.size > 0 ? supplierVariantIds.has(v.id) : true;
      return isLow && matchesSupplier;
    });

    if (lowStockItems.length === 0) {
      alert("ℹ️ Tidak ada barang dengan stok menipis yang perlu dikulak dari supplier ini.");
      return;
    }

    // Add to poItems
    const newItems = lowStockItems.map(v => {
      const recommendedQty = Math.max(1, (v.min_stock || lowStockThreshold) * 2 - v.stock);
      return {
        variant_id: v.id,
        variant_name: v.variant_name || v.products?.name || "Barang",
        quantity: recommendedQty,
        cost_price: v.hpp || 0
      };
    });

    // Filter out items already in poItems
    const filteredNewItems = newItems.filter(item => !poItems.some(it => it.variant_id === item.variant_id));

    if (filteredNewItems.length === 0) {
      alert("ℹ️ Semua barang rekomendasi sudah ada di daftar belanja.");
      return;
    }

    setPoItems(prev => [...prev, ...filteredNewItems]);
    alert(`✨ Berhasil menambahkan ${filteredNewItems.length} barang rekomendasi ke daftar belanja.`);
  };

  const handleSavePO = async () => {
    if (!selectedPoSupplier) {
      alert("⚠️ Silakan pilih supplier!");
      return;
    }
    if (poItems.length === 0) {
      alert("⚠️ Harap tambahkan minimal 1 barang ke daftar kulakan!");
      return;
    }
    
    // validate items
    for (const it of poItems) {
      if (!it.variant_id || !it.quantity || it.quantity <= 0 || !it.cost_price || it.cost_price <= 0) {
        alert("⚠️ Harap isi Jumlah dan Harga Beli (HPP) dengan benar untuk semua item!");
        return;
      }
    }

    if (poPaymentTerms === "tempo" && !poDueDate) {
      alert("⚠️ Harap tentukan tanggal jatuh tempo untuk pembayaran tempo!");
      return;
    }

    setIsSavingPo(true);
    try {
      const totalAmount = poItems.reduce((sum, it) => sum + (it.quantity * it.cost_price), 0);
      
      const notesJson = JSON.stringify({
        payment_terms: poPaymentTerms,
        payment_status: poPaymentTerms === "cash" ? "paid" : "unpaid",
        due_date: poPaymentTerms === "tempo" ? poDueDate : null,
        notes: poNotes
      });

      // 1. Create Purchase Order
      const { data: poData, error: poErr } = await supabase.from("purchase_orders").insert([{
        supplier_id: selectedPoSupplier,
        order_date: new Date().toISOString().split("T")[0],
        status: "pending",
        total_amount: totalAmount,
        notes: notesJson
      }]).select().single();

      if (poErr) throw poErr;
      if (!poData) throw new Error("Gagal membuat PO");

      // 2. Create Purchase Order Items
      const itemsPayload = poItems.map(it => ({
        purchase_order_id: poData.id,
        variant_id: it.variant_id,
        quantity: Number(it.quantity),
        cost_price: Number(it.cost_price),
        subtotal: Number(it.quantity) * Number(it.cost_price)
      }));

      const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      alert("✅ Purchase Order kulakan berhasil dibuat dengan status PENDING!");
      setShowPoForm(false);
      setSelectedPoSupplier("");
      setPoItems([]);
      setPoPaymentTerms("cash");
      setPoDueDate("");
      setPoNotes("");
      fetchPurchaseOrders();
    } catch (err: any) {
      alert("Gagal menyimpan PO: " + err.message);
    } finally {
      setIsSavingPo(false);
    }
  };

  const handleSaveUnit = async () => {
    if (!editingProduct || !newUnitName || !newUnitMultiplier) return;
    try {
      const { error } = await supabase.from("product_units").insert([{
        variant_id: editingProduct.id,
        unit_name: newUnitName,
        multiplier: Number(newUnitMultiplier),
        barcode: newUnitBarcode || null,
        price: newUnitPrice ? Number(newUnitPrice) : null
      }]);
      if (error) throw error;
      setNewUnitName(""); setNewUnitMultiplier(""); setNewUnitBarcode(""); setNewUnitPrice("");
      fetchProductUnits();
    } catch (err: any) { alert("Gagal simpan satuan: " + err.message); }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Hapus satuan ini?")) return;
    try {
      const { error } = await supabase.from("product_units").delete().eq("id", id);
      if (error) throw error;
      fetchProductUnits();
    } catch (err: any) { alert("Gagal hapus satuan: " + err.message); }
  };

  // ================= POS DIRECT FUNCTIONS =================
  const addItemToPosCart = (variant: any, unit?: any) => {
    if (!variant) return;
    setPosCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id && item.unit?.id === unit?.id);
      const currentQty = existing ? existing.quantity : 0;
      
      // Calculate multiplier
      const multiplier = unit ? unit.multiplier : 1;
      const totalBaseQtyNeeded = (currentQty + 1) * multiplier;

      if (variant.stock !== null && variant.stock !== undefined && totalBaseQtyNeeded > variant.stock) {
        alert(`⚠️ Stok "${variant.variant_name || variant.products?.name}" tidak mencukupi!`);
        return prev;
      }
      
      let nextCart;
      if (existing) {
        nextCart = prev.map((item) => (item.variant.id === variant.id && item.unit?.id === unit?.id) ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        nextCart = [...prev, { variant, quantity: 1, unit }];
      }

      // Apply Wholesale Pricing logic (Only for base units for now, or total quantity based)
      return nextCart.map(item => {
        if (item.unit) {
          // If it's a specific UOM, use its price if set, otherwise variant price * multiplier
          const basePrice = item.unit.price || (item.variant.price * item.unit.multiplier);
          return { ...item, unit_price: basePrice };
        }
        const rules = wholesalePrices.filter(wp => wp.variant_id === item.variant.id).sort((a, b) => b.min_quantity - a.min_quantity);
        const bestRule = rules.find(r => item.quantity >= r.min_quantity);
        return { ...item, unit_price: bestRule ? bestRule.price : item.variant.price };
      });
    });
    playBeepSound();
  };

  const calculateFifoHpp = async (variantId: string, totalBaseQty: number) => {
    try {
      // 1. Fetch available layers for this variant, ordered by creation (oldest first)
      const { data: layers, error } = await supabase
        .from("stock_layers")
        .select("*")
        .eq("variant_id", variantId)
        .gt("quantity_remaining", 0)
        .order("created_at", { ascending: true });

      if (error || !layers || layers.length === 0) {
        // Fallback to variant's HPP if no layers found
        const { data: vData } = await supabase.from("product_variants").select("hpp").eq("id", variantId).single();
        return (vData?.hpp || 0) * totalBaseQty;
      }

      let remainingToConsume = totalBaseQty;
      let totalHpp = 0;

      for (const layer of layers) {
        if (remainingToConsume <= 0) break;

        const consumeFromThisLayer = Math.min(layer.quantity_remaining, remainingToConsume);
        totalHpp += consumeFromThisLayer * layer.cost_per_unit;
        remainingToConsume -= consumeFromThisLayer;

        // Update layer in DB
        await supabase
          .from("stock_layers")
          .update({ quantity_remaining: layer.quantity_remaining - consumeFromThisLayer })
          .eq("id", layer.id);
      }

      // If still remaining (oversold?), use the last layer's cost or variant HPP
      if (remainingToConsume > 0) {
        const lastCost = layers[layers.length - 1].cost_per_unit;
        totalHpp += remainingToConsume * lastCost;
      }

      return totalHpp;
    } catch (err) {
      console.error("FIFO Error:", err);
      return 0;
    }
  };

  const handlePosScan = async (barcode: string) => {
    try {
      // 1. Check product_variants first (Base Unit)
      const { data: vData, error: vErr } = await supabase.from("product_variants").select("*, products(name)").eq("barcode", barcode).single();
      
      if (vData) {
        addItemToPosCart(vData);
        return;
      }

      // 2. Check product_units (Multi-UOM)
      const { data: uData, error: uErr } = await supabase.from("product_units").select("*, product_variants(*, products(name))").eq("barcode", barcode).single();
      
      if (uData && uData.product_variants) {
        addItemToPosCart(uData.product_variants, uData);
        return;
      }

      alert("❌ Barcode tidak ditemukan!");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const updatePosQuantity = (variantId: string, delta: number, unitId?: string) => {
    setPosCart((prev) => {
      const nextCart = prev.map(item => {
        if (item.variant.id === variantId && item.unit?.id === unitId) {
          const newQ = item.quantity + delta;
          const multiplier = item.unit ? item.unit.multiplier : 1;
          const totalBaseQtyNeeded = newQ * multiplier;

          if (delta > 0 && item.variant.stock !== null && item.variant.stock !== undefined && totalBaseQtyNeeded > item.variant.stock) {
            alert(`⚠️ Stok tidak mencukupi!`);
            return item;
          }
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      });

      // Apply Wholesale Pricing logic
      return nextCart.map(item => {
        if (item.unit) {
          const basePrice = item.unit.price || (item.variant.price * item.unit.multiplier);
          return { ...item, unit_price: basePrice };
        }
        const rules = wholesalePrices.filter(wp => wp.variant_id === item.variant.id).sort((a, b) => b.min_quantity - a.min_quantity);
        const bestRule = rules.find(r => item.quantity >= r.min_quantity);
        return { ...item, unit_price: bestRule ? bestRule.price : item.variant.price };
      });
    });
  };

  const handleDirectPayment = async (method: string, afterAction?: 'print' | 'download') => {
    if (posCart.length === 0) return;
    if (method === 'Kasbon' && !selectedCustomer) {
      alert("⚠️ Pembayaran 'Kasbon' memerlukan pemilihan Pelanggan!");
      return;
    }

    setIsProcessingPos(true);
    setPosPaymentMethod(method);
    try {
      const totalAmount = posCart.reduce((sum, item) => sum + (item.unit_price || item.variant.price || 0) * item.quantity, 0);
      const { data: trxData, error: trxError } = await supabase.from("transactions").insert([{
        status: "paid",
        total_amount: totalAmount,
        customer_name: selectedCustomer?.name || "Customer Langsung",
        payment_method: method
      }]).select().single();
      if (trxError) throw trxError;

      const itemsToInsert = [];
      for (const item of posCart) {
        const multiplier = item.unit ? item.unit.multiplier : 1;
        const totalBaseQty = item.quantity * multiplier;
        
        // FIFO: Calculate real HPP
        const realHpp = await calculateFifoHpp(item.variant.id, totalBaseQty);
        const avgHppPerBase = totalBaseQty > 0 ? realHpp / totalBaseQty : 0;

        itemsToInsert.push({
          transaction_id: trxData.id,
          variant_id: item.variant.id,
          quantity: item.quantity,
          unit_price: item.unit_price || item.variant.price,
          subtotal: (item.unit_price || item.variant.price || 0) * item.quantity,
          hpp: avgHppPerBase
        });

        // Stock reduction
        const newStock = Math.max(0, (item.variant.stock || 0) - totalBaseQty);
        const newSold = (item.variant.sold_count || 0) + totalBaseQty;
        await supabase.from("product_variants").update({ stock: newStock, sold_count: newSold }).eq("id", item.variant.id);
      }
      
      await supabase.from("transaction_items").insert(itemsToInsert);

      if (method === 'Kasbon' && selectedCustomer) {
        await supabase.rpc('update_customer_debt', { p_customer_id: selectedCustomer.id, p_amount: totalAmount });
      }

      const receiptInfo = { 
        ...trxData, 
        transaction_items: posCart.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price || item.variant.price,
          product_variants: item.variant
        }))
      };

      setPosReceiptData(receiptInfo);
      setViewingTrx(receiptInfo);
      
      setPosCart([]);
      setSelectedCustomer(null);
      setIsConfirmingPos(false);
      logActivity(`POS: Rp ${totalAmount} via ${method}`);
      fetchInventory();
      fetchCustomers();

      if (afterAction === 'print') {
        setTimeout(() => window.print(), 500);
      } else if (afterAction === 'download') {
        alert("✅ Transaksi Disimpan! Silakan unduh PDF dari riwayat jika diperlukan.");
      } else {
        alert("✅ Transaksi Berhasil Disimpan!");
      }
    } catch (err: any) { alert("Gagal: " + err.message); }
    finally { setIsProcessingPos(false); }
  };

  const handleDeleteTransactions = async () => {
    if (selectedTrxIds.length === 0 || !confirm(`Hapus ${selectedTrxIds.length} transaksi terpilih?`)) return;
    try {
      const { error } = await supabase.from("transactions").delete().in("id", selectedTrxIds);
      if (error) throw error;
      alert("✅ Transaksi berhasil dihapus!");
      setSelectedTrxIds([]);
      loadData();
    } catch (err: any) { alert("Gagal hapus: " + err.message); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ambil PIN dari database untuk keamanan (tidak di-hardcode)
      const { data, error } = await supabase
        .from('pos_settings')
        .select('value')
        .eq('key', 'admin_pin')
        .single();

      if (error) throw new Error("Gagal mengambil konfigurasi keamanan.");

      if (pinInput === data.value) {
        setAuthRole("admin");
        localStorage.setItem("pos_admin_role", "admin");
        setShowLoginModal(false);
        setActiveTab("history");
      } else {
        alert("❌ Password Salah!");
      }
    } catch (err: any) {
      alert("⚠️ Terjadi kesalahan: " + err.message);
    } finally {
      setPinInput("");
    }
  };


  const fetchClosingHistory = async () => {
    setLoadingClosing(true);
    const { data } = await supabase.from("closing_reports").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setClosingHistory(data);
    setLoadingClosing(false);
  };

  const handleSaveClosing = async (expected: any) => {
    if (closingCashActual === "" || Number(closingCashActual) < 0) {
      alert("Masukkan jumlah uang fisik yang ada di laci!");
      return;
    }

    setIsSavingClosing(true);
    try {
      const actual = Number(closingCashActual);
      const diff = actual - expected.cash;

      const { error } = await supabase.from("closing_reports").insert([{
        total_revenue: expected.total,
        total_transactions: expected.count,
        cash_expected: expected.cash,
        cash_actual: actual,
        qris_total: expected.qris,
        transfer_total: expected.transfer,
        difference: diff,
        notes: closingNotes,
        closed_by: authRole
      }]);

      if (error) throw error;

      alert("✅ Laporan Tutup Toko berhasil disimpan!");
      setClosingCashActual("");
      setClosingNotes("");
      setShowClosingForm(false);
      fetchClosingHistory();
      logActivity(`Laporan Tutup Toko: Selisih Rp ${diff.toLocaleString('id-ID')}`);
    } catch (err: any) {
      alert("Gagal simpan laporan. Pastikan tabel 'closing_reports' tersedia di Supabase! Error: " + err.message);
    } finally {
      setIsSavingClosing(false);
    }
  };

  const fetchBusinessNotes = async () => {
    const { data } = await supabase.from("business_notes").select("*").order("date", { ascending: false });
    if (data) setBusinessNotes(data);
  };

  const handleSaveNote = async () => {
    if (!selectedNoteDate) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from("business_notes").upsert({
        date: selectedNoteDate,
        note: noteInput
      }, { onConflict: 'date' });
      
      if (error) throw error;
      setNoteInput("");
      fetchBusinessNotes();
    } catch (err: any) { alert("Gagal simpan catatan: " + err.message); }
    finally { setIsSavingNote(false); }
  };

  const logActivity = async (actionDesc: string) => {
    try {
      if (!authRole) return;
      await supabase.from("activity_logs").insert([{ role: authRole.toUpperCase(), action: actionDesc }]);
    } catch (err) { console.error("Logger err", err); }
  };

  const fetchTransactions = async () => {
    setLoadingTrx(true);
    const { data } = await supabase.from("transactions").select("*, transaction_items(*, product_variants(*, products(name)))").eq("status", "pending").order("created_at", { ascending: true });
    if (data) setTransactions(data);
    setLoadingTrx(false);
  };

  const fetchHistory = async () => {
    setLoadingHist(true);
    const { data } = await supabase.from("transactions").select("*, transaction_items(*, product_variants(*, products(name)))").in("status", ["paid", "cancelled"]).order("created_at", { ascending: false }).limit(500);
    if (data) setHistory(data);
    setLoadingHist(false);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setExpenses(data);
  };

  const handleAddExpense = async () => {
    if (!expenseDesc || !expenseAmount || expenseAmount <= 0) { alert("Isi deskripsi dan jumlah!"); return; }
    
    if (editingExpense) {
      // UPDATE existing
      const { error } = await supabase.from("expenses").update({ 
        description: expenseDesc, 
        amount: Number(expenseAmount), 
        category: expenseCategory 
      }).eq("id", editingExpense.id);
      
      if (error) { alert("Gagal mengubah data! Error: " + error.message); return; }
      logActivity(`Ubah Pengeluaran: ${expenseCategory} - ${expenseDesc} Rp ${expenseAmount}`);
    } else {
      // INSERT new
      const { error } = await supabase.from("expenses").insert([{ 
        description: expenseDesc, 
        amount: Number(expenseAmount), 
        category: expenseCategory 
      }]);
      
      if (error) { alert("Gagal menyimpan. Pastikan tabel 'expenses' sudah dibuat! Error: " + error.message); return; }
      logActivity(`Catat Pengeluaran: ${expenseCategory} - ${expenseDesc} Rp ${expenseAmount}`);
    }

    setExpenseDesc(""); setExpenseAmount(0); setShowExpenseForm(false); setEditingExpense(null);
    fetchExpenses();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { alert("Gagal menghapus! " + error.message); return; }
    logActivity(`Hapus Pengeluaran ID ${id.substring(0, 8)}`);
    fetchExpenses();
  };

  const handleOpenEditExpense = (exp: any) => {
    setEditingExpense(exp);
    setExpenseDesc(exp.description);
    setExpenseAmount(exp.amount);
    setExpenseCategory(exp.category);
    setShowExpenseForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };



  const handleProcessPayment = async () => {
    if (!viewingTrx || viewingTrx.status !== 'pending') return;
    const { error } = await supabase.from("transactions").update({ status: "paid", payment_method: paymentMethod }).eq("id", viewingTrx.id);
    if (!error) {
      logActivity(`Transaksi ${viewingTrx.id.substring(0, 8)} diproses via ${paymentMethod} (Rp ${viewingTrx.total_amount})`);

      // Update Sold Count + Reduce Stock
      for (const item of viewingTrx.transaction_items) {
        if (item.variant_id) {
          const variant = inventory.find(i => i.id === item.variant_id);
          if (variant) {
            // Note: For pending transactions, we might not have unit info stored yet in transaction_items.
            // Ideally transaction_items should have unit_id or multiplier column.
            // For now we assume base unit if not specified.
            const multiplier = item.multiplier || 1; 
            const totalBaseQty = item.quantity * multiplier;
            const newSoldCount = (variant.sold_count || 0) + totalBaseQty;
            const newStock = Math.max(0, (variant.stock || 0) - totalBaseQty);
            await supabase.from("product_variants").update({ sold_count: newSoldCount, stock: newStock }).eq("id", variant.id);
          }
        }
      }

      if (false && viewingTrx.table_number) {
        // setTableOccupancy(p => {
        //   const n = { ...p, [viewingTrx.table_number]: 'confirmed' };
        //   localStorage.setItem('pos_table_occ', JSON.stringify(n));
        //   return n;
        // });
      }

      setViewingTrx({ ...viewingTrx, status: "paid" });
      alert("✅ Pembayaran sukses!");
      loadData();
    } else alert("❌ Error: " + error.message);
  };

  const handleCancelOrder = async () => {
    setShowCancelConfirm(false);
    if (!viewingTrx || viewingTrx.status !== 'pending') return;

    const { error } = await supabase.from("transactions").update({ status: "cancelled" }).eq("id", viewingTrx.id);
    if (!error) {
      logActivity(`Transaksi ${viewingTrx.id.substring(0, 8)} DIBATALKAN (Void)`);
      alert("Pesanan dibatalkan (VOID).");
      setViewingTrx(null); loadData();
    } else alert("Error: " + error.message);
  };

  const handleDeleteTrx = async () => {
    setShowDeleteConfirm(false);
    if (!viewingTrx) return;

    // If this was a paid transaction, restore stock & sold_count
    if (viewingTrx.status === 'paid') {
      for (const item of (viewingTrx.transaction_items || [])) {
        if (item.variant_id) {
          const variant = inventory.find(i => i.id === item.variant_id);
          if (variant) {
            const restoredStock = (variant.stock || 0) + item.quantity;
            const restoredSold = Math.max(0, (variant.sold_count || 0) - item.quantity);
            await supabase.from("product_variants").update({ stock: restoredStock, sold_count: restoredSold }).eq("id", variant.id);
          }
        }
      }
    }

    const { error } = await supabase.from("transactions").delete().eq("id", viewingTrx.id);
    if (!error) {
      logActivity(`Transaksi ${viewingTrx.id.substring(0, 8)} DIHAPUS PERMANEN (stok dikembalikan)`);
      setViewingTrx(null); loadData();
    } else alert("Error: " + error.message);
  };



  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

  const formatGrowthLine = (pct: number | null) => {
    if (pct === null) {
      return (
        <p className="text-[9px] text-slate-400 font-bold text-right leading-normal flex-1 ml-2">
          Tanpa pembanding <br />
          <span className="text-[8px] font-black text-slate-300 tracking-wider uppercase">(Lalu Rp 0)</span>
        </p>
      );
    }
    const up = pct >= 0;
    return (
      <p className={`text-[10px] font-black flex items-center justify-end gap-0.5 text-right flex-1 ml-2 leading-tight ${up ? "text-emerald-600" : "text-rose-600"}`}>
        {up ? <ArrowUpRight size={11} className="shrink-0" /> : <ArrowDownRight size={11} className="shrink-0" />}
        <span>{up ? "+" : ""}{pct.toFixed(1)}% vs sebelumnya</span>
      </p>
    );
  };

  // Compute sold per variant from history, filtered by period
  const inventorySoldMap = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const getStartOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay() + 1); x.setHours(0, 0, 0, 0); return x; };
    const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const getStartOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

    const map: Record<string, number> = {};
    history.forEach(trx => {
      if (trx.status !== 'paid') return;
      const tDate = new Date(trx.created_at);

      let inRange = false;
      if (invPeriod === 'today') inRange = tDate.toDateString() === todayStr;
      else if (invPeriod === 'week') inRange = tDate >= getStartOfWeek(now);
      else if (invPeriod === 'month') inRange = tDate >= getStartOfMonth(now);
      else if (invPeriod === 'year') inRange = tDate >= getStartOfYear(now);
      else if (invPeriod === 'custom') {
        const from = invCustomFrom ? new Date(invCustomFrom) : new Date(0);
        const to = invCustomTo ? new Date(invCustomTo + 'T23:59:59') : new Date();
        inRange = tDate >= from && tDate <= to;
      }
      if (!inRange) return;

      trx.transaction_items?.forEach((item: any) => {
        if (item.variant_id) {
          map[item.variant_id] = (map[item.variant_id] || 0) + item.quantity;
        }
      });
    });
    return map;
  }, [history, invPeriod, invCustomFrom, invCustomTo]);

  // Filtered history by period
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const getStartOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay() + 1); x.setHours(0, 0, 0, 0); return x; };
    const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const getStartOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

    return history.filter(trx => {
      const tDate = new Date(trx.created_at);
      if (histPeriod === 'today') return tDate.toDateString() === todayStr;
      if (histPeriod === 'week') return tDate >= getStartOfWeek(now);
      if (histPeriod === 'month') return tDate >= getStartOfMonth(now);
      if (histPeriod === 'year') return tDate >= getStartOfYear(now);
      if (histPeriod === 'custom') {
        const from = histCustomFrom ? new Date(histCustomFrom) : new Date(0);
        const to = histCustomTo ? new Date(histCustomTo + 'T23:59:59') : new Date();
        return tDate >= from && tDate <= to;
      }
      return true;
    });
  }, [history, histPeriod, histCustomFrom, histCustomTo]);

  // Filtered inventory based on search term
  const filteredInventory = useMemo(() => {
    const term = manualBarcode?.toLowerCase().trim() || "";
    if (!term) return inventory;
    return inventory.filter(item => {
      const barcode = item.barcode?.toString().toLowerCase() || "";
      const name = (item.variant_name || item.products?.name || "").toLowerCase();
      return barcode.includes(term) || name.includes(term);
    });
  }, [inventory, manualBarcode]);

  const supplierDebts = useMemo(() => {
    const debts: Record<string, number> = {};
    purchaseOrders.forEach(po => {
      const meta = getPoPaymentMeta(po.notes);
      if (meta.payment_terms === "tempo" && meta.payment_status === "unpaid") {
        debts[po.supplier_id] = (debts[po.supplier_id] || 0) + (po.total_amount || 0);
      }
    });
    return debts;
  }, [purchaseOrders]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const { start, end, label: rangeLabel } = getAnalyticsRange(analyticsPeriod, analyticsCustomFrom, analyticsCustomTo, now);
    const prevRange = previousEqualPeriod(start, end);
    const curr = aggregatePeriodMetrics(history, expenses, start, end);
    const prev = aggregatePeriodMetrics(history, expenses, prevRange.start, prevRange.end);

    const msPerDay = 86400000;
    const nDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
    const trendGranularity = nDays <= 2 ? "hour" : nDays <= 45 ? "day" : "week";

    let chartElements: any[] = [];
    if (trendGranularity === "hour") {
      for (let h = 0; h < 24; h++) {
        const point = { name: `${h}:00`, total: 0 };
        history.forEach((trx) => {
          if (trx.status !== "paid") return;
          const tDate = new Date(trx.created_at);
          if (tDate >= start && tDate <= end && tDate.getHours() === h) point.total += trx.total_amount || 0;
        });
        chartElements.push(point);
      }
    } else {
      chartElements = buildTrendChartData(history, start, end);
    }

    const payMethodChart = Object.entries(curr.payMethodMap).map(([name, value]) => ({ name, value }));
    const rushHourChart = Object.entries(curr.hourMap).map(([h, count]) => ({ hour: `${h}:00`, count }));
    const dayOfWeekNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const dayOfWeekChart = Object.entries(curr.dayMap).map(([d, data]) => ({ name: dayOfWeekNames[Number(d)], revenue: data.revenue }));
    const bestSellerChart = Object.entries(curr.sellerMap).sort((a, b) => b[1] - a[1]).slice(0, analysisLimit).map(([name, value]) => ({ name, value }));
    const worstSellerChart = Object.entries(curr.sellerMap).sort((a, b) => a[1] - b[1]).slice(0, analysisLimit).map(([name, value]) => ({ name, value }));
    const categoryChart = Object.entries(curr.categoryRevenue).map(([name, value]) => ({ name, value }));
    const categoryProfitChart = Object.entries(curr.categoryProfit).map(([name, value]) => ({ name, value }));

    const variantSold: Record<string, number> = {};
    history.forEach((trx) => {
      if (trx.status !== "paid") return;
      const tDate = new Date(trx.created_at);
      if (tDate < start || tDate > end) return;
      trx.transaction_items?.forEach((item: any) => {
        if (item.variant_id) variantSold[item.variant_id] = (variantSold[item.variant_id] || 0) + item.quantity;
      });
    });

    const deadStock = inventory.filter((inv: any) => !variantSold[inv.id]).slice(0, 10);
    const mostPopular = [...inventory].sort((a: any, b: any) => (b.sold_count ?? 0) - (a.sold_count ?? 0)).slice(0, 10);
    const leastPopular = [...inventory].sort((a: any, b: any) => (a.sold_count ?? 0) - (a.stock ?? 0)).slice(0, 10);
    const highStock = [...inventory].sort((a: any, b: any) => (b.stock ?? 0) - (a.stock ?? 0)).slice(0, 10);
    const criticalStock = [...inventory].filter((i: any) => (i.stock ?? 0) <= lowStockThreshold).sort((a: any, b: any) => (a.stock ?? 0) - (b.stock ?? 0));

    const profitMap: Record<string, { name: string; profit: number; revenue: number }> = {};
    history.forEach((trx) => {
      if (trx.status !== "paid") return;
      const tDate = new Date(trx.created_at);
      if (tDate < start || tDate > end) return;
      trx.transaction_items?.forEach((item: any) => {
        if (item.variant_id) {
          const name = item.product_variants?.variant_name || item.product_variants?.products?.name || "Produk";
          const revenue = (item.unit_price || item.price || 0) * item.quantity;
          const currentHpp = item.hpp || item.product_variants?.hpp || 0;
          const modal = currentHpp * item.quantity;
          const profit = revenue - modal;
          if (!profitMap[item.variant_id]) profitMap[item.variant_id] = { name, profit: 0, revenue: 0 };
          profitMap[item.variant_id].profit += profit;
          profitMap[item.variant_id].revenue += revenue;
        }
      });
    });

    const topProfitProducts = Object.values(profitMap).sort((a, b) => b.profit - a.profit).slice(0, analysisLimit);

    const velocityRecommendation = [...inventory].map((inv: any) => {
      const soldInPeriod = variantSold[inv.id] || 0;
      const velocityPerDay = soldInPeriod / nDays;
      const recommendedStock = Math.ceil(velocityPerDay * 14);
      const needed = Math.max(0, recommendedStock - (inv.stock || 0));
      return { id: inv.id, name: inv.variant_name || inv.products?.name || "Produk", velocity: velocityPerDay, recommended: recommendedStock, needed: needed, stock: inv.stock || 0 };
    }).filter(item => item.needed > 0 || item.velocity > 0).sort((a, b) => b.needed - a.needed).slice(0, analysisLimit);

    const expenseRatioData = [{ name: "Omzet", value: curr.omzet, fill: "#3b82f6" }, { name: "Biaya Operasional", value: curr.expense, fill: "#ef4444" }];

    return {
      rangeLabel, trendGranularity, omzet: curr.omzet, hpp: curr.hpp, expense: curr.expense, netProfit: curr.netProfit, trxCount: curr.trxCount, aov: curr.aov,
      prevOmzet: prev.omzet, prevHpp: prev.hpp, prevExpense: prev.expense, prevNet: prev.netProfit, prevAov: prev.aov,
      growthOmzet: growthPct(curr.omzet, prev.omzet), growthHpp: growthPct(curr.hpp, prev.hpp), growthExpense: growthPct(curr.expense, prev.expense),
      growthNet: growthPct(curr.netProfit, prev.netProfit), growthAov: growthPct(curr.aov, prev.aov), chartElements, payMethodChart, rushHourChart,
      dayOfWeekChart, bestSellerChart, worstSellerChart, categoryChart, categoryProfitChart, deadStock, mostPopular, leastPopular, highStock,
      criticalStock, topProfitProducts, velocityRecommendation, expenseRatioData, variantSold
    };
  }, [history, expenses, inventory, analyticsPeriod, analyticsCustomFrom, analyticsCustomTo, lowStockThreshold, analysisLimit]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, number> = {
      "Kulakan": 0,
      "Listrik": 0,
      "Gaji": 0,
      "Lainnya": 0
    };
    const now = new Date();
    const { start, end } = getAnalyticsRange(analyticsPeriod, analyticsCustomFrom, analyticsCustomTo, now);
    expenses.forEach(exp => {
      const eDate = new Date(exp.created_at);
      if (eDate >= start && eDate <= end) {
        const cat = exp.category || "Lainnya";
        groups[cat] = (groups[cat] || 0) + (exp.amount || 0);
      }
    });
    return groups;
  }, [expenses, analyticsPeriod, analyticsCustomFrom, analyticsCustomTo]);

  if (!mounted) return null;


  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductHpp || !newProductStock) {
      alert("⚠️ Harap isi semua field utama!");
      return;
    }
    setIsRegistering(true);
    try {
      // 1. Create Product
      const { data: pData, error: pErr } = await supabase.from("products").insert([{ name: newProductName }]).select().single();
      if (pErr) throw pErr;

      // 2. Create Variant with Enhanced Fields
      const { error: vErr } = await supabase.from("product_variants").insert([{
        product_id: pData.id,
        variant_name: newProductName,
        price: Number(newProductPrice),
        hpp: Number(newProductHpp),
        stock: Number(newProductStock),
        barcode: newProductBarcode || null,
        image_url: newProductImage || null,
        category: newProductCategory,
        unit: newProductUnit,
        min_stock: Number(newProductMinStock),
        keywords: newProductKeywords
      }]);
      if (vErr) throw vErr;

      alert("✅ Produk Berhasil Didaftarkan!");
      setIsNewProduct(false);
      resetNewProductForm();
      fetchInventory();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsRegistering(false); }
  };

  const resetNewProductForm = () => {
    setNewProductName(""); setNewProductPrice(""); setNewProductHpp(""); setNewProductStock("");
    setNewProductBarcode(""); setNewProductImage(""); setNewProductCategory("Sembako");
    setNewProductUnit("Pcs"); setNewProductMinStock(0); setNewProductKeywords("");
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    setIsUpdatingProduct(true);
    try {
      const { error } = await supabase.from("product_variants").update({
        variant_name: editProductName,
        price: Number(editProductPrice),
        hpp: Number(editProductHpp),
        stock: Number(editProductStock),
        barcode: editProductBarcode,
        image_url: editProductImage,
        category: editProductCategory,
        unit: editProductUnit,
        min_stock: Number(editProductMinStock),
        keywords: editProductKeywords
      }).eq("id", editingProduct.id);
      if (error) throw error;
      alert("✅ Data Berhasil Diupdate!");
      setEditingProduct(null);
      fetchInventory();
    } catch (err: any) { alert("Gagal: " + err.message); }
    finally { setIsUpdatingProduct(false); }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct || !confirm("Hapus produk ini secara permanen?")) return;
    try {
      const { error } = await supabase.from("product_variants").delete().eq("id", editingProduct.id);
      if (error) throw error;
      alert("🗑️ Produk Dihapus!");
      setEditingProduct(null);
      fetchInventory();
    } catch (err: any) { alert("Gagal: " + err.message); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('pos-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('pos-images').getPublicUrl(filePath);
      setter(publicUrl);
    } catch (err: any) { alert("Upload Gagal: " + err.message); }
    finally { setIsUploading(false); }
  };

  const handleAddStock = async () => {
    if (!selectedVariant || !addStockAmount) return;
    setIsUpdatingProduct(true);
    try {
      const newStock = (selectedVariant.stock || 0) + Number(addStockAmount);
      const { error } = await supabase.from("product_variants").update({ 
        stock: newStock,
        variant_name: editProductName,
        barcode: editProductBarcode,
        category: editProductCategory,
        keywords: editProductKeywords,
        hpp: Number(editProductHpp),
        price: Number(editProductPrice)
      }).eq("id", selectedVariant.id);
      
      if (!error) {
        // FIFO: Create new stock layer for manual addition
        await supabase.from("stock_layers").insert([{
          variant_id: selectedVariant.id,
          quantity_remaining: Number(addStockAmount),
          cost_per_unit: Number(editProductHpp) || 0
        }]);
      }
      if (error) throw error;
      alert(`✅ Stok ${editProductName} berhasil diperbarui!`);
      setSelectedVariant(null);
      setAddStockAmount("");
      fetchInventory();
    } catch (err: any) { alert("Gagal tambah stok: " + err.message); }
    finally { setIsUpdatingProduct(false); }
  };

  const openLabelPrinter = (v: any) => {
    setPrintingProduct(v);
    setLabelFormat("shelf");
    setPrintQty(1);
  };

  const openEditProduct = (v: any) => {
    setEditingProduct(v);
    setEditProductName(v.variant_name || v.products?.name || "");
    setEditProductPrice(v.price || "");
    setEditProductHpp(v.hpp || "");
    setEditProductStock(v.stock || "");
    setEditProductBarcode(v.barcode || "");
    setEditProductImage(v.image_url || "");
    setEditProductCategory(v.category || "Lainnya");
    setEditProductUnit(v.unit || "Pcs");
    setEditProductMinStock(v.min_stock || 0);
    setEditProductKeywords(v.keywords || "");
  };

  const openAddStock = (v: any) => {
    setSelectedVariant(v);
    setAddStockAmount("");
    setEditProductName(v.variant_name || v.products?.name || "");
    setEditProductPrice(v.price || "");
    setEditProductHpp(v.hpp || "");
    setEditProductBarcode(v.barcode || "");
    setEditProductCategory(v.category || "Lainnya");
    setEditProductKeywords(v.keywords || "");
    setEditProductUnit(v.unit || "Pcs");
  };

  return (
    <ScalingContainer bg="bg-[#f8fafc]" baseWidth={1366} baseHeight={768} mode="fit" forceFluid={true}>
      <div className="h-screen bg-[#f8fafc] flex font-sans overflow-hidden relative w-full">
        {/* Left Sidebar */}
        <aside className={`no-print bg-slate-900 text-white flex flex-col transition-all duration-300 relative z-30 shrink-0 h-full
          ${isMobileOrTablet ? (isSidebarOpen ? 'w-[260px] fixed inset-y-0 left-0' : 'w-0 overflow-hidden fixed inset-y-0 left-0') : 'w-[260px]'}`}>
          
          {/* Logo / Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div onClick={handleSecretGateway} className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20 cursor-pointer hover:scale-110 transition-transform border border-white/10 shrink-0">
                <ShoppingBag size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black tracking-tighter leading-none text-white truncate">TANI MAJU</h1>
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1 truncate">Premium POS</p>
              </div>
            </div>
            {isMobileOrTablet && (
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white shrink-0">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Active Mode Banner / Description */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40">
            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">MODE AKTIF</div>
            {authRole ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0"></span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider truncate">ADMINISTRATOR</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider truncate">KASIR UTAMA</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1 custom-scrollbar">
            {!authRole ? (
              <>
                <SidebarButton active={activeTab === "pos"} onClick={() => { setActiveTab("pos"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<ShoppingCart size={16} />} label="Kasir POS" />
                <SidebarButton active={activeTab === "transactions"} onClick={() => { setActiveTab("transactions"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<ListOrdered size={16} />} label="Antrean" />
                <SidebarButton active={activeTab === "printer"} onClick={() => { setActiveTab("printer"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Smartphone size={16} />} label="Printer" />
              </>
            ) : (
              <>
                <SidebarButton active={activeTab === "history"} onClick={() => { setActiveTab("history"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<History size={16} />} label="Riwayat" />
                <SidebarButton active={activeTab === "inventory"} onClick={() => { setActiveTab("inventory"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<PackageSearch size={16} />} label="Produk" />
                <SidebarButton active={activeTab === "suppliers"} onClick={() => { setActiveTab("suppliers"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Truck size={16} />} label="Supplier" />
                <SidebarButton active={activeTab === "customers"} onClick={() => { setActiveTab("customers"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Users size={16} />} label="Pelanggan" />
                <SidebarButton active={activeTab === "promotions"} onClick={() => { setActiveTab("promotions"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Tag size={16} />} label="Promosi" />
                <SidebarButton active={activeTab === "expenses"} onClick={() => { setActiveTab("expenses"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Receipt size={16} />} label="Biaya" />
                <SidebarButton active={activeTab === "analytics"} onClick={() => { setActiveTab("analytics"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<BarChart3 size={16} />} label="Analytics" />
                <SidebarButton active={activeTab === "closing"} onClick={() => { setActiveTab("closing"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<CheckCircle size={16} />} label="Tutup" />
                <SidebarButton active={activeTab === "database"} onClick={() => { setActiveTab("database"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Cloud size={16} />} label="Cloud" />
                <SidebarButton active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); if(isMobileOrTablet) setIsSidebarOpen(false); }} icon={<Settings size={16} />} label="Pengaturan" />
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/20 space-y-2">
            <button 
              onClick={loadData} 
              className="w-full flex items-center justify-center gap-1.5 p-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all font-black border border-slate-800 uppercase tracking-widest shrink-0"
            >
              <RotateCcw size={12} /> Sync Data
            </button>

            {!authRole ? (
              <button 
                onClick={() => { setPinInput(""); setShowLoginModal(true); }} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl transition-all font-black flex items-center justify-center gap-1.5 shadow-lg border border-blue-400/25 uppercase text-[9px] tracking-widest shrink-0"
              >
                <Lock size={12} /> Mode Admin
              </button>
            ) : (
              <button 
                onClick={() => { setAuthRole(null); localStorage.removeItem("pos_admin_role"); setActiveTab("pos"); }} 
                className="w-full bg-slate-800 hover:bg-red-500 hover:text-white py-2.5 rounded-xl transition-all font-black flex items-center justify-center gap-1.5 shadow-sm border border-slate-700 uppercase text-[9px] tracking-widest shrink-0"
              >
                <LogOut size={12} /> Keluar
              </button>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile when sidebar is open */}
        {isMobileOrTablet && isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 z-20 no-print"></div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 h-screen lg:h-full overflow-hidden relative">
          {/* Mobile Top Header (only on mobile/tablet) */}
          {isMobileOrTablet && (
            <header className="no-print bg-slate-900 text-white px-4 py-3 shadow-md flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                  <Menu size={20} />
                </button>
                <span className="font-black text-sm tracking-tight">TANI MAJU</span>
              </div>
              
              <div className="flex items-center gap-2">
                {authRole ? (
                  <span className="text-[8px] font-black bg-blue-500/25 text-blue-400 px-2 py-1 rounded border border-blue-500/20 uppercase">Admin Active</span>
                ) : (
                  <span className="text-[8px] font-black bg-emerald-500/25 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase">Kasir Mode</span>
                )}
              </div>
            </header>
          )}

          {/* Actual content pane */}
          <main className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
        {/* ================= TAB POS (KASIR) ================= */}
        {activeTab === "pos" && (
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
                    .filter(i => {
                       const itemCat = (i.category || "Lainnya").toString().trim().toLowerCase();
                       const activeCat = newProductCategory.trim().toLowerCase();
                       const catMatch = activeCat === 'semua' || itemCat === activeCat;
                       
                       const searchMatch = (i.variant_name || i.products?.name || "").toLowerCase().includes(posManualCode.toLowerCase()) ||
                                          (i.barcode || "").toLowerCase().includes(posManualCode.toLowerCase());
                       return catMatch && searchMatch;
                    })
                    .map(item => (
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

                  {inventory.length > 0 && inventory.filter(i => {
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
                            const c = customers.find(cust => cust.id === e.target.value);
                            setSelectedCustomer(c || null);
                          }}
                        >
                          <option value="">UMUM</option>
                          {customers.map(c => (
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
                  ) : posCart.map(item => (
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
                         <h2 className="text-lg font-black text-white tracking-tighter">Rp {posCart.reduce((s, i) => s + ((i.unit_price || i.variant.price) * i.quantity), 0).toLocaleString('id-ID')}</h2>
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
        )}

        {/* ================= TAB TRANSACTIONS (ANTREAN) ================= */}
        {activeTab === "transactions" && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight">Antrean Pesanan</h2>
                   <p className="text-gray-500 font-medium">Lengkapi pembayaran untuk pesanan yang masih tertunda</p>
                </div>
                <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl font-black text-xs animate-pulse">
                   TOTAL PENDING: {transactions.filter(t => t.status === 'pending').length}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transactions.filter(t => t.status === 'pending').map(trx => (
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
                {transactions.filter(t => t.status === 'pending').length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                     <CheckCircle size={64} className="mb-4" />
                     <p className="font-black uppercase tracking-[0.3em] text-sm">Tidak Ada Antrean Pembayaran</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* ================= TAB PRINTER (THERMAL) ================= */}
        {activeTab === "printer" && (
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
        )}

        {/* ================= TAB HISTORY (RIWAYAT) ================= */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Riwayat Transaksi</h2>
                <p className="text-gray-500 font-medium">Pantau semua penjualan dan status pembayaran</p>
              </div>
              <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                {['today', 'week', 'month', 'custom'].map((p) => (
                  <button key={p} onClick={() => setHistPeriod(p as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${histPeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                    {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Kustom'}
                  </button>
                ))}
              </div>
            </div>

            {histPeriod === 'custom' && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 animate-in slide-in-from-top-2">
                <div className="flex-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Dari Tanggal</label>
                  <input type="date" className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-500 transition-all" value={histCustomFrom} onChange={e => setHistCustomFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Sampai Tanggal</label>
                  <input type="date" className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-500 transition-all" value={histCustomTo} onChange={e => setHistCustomTo(e.target.value)} />
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <input type="checkbox" className="w-5 h-5 rounded-lg" checked={selectedTrxIds.length === filteredHistory.length && filteredHistory.length > 0} onChange={e => {
                     if (e.target.checked) setSelectedTrxIds(filteredHistory.map(t => t.id));
                     else setSelectedTrxIds([]);
                   }} />
                   <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedTrxIds.length} Terpilih</span>
                 </div>
                 {selectedTrxIds.length > 0 && (
                   <button onClick={handleDeleteTransactions} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2">
                     <Trash2 size={14} /> HAPUS PERMANEN
                   </button>
                 )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4 w-10"></th>
                      <th className="px-6 py-4">Waktu</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Metode</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map(trx => (
                      <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 rounded" checked={selectedTrxIds.includes(trx.id)} onChange={e => {
                            if (e.target.checked) setSelectedTrxIds(prev => [...prev, trx.id]);
                            else setSelectedTrxIds(prev => prev.filter(id => id !== trx.id));
                          }} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">{new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm">{trx.customer_name || 'UMUM'}</td>
                        <td className="px-6 py-4 font-black text-blue-700 text-sm">Rp {(trx.total_amount || 0).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-600 uppercase">{trx.payment_method || 'Tunai'}</span></td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${trx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : trx.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                            {trx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setViewingTrx(trx)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><ExternalLink size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB INVENTORY (PRODUK) ================= */}
        {activeTab === "inventory" && (
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
                {filteredInventory.map(item => (
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
        )}

        {/* ================= TAB SUPPLIERS (PENYEDIA) ================= */}
        {activeTab === "suppliers" && (
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
                    {suppliers.map(s => {
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
                      {suppliers.map(s => (
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
                        .filter(po => {
                          if (poFilterStatus === "pending" && po.status !== "pending") return false;
                          if (poFilterStatus === "received" && po.status !== "received") return false;
                          if (poFilterSupplier !== "all" && po.supplier_id !== poFilterSupplier) return false;

                          const meta = getPoPaymentMeta(po.notes);
                          if (poFilterPayment === "cash" && meta.payment_terms !== "cash") return false;
                          if (poFilterPayment === "tempo_unpaid" && (meta.payment_terms !== "tempo" || meta.payment_status !== "unpaid")) return false;
                          if (poFilterPayment === "tempo_paid" && (meta.payment_terms !== "tempo" || meta.payment_status !== "paid")) return false;

                          return true;
                        })
                        .map(po => {
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
        )}

        {/* ================= TAB CUSTOMERS (PELANGGAN) ================= */}
        {activeTab === "customers" && (
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
                    {customers.map(c => (
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
              const debtors = customers.filter(c => (c.total_debt || 0) > 0);
              const totalReceivables = debtors.reduce((sum, c) => sum + (c.total_debt || 0), 0);
              const totalDebtorsCount = debtors.length;
              const avgReceivables = totalDebtorsCount > 0 ? Math.round(totalReceivables / totalDebtorsCount) : 0;

              // Filter debtors based on search query
              const filteredDebtors = debtors
                .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone || "").includes(customerSearchQuery))
                .sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0));

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
                          {filteredDebtors.map((debtor, index) => (
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
        )}

        {/* ================= TAB PROMOTIONS (PROMOSI) ================= */}
        {activeTab === "promotions" && (
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
                        {inventory.map(v => <option key={v.id} value={v.id}>{v.variant_name || v.products?.name} (Rp {v.price})</option>)}
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
                  {wholesalePrices.map(wp => (
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
        )}

        {/* ================= TAB EXPENSES (BIAYA) ================= */}
        {activeTab === "expenses" && (
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
                    {expenses.map(exp => (
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
                   <h3 className="text-2xl font-black relative z-10">Rp {expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString('id-ID')}</h3>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl"></div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tips Efisiensi</h4>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Catat setiap pengeluaran sekecil apapun untuk mendapatkan laporan laba bersih yang akurat di tab Analytics.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB ANALYTICS (BUSINESS INTELLIGENCE) ================= */}
        {activeTab === "analytics" && chartsReady && (
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
                            {analyticsData.payMethodChart.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
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
                   {analyticsData.payMethodChart.map((item, idx) => (
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
                        {analyticsData.bestSellerChart.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between group">
                             <div className="flex items-center gap-4 flex-1">
                                <span className="text-xs font-black text-slate-500 w-4">{idx+1}.</span>
                                <div className="flex-1">
                                   <div className="flex justify-between text-xs font-black mb-1.5">
                                      <span className="uppercase tracking-tight">{item.name}</span>
                                      <span className="text-blue-400">{item.value} {analyticsData.deadStock.find(i => i.variant_name === item.name)?.unit || 'Pcs'}</span>
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
                     {analyticsData.topProfitProducts.slice(0, 5).map((item, idx) => (
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
                  {analyticsData.velocityRecommendation.slice(0, 8).map((item, idx) => (
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
        )}

        {/* ================= TAB CLOSING (TUTUP TOKO) ================= */}
        {activeTab === "closing" && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            {/* Today's Stats Summary */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Status Kas Harian</p>
                    <h2 className="text-3xl font-black">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                  </div>
                  <button onClick={() => setShowClosingForm(!showClosingForm)} className="bg-white text-slate-900 font-black px-6 py-3 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2">
                    {showClosingForm ? <X size={20} /> : <Printer size={20} />}
                    {showClosingForm ? 'Batal' : 'Buat Laporan Tutup'}
                  </button>
                </div>

                {(() => {
                  const today = history.filter(t => t.status === 'paid' && new Date(t.created_at).toDateString() === new Date().toDateString());
                  const total = today.reduce((s, t) => s + (t.total_amount || 0), 0);
                  const cash = today.filter(t => t.payment_method === 'Tunai').reduce((s, t) => s + (t.total_amount || 0), 0);
                  const qris = today.filter(t => t.payment_method === 'QRIS').reduce((s, t) => s + (t.total_amount || 0), 0);
                  const transfer = today.filter(t => t.payment_method === 'Transfer').reduce((s, t) => s + (t.total_amount || 0), 0);
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                          <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Total Omzet</p>
                          <p className="text-xl font-black">Rp {total.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-emerald-500/20 p-4 rounded-2xl backdrop-blur-sm border border-emerald-500/20">
                          <p className="text-[10px] font-bold text-emerald-300 uppercase mb-1">Ekspektasi Tunai</p>
                          <p className="text-xl font-black text-emerald-400">Rp {cash.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total QRIS</p>
                          <p className="text-xl font-black">Rp {qris.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Transfer</p>
                          <p className="text-xl font-black">Rp {transfer.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      {showClosingForm && (
                        <div className="mt-8 p-8 bg-white text-slate-900 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 space-y-6">
                          <div className="text-center border-b pb-4">
                            <h3 className="text-xl font-black text-slate-800">Form Rekonsiliasi Kas</h3>
                            <p className="text-sm text-slate-400">Hitung uang fisik di laci dan masukkan di bawah ini</p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Uang Fisik (Tunai)</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">Rp</span>
                                <input 
                                  type="number" 
                                  placeholder="0" 
                                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 pl-16 text-3xl font-black text-slate-800 focus:border-blue-500 focus:ring-0 outline-none transition-all"
                                  value={closingCashActual}
                                  onChange={e => setClosingCashActual(Number(e.target.value) || "")}
                                />
                              </div>
                            </div>

                            {closingCashActual !== "" && (
                              <div className={`p-4 rounded-2xl flex items-center justify-between font-black ${Number(closingCashActual) - cash >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <span>Selisih (Varian):</span>
                                <span className="text-xl">Rp {(Number(closingCashActual) - cash).toLocaleString('id-ID')}</span>
                              </div>
                            )}

                            <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Catatan Tambahan</label>
                              <textarea 
                                placeholder="Contoh: Ada selisih karena pengembalian manual / uang kembalian kurang" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 text-sm font-medium outline-none focus:border-blue-500 transition-all min-h-[100px]"
                                value={closingNotes}
                                onChange={e => setClosingNotes(e.target.value)}
                              />
                            </div>

                            <button 
                              onClick={() => handleSaveClosing({ total, cash, qris, transfer, count: today.length })}
                              disabled={isSavingClosing}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                            >
                              {isSavingClosing ? <Loader2 className="animate-spin" /> : <Save />}
                              Simpan Laporan & Tutup Shift
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            </div>

            {/* History Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <History className="text-blue-500" /> Riwayat Tutup Toko
              </h3>
              
              {loadingClosing ? (
                <div className="text-center py-10 opacity-50"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : closingHistory.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <CheckCircle size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 font-medium">Belum ada laporan tutup toko.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {closingHistory.map((report: any) => (
                    <div key={report.id} className="p-5 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-blue-100 border border-transparent rounded-[2rem] transition-all group">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600 font-black text-xl">
                            {new Date(report.created_at).getDate()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{new Date(report.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • OLEH: {report.closed_by}</p>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cash (Sistem / Fisik)</p>
                            <p className="text-sm font-black text-slate-700">Rp {report.cash_expected.toLocaleString('id-ID')} / {report.cash_actual.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Selisih</p>
                            <p className={`text-sm font-black ${report.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.difference >= 0 ? '+' : ''}Rp {report.difference.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                      {report.notes && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 italic text-[11px] text-slate-500 font-medium">
                          💬 "{report.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
               <h3 className="text-xl font-black text-gray-800 mb-6">Pengaturan Aplikasi</h3>
               <div className="space-y-4">
                  <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Threshold Stok Menipis</label>
                    <input type="number" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value))} />
                  </div>
                  <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Limit Analisis Produk (Top/Worst)</label>
                    <input type="number" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={analysisLimit} onChange={e => setAnalysisLimit(Number(e.target.value))} />
                  </div>
                  <div className="p-5 bg-slate-100/50 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tarif Pajak Final UMKM (%)</label>
                    <input type="number" step="0.1" className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-sm" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
                  </div>
                  <button 
                    onClick={() => saveSyncSettings(remindMidday, remindEvening, remindClosing, lowStockThreshold, analysisLimit, taxRate)}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
                  >
                    SIMPAN PENGATURAN
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>

      <div className="no-print opacity-20 hover:opacity-100 transition-opacity text-center pb-4 mt-auto">
          <p className="text-[7px] font-black uppercase tracking-[0.8em] text-slate-400 leading-none">POS System By Naufal Rayhan</p>
      </div>
        </div>
      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* LOGIN MODAL */}
      {showLoginModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowLoginModal(false)}></div>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative z-10 animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} className="text-blue-600" /></div>
            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Akses Terbatas</h2>
            <p className="text-center text-gray-500 mb-6 text-sm">Silakan masukkan PIN Admin untuk membuka Menu Manajemen.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Masukkan Password" style={{ WebkitTextSecurity: 'disc' } as any} className="w-full text-center text-lg bg-gray-100 border border-gray-200 rounded-2xl px-4 py-4 focus:ring-4 focus:ring-blue-500 outline-none transition-all font-mono text-slate-900" autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-xl transition-all">Batal</button>
                <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">Buka Menu</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL AKHIR: SIMPAN / CETAK / DOWNLOAD */}
      {isConfirmingPos && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col p-8 space-y-6">
              <div className="text-center">
                 <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Receipt size={40} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 leading-tight">Konfirmasi Transaksi</h3>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Metode: <span className="text-blue-600">{posPaymentMethod}</span></p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl space-y-2">
                 <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Total Item</span>
                    <span>{posCart.length} Jenis</span>
                 </div>
                 <div className="flex justify-between items-center text-slate-900 font-black text-2xl pt-2 border-t border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-blue-600">Rp {posCart.reduce((s, i) => s + ((i.unit_price || i.variant.price) * i.quantity), 0).toLocaleString('id-ID')}</span>
                 </div>
              </div>

              {posPaymentMethod === 'Kasbon' && (
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Pilih Pelanggan (Wajib Kasbon)</p>
                   <select 
                      className="w-full bg-orange-50 text-orange-900 border-2 border-orange-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-orange-500 transition-all appearance-none"
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const c = customers.find(x => x.id === e.target.value);
                        setSelectedCustomer(c || null);
                      }}
                   >
                      <option value="">-- PILIH PELANGGAN --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              )}

              <div className="space-y-3">
                 <button 
                   disabled={isProcessingPos || (posPaymentMethod === 'Kasbon' && !selectedCustomer)}
                   onClick={() => handleDirectPayment(posPaymentMethod)}
                   className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-3"
                 >
                   {isProcessingPos && !viewingTrx ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                   KONFIRMASI & SIMPAN
                 </button>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                       disabled={isProcessingPos || (posPaymentMethod === 'Kasbon' && !selectedCustomer)}
                       onClick={() => handleDirectPayment(posPaymentMethod, 'print')}
                       className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                       <Printer size={16} /> CETAK
                    </button>
                    <button 
                       disabled={isProcessingPos || (posPaymentMethod === 'Kasbon' && !selectedCustomer)}
                       onClick={() => handleDirectPayment(posPaymentMethod, 'download')}
                       className="bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                       <Download size={16} /> PDF
                    </button>
                 </div>

                 <button 
                   onClick={() => setIsConfirmingPos(false)}
                   className="w-full text-slate-400 font-black py-3 text-[10px] tracking-[0.2em] uppercase hover:text-red-500 transition-colors"
                 >
                   BATAL TRANSAKSI
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* MODAL TAMBAH PRODUK BARU */}
      {isNewProduct && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsNewProduct(false)}></div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200"><Plus size={28} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Registrasi Produk Baru</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Input Data Master Minimarket</p>
                  </div>
                </div>
                <button onClick={() => setIsNewProduct(false)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><X size={24} /></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nama Produk</label>
                      <input type="text" placeholder="Contoh: Indomie Goreng" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={newProductName} onChange={e => setNewProductName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Barcode / SKU</label>
                      <input type="text" placeholder="Scan atau ketik kode" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={newProductBarcode} onChange={e => setNewProductBarcode(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all appearance-none" value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)}>
                          {['Sembako', 'Makanan', 'Minuman', 'Bumbu', 'Kebersihan', 'Lainnya'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Satuan (Unit)</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all appearance-none" value={newProductUnit} onChange={e => setNewProductUnit(e.target.value)}>
                          {['Pcs', 'Box', 'Kg', 'Liter', 'Bungkus', 'Renceng'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Modal (HPP)</label>
                        <input type="number" placeholder="0" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={newProductHpp} onChange={e => setNewProductHpp(Number(e.target.value) || "")} />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Harga Jual</label>
                        <input type="number" placeholder="0" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 font-bold text-emerald-800 focus:border-emerald-500 outline-none transition-all" value={newProductPrice} onChange={e => setNewProductPrice(Number(e.target.value) || "")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Stok Awal</label>
                        <input type="number" placeholder="0" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={newProductStock} onChange={e => setNewProductStock(Number(e.target.value) || "")} />
                      </div>
                      <div>
                        <label className="text-xs font-black text-orange-400 uppercase tracking-widest ml-1 mb-2 block">Min. Stok</label>
                        <input type="number" placeholder="5" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 font-bold text-orange-800 focus:border-orange-500 outline-none transition-all" value={newProductMinStock} onChange={e => setNewProductMinStock(Number(e.target.value) || "")} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kata Kunci (Tags)</label>
                      <input type="text" placeholder="Contoh: mie, instan, sedaap" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={newProductKeywords} onChange={e => setNewProductKeywords(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 rounded-b-[2.5rem] flex gap-4">
                <button onClick={() => setIsNewProduct(false)} className="flex-1 bg-white border-2 border-gray-200 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all">Batal</button>
                <button onClick={handleRegisterProduct} disabled={isRegistering} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isRegistering ? <Loader2 className="animate-spin" /> : <Save />} Simpan Produk Baru
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL EDIT PRODUK */}
      {editingProduct && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingProduct(null)}></div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200"><Edit size={28} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Edit Produk</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Perbarui Data Master</p>
                  </div>
                </div>
                <button onClick={() => setEditingProduct(null)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><X size={24} /></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nama Produk</label>
                      <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={editProductName} onChange={e => setEditProductName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Barcode / SKU</label>
                      <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={editProductBarcode} onChange={e => setEditProductBarcode(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all appearance-none" value={editProductCategory} onChange={e => setEditProductCategory(e.target.value)}>
                          {['Sembako', 'Makanan', 'Minuman', 'Bumbu', 'Kebersihan', 'Lainnya'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Satuan (Unit)</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all appearance-none" value={editProductUnit} onChange={e => setEditProductUnit(e.target.value)}>
                          {['Pcs', 'Box', 'Kg', 'Liter', 'Bungkus', 'Renceng'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Modal (HPP)</label>
                        <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={editProductHpp} onChange={e => setEditProductHpp(Number(e.target.value) || "")} />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Harga Jual</label>
                        <input type="number" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 font-bold text-emerald-800 focus:border-emerald-500 outline-none transition-all" value={editProductPrice} onChange={e => setEditProductPrice(Number(e.target.value) || "")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Stok Saat Ini</label>
                        <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={editProductStock} onChange={e => setEditProductStock(Number(e.target.value) || "")} />
                      </div>
                      <div>
                        <label className="text-xs font-black text-orange-400 uppercase tracking-widest ml-1 mb-2 block">Min. Stok</label>
                        <input type="number" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 font-bold text-orange-800 focus:border-orange-500 outline-none transition-all" value={editProductMinStock} onChange={e => setEditProductMinStock(Number(e.target.value) || "")} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kata Kunci (Tags)</label>
                      <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" value={editProductKeywords} onChange={e => setEditProductKeywords(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Multi-UOM Management Section */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <LayoutGrid size={18} className="text-blue-600" /> Satuan Tambahan (Multi-UOM)
                  </h4>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 space-y-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nama Satuan</label>
                        <input type="text" placeholder="Karton" className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Isi (Multiplier)</label>
                        <input type="number" placeholder="24" className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={newUnitMultiplier} onChange={e => setNewUnitMultiplier(Number(e.target.value) || "")} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Barcode</label>
                        <input type="text" placeholder="Scan Barcode" className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={newUnitBarcode} onChange={e => setNewUnitBarcode(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Harga Jual</label>
                        <input type="number" placeholder="Opsional" className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={newUnitPrice} onChange={e => setNewUnitPrice(Number(e.target.value) || "")} />
                      </div>
                    </div>
                    <button onClick={handleSaveUnit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                      <Plus size={14} /> Tambah Satuan
                    </button>
                  </div>

                  <div className="space-y-2">
                    {productUnits.filter(u => u.variant_id === editingProduct.id).map(u => (
                      <div key={u.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">{u.unit_name} (Isi {u.multiplier} {editProductUnit})</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Barcode: {u.barcode || '-'} • Harga: {u.price ? `Rp ${u.price.toLocaleString('id-ID')}` : 'Auto'}</p>
                        </div>
                        <button onClick={() => handleDeleteUnit(u.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50 rounded-b-[2.5rem] flex gap-4">
                <button onClick={handleDeleteProduct} className="px-6 bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center gap-2"><Trash2 size={20} /> Hapus</button>
                <button onClick={handleUpdateProduct} disabled={isUpdatingProduct} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isUpdatingProduct ? <Loader2 className="animate-spin" /> : <Save />} Perbarui Produk
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL TAMBAH STOK (ENHANCED) */}
      {selectedVariant && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setSelectedVariant(null)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 relative z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <PlusCircle size={24} />
                <div>
                  <h3 className="font-black leading-tight">TAMBAH STOK & UPDATE HARGA</h3>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Inventory Management</p>
                </div>
              </div>
              <button onClick={() => setSelectedVariant(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Produk</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800" value={editProductName} onChange={e => setEditProductName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Barcode / SKU</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800" value={editProductBarcode} onChange={e => setEditProductBarcode(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 appearance-none" value={editProductCategory} onChange={e => setEditProductCategory(e.target.value)}>
                        {['Sembako', 'Makanan', 'Minuman', 'Bumbu', 'Kebersihan', 'Lainnya'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kata Kunci</label>
                      <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800" value={editProductKeywords} onChange={e => setEditProductKeywords(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100">
                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest text-center mb-3 block">Jumlah Stok MASUK</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full bg-white border-2 border-blue-200 rounded-2xl p-5 text-4xl font-black text-center text-blue-600 focus:border-blue-500 outline-none transition-all" 
                        value={addStockAmount} 
                        onChange={e => setAddStockAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                        autoFocus 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-blue-300 uppercase text-xs">{editProductUnit}</span>
                    </div>
                    <p className="text-[10px] text-blue-400 font-bold text-center mt-3">STOK SAAT INI: {selectedVariant.stock} {editProductUnit}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Modal Baru (HPP)</label>
                      <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800" value={editProductHpp} onChange={e => setEditProductHpp(Number(e.target.value) || "")} />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Harga Jual Baru</label>
                      <input type="number" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 font-bold text-emerald-800" value={editProductPrice} onChange={e => setEditProductPrice(Number(e.target.value) || "")} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-slate-50 flex gap-4">
              <button onClick={() => setSelectedVariant(null)} className="flex-1 bg-white border-2 border-slate-200 text-slate-400 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all">BATAL</button>
              <button onClick={handleAddStock} disabled={!addStockAmount || isUpdatingProduct} className="flex-[2] bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isUpdatingProduct ? <Loader2 className="animate-spin" /> : <Save />} SIMPAN & UPDATE DATA
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CETAK LABEL & BARCODE (PRICE TAG GENERATOR) */}
      {printingProduct && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setPrintingProduct(null)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 flex flex-col md:flex-row max-h-[90vh]">
            {/* Control Panel (Left Side) */}
            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cetak Label & Barcode</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Buat label harga rak atau sticker tempel produk</p>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Format Label</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setLabelFormat("shelf")}
                    className={`p-4 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1.5 ${labelFormat === "shelf" ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm" : "border-slate-100 hover:border-slate-200 text-slate-400"}`}
                  >
                    <LayoutGrid size={20} />
                    <span className="text-xs">Label Rak (50x30mm)</span>
                  </button>
                  <button 
                    onClick={() => setLabelFormat("sticker")}
                    className={`p-4 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1.5 ${labelFormat === "sticker" ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm" : "border-slate-100 hover:border-slate-200 text-slate-400"}`}
                  >
                    <Tag size={20} />
                    <span className="text-xs">Sticker (40x20mm)</span>
                  </button>
                </div>
              </div>

              {/* Store Name Input */}
              {labelFormat === "shelf" && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nama Toko di Label</label>
                  <input 
                    type="text" 
                    value={labelStoreName}
                    onChange={e => setLabelStoreName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all uppercase"
                    placeholder="TANI MAJU"
                  />
                </div>
              )}

              {/* Copies Count */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Jumlah Salinan Cetak</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPrintQty(prev => Math.max(1, prev - 1))}
                    className="w-12 h-12 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl flex items-center justify-center font-black transition-all"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    min={1}
                    value={printQty}
                    onChange={e => setPrintQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 text-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 font-black text-lg outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={() => setPrintQty(prev => prev + 1)}
                    className="w-12 h-12 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl flex items-center justify-center font-black transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview & Print Action (Right Side) */}
            <div className="flex-1 p-8 bg-slate-50/50 flex flex-col justify-between max-h-full">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Live Preview (Tampilan Label)</label>
                
                {/* Preview Box Container */}
                <div className="w-full flex items-center justify-center py-8 bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  {labelFormat === "shelf" ? (
                    /* Shelf Label format: 50x30mm mock */
                    <div className="w-[280px] h-[168px] bg-white border border-slate-300 shadow-lg rounded-xl p-3 flex flex-col justify-between select-none relative overflow-hidden text-black font-sans">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-wider">
                        <span>{labelStoreName || "TANI MAJU"}</span>
                        <span className="uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[8px]">{printingProduct.category || "LAINNYA"}</span>
                      </div>
                      <div className="text-sm font-black text-slate-800 line-clamp-1 uppercase tracking-tight mt-1">
                        {printingProduct.variant_name || printingProduct.products?.name}
                      </div>
                      <div className="text-2xl font-black text-slate-900 leading-none mt-1">
                        Rp {(printingProduct.price || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="mt-2 text-center">
                        <BarcodeSVG value={printingProduct.barcode || "123456"} />
                        <div className="text-[8px] font-mono tracking-widest text-slate-400 mt-1">{printingProduct.barcode || "TANPA SKU"}</div>
                      </div>
                    </div>
                  ) : (
                    /* Sticker format: 40x20mm mock */
                    <div className="w-[240px] h-[120px] bg-white border border-slate-300 shadow-md rounded-lg p-2.5 flex flex-col justify-between select-none overflow-hidden text-black font-sans">
                      <div className="text-[9px] font-black text-slate-800 line-clamp-1 uppercase text-center">
                        {printingProduct.variant_name || printingProduct.products?.name}
                      </div>
                      <div className="my-1.5 text-center">
                        <BarcodeSVG value={printingProduct.barcode || "123456"} />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-900 border-t border-slate-100 pt-1">
                        <span>Rp {(printingProduct.price || 0).toLocaleString('id-ID')}</span>
                        <span className="font-mono text-[7px] text-slate-400">{printingProduct.barcode || "TANPA SKU"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setPrintingProduct(null)} 
                  className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-100 rounded-2xl transition-all text-sm"
                >
                  TUTUP
                </button>
                <button 
                  onClick={() => {
                    setTimeout(() => window.print(), 200);
                  }}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Printer size={18} />
                  CETAK ({printQty} SALINAN)
                </button>
              </div>
            </div>
          </div>

          {/* Hidden print container parsed only by media CSS */}
          <div id="printable-label" className="hidden">
            {Array.from({ length: printQty }).map((_, idx) => (
              <div 
                key={idx} 
                className={`label-print-item ${labelFormat === 'shelf' ? 'format-shelf' : 'format-sticker'}`}
                style={{
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: 'black',
                  backgroundColor: 'white',
                  border: '1px dashed #ccc',
                  pageBreakInside: 'avoid',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {labelFormat === 'shelf' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1mm', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6pt', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>
                      <span>{labelStoreName || "TANI MAJU"}</span>
                      <span>{printingProduct.category || "LAINNYA"}</span>
                    </div>
                    <div style={{ fontSize: '8pt', fontWeight: '900', textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: '0.5mm 0' }}>
                      {printingProduct.variant_name || printingProduct.products?.name}
                    </div>
                    <div style={{ fontSize: '14pt', fontWeight: '900', margin: '0.5mm 0' }}>
                      Rp {(printingProduct.price || 0).toLocaleString('id-ID')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <BarcodeSVG value={printingProduct.barcode || "123456"} />
                      <span style={{ fontSize: '6pt', fontFamily: 'monospace', letterSpacing: '1px', marginTop: '0.5mm' }}>{printingProduct.barcode}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1mm', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '6.5pt', fontWeight: 'bold', textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center' }}>
                      {printingProduct.variant_name || printingProduct.products?.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5mm 0' }}>
                      <BarcodeSVG value={printingProduct.barcode || "123456"} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '6.5pt', fontWeight: 'bold', borderTop: '0.5px solid #eee', paddingTop: '0.5mm' }}>
                      <span>Rp {(printingProduct.price || 0).toLocaleString('id-ID')}</span>
                      <span style={{ fontSize: '5pt', fontFamily: 'monospace' }}>{printingProduct.barcode}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DETAIL TRANSAKSI / RECEIPT PREVIEW */}
      {viewingTrx && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0" onClick={() => setViewingTrx(null)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-[300px] max-h-[85vh] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 flex flex-col">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Preview Struk</h3>
               <button onClick={() => setViewingTrx(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={16} /></button>
            </div>
            
            {/* The Actual Receipt Content */}
            <div id="printable-receipt" className="p-5 font-mono text-[10px] space-y-2 bg-white text-black leading-tight flex-1 overflow-y-auto custom-scrollbar">
               <div className="text-center space-y-1 mb-4">
                  <h2 className="text-xs font-black uppercase">TANI MAJU</h2>
                  <p className="text-[8px]">PANDANSARI PREMIUM POS</p>
                  <p className="text-[8px] opacity-70">********************************</p>
               </div>
               
               <div className="space-y-1 text-[8px] mb-3">
                  <div className="flex justify-between"><span>WAKTU:</span> <span>{new Date(viewingTrx.created_at || new Date()).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>ID   :</span> <span>#{viewingTrx.id?.substring(0,8).toUpperCase() || 'TRX'}</span></div>
                  <div className="flex justify-between"><span>KASIR:</span> <span>{(authRole || 'KASIR').toUpperCase()}</span></div>
                  <div className="flex justify-between"><span>CUST :</span> <span>{(viewingTrx.customer_name || viewingTrx.customer?.name || "UMUM").toUpperCase()}</span></div>
               </div>

               <p className="text-[8px] opacity-70 text-center">--------------------------------</p>

               <div className="space-y-2 py-2">
                  {viewingTrx.transaction_items?.map((it: any, idx: number) => (
                    <div key={idx} className="space-y-0.5">
                       <p className="uppercase font-bold text-[9px]">{it.product_variants?.variant_name || it.product_variants?.products?.name || "Item"}</p>
                       <div className="flex justify-between text-[8px]">
                          <span>{it.quantity} x {(it.unit_price || it.price || 0).toLocaleString('id-ID')}</span>
                          <span className="font-bold">Rp {((it.unit_price || it.price || 0) * it.quantity).toLocaleString('id-ID')}</span>
                       </div>
                    </div>
                  ))}
               </div>

               <p className="text-[8px] opacity-70 text-center">--------------------------------</p>

               <div className="space-y-1 py-2 text-[10px] font-black">
                  <div className="flex justify-between"><span>TOTAL</span> <span>Rp {viewingTrx.total_amount.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[8px] opacity-80"><span>BAYAR</span> <span>{(viewingTrx.payment_method || 'TUNAI').toUpperCase()}</span></div>
               </div>

               <p className="text-[8px] opacity-70 text-center">--------------------------------</p>
               
               <div className="pt-4 text-center space-y-1">
                  <p className="font-bold text-[8px]">TERIMA KASIH</p>
                  <p className="text-[7px]">POS BY NAUFAL RAYHAN</p>
               </div>
            </div>

            <div className="p-4 bg-slate-50 border-t grid grid-cols-2 gap-2 no-print shrink-0">
               <button onClick={() => window.print()} className="bg-slate-900 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg text-[10px]"><Printer size={14} /> CETAK</button>
               <button onClick={() => window.print()} className="bg-white border-2 border-slate-200 text-slate-600 font-black py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm text-[10px]"><Download size={14} /> PDF</button>
               <button onClick={() => setViewingTrx(null)} className="col-span-2 bg-white border border-slate-200 text-slate-400 font-bold py-2 rounded-2xl mt-1 text-xs">TUTUP</button>
            </div>

            <style jsx global>{`
              @media print {
                /* Hide everything by default */
                body * { visibility: hidden !important; }
                .no-print, .no-print * { display: none !important; }
                
                /* Only show the receipt */
                ${viewingTrx ? `
                #printable-receipt, #printable-receipt * { 
                  visibility: visible !important; 
                  color: black !important;
                }
                #printable-receipt {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 58mm !important;
                  padding: 5mm !important;
                  margin: 0 !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: white !important;
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 10pt !important;
                }
                ` : ''}

                /* Only show the label */
                ${printingProduct ? `
                #printable-label, #printable-label * {
                  visibility: visible !important;
                  color: black !important;
                }
                #printable-label {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: flex !important;
                  flex-wrap: wrap !important;
                  gap: 3mm !important;
                  background: white !important;
                }
                .label-print-item {
                  background: white !important;
                  border: 1px dashed #ccc !important;
                }
                .label-print-item.format-shelf {
                  width: 50mm !important;
                  height: 30mm !important;
                }
                .label-print-item.format-sticker {
                  width: 40mm !important;
                  height: 20mm !important;
                }
                ` : ''}

                @page { 
                  margin: 0; 
                  size: auto; 
                }
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KIRIM LAPORAN KE WHATSAPP */}
      {showWaModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowWaModal(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 flex flex-col p-8 border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kirim Laporan WA</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Masukkan Nomor WhatsApp Penerima</p>
              </div>
              <button 
                onClick={() => setShowWaModal(false)}
                className="w-10 h-10 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-2xl flex items-center justify-center text-slate-400 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nomor WhatsApp</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    +62
                  </div>
                  <input 
                    type="text" 
                    value={
                      waPhoneNumber
                        ? waPhoneNumber.startsWith("62")
                          ? waPhoneNumber.substring(2)
                          : waPhoneNumber.startsWith("0")
                          ? waPhoneNumber.substring(1)
                          : waPhoneNumber
                        : ""
                    }
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setWaPhoneNumber(val ? "62" + val : "");
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-14 font-black text-slate-800 outline-none focus:border-blue-500 transition-all tracking-wide text-lg"
                    placeholder="8123456789"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1.5 ml-1">Contoh: 8123456789 atau 08123456789</p>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <input 
                  type="checkbox" 
                  id="remember_wa"
                  checked={rememberWaNumber}
                  onChange={e => setRememberWaNumber(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember_wa" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Ingat nomor HP ini di perangkat ini
                </label>
              </div>

              <button 
                onClick={async () => {
                  let cleanNum = waPhoneNumber.replace(/\D/g, "");
                  if (cleanNum.startsWith("0")) {
                    cleanNum = "62" + cleanNum.substring(1);
                  }
                  if (cleanNum && !cleanNum.startsWith("62")) {
                    cleanNum = "62" + cleanNum;
                  }
                  if (cleanNum.length < 10) {
                    alert("⚠️ Harap masukkan nomor HP yang valid!");
                    return;
                  }

                  if (rememberWaNumber) {
                    localStorage.setItem("pos_wa_report_number", cleanNum);
                  } else {
                    localStorage.removeItem("pos_wa_report_number");
                  }

                  setShowWaModal(false);
                  setIsSharingWa(true);
                  try {
                    await shareFullReportXlsx(
                      waReportParams.history,
                      waReportParams.inventory,
                      waReportParams.soldMap,
                      waReportParams.expenses,
                      waReportParams.summary,
                      cleanNum
                    );
                  } finally {
                    setIsSharingWa(false);
                    setWaReportParams(null);
                  }
                }}
                className="w-full bg-green-500 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Send size={18} /> KIRIM LAPORAN SEKARANG
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL FORM PELANGGAN */}
      {showCustomerForm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCustomerForm(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserPlus size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{editingCustomer ? 'Edit Pelanggan' : 'Pelanggan Baru'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informasi Member & Kasbon</p>
                </div>
              </div>
              <button onClick={() => setShowCustomerForm(false)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nama Lengkap</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ketik nama pelanggan..." autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">No. WhatsApp / HP</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="0812..." />
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border-2 border-blue-100/50">
                 <input type="checkbox" id="is-member-check" className="w-5 h-5 rounded-lg border-2 border-blue-300 text-blue-600" checked={isMember} onChange={e => setIsMember(e.target.checked)} />
                 <label htmlFor="is-member-check" className="text-sm font-black text-blue-800 cursor-pointer">Daftarkan Sebagai Member ⭐</label>
              </div>
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setShowCustomerForm(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl">BATAL</button>
              <button onClick={handleSaveCustomer} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">SIMPAN PELANGGAN</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PELUNASAN KASBON */}
      {showDebtPaymentModal && selectedCustomerForPayment && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { if(!isProcessingDebtPayment) setShowDebtPaymentModal(false); }}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><DollarSign size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Pelunasan Kasbon</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedCustomerForPayment.name}</p>
                </div>
              </div>
              <button disabled={isProcessingDebtPayment} onClick={() => setShowDebtPaymentModal(false)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hutang Aktif</p>
                  <p className="text-xl font-black text-red-600 mt-1">Rp {(selectedCustomerForPayment.total_debt || 0).toLocaleString('id-ID')}</p>
                </div>
                <button 
                  onClick={() => setDebtPaymentAmount(selectedCustomerForPayment.total_debt || 0)} 
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
                >
                  Bayar Semua
                </button>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Jumlah Pembayaran (Rp)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-800 outline-none focus:border-emerald-500 transition-all text-xl" 
                  value={debtPaymentAmount} 
                  onChange={e => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setDebtPaymentAmount(val);
                  }} 
                  placeholder="Masukkan nominal uang..." 
                  disabled={isProcessingDebtPayment}
                  autoFocus 
                />
              </div>
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button disabled={isProcessingDebtPayment} onClick={() => setShowDebtPaymentModal(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl">BATAL</button>
              <button 
                disabled={isProcessingDebtPayment || !debtPaymentAmount || debtPaymentAmount <= 0} 
                onClick={handlePayCustomerDebt} 
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingDebtPayment ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    MEMPROSES...
                  </>
                ) : (
                  "SIMPAN PEMBAYARAN"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PENCATATAN BARANG RUSAK / SHRINKAGE */}
      {showDamagedModal && selectedVariantForDamaged && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { if(!isSavingDamaged) setShowDamagedModal(false); }}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-red-50 text-red-600">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Ban size={24} /></div>
                <div>
                  <h3 className="text-xl font-black">Catat Barang Rusak</h3>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{selectedVariantForDamaged.variant_name || selectedVariantForDamaged.products?.name}</p>
                </div>
              </div>
              <button disabled={isSavingDamaged} onClick={() => setShowDamagedModal(false)} className="p-2 hover:bg-red-100 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Saat Ini</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{selectedVariantForDamaged.stock || 0} {selectedVariantForDamaged.unit || 'Pcs'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HPP Barang</p>
                  <p className="text-lg font-black text-slate-800 mt-1">Rp {(selectedVariantForDamaged.hpp || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Jumlah Rusak</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-800 outline-none focus:border-red-500 transition-all text-xl" 
                    value={damagedQty} 
                    onChange={e => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setDamagedQty(val);
                    }} 
                    placeholder="0" 
                    disabled={isSavingDamaged}
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Alasan</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                    value={damagedReason}
                    onChange={e => setDamagedReason(e.target.value)}
                    disabled={isSavingDamaged}
                  >
                    <option value="Expired">⌛ Kadaluarsa</option>
                    <option value="Pecah/Rusak">🥚 Pecah / Rusak Fisik</option>
                    <option value="Hama">🐭 Hama / Tikus / Semut</option>
                    <option value="Penyusutan">📉 Penyusutan Berat</option>
                    <option value="Lainnya">⚙️ Lainnya</option>
                  </select>
                </div>
              </div>
              
              {Number(damagedQty) > 0 && (
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 flex justify-between items-center">
                  <p className="text-xs font-black text-red-800">Total Kerugian Toko (Beban Biaya):</p>
                  <p className="text-base font-black text-red-600">Rp {(Number(damagedQty) * (selectedVariantForDamaged.hpp || 0)).toLocaleString('id-ID')}</p>
                </div>
              )}
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button disabled={isSavingDamaged} onClick={() => setShowDamagedModal(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl">BATAL</button>
              <button 
                disabled={isSavingDamaged || !damagedQty || damagedQty <= 0} 
                onClick={handleSaveDamaged} 
                className="flex-[2] bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSavingDamaged ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    MEMPROSES...
                  </>
                ) : (
                  "SIMPAN PENCATATAN"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL FORM SUPPLIER */}
      {showSupplierForm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowSupplierForm(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Truck size={24} /></div>
                <h3 className="text-xl font-black text-slate-800">Data Supplier</h3>
              </div>
              <button onClick={() => setShowSupplierForm(false)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" placeholder="Nama Perusahaan / Supplier" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" placeholder="Kontak Person" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} />
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" placeholder="No. Telp" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} />
              <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" placeholder="Alamat" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} />
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setShowSupplierForm(false)} className="flex-1 py-4 font-black text-slate-400">BATAL</button>
              <button onClick={handleSaveSupplier} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">SIMPAN DATA</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KULAKAN / PURCHASE ORDER */}
      {showPoForm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { if(!isSavingPo) setShowPoForm(false); }}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 animate-in zoom-in-95 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShoppingCart size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Buat PO Kulakan Baru</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pencatatan pembelian stok barang ke Supplier</p>
                </div>
              </div>
              <button disabled={isSavingPo} onClick={() => setShowPoForm(false)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-4 overflow-y-auto flex-1">
              {/* Supplier Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Pilih Supplier</label>
                <select 
                  value={selectedPoSupplier} 
                  onChange={e => setSelectedPoSupplier(e.target.value)}
                  disabled={isSavingPo}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_person})</option>
                  ))}
                </select>
                {selectedPoSupplier && (
                  <button
                    type="button"
                    onClick={handleFillPoRecommendations}
                    className="mt-2 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all outline-none border border-blue-200/50"
                  >
                    ✨ Rekomendasi Belanja (Auto-Fill Stok Menipis)
                  </button>
                )}
              </div>

              {/* Item Adder Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tambah Barang</label>
                <select 
                  onChange={(e) => {
                    const valId = e.target.value;
                    if (!valId) return;
                    const variant = inventory.find(i => i.id === valId);
                    if (!variant) return;
                    if (poItems.some(it => it.variant_id === valId)) {
                      alert("⚠️ Barang sudah ditambahkan!");
                      return;
                    }
                    setPoItems(prev => [...prev, {
                      variant_id: valId,
                      variant_name: variant.variant_name || variant.products?.name || "Barang",
                      quantity: 1,
                      cost_price: variant.hpp || 0
                    }]);
                    e.target.value = ""; // reset dropdown
                  }}
                  disabled={isSavingPo}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">➕ Klik untuk pilih produk...</option>
                  {inventory.map(v => {
                    const isLow = v.stock <= (v.min_stock || lowStockThreshold);
                    return (
                      <option key={v.id} value={v.id}>
                        {isLow ? "🚨 [STOK MENIPIS] " : ""}{v.variant_name || v.products?.name} (Stok: {v.stock} | HPP: Rp {v.hpp})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Items List */}
              {poItems.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Daftar Barang Belanja</label>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                    {poItems.map((item, idx) => (
                      <div key={item.variant_id} className="p-4 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 text-xs uppercase line-clamp-1">{item.variant_name}</span>
                          <button 
                            onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-300 hover:text-red-500 transition-all p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Jumlah</span>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={e => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs"
                              placeholder="Qty"
                              min="1"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Harga Beli</span>
                            <input 
                              type="number" 
                              value={item.cost_price}
                              onChange={e => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, cost_price: val } : it));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs"
                              placeholder="Rp"
                            />
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Subtotal</span>
                            <span className="font-black text-xs text-slate-800">
                              Rp {((item.quantity || 0) * (item.cost_price || 0)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Metode Bayar</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setPoPaymentTerms("cash")}
                      className={`flex-1 py-3.5 rounded-2xl font-black text-xs transition-all border ${poPaymentTerms === "cash" ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"}`}
                    >
                      💵 TUNAI
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPoPaymentTerms("tempo")}
                      className={`flex-1 py-3.5 rounded-2xl font-black text-xs transition-all border ${poPaymentTerms === "tempo" ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/10" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"}`}
                    >
                      ⏳ TEMPO
                    </button>
                  </div>
                </div>

                {poPaymentTerms === "tempo" && (
                  <div className="animate-in slide-in-from-right-4 duration-200">
                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 mb-2 block">Jatuh Tempo</label>
                    <input 
                      type="date" 
                      value={poDueDate} 
                      onChange={e => setPoDueDate(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 font-bold text-slate-800 text-sm outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Catatan Tambahan</label>
                <textarea 
                  value={poNotes} 
                  onChange={e => setPoNotes(e.target.value)}
                  placeholder="Catatan pengerjaan / kontak supplier / no faktur..."
                  disabled={isSavingPo}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 text-xs outline-none focus:border-blue-500 h-20"
                />
              </div>

              {/* Total Summary */}
              {poItems.length > 0 && (
                <div className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center text-white shadow-lg">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Belanja PO</span>
                  <span className="text-lg font-black">
                    Rp {poItems.reduce((sum, it) => sum + ((it.quantity || 0) * (it.cost_price || 0)), 0).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            <div className="p-8 border-t flex gap-3 bg-slate-50">
              <button disabled={isSavingPo} onClick={() => setShowPoForm(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">BATAL</button>
              <button 
                disabled={isSavingPo || !selectedPoSupplier || poItems.length === 0} 
                onClick={handleSavePO} 
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPo ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    MEMPROSES...
                  </>
                ) : (
                  "SIMPAN PO"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL FORM PENGELUARAN */}
      {showExpenseForm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowExpenseForm(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-red-50 text-red-600">
              <div className="flex items-center gap-4"><MinusCircle size={24} /><h3 className="text-xl font-black">Catat Pengeluaran</h3></div>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-red-100 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                <option value="Kulakan">📦 Kulakan Barang</option>
                <option value="Listrik">⚡ Listrik & Air</option>
                <option value="Gaji">👥 Gaji Karyawan</option>
                <option value="Lainnya">🛠️ Lain-lain</option>
              </select>
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold" placeholder="Deskripsi Pengeluaran" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">Rp</span>
                <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-black text-xl text-red-600" placeholder="0" value={expenseAmount} onChange={e => setExpenseAmount(Number(e.target.value) || "")} />
              </div>
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setShowExpenseForm(false)} className="flex-1 py-4 font-black text-slate-400">BATAL</button>
              <button onClick={handleAddExpense} className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">SIMPAN PENGELUARAN</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </ScalingContainer>
  );
}
