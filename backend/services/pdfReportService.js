const PDFDocument = require('pdfkit');
const axios = require('axios');

class PdfReportService {
  /**
   * Generates a high-graphic, executive PDF dossier for a dataset
   */
  async generateDatasetPdf(dataset, leads, res) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: `MegaTrix Dossier — ${dataset.name}`,
        Author: 'MegaTrix Technologies',
        Subject: 'Executive B2B Lead Intelligence Report'
      }
    });

    // Stream PDF directly to HTTP response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_dossier.pdf"`);
    doc.pipe(res);

    const primaryColor = '#111827';
    const accentColor = '#2563EB';
    const darkBg = '#0B0F19';
    const cardBg = '#F3F4F6';
    const textDark = '#1F2937';
    const textMuted = '#4B5563';

    // ─── COVER / HEADER BANNER ───────────────────────────────────────────
    doc.rect(40, 40, 515, 80).fill('#090D16');

    // MegaTrix Brand tag
    doc.fillColor('#3B82F6').fontSize(9).font('Helvetica-Bold')
      .text('MEGATRIX LEADENGINE  •  B2B INTELLIGENCE DOSSIER', 55, 52, { characterSpacing: 1.5 });

    // Dataset Name
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text(dataset.name, 55, 68, { width: 485, ellipsis: true });

    // Meta details
    const metaStr = `Niche: ${dataset.keyword}  |  Market: ${dataset.area}  |  Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    doc.fillColor('#9CA3AF').fontSize(8.5).font('Helvetica')
      .text(metaStr, 55, 92);

    doc.moveDown(3);

    // ─── EXECUTIVE METRICS SUMMARY BAR ──────────────────────────────────
    let yPos = 135;
    doc.rect(40, yPos, 515, 45).fill('#F8FAFC').stroke('#E2E8F0');

    const metrics = [
      { label: 'TOTAL PROFILES', value: `${leads.length}` },
      { label: 'UNCONTACTED', value: `${leads.filter(l => l.callStatus === 'Uncontacted').length}` },
      { label: 'UNREACHABLE', value: `${leads.filter(l => l.callStatus === 'Unreachable').length}` },
      { label: 'IN PIPELINE', value: `${leads.filter(l => ['Shows Interest', 'Follow Up', 'Lead / Sale'].includes(l.callStatus)).length}` },
      { label: 'DEALS WON', value: `${leads.filter(l => l.callStatus === 'Lead / Sale').length}` }
    ];

    const colWidth = 515 / metrics.length;
    metrics.forEach((m, idx) => {
      const colX = 40 + idx * colWidth;
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold')
        .text(m.label, colX + 8, yPos + 10, { width: colWidth - 16, align: 'center' });
      doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold')
        .text(m.value, colX + 8, yPos + 24, { width: colWidth - 16, align: 'center' });
    });

    yPos += 60;

    // ─── LEAD PROFILES LISTING ──────────────────────────────────────────
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold')
      .text(`QUALIFIED PROFILES (${leads.length})`, 40, yPos);
    yPos += 18;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const cardHeight = 100;

      // Check for page break
      if (yPos + cardHeight > 760) {
        doc.addPage();
        yPos = 45;
      }

      // Card Background & Border
      doc.rect(40, yPos, 515, cardHeight).fill('#FFFFFF').stroke('#E5E7EB');

      // Left Accent Strip
      const statusColors = {
        'Lead / Sale': '#10B981',
        'Shows Interest': '#3B82F6',
        'Follow Up': '#F59E0B',
        'Unreachable': '#F97316',
        'Do Not Call': '#EF4444',
        'IVR': '#8B5CF6',
        'Receptionist': '#D97706',
        'Uncontacted': '#6B7280'
      };
      const statusColor = statusColors[lead.callStatus] || '#6B7280';
      doc.rect(40, yPos, 4, cardHeight).fill(statusColor);

      // Business Name
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold')
        .text(`${i + 1}. ${lead.businessName}`, 55, yPos + 10, { width: 330, ellipsis: true });

      // Category / Niche Badge
      doc.fillColor('#6B7280').fontSize(8).font('Helvetica')
        .text(`[ ${lead.category || dataset.keyword} ]`, 55, yPos + 24);

      // Rating & Reviews
      const starRating = lead.rating ? `⭐ ${lead.rating.toFixed(1)} (${lead.reviewCount || 0} reviews)` : 'No rating yet';
      doc.fillColor('#D97706').fontSize(8.5).font('Helvetica-Bold')
        .text(starRating, 55, yPos + 37);

      // Phone & Website
      const phoneText = lead.phoneNumber ? `📞 ${lead.phoneNumber}` : '📞 No phone listed';
      const webText = lead.website ? `🌐 ${lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '🌐 No website';
      doc.fillColor('#2563EB').fontSize(8.5).font('Helvetica-Bold')
        .text(phoneText, 55, yPos + 52, { width: 170, ellipsis: true });
      doc.fillColor('#4B5563').fontSize(8).font('Helvetica')
        .text(webText, 235, yPos + 52, { width: 170, ellipsis: true });

      // Address
      const addressText = lead.address ? `📍 ${lead.address}` : `📍 ${lead.area}`;
      doc.fillColor('#6B7280').fontSize(8).font('Helvetica')
        .text(addressText, 55, yPos + 67, { width: 350, ellipsis: true });

      // Status Pill (Right Corner)
      doc.rect(410, yPos + 10, 135, 22).fill(statusColor);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
        .text(lead.callStatus.toUpperCase(), 410, yPos + 16, { width: 135, align: 'center' });

      // Follow-up or Notes indicator
      if (lead.followUpDate) {
        doc.fillColor('#92400E').fontSize(7.5).font('Helvetica')
          .text(`Follow-up: ${new Date(lead.followUpDate).toLocaleString()}`, 410, yPos + 38, { width: 135, align: 'right' });
      } else if (lead.callNotes && lead.callNotes.length > 0) {
        const lastNote = lead.callNotes[lead.callNotes.length - 1].note;
        doc.fillColor('#6B7280').fontSize(7.5).font('Helvetica-Oblique')
          .text(`"${lastNote.substring(0, 45)}..."`, 410, yPos + 52, { width: 135, align: 'right' });
      }

      yPos += cardHeight + 12;
    }

    // ─── FOOTER ON EACH PAGE ───────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      doc.fillColor('#9CA3AF').fontSize(7.5).font('Helvetica')
        .text(
          `MegaTrix LeadEngine & CRM  •  Confidential Intelligence Dossier  •  Page ${p + 1} of ${range.count}`,
          40,
          800,
          { align: 'center', width: 515 }
        );
    }

    doc.end();
  }
}

module.exports = new PdfReportService();
