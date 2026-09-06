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
    const kpiHeaderRow = summarySheet.addRow(['ACCOUNTING METRIC', 'AMOUNT (PKR)', 'RECORD COUNT', 'MARGIN / RATIO', 'ACCOUNTING BASIS']);
    kpiHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    kpiHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiHeaderRow.height = 26;

    const realizedInflow = summary.realizedSales !== undefined ? summary.realizedSales : summary.totalSales;
    const bookedTotal = summary.bookedSales !== undefined ? summary.bookedSales : summary.totalSales;
    const pendingBalance = summary.pendingReceivables || 0;
    const realizedProfit = summary.realizedNetProfit !== undefined ? summary.realizedNetProfit : summary.netProfit;
    const projectedProfit = summary.projectedNetProfit !== undefined ? summary.projectedNetProfit : summary.netProfit;

    // KPI Rows
    const salesRow = summarySheet.addRow(['Realized Sales Revenue (Cash Inflow)', realizedInflow, summary.salesCount, '100.0%', 'Cash Basis (In Bank)']);
    salesRow.getCell(2).numFmt = '#,##0.00';
    salesRow.getCell(2).font = { bold: true, color: { argb: 'FF059669' } };

    const bookedRow = summarySheet.addRow(['Gross Booked Sales (Contract Value)', bookedTotal, summary.salesCount, '—', 'Accrual Basis (Pipeline)']);
    bookedRow.getCell(2).numFmt = '#,##0.00';
    bookedRow.getCell(2).font = { bold: true, color: { argb: 'FF1E3A8A' } };

    const recvRow = summarySheet.addRow(['Accounts Receivable (Pending)', pendingBalance, summary.salesCount, bookedTotal > 0 ? `${((pendingBalance / bookedTotal) * 100).toFixed(1)}%` : '0%', 'Pending Collection']);
    recvRow.getCell(2).numFmt = '#,##0.00';
    recvRow.getCell(2).font = { bold: true, color: { argb: 'FFD97706' } };

    const expenseRow = summarySheet.addRow(['Total Operating Expenses', summary.totalExpenses, summary.expenseCount, realizedInflow > 0 ? `${((summary.totalExpenses / realizedInflow) * 100).toFixed(1)}%` : '0%', 'Operating Outflow']);
    expenseRow.getCell(2).numFmt = '#,##0.00';
    expenseRow.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };

    const netProfitRow = summarySheet.addRow(['Realized Net Profit (Cash Surplus)', realizedProfit, summary.salesCount + summary.expenseCount, `${summary.profitMargin}%`, realizedProfit >= 0 ? 'Surplus' : 'Deficit']);
    netProfitRow.getCell(2).numFmt = '#,##0.00';
    netProfitRow.getCell(2).font = { bold: true, color: realizedProfit >= 0 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
    netProfitRow.getCell(4).font = { bold: true };

    const projectedProfitRow = summarySheet.addRow(['Projected Net Profit (Full Contracts)', projectedProfit, summary.salesCount + summary.expenseCount, summary.projectedProfitMargin ? `${summary.projectedProfitMargin}%` : '—', projectedProfit >= 0 ? 'Projected Surplus' : 'Deficit']);
    projectedProfitRow.getCell(2).numFmt = '#,##0.00';
    projectedProfitRow.getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };

    summarySheet.addRow([]);

    // Category Breakdown Section
    summarySheet.mergeCells('A11:E11');
    const catHeaderCell = summarySheet.getCell('A11');
    catHeaderCell.value = 'OPERATIONAL EXPENSES BY CATEGORY';
    catHeaderCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    catHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    catHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    summarySheet.getRow(11).height = 24;

    const catSubHeaderRow = summarySheet.addRow(['CATEGORY', 'EXPENSE AMOUNT (PKR)', 'SHARE OF TOTAL EXPENSES', '', '']);
    catSubHeaderRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
    catSubHeaderRow.height = 20;

    let catStartRow = 13;
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
      { header: 'Products Sold', key: 'products', width: 32 },
      { header: 'Contract Value (PKR)', key: 'contract', width: 22 },
      { header: 'Cash Inflow (PKR)', key: 'inflow', width: 20 },
      { header: 'Pending Balance (PKR)', key: 'balance', width: 22 },
      { header: 'Status', key: 'status', width: 16 }
    ];

    const salesHeaderRow = salesSheet.getRow(1);
    salesHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    salesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    salesHeaderRow.height = 28;
    salesHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

    sales.forEach((s, idx) => {
      const prodsStr = (s.interestedProducts || []).map(p => `${p.name} (${p.finalPrice || p.basePrice})`).join(', ') || 'Direct Deal';
      const contractVal = s.dealValue || 0;
      const cashCollected = s.advanceAmount !== undefined ? s.advanceAmount : contractVal;
      const balance = s.remainingAmount !== undefined ? s.remainingAmount : (contractVal - cashCollected);

      const row = salesSheet.addRow({
        date: s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
        client: s.businessName || 'Unknown Client',
        category: s.category || 'General',
        area: s.area || 'Lahore',
        agent: s.extractedByName || 'Sales Desk',
        products: prodsStr,
        contract: contractVal,
        inflow: cashCollected,
        balance: balance,
        status: balance <= 0 ? 'Fully Paid' : 'Partial Advance'
      });
      row.height = 20;
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).numFmt = '#,##0.00';
      row.getCell(9).alignment = { horizontal: 'right' };
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    // Bottom Totals Row for Sales
    const salesTotalRow = salesSheet.addRow([
      'TOTAL SALES PIPELINE',
      '',
      '',
      '',
      '',
      `${sales.length} Deals Closed`,
      bookedTotal,
      realizedInflow,
      pendingBalance,
      ''
    ]);
    salesTotalRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    salesTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    salesTotalRow.height = 24;
    salesTotalRow.getCell(7).numFmt = '#,##0.00';
    salesTotalRow.getCell(7).alignment = { horizontal: 'right' };
    salesTotalRow.getCell(8).numFmt = '#,##0.00';
    salesTotalRow.getCell(8).alignment = { horizontal: 'right' };
    salesTotalRow.getCell(9).numFmt = '#,##0.00';
    salesTotalRow.getCell(9).alignment = { horizontal: 'right' };

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

    const realizedInflow = summary.realizedSales !== undefined ? summary.realizedSales : summary.totalSales;
    const bookedTotal = summary.bookedSales !== undefined ? summary.bookedSales : summary.totalSales;
    const pendingBalance = summary.pendingReceivables || 0;
    const realizedProfit = summary.realizedNetProfit !== undefined ? summary.realizedNetProfit : summary.netProfit;

    const metrics = [
      { label: 'REALIZED CASH', value: formatPKR(realizedInflow), color: '#059669' },
      { label: 'BOOKED SALES', value: formatPKR(bookedTotal), color: '#1E3A8A' },
      { label: 'TOTAL EXPENSES', value: formatPKR(summary.totalExpenses), color: '#DC2626' },
      { label: 'REALIZED PROFIT', value: formatPKR(realizedProfit), color: realizedProfit >= 0 ? '#059669' : '#DC2626' },
      { label: 'RECEIVABLES', value: formatPKR(pendingBalance), color: '#D97706' }
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
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
      .text('DATE', 42, yPos + 6)
      .text('CLIENT / BUSINESS', 98, yPos + 6)
      .text('INDUSTRY', 220, yPos + 6)
      .text('CONTRACT', 300, yPos + 6, { width: 75, align: 'right' })
      .text('CASH INFLOW', 380, yPos + 6, { width: 80, align: 'right' })
      .text('RECEIVABLE', 465, yPos + 6, { width: 85, align: 'right' });
    yPos += 20;

    const displaySales = sales.slice(0, 12);
    displaySales.forEach((s, idx) => {
      const fill = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const contractVal = s.dealValue || 0;
      const cashCollected = s.advanceAmount !== undefined ? s.advanceAmount : contractVal;
      const balance = s.remainingAmount !== undefined ? s.remainingAmount : (contractVal - cashCollected);

      doc.rect(36, yPos, 523, 18).fill(fill);
      doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica')
        .text(s.date ? new Date(s.date).toLocaleDateString() : 'N/A', 42, yPos + 5)
        .text(s.businessName || 'Client', 98, yPos + 5, { width: 118, ellipsis: true })
        .text(s.category || 'General', 220, yPos + 5, { width: 78, ellipsis: true })
        .text(formatPKR(contractVal), 300, yPos + 5, { width: 75, align: 'right' })
        .text(formatPKR(cashCollected), 380, yPos + 5, { width: 80, align: 'right' })
        .text(formatPKR(balance), 465, yPos + 5, { width: 85, align: 'right' });
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
