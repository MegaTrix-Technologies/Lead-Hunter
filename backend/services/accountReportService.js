const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class AccountReportService {
  /**
   * Generates a professional, multi-tab Excel (.xlsx) workbook with styled headers and totals
   */
  async generateExcelWorkbook({ periodLabel, summary, sales = [], expenses = [], categoryBreakdown = [] }, res) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MegaTrix LeadEngine & CRM';
    workbook.created = new Date();

    // ─── SHEET 1: EXECUTIVE SUMMARY & P&L ────────────────────────────────────
    const summarySheet = workbook.addWorksheet('P&L Summary', {
      views: [{ showGridLines: true }]
    });

    summarySheet.columns = [
      { width: 28 },
      { width: 24 },
      { width: 24 },
      { width: 24 },
      { width: 24 }
    ];

    // Title Row
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'MEGATRIX TECHNOLOGIES — FINANCIAL P&L STATEMENT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(1).height = 35;

    // Period Meta Row
    summarySheet.mergeCells('A2:E2');
    const metaCell = summarySheet.getCell('A2');
    metaCell.value = `Reporting Period: ${periodLabel}   |   Generated: ${new Date().toLocaleString()}   |   Currency: PKR`;
    metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(2).height = 22;

    summarySheet.addRow([]);

    // KPI Cards Header
    const kpiHeaderRow = summarySheet.addRow(['METRIC', 'AMOUNT (PKR)', 'RECORD COUNT', 'MARGIN / RATIO', 'STATUS']);
    kpiHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    kpiHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiHeaderRow.height = 26;

    // KPI Rows
    const salesRow = summarySheet.addRow(['Total Sales Revenue', summary.totalSales, summary.salesCount, '100.0%', 'Gross Inflow']);
    salesRow.getCell(2).numFmt = '#,##0.00';
    salesRow.getCell(2).font = { bold: true, color: { argb: 'FF059669' } };

    const expenseRow = summarySheet.addRow(['Total Operating Expenses', summary.totalExpenses, summary.expenseCount, summary.totalSales > 0 ? `${((summary.totalExpenses / summary.totalSales) * 100).toFixed(1)}%` : '0%', 'Operating Outflow']);
    expenseRow.getCell(2).numFmt = '#,##0.00';
    expenseRow.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };

    const netProfitRow = summarySheet.addRow(['Net Operating Profit', summary.netProfit, summary.salesCount + summary.expenseCount, `${summary.profitMargin}%`, summary.netProfit >= 0 ? 'Profitable' : 'Deficit']);
    netProfitRow.getCell(2).numFmt = '#,##0.00';
    netProfitRow.getCell(2).font = { bold: true, color: summary.netProfit >= 0 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
    netProfitRow.getCell(4).font = { bold: true };

    summarySheet.addRow([]);

    // Category Breakdown Section
    summarySheet.mergeCells('A8:E8');
    const catHeaderCell = summarySheet.getCell('A8');
    catHeaderCell.value = 'OPERATIONAL EXPENSES BY CATEGORY';
    catHeaderCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    catHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    catHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    summarySheet.getRow(8).height = 24;

    const catSubHeaderRow = summarySheet.addRow(['CATEGORY', 'EXPENSE AMOUNT (PKR)', 'SHARE OF TOTAL EXPENSES', '', '']);
    catSubHeaderRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
    catSubHeaderRow.height = 20;

    let catStartRow = 10;
    (summary.expensesByCategory || []).forEach(cat => {
      const row = summarySheet.addRow([
        cat.category,
        cat.amount,
        summary.totalExpenses > 0 ? `${((cat.amount / summary.totalExpenses) * 100).toFixed(1)}%` : '0%',
        '',
        ''
      ]);
      row.getCell(2).numFmt = '#,##0.00';
    });

    // ─── SHEET 2: SALES LEDGER ───────────────────────────────────────────────
    const salesSheet = workbook.addWorksheet('Sales Ledger', {
      views: [{ showGridLines: true }]
    });

    salesSheet.columns = [
      { header: 'Sale Date', key: 'date', width: 14 },
      { header: 'Client / Business Name', key: 'client', width: 32 },
      { header: 'Industry / Niche', key: 'category', width: 22 },
      { header: 'Commercial Area', key: 'area', width: 24 },
      { header: 'Closed By (Agent)', key: 'agent', width: 20 },
      { header: 'Products Sold', key: 'products', width: 34 },
      { header: 'Deal Amount (PKR)', key: 'amount', width: 20 }
    ];

    const salesHeaderRow = salesSheet.getRow(1);
    salesHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    salesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    salesHeaderRow.height = 28;
    salesHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

    sales.forEach((s, idx) => {
      const prodsStr = (s.interestedProducts || []).map(p => `${p.name} (${p.finalPrice || p.basePrice})`).join(', ') || 'Direct Deal';
      const row = salesSheet.addRow({
        date: s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
        client: s.businessName || 'Unknown Client',
        category: s.category || 'General',
        area: s.area || 'Lahore',
        agent: s.extractedByName || 'Sales Desk',
        products: prodsStr,
        amount: s.dealValue || 0
      });
      row.height = 20;
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(7).alignment = { horizontal: 'right' };
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    // Bottom Totals Row for Sales
    const salesTotalRowNum = sales.length + 2;
    const salesTotalRow = salesSheet.addRow([
      'TOTAL SALES',
      '',
      '',
      '',
      '',
      `${sales.length} Deals Closed`,
      summary.totalSales
    ]);
    salesTotalRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    salesTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    salesTotalRow.height = 24;
    salesTotalRow.getCell(7).numFmt = '#,##0.00';
    salesTotalRow.getCell(7).alignment = { horizontal: 'right' };

    // ─── SHEET 3: EXPENSES LEDGER ────────────────────────────────────────────
    const expenseSheet = workbook.addWorksheet('Expenses Ledger', {
      views: [{ showGridLines: true }]
    });

    expenseSheet.columns = [
      { header: 'Expense Date', key: 'date', width: 14 },
      { header: 'Expense Category', key: 'category', width: 28 },
      { header: 'Description / Purpose', key: 'description', width: 38 },
      { header: 'Payment Method', key: 'method', width: 18 },
      { header: 'Reference / Invoice #', key: 'ref', width: 20 },
      { header: 'Amount (PKR)', key: 'amount', width: 20 }
    ];

    const expHeaderRow = expenseSheet.getRow(1);
    expHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    expHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    expHeaderRow.height = 28;
    expHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

    expenses.forEach((e, idx) => {
      const row = expenseSheet.addRow({
        date: e.date ? new Date(e.date).toLocaleDateString() : 'N/A',
        category: e.category,
        description: e.description,
        method: e.paymentMethod || 'Bank Transfer',
        ref: e.referenceId || 'N/A',
        amount: e.amount || 0
      });
      row.height = 20;
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(6).alignment = { horizontal: 'right' };
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F2' } };
      }
    });

    // Bottom Totals Row for Expenses
    const expTotalRow = expenseSheet.addRow([
      'TOTAL EXPENSES',
      '',
      '',
      '',
      `${expenses.length} Records`,
      summary.totalExpenses
    ]);
    expTotalRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    expTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    expTotalRow.height = 24;
    expTotalRow.getCell(6).numFmt = '#,##0.00';
    expTotalRow.getCell(6).alignment = { horizontal: 'right' };

    // Format & Stream
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MegaTrix_Accounts_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Generates a sleek, executive PDF dossier using PDFKit
   */
  async generatePdfReport({ periodLabel, summary, sales = [], expenses = [] }, res) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      bufferPages: true,
      info: {
        Title: `MegaTrix Financial Report — ${periodLabel}`,
        Author: 'MegaTrix Technologies',
        Subject: 'Executive Accounts P&L Dossier'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MegaTrix_Financial_Dossier_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf"`);
    doc.pipe(res);

    const formatPKR = (num) => `PKR ${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // ─── COVER / HEADER BANNER ───────────────────────────────────────────
    doc.rect(36, 36, 523, 75).fill('#090D16');

    doc.fillColor('#3B82F6').fontSize(8.5).font('Helvetica-Bold')
      .text('MEGATRIX TECHNOLOGIES  •  EXECUTIVE FINANCIAL & ACCOUNTS REPORT', 50, 48, { characterSpacing: 1.2 });

    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text('Profit & Loss (P&L) Statement', 50, 63);

    const metaStr = `Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}   |   Author: Super Administrator`;
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
      .text(metaStr, 50, 86);

    // ─── EXECUTIVE METRICS SUMMARY BAR ──────────────────────────────────
    let yPos = 125;
    doc.rect(36, yPos, 523, 50).fill('#F8FAFC').stroke('#CBD5E1');

    const metrics = [
      { label: 'TOTAL SALES', value: formatPKR(summary.totalSales), color: '#059669' },
      { label: 'TOTAL EXPENSES', value: formatPKR(summary.totalExpenses), color: '#DC2626' },
      { label: 'NET PROFIT', value: formatPKR(summary.netProfit), color: summary.netProfit >= 0 ? '#059669' : '#DC2626' },
      { label: 'NET MARGIN', value: `${summary.profitMargin}%`, color: '#2563EB' },
      { label: 'DEALS WON', value: `${summary.salesCount}`, color: '#0F172A' }
    ];

    const colWidth = 523 / metrics.length;
    metrics.forEach((m, idx) => {
      const colX = 36 + idx * colWidth;
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold')
        .text(m.label, colX + 4, yPos + 10, { width: colWidth - 8, align: 'center' });
      doc.fillColor(m.color).fontSize(10.5).font('Helvetica-Bold')
        .text(m.value, colX + 4, yPos + 26, { width: colWidth - 8, align: 'center' });
    });

    yPos += 70;

    // ─── EXPENSE CATEGORY BREAKDOWN ─────────────────────────────────────
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold')
      .text('EXPENSE CATEGORY DISTRIBUTION', 36, yPos);
    yPos += 16;

    doc.rect(36, yPos, 523, 20).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      .text('CATEGORY', 44, yPos + 6)
      .text('RECORDS', 260, yPos + 6, { width: 60, align: 'center' })
      .text('TOTAL AMOUNT (PKR)', 340, yPos + 6, { width: 110, align: 'right' })
      .text('SHARE %', 460, yPos + 6, { width: 90, align: 'right' });
    yPos += 20;

    (summary.expensesByCategory || []).forEach((cat, idx) => {
      const fill = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, yPos, 523, 18).fill(fill);
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica')
        .text(cat.category, 44, yPos + 5)
        .text(`${cat.count || 1}`, 260, yPos + 5, { width: 60, align: 'center' })
        .text(formatPKR(cat.amount), 340, yPos + 5, { width: 110, align: 'right' })
        .text(summary.totalExpenses > 0 ? `${((cat.amount / summary.totalExpenses) * 100).toFixed(1)}%` : '0%', 460, yPos + 5, { width: 90, align: 'right' });
      yPos += 18;
    });

    yPos += 20;

    // ─── RECENT CLOSED SALES TABLE ──────────────────────────────────────
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold')
      .text(`CLOSED SALES & CLIENT ACQUISITIONS (Showing ${Math.min(sales.length, 12)} of ${sales.length})`, 36, yPos);
    yPos += 16;

    doc.rect(36, yPos, 523, 20).fill('#1E3A8A');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      .text('DATE', 44, yPos + 6)
      .text('CLIENT / BUSINESS', 105, yPos + 6)
      .text('INDUSTRY', 250, yPos + 6)
      .text('CLOSED BY', 350, yPos + 6)
      .text('DEAL VALUE', 450, yPos + 6, { width: 100, align: 'right' });
    yPos += 20;

    const displaySales = sales.slice(0, 12);
    displaySales.forEach((s, idx) => {
      const fill = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, yPos, 523, 18).fill(fill);
      doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica')
        .text(s.date ? new Date(s.date).toLocaleDateString() : 'N/A', 44, yPos + 5)
        .text(s.businessName || 'Client', 105, yPos + 5, { width: 140, ellipsis: true })
        .text(s.category || 'General', 250, yPos + 5, { width: 95, ellipsis: true })
        .text(s.extractedByName || 'Sales Desk', 350, yPos + 5, { width: 95, ellipsis: true })
        .text(formatPKR(s.dealValue), 450, yPos + 5, { width: 100, align: 'right' });
      yPos += 18;
    });

    if (displaySales.length === 0) {
      doc.rect(36, yPos, 523, 20).fill('#FFFFFF');
      doc.fillColor('#64748B').fontSize(8).font('Helvetica-Oblique')
        .text('No sales recorded in this period.', 44, yPos + 6);
      yPos += 20;
    }

    // ─── FOOTER ─────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(36, 780, 523, 20).fill('#090D16');
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
        .text('MegaTrix LeadEngine & CRM • Confidential Financial Dossier • For Super Admin Eyes Only', 44, 786)
        .text(`Page ${i + 1} of ${range.count}`, 490, 786, { align: 'right', width: 60 });
    }

    doc.end();
  }
}

module.exports = new AccountReportService();
