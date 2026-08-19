const Lead = require('../models/Lead');
const EmailTemplate = require('../models/EmailTemplate');
const nodemailer = require('nodemailer');
const EventEmitter = require('events');

class EmailQueueService extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.activeJob = null;
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465, // true for 465, false for 587/25
          auth: {
            user,
            pass
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log(`[MegaTrix Email] Real SMTP Transport connected via ${host}:${port} (${user})`);
      } catch (err) {
        console.error('[MegaTrix Email] Failed to initialize SMTP transport:', err.message);
        this.transporter = null;
      }
    } else {
      console.log('[MegaTrix Email] Running in Simulated/Direct Dispatch Mode (No SMTP credentials configured).');
    }
  }

  /**
   * Replaces merge tags with actual lead data
   */
  interpolate(templateStr, lead) {
    if (!templateStr) return '';
    return templateStr
      .replace(/{{\s*businessName\s*}}/gi, lead.businessName || 'Valued Business')
      .replace(/{{\s*phone\s*}}/gi, lead.phoneNumber || 'N/A')
      .replace(/{{\s*rating\s*}}/gi, lead.rating ? `⭐ ${lead.rating} (${lead.reviewCount || 0} reviews)` : 'Unrated')
      .replace(/{{\s*area\s*}}/gi, lead.area || 'your area')
      .replace(/{{\s*category\s*}}/gi, lead.category || 'Industry Specialist')
      .replace(/{{\s*website\s*}}/gi, lead.website || 'No website registered')
      .replace(/{{\s*email\s*}}/gi, lead.email || '');
  }

  /**
   * Validates email syntax
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  /**
   * Processes a bulk email proposal campaign
   */
  async processCampaign({ leadIds, templateId, customSubject, customBody, sendDelayMs = 500 }) {
    if (this.isProcessing) {
      throw new Error('A campaign is currently actively processing in the queue.');
    }

    let template = null;
    if (templateId) {
      template = await EmailTemplate.findById(templateId);
    }

    const rawSubject = customSubject || (template ? template.subject : 'Growth & Visibility Proposal for {{businessName}}');
    const rawBody = customBody || (template ? template.bodyHtml : '<p>Hello {{businessName}},</p><p>We analyzed your market presence in {{area}} and prepared a tailored proposal.</p>');

    const leads = await Lead.find({ _id: { $in: leadIds } });
    if (!leads || leads.length === 0) {
      throw new Error('No valid leads selected for proposal dispatch.');
    }

    this.isProcessing = true;
    const report = {
      jobId: `job_${Date.now()}`,
      startTime: new Date(),
      totalQueued: leads.length,
      successfullySent: 0,
      droppedBounced: 0,
      spamFiltered: 0,
      invalidEmailAddresses: 0,
      safetyCappedBlocked: 0,
      logs: [],
      completed: false
    };

    this.activeJob = report;

    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'sales@megatrixai.com';
    const fromName = process.env.FROM_NAME || 'MegaTrix Technologies';
    const replyToAddress = process.env.REPLY_TO || 'sales@megatrixai.com';

    // Run async batch worker
    (async () => {
      try {
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          const logEntry = {
            index: i + 1,
            leadId: lead._id,
            businessName: lead.businessName,
            email: lead.email,
            timestamp: new Date()
          };

          // 1. Check Previous Delivery: If emailSentCount > 0, skip sending again to prevent duplicate emails!
          if (lead.emailSentCount && lead.emailSentCount > 0) {
            report.safetyCappedBlocked++;
            logEntry.status = 'already_sent';
            logEntry.reason = `Proposal already sent previously on ${lead.lastEmailedAt ? new Date(lead.lastEmailedAt).toLocaleDateString() : 'earlier run'}. Skipped to prevent duplicates.`;
            report.logs.push(logEntry);
            this.emit('progress', { progress: Math.round(((i + 1) / leads.length) * 100), report, current: logEntry });
            await new Promise(r => setTimeout(r, 100));
            continue;
          }

          // 2. Validate email format
          if (!this.isValidEmail(lead.email)) {
            report.invalidEmailAddresses++;
            logEntry.status = 'invalid';
            logEntry.reason = `Invalid email address format: "${lead.email || 'EMPTY'}"`;
            report.logs.push(logEntry);
            this.emit('progress', { progress: Math.round(((i + 1) / leads.length) * 100), report, current: logEntry });
            await new Promise(r => setTimeout(r, 100));
            continue;
          }

          // 3. Interpolate merge tags
          const personalizedSubject = this.interpolate(rawSubject, lead);
          const personalizedHtml = this.interpolate(rawBody, lead);

          // 4. Rate-limiting interval
          await new Promise(r => setTimeout(r, sendDelayMs));

          let dispatchStatus = 'sent';

          // 5. LIVE SMTP TRANSMISSION (Brevo / Zoho / Custom SMTP)
          if (this.transporter) {
            try {
              const mailOptions = {
                from: `"${fromName}" <${fromAddress}>`,
                to: lead.email.trim(),
                replyTo: replyToAddress,
                subject: personalizedSubject,
                html: personalizedHtml
              };

              const info = await this.transporter.sendMail(mailOptions);
              dispatchStatus = 'sent';
              report.successfullySent++;
              logEntry.status = 'sent';
              logEntry.subject = personalizedSubject;
              logEntry.reason = `Delivered via SMTP (${info.messageId || 'OK'}) • Replies route to ${replyToAddress}`;
            } catch (smtpErr) {
              console.error(`[MegaTrix Email] SMTP error for "${lead.email}":`, smtpErr.message);
              dispatchStatus = 'bounced';
              report.droppedBounced++;
              logEntry.status = 'bounced';
              logEntry.reason = `SMTP Transmission Error: ${smtpErr.message}`;
            }
          } else {
            // Simulated fallback mode when no SMTP credentials are in .env
            const randomFactor = Math.random();
            if (randomFactor < 0.03) {
              dispatchStatus = 'bounced';
              report.droppedBounced++;
              logEntry.status = 'bounced';
              logEntry.reason = 'Simulated: Mailbox unavailable / SMTP 550 recipient rejected';
            } else {
              dispatchStatus = 'sent';
              report.successfullySent++;
              logEntry.status = 'sent';
              logEntry.subject = personalizedSubject;
              logEntry.reason = `Simulated: Dispatched successfully (Configure Brevo/Zoho in .env for live sending)`;
            }
          }

          // 6. Update Lead record in MongoDB
          await Lead.findByIdAndUpdate(lead._id, {
            $inc: { emailSentCount: dispatchStatus === 'sent' ? 1 : 0 },
            $push: {
              emailHistory: {
                sentAt: new Date(),
                status: dispatchStatus,
                templateId: template ? template._id.toString() : 'custom',
                templateName: template ? template.name : 'Custom Proposal',
                subject: personalizedSubject
              }
            },
            lastEmailedAt: new Date()
          });

          report.logs.push(logEntry);
          this.emit('progress', { progress: Math.round(((i + 1) / leads.length) * 100), report, current: logEntry });
        }
      } catch (err) {
        console.error('[MegaTrix Email] Error during campaign dispatch:', err);
      } finally {
        report.completed = true;
        report.endTime = new Date();
        this.isProcessing = false;
        this.emit('completed', report);
      }
    })();

    return report;
  }

  getActiveReport() {
    return this.activeJob;
  }
}

module.exports = new EmailQueueService();
