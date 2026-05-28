import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
//  XLSX Helpers – runs entirely on the client (no API route needed)
// ---------------------------------------------------------------------------

/** Format a date to Indonesian locale string */
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const currency = (n: number) => n; // keep as number so Excel can SUM

// ---------------------------------------------------------------------------
//  Export Transactions (History)
// ---------------------------------------------------------------------------
export function exportTransactionsXlsx(history: any[]) {
  const rows = history
    .filter((t) => t.status === "paid")
    .map((trx) => {
      const items = (trx.transaction_items || [])
        .map(
          (it: any) =>
            `${it.product_variants?.variant_name || it.product_variants?.products?.name || "Item"} x${it.quantity}`
        )
        .join(", ");

      const totalHpp = (trx.transaction_items || []).reduce(
        (s: number, it: any) =>
          s + (it.product_variants?.hpp || 0) * it.quantity,
        0
      );

      return {
        "Tanggal": fmtDate(trx.created_at),
        "ID Transaksi": trx.id?.substring(0, 8).toUpperCase(),
        "Pelanggan": trx.customer_name || "-",
        "Meja": trx.table_number || "-",
        "Item": items,
        "Total (Rp)": currency(trx.total_amount || 0),
        "HPP (Rp)": currency(totalHpp),
        "Laba Kotor (Rp)": currency((trx.total_amount || 0) - totalHpp),
        "Metode Bayar": trx.payment_method || "Tunai",
        "Status": trx.status,
      };
    });

  if (rows.length === 0) {
    alert("Tidak ada transaksi LUNAS untuk diekspor.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String((r as any)[key]).length)
    ) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
  XLSX.writeFile(
    wb,
    `Transaksi_TaniMajuPandansari_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// ---------------------------------------------------------------------------
//  Export Inventory
// ---------------------------------------------------------------------------
export function exportInventoryXlsx(
  inventory: any[],
  soldMap: Record<string, number>
) {
  const rows = inventory.map((item) => ({
    "Nama Produk": item.variant_name || item.products?.name || "-",
    "Barcode": item.barcode || "-",
    "Harga Jual (Rp)": currency(item.price || 0),
    "HPP / Modal (Rp)": currency(item.hpp || 0),
    "Margin (Rp)": currency((item.price || 0) - (item.hpp || 0)),
    "Stok Saat Ini": item.stock || 0,
    "Terjual (Periode)": soldMap[item.id] || 0,
    "Total Terjual": item.sold_count || 0,
  }));

  if (rows.length === 0) {
    alert("Tidak ada data inventori.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String((r as any)[key]).length)
    ) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventori");
  XLSX.writeFile(
    wb,
    `Inventori_TaniMajuPandansari_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// ---------------------------------------------------------------------------
//  Export Combined Report (Transactions + Inventory in one workbook)
// ---------------------------------------------------------------------------
export function exportFullReportXlsx(
  history: any[],
  inventory: any[],
  soldMap: Record<string, number>,
  expenses: any[],
  analysisLimit: number = 10,
  summary: { omzet: number; hpp: number; expense: number; netProfit: number; range: string; taxRate?: number }
) {
  const wb = XLSX.utils.book_new();
  const taxRate = summary.taxRate ?? 0.005;

  // Sheet 1: Transaksi
  const trxRows = history
    .filter((t) => t.status === "paid")
    .map((trx) => {
      const items = (trx.transaction_items || [])
        .map(
          (it: any) =>
            `${it.product_variants?.variant_name || it.product_variants?.products?.name || "Item"} x${it.quantity}`
        )
        .join(", ");
      const totalHpp = (trx.transaction_items || []).reduce(
        (s: number, it: any) =>
          s + (it.product_variants?.hpp || 0) * it.quantity,
        0
      );
      return {
        "Tanggal": fmtDate(trx.created_at),
        "ID Transaksi": trx.id?.substring(0, 8).toUpperCase(),
        "Pelanggan": trx.customer_name || "-",
        "Meja": trx.table_number || "-",
        "Item": items,
        "Total (Rp)": currency(trx.total_amount || 0),
        "HPP (Rp)": currency(totalHpp),
        "Laba Kotor (Rp)": currency((trx.total_amount || 0) - totalHpp),
        "Metode Bayar": trx.payment_method || "Tunai",
      };
    });

  if (trxRows.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(trxRows);
    ws1["!cols"] = Object.keys(trxRows[0]).map((key) => ({
      wch: Math.max(key.length, ...trxRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws1, "Transaksi");
  }

  // Sheet 2: Inventori
  const invRows = inventory.map((item) => ({
    "Nama Produk": item.variant_name || item.products?.name || "-",
    "Barcode": item.barcode || "-",
    "Harga Jual (Rp)": currency(item.price || 0),
    "HPP / Modal (Rp)": currency(item.hpp || 0),
    "Stok Saat Ini": item.stock || 0,
    "Terjual (Periode)": soldMap[item.id] || 0,
    "Total Terjual": item.sold_count || 0,
  }));

  if (invRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(invRows);
    ws2["!cols"] = Object.keys(invRows[0]).map((key) => ({
      wch: Math.max(key.length, ...invRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws2, "Inventori");
  }

  // Sheet 3: Pengeluaran
  const expRows = expenses.map((exp) => ({
    "Tanggal": fmtDate(exp.created_at),
    "Kategori": exp.category || "-",
    "Deskripsi": exp.description || "-",
    "Jumlah (Rp)": currency(exp.amount || 0),
  }));

  if (expRows.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(expRows);
    ws3["!cols"] = Object.keys(expRows[0]).map((key) => ({
      wch: Math.max(key.length, ...expRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws3, "Pengeluaran");
  }

  const analysisRows = [
    { "Kategori Analisis": "📊 RINGKASAN PERIODE", "Nama Produk": summary.range, "Detail": "" },
    { "Kategori Analisis": "💰 Total Omzet", "Nama Produk": "", "Detail": `Rp ${summary.omzet.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "📦 Total Modal (HPP)", "Nama Produk": "", "Detail": `Rp ${summary.hpp.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "🧾 Total Operasional", "Nama Produk": "", "Detail": `Rp ${summary.expense.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "📈 Laba Bersih (Sebelum Pajak)", "Nama Produk": "", "Detail": `Rp ${summary.netProfit.toLocaleString("id-ID")}` },
    { "Kategori Analisis": `🏛️ Pajak UMKM (PPh Final ${(taxRate * 100).toFixed(1)}%)`, "Nama Produk": "", "Detail": `Rp ${(summary.omzet * taxRate).toLocaleString("id-ID")}` },
    { "Kategori Analisis": "💵 Laba Bersih Setelah Pajak", "Nama Produk": "", "Detail": `Rp ${(summary.netProfit - (summary.omzet * taxRate)).toLocaleString("id-ID")}` },
    {},
  ];

  const mostPop = [...inventory]
    .map(i => ({ i, sold: soldMap[i.id] || 0 }))
    .filter(x => x.sold > 0)
    .sort((a,b) => b.sold - a.sold)
    .slice(0, analysisLimit)
    .map(x => ({ "Kategori Analisis": "⭐ Produk Paling Laku", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Terjual ${x.sold}` }));

  const profitAnalysis = [...inventory]
    .map(i => {
      const sold = soldMap[i.id] || 0;
      const profit = ((i.price || 0) - (i.hpp || 0)) * sold;
      return { i, profit };
    })
    .filter(x => x.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, analysisLimit)
    .map(x => ({ "Kategori Analisis": "💰 Analisis Keuntungan", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Profit Rp ${x.profit.toLocaleString("id-ID")}` }));

  const procurement = [...inventory]
    .map(i => {
      const sold = soldMap[i.id] || 0;
      const needed = Math.max(0, Math.ceil(sold * 1.2) - (i.stock || 0));
      return { i, needed, sold };
    })
    .filter(x => x.needed > 0)
    .sort((a, b) => b.needed - a.needed)
    .slice(0, analysisLimit)
    .map(x => ({ "Kategori Analisis": "🛒 Saran Restok", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Butuh +${x.needed} unit` }));

  const critStock = inventory
    .filter(i => (i.stock ?? 0) <= 5)
    .sort((a,b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, analysisLimit)
    .map(i => ({ "Kategori Analisis": "⚠️ Stok Menipis", "Nama Produk": i.variant_name || i.products?.name || "-", "Detail": `Sisa ${i.stock || 0} pcs` }));

  analysisRows.push(...mostPop, {}, ...profitAnalysis, {}, ...procurement, {}, ...critStock);


  if (analysisRows.length > 0) {
    const ws4 = XLSX.utils.json_to_sheet(analysisRows);
    ws4["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Analisis");
  }

  XLSX.writeFile(
    wb,
    `Laporan_TaniMajuPandansari_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// ---------------------------------------------------------------------------
//  Share Full Report on WhatsApp
// ---------------------------------------------------------------------------
export async function shareFullReportXlsx(
  history: any[],
  inventory: any[],
  soldMap: Record<string, number>,
  expenses: any[],
  summary: { omzet: number; hpp: number; expense: number; netProfit: number; range: string; taxRate?: number },
  phoneNumber: string
) {
  const wb = XLSX.utils.book_new();
  const taxRate = summary.taxRate ?? 0.005;

  // Sheet 1: Transaksi
  const trxRows = history
    .filter((t) => t.status === "paid")
    .map((trx) => {
      const items = (trx.transaction_items || [])
        .map(
          (it: any) =>
            `${it.product_variants?.variant_name || it.product_variants?.products?.name || "Item"} x${it.quantity}`
        )
        .join(", ");
      const totalHpp = (trx.transaction_items || []).reduce(
        (s: number, it: any) =>
          s + (it.product_variants?.hpp || 0) * it.quantity,
        0
      );
      return {
        "Tanggal": fmtDate(trx.created_at),
        "ID Transaksi": trx.id?.substring(0, 8).toUpperCase(),
        "Pelanggan": trx.customer_name || "-",
        "Meja": trx.table_number || "-",
        "Item": items,
        "Total (Rp)": currency(trx.total_amount || 0),
        "HPP (Rp)": currency(totalHpp),
        "Laba Kotor (Rp)": currency((trx.total_amount || 0) - totalHpp),
        "Metode Bayar": trx.payment_method || "Tunai",
      };
    });

  if (trxRows.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(trxRows);
    ws1["!cols"] = Object.keys(trxRows[0]).map((key) => ({
      wch: Math.max(key.length, ...trxRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws1, "Transaksi");
  }

  // Sheet 2: Inventori
  const invRows = inventory.map((item) => ({
    "Nama Produk": item.variant_name || item.products?.name || "-",
    "Barcode": item.barcode || "-",
    "Harga Jual (Rp)": currency(item.price || 0),
    "HPP / Modal (Rp)": currency(item.hpp || 0),
    "Stok Saat Ini": item.stock || 0,
    "Terjual (Periode)": soldMap[item.id] || 0,
    "Total Terjual": item.sold_count || 0,
  }));

  if (invRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(invRows);
    ws2["!cols"] = Object.keys(invRows[0]).map((key) => ({
      wch: Math.max(key.length, ...invRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws2, "Inventori");
  }

  // Sheet 3: Pengeluaran
  const expRows = expenses.map((exp) => ({
    "Tanggal": fmtDate(exp.created_at),
    "Kategori": exp.category || "-",
    "Deskripsi": exp.description || "-",
    "Jumlah (Rp)": currency(exp.amount || 0),
  }));

  if (expRows.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(expRows);
    ws3["!cols"] = Object.keys(expRows[0]).map((key) => ({
      wch: Math.max(key.length, ...expRows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws3, "Pengeluaran");
  }

  // Sheet 4: Analisis
  const analysisRows = [
    { "Kategori Analisis": "📊 RINGKASAN PERIODE", "Nama Produk": summary.range, "Detail": "" },
    { "Kategori Analisis": "💰 Total Omzet", "Nama Produk": "", "Detail": `Rp ${summary.omzet.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "📦 Total Modal (HPP)", "Nama Produk": "", "Detail": `Rp ${summary.hpp.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "🧾 Total Operasional", "Nama Produk": "", "Detail": `Rp ${summary.expense.toLocaleString("id-ID")}` },
    { "Kategori Analisis": "📈 Laba Bersih (Sebelum Pajak)", "Nama Produk": "", "Detail": `Rp ${summary.netProfit.toLocaleString("id-ID")}` },
    { "Kategori Analisis": `🏛️ Pajak UMKM (PPh Final ${(taxRate * 100).toFixed(1)}%)`, "Nama Produk": "", "Detail": `Rp ${(summary.omzet * taxRate).toLocaleString("id-ID")}` },
    { "Kategori Analisis": "💵 Laba Bersih Setelah Pajak", "Nama Produk": "", "Detail": `Rp ${(summary.netProfit - (summary.omzet * taxRate)).toLocaleString("id-ID")}` },
    {},
  ];

  const mostPop = [...inventory]
    .map(i => ({ i, sold: soldMap[i.id] || 0 }))
    .filter(x => x.sold > 0)
    .sort((a,b) => b.sold - a.sold)
    .slice(0, 10)
    .map(x => ({ "Kategori Analisis": "⭐ Produk Paling Laku", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Terjual ${x.sold}` }));

  const profitAnalysis = [...inventory]
    .map(i => {
      const sold = soldMap[i.id] || 0;
      const profit = ((i.price || 0) - (i.hpp || 0)) * sold;
      return { i, profit };
    })
    .filter(x => x.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)
    .map(x => ({ "Kategori Analisis": "💰 Analisis Keuntungan", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Profit Rp ${x.profit.toLocaleString("id-ID")}` }));

  const procurement = [...inventory]
    .map(i => {
      const sold = soldMap[i.id] || 0;
      const needed = Math.max(0, Math.ceil(sold * 1.2) - (i.stock || 0));
      return { i, needed, sold };
    })
    .filter(x => x.needed > 0)
    .sort((a, b) => b.needed - a.needed)
    .slice(0, 10)
    .map(x => ({ "Kategori Analisis": "🛒 Saran Restok", "Nama Produk": x.i.variant_name || x.i.products?.name || "-", "Detail": `Butuh +${x.needed} unit` }));

  const critStock = inventory
    .filter(i => (i.stock ?? 0) <= 5)
    .sort((a,b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 10)
    .map(i => ({ "Kategori Analisis": "⚠️ Stok Menipis", "Nama Produk": i.variant_name || i.products?.name || "-", "Detail": `Sisa ${i.stock || 0} pcs` }));

  analysisRows.push(...mostPop, {}, ...profitAnalysis, {}, ...procurement, {}, ...critStock);

  if (analysisRows.length > 0) {
    const ws4 = XLSX.utils.json_to_sheet(analysisRows);
    ws4["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Analisis");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const fileName = `Laporan_TaniMajuPandansari_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Laporan POS Tani Maju",
        text: `Laporan Keuangan POS Tani Maju Pandansari periode ${summary.range}.`,
      });
      return { success: true, method: "native_share" };
    } catch (err: any) {
      if (err.name === 'AbortError') return { success: false, error: 'Cancelled' };
    }
  }

  try {
    const { supabase } = await import("@/lib/supabase");
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filePath = `reports/Laporan_${fileId}.xlsx`;

    const { error: uploadError } = await supabase.storage
      .from('pos-images')
      .upload(filePath, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage
      .from('pos-images')
      .getPublicUrl(filePath);

    const taxValue = summary.omzet * taxRate;
    const finalNetProfit = summary.netProfit - taxValue;

    const message = `*LAPORAN PEMBUKUAN POS TANI MAJU*\n` +
      `Periode: ${summary.range}\n` +
      `-----------------------------------------\n` +
      `💰 *Total Omzet:* Rp ${summary.omzet.toLocaleString("id-ID")}\n` +
      `📦 *Total Modal (HPP):* Rp ${summary.hpp.toLocaleString("id-ID")}\n` +
      `🧾 *Total Operasional:* Rp ${summary.expense.toLocaleString("id-ID")}\n` +
      `📈 *Laba Bersih (Sebelum Pajak):* Rp ${summary.netProfit.toLocaleString("id-ID")}\n` +
      `🏛️ *Pajak Final UMKM (${(taxRate * 100).toFixed(1)}%):* Rp ${taxValue.toLocaleString("id-ID")}\n` +
      `💵 *Laba Bersih Setelah Pajak:* Rp ${finalNetProfit.toLocaleString("id-ID")}\n` +
      `-----------------------------------------\n` +
      `📂 *Unduh Laporan Excel:* \n${publicUrl}`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    return { success: true, method: "whatsapp_link", publicUrl };
  } catch (uploadErr: any) {
    console.error("Gagal share ke WA:", uploadErr);
    
    const taxValue = summary.omzet * taxRate;
    const finalNetProfit = summary.netProfit - taxValue;

    // Fallback to text-only report to WhatsApp if storage fails
    const message = `*LAPORAN PEMBUKUAN POS TANI MAJU*\n` +
      `Periode: ${summary.range}\n` +
      `-----------------------------------------\n` +
      `💰 *Total Omzet:* Rp ${summary.omzet.toLocaleString("id-ID")}\n` +
      `📦 *Total Modal (HPP):* Rp ${summary.hpp.toLocaleString("id-ID")}\n` +
      `🧾 *Total Operasional:* Rp ${summary.expense.toLocaleString("id-ID")}\n` +
      `📈 *Laba Bersih (Sebelum Pajak):* Rp ${summary.netProfit.toLocaleString("id-ID")}\n` +
      `🏛️ *Pajak Final UMKM (${(taxRate * 100).toFixed(1)}%):* Rp ${taxValue.toLocaleString("id-ID")}\n` +
      `💵 *Laba Bersih Setelah Pajak:* Rp ${finalNetProfit.toLocaleString("id-ID")}\n` +
      `-----------------------------------------\n` +
      `*(Catatan: File Excel tidak dapat dilampirkan karena bucket 'pos-images' belum dibuat di Supabase)*`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    
    alert("⚠️ File Excel gagal diunggah ke cloud (Bucket Supabase 'pos-images' belum dibuat), namun rangkuman laporan tetap berhasil dikirim ke nomor WA.");
    return { success: true, method: "whatsapp_text_only" };
  }
}
