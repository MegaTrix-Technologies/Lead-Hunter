const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Sanitize strings to remove non-ASCII bytes and mojibake glyphs
 */
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[^\x20-\x7E\t\n\r]/g, '') // remove non-ASCII / emojis
    .replace(/\s+/g, ' ')
    .trim();
}

class PdfReportService {
  /**
   * Generates a sleek, black-themed (MegaTrix CRM) executive PDF dossier for a dataset
   */
  async generateDatasetPdf(dataset, leads, res, user = null) {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 25, bottom: 20, left: 25, right: 25 },
      bufferPages: true,
      info: {
        Title: `MegaTrix CRM Dossier — ${sanitizeText(dataset.name)}`,
        Author: 'MegaTrix Technologies',
        Subject: 'B2B Market Intelligence & Lead Dossier'
      }
    });

    // Stream PDF directly to HTTP response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_dossier.pdf"`);
    doc.pipe(res);

    // Resolve Logo Path
    const possibleLogoPaths = [
      path.join(__dirname, '../../frontend/public/Mega AI logo.png'),
      path.join(__dirname, '../../frontend/src/assets/Mega AI logo.png'),
      'd:/MegaTrix/leadhunter/frontend/public/Mega AI logo.png'
    ];
    let resolvedLogoPath = null;
    for (const p of possibleLogoPaths) {
      if (fs.existsSync(p)) {
        resolvedLogoPath = p;
        break;
      }
    }

    // User & Role Resolution
    const operatorName = sanitizeText(user?.name || dataset.createdByName || 'Super Admin');
    const rawRole = user?.role || 'superadmin';
    const roleDisplay = rawRole === 'superadmin' ? 'Super Administrator' :
                        rawRole === 'closer' ? 'Executive Deal Closer' :
                        rawRole === 'agent' ? 'Sales & Operations Agent' : 'Platform Specialist';

    // ─── HELPER: Draw Pitch-Black Background & CRM Border on Every Page ─
    function drawPageBase() {
      // 1. Fill entire page with pitch black (#000000)
      doc.rect(0, 0, 595.28, 841.89).fill('#000000');

      // 2. Outer Industrial Frame (#1F1F23)
      doc.lineWidth(1.2).strokeColor('#1F1F23').rect(18, 18, 559.28, 805.89).stroke();

      // 3. Inner Subtle Border (#141418) with top neon blue accent line
      doc.lineWidth(0.8).strokeColor('#141418').rect(22, 22, 551.28, 797.89).stroke();

      // Top Neon Blue Accent Line
      doc.lineWidth(1.5).strokeColor('#2563EB').moveTo(22, 22).lineTo(573.28, 22).stroke();

      // Industrial Corner Accents (MegaTrix sharp styling)
      const corners = [
        [18, 18, 1, 1],
        [577.28, 18, -1, 1],
        [18, 823.89, 1, -1],
        [577.28, 823.89, -1, -1]
      ];
      corners.forEach(([cx, cy, dx, dy]) => {
        doc.lineWidth(1.5).strokeColor('#3B82F6');
        doc.moveTo(cx, cy).lineTo(cx + dx * 12, cy).stroke();
        doc.moveTo(cx, cy).lineTo(cx, cy + dy * 12).stroke();
      });
    }

    // Initial page base
    drawPageBase();

    // ─── TOP HEADER (MATCHING CRM NAVBAR & BRANDING) ────────────────────
    // Top Left: High Quality Logo (Aligned with brand text)
    if (resolvedLogoPath) {
      try {
        doc.image(resolvedLogoPath, 34, 28, { width: 58 });
      } catch (e) {
        doc.rect(34, 30, 58, 45).fill('#0B0B0E');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text('MEGATRIX', 38, 48);
      }
    }

    // Beside Logo: Brand Text (Perfect vertical alignment)
    doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
      .text('MEGATRIX TECHNOLOGIES', 104, 38, { characterSpacing: 1 });
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
      .text('Customer Relationship Manager & Intelligence Engine', 104, 54);
    doc.fillColor('#3B82F6').fontSize(7.5).font('Helvetica-Bold')
      .text('ENTERPRISE B2B RECONNAISSANCE DOSSIER', 104, 68, { characterSpacing: 0.8 });

    // Top Right: User & Role Credentials (No Dossier ID, No "Certified Dossier Issuance")
    doc.rect(365, 32, 195, 52).fill('#08080A').stroke('#222226');
    doc.lineWidth(1).strokeColor('#10B981').moveTo(365, 32).lineTo(365, 84).stroke(); // Emerald status strip

    doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold')
      .text('OPERATOR:', 375, 40);
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold')
      .text(operatorName, 430, 39, { width: 125, ellipsis: true });

    doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold')
      .text('ROLE / RANK:', 375, 52);
    doc.fillColor('#38BDF8').fontSize(7.5).font('Helvetica-Bold')
      .text(roleDisplay, 430, 51, { width: 125, ellipsis: true });

    doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold')
      .text('DATE:', 375, 64);
    doc.fillColor('#10B981').fontSize(7).font('Helvetica-Bold')
      .text(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 430, 64);

    // ─── DATASET TITLE BANNER (DARK INDUSTRIAL CARD) ────────────────────
    let yPos = 94;
    doc.rect(34, yPos, 527, 38).fill('#0B0B0E').stroke('#222226');
    doc.lineWidth(1.5).strokeColor('#3B82F6').moveTo(34, yPos + 38).lineTo(561, yPos + 38).stroke();

    doc.fillColor('#60A5FA').fontSize(6.5).font('Helvetica-Bold')
      .text('ACTIVE B2B DATASET DOSSIER', 44, yPos + 6, { characterSpacing: 1.2 });
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
      .text(sanitizeText(dataset.name), 44, yPos + 17, { width: 507, ellipsis: true });

    yPos += 46;

    // ─── DATASET METADATA & KPI STRIP (PITCH BLACK & ZINC) ──────────────
    doc.rect(34, yPos, 527, 40).fill('#060608').stroke('#1E1E22');

    const uncontactedCount = leads.filter(l => l.callStatus === 'Uncontacted').length;
    const followUpCount = leads.filter(l => ['Follow Up', 'Closer Follow Up'].includes(l.callStatus)).length;
    const dealsWonCount = leads.filter(l => l.callStatus === 'sale').length;

    const metrics = [
      { label: 'TOTAL PROFILES', value: `${leads.length}`, color: '#FFFFFF' },
      { label: 'UNCONTACTED', value: `${uncontactedCount}`, color: '#94A3B8' },
      { label: 'FOLLOW-UPS', value: `${followUpCount}`, color: '#FBBF24' },
      { label: 'DEALS WON', value: `${dealsWonCount}`, color: '#34D399' },
      { label: 'TARGET NICHE', value: `${sanitizeText(dataset.keyword)}`, color: '#60A5FA' }
    ];

    const colW = 527 / metrics.length;
    metrics.forEach((m, idx) => {
      const colX = 34 + idx * colW;
      if (idx > 0) {
        doc.lineWidth(0.5).strokeColor('#1F1F24').moveTo(colX, yPos + 5).lineTo(colX, yPos + 35).stroke();
      }
      doc.fillColor('#71717A').fontSize(6.5).font('Helvetica-Bold')
        .text(m.label, colX + 4, yPos + 7, { width: colW - 8, align: 'center' });
      doc.fillColor(m.color).fontSize(10.5).font('Helvetica-Bold')
        .text(m.value, colX + 4, yPos + 19, { width: colW - 8, align: 'center', ellipsis: true });
    });

    yPos += 48;

    // ─── PROFILES SECTION HEADER ────────────────────────────────────────
    doc.fillColor('#FFFFFF').fontSize(9.5).font('Helvetica-Bold')
      .text(`VERIFIED PROFILES & CONTACT DIRECTORY (${leads.length})`, 34, yPos, { characterSpacing: 0.5 });
    yPos += 16;

    // ─── PROFILE CARDS (EXACT SAME DARK PALETTE AS CRM) ─────────────────
    const statusStyles = {
      'sale':            { bg: '#064E3B', border: '#059669', text: '#34D399', label: 'DEAL WON' },
      'Lead':            { bg: '#1E3A8A', border: '#2563EB', text: '#93C5FD', label: 'LEAD / CLOSER' },
      'Lead / Sale':     { bg: '#064E3B', border: '#059669', text: '#34D399', label: 'DEAL WON' },
      'Shows Interest':   { bg: '#1E3A8A', border: '#3B82F6', text: '#60A5FA', label: 'SHOWS INTEREST' },
      'Follow Up':       { bg: '#451A03', border: '#D97706', text: '#FBBF24', label: 'FOLLOW UP' },
      'Closer Follow Up':{ bg: '#451A03', border: '#D97706', text: '#FBBF24', label: 'CLOSER FOLLOW UP' },
      'Unreachable':     { bg: '#431407', border: '#EA580C', text: '#FB923C', label: 'UNREACHABLE' },
      'Do Not Call':     { bg: '#450A0A', border: '#DC2626', text: '#F87171', label: 'DO NOT CALL' },
      'IVR':             { bg: '#2E1065', border: '#7C3AED', text: '#C084FC', label: 'IVR' },
      'Receptionist':    { bg: '#361E04', border: '#CA8A04', text: '#FDE047', label: 'RECEPTIONIST' },
      'Uncontacted':     { bg: '#18181B', border: '#3F3F46', text: '#A1A1AA', label: 'UNCONTACTED' }
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const hasAttribution = lead.callStatus === 'sale';
      const hasFollowUp = Boolean(lead.followUpDate);
      const cardHeight = hasAttribution ? 90 : (hasFollowUp ? 84 : 76);

      // Page Break Guard
      if (yPos + cardHeight > 780) {
        doc.addPage();
        drawPageBase();
        yPos = 38;
      }

      const st = statusStyles[lead.callStatus] || statusStyles['Uncontacted'];

      // Card Dark Background Box (#08080A with #1E1E22 border)
      doc.rect(34, yPos, 527, cardHeight).fill('#08080A').stroke('#1E1E22');

      // Left Accent Disposition Strip
      doc.rect(34, yPos, 3.5, cardHeight).fill(st.border);

      // Row 1: Business Name
      const bName = `${i + 1}. ${sanitizeText(lead.businessName)}`;
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
        .text(bName, 46, yPos + 8, { width: 360, ellipsis: true });

      // Status Pill (Right Corner)
      doc.rect(420, yPos + 7, 130, 16).fill(st.bg).stroke(st.border);
      doc.fillColor(st.text).fontSize(7.5).font('Helvetica-Bold')
        .text(st.label, 420, yPos + 11, { width: 130, align: 'center' });

      // Row 2: Niche Tag & Rating
      const categoryTag = `[ NICHE: ${sanitizeText(lead.category || dataset.keyword).toUpperCase()} ]`;
      doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold')
        .text(categoryTag, 46, yPos + 22);

      const ratingStr = lead.rating > 0 
        ? `RATING: ${lead.rating.toFixed(1)} / 5.0 (${lead.reviewCount || 0} reviews)`
        : 'RATING: Unrated';
      doc.fillColor('#F59E0B').fontSize(7.5).font('Helvetica-Bold')
        .text(ratingStr, 195, yPos + 22);

      // Row 3: Phone & Website
      const isDNC = lead.callStatus === 'Do Not Call';
      const phoneDisplay = isDNC
        ? '[DO NOT CALL - OPT-OUT]'
        : (lead.phoneNumber ? sanitizeText(lead.phoneNumber) : 'No Phone Listed');
      
      doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold').text('TEL:', 46, yPos + 35);
      doc.fillColor(isDNC ? '#F87171' : '#38BDF8').fontSize(8).font('Helvetica-Bold')
        .text(phoneDisplay, 70, yPos + 34, { width: 160, ellipsis: true });

      const cleanWeb = lead.website 
        ? sanitizeText(lead.website.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].replace(/\/$/, ''))
        : 'No Website';
      doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold').text('WEB:', 255, yPos + 35);
      doc.fillColor('#A1A1AA').fontSize(7.5).font('Helvetica')
        .text(cleanWeb, 282, yPos + 35, { width: 268, height: 11, ellipsis: true, lineBreak: false });

      // Row 4: Address
      const addressDisplay = sanitizeText(lead.address || dataset.area);
      doc.fillColor('#71717A').fontSize(7).font('Helvetica-Bold').text('LOC:', 46, yPos + 48);
      doc.fillColor('#A1A1AA').fontSize(7.5).font('Helvetica')
        .text(addressDisplay, 70, yPos + 48, { width: 480, ellipsis: true });

      // Row 5: Conditional Attribution or Follow-up Ribbon
      if (hasAttribution) {
        doc.rect(46, yPos + 63, 504, 20).fill('#064E3B').stroke('#059669');
        doc.fillColor('#34D399').fontSize(7).font('Helvetica-Bold')
          .text(`VERIFIED CLIENT: Lead Generated by ${sanitizeText(lead.generatedByName || 'Sales Agent')} • Closed by ${sanitizeText(lead.closerName || 'Executive Closer')}`, 52, yPos + 69, { width: 492, ellipsis: true });
      } else if (hasFollowUp) {
        doc.rect(46, yPos + 63, 504, 16).fill('#451A03').stroke('#B45309');
        doc.fillColor('#FBBF24').fontSize(7).font('Helvetica-Bold')
          .text(`CALLBACK SCHEDULED: ${new Date(lead.followUpDate).toLocaleString()}`, 52, yPos + 67, { width: 492, ellipsis: true });
      }

      yPos += cardHeight + 8;
    }

    // ─── FOOTER (Applied to all pages) ──────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      doc.fillColor('#52525B').fontSize(6.5).font('Helvetica')
        .text(
          `MEGATRIX LEADENGINE™ • OPERATOR: ${operatorName.toUpperCase()} (${roleDisplay.toUpperCase()}) • PAGE ${p + 1} OF ${range.count}`,
          34,
          788,
          { align: 'center', width: 527, lineBreak: false }
        );
    }

    doc.end();
  }
}

module.exports = new PdfReportService();
