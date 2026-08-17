const EmailTemplate = require('../models/EmailTemplate');
const emailQueueService = require('../services/emailQueueService');

/**
 * Get all email templates
 */
exports.getTemplates = async (req, res) => {
  try {
    let templates = await EmailTemplate.find().sort({ createdAt: -1 });
    
    // If no templates exist yet, seed default high-converting templates
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          name: 'Website Modernization & SEO Audit',
          subject: 'Quick question regarding {{businessName}} website & Google listing',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #f4f4f5; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
  <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">MegaTrix Digital Growth Audit</h2>
  <p>Hi team at <strong>{{businessName}}</strong>,</p>
  <p>We recently analyzed local search rankings for <strong>{{category}}</strong> in <strong>{{area}}</strong> and noticed an immediate growth opportunity for your brand.</p>
  <div style="background-color: #18181b; padding: 16px; border-left: 3px solid #3b82f6; margin: 16px 0;">
    <p style="margin: 0; color: #a1a1aa; font-size: 14px;"><strong>Target Profile:</strong> {{businessName}}</p>
    <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 14px;"><strong>Reputation Status:</strong> {{rating}}</p>
    <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 14px;"><strong>Digital Footprint:</strong> {{website}}</p>
  </div>
  <p>We build automated client acquisition pipelines tailored specifically for {{category}} providers in {{area}}.</p>
  <p>Would you have 5 minutes this week for a brief walkthrough of how we can boost your inbound high-intent leads?</p>
  <p style="margin-top: 24px;">Best regards,<br/><strong>MegaTrix Growth Team</strong><br/><span style="color: #71717a; font-size: 12px;">Automated via MegaTrix LeadEngine</span></p>
</div>`,
          category: 'Web Design & SEO',
          isDefault: true
        },
        {
          name: 'Google Reviews & Reputation Accelerator',
          subject: 'Accelerating 5-Star Reviews for {{businessName}} in {{area}}',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #f4f4f5; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
  <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Reputation Growth Briefing</h2>
  <p>Hello <strong>{{businessName}}</strong> Leadership,</p>
  <p>Your current Google score is <strong>{{rating}}</strong>. In {{area}}, businesses that cross the 4.7+ review threshold capture up to <strong>3.2x more inbound phone calls</strong>.</p>
  <p>Our autonomous review generation engine helps leading {{category}} businesses turn satisfied customers into 5-star Google reviews on autopilot.</p>
  <p>Can we send you a 60-second video demo showing how it works?</p>
  <p style="margin-top: 24px;">Warmly,<br/><strong>MegaTrix Reputation Specialists</strong></p>
</div>`,
          category: 'Reputation',
          isDefault: false
        },
        {
          name: 'Direct Cold Calling Follow-Up Deck',
          subject: 'Following up on our conversation with {{businessName}}',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #f4f4f5; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
  <p>Hi <strong>{{businessName}}</strong> Team,</p>
  <p>Thank you for connecting with our outbound desk regarding your growth initiatives in <strong>{{area}}</strong>.</p>
  <p>As discussed, here is our full B2B lead generation and client acquisition deck customized for {{category}}.</p>
  <p>Let us know if you'd like to schedule a deep dive call next Tuesday or Thursday.</p>
  <p style="margin-top: 24px;">Best regards,<br/><strong>MegaTrix Client Success</strong></p>
</div>`,
          category: 'Follow Up',
          isDefault: false
        }
      ];

      templates = await EmailTemplate.insertMany(defaultTemplates);
    }

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create custom email template
 */
exports.createTemplate = async (req, res) => {
  try {
    const { name, subject, bodyHtml, category, isDefault } = req.body;

    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ success: false, message: 'Template name, subject, and body HTML are required.' });
    }

    if (isDefault) {
      await EmailTemplate.updateMany({}, { isDefault: false });
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      bodyHtml,
      category: category || 'Custom',
      isDefault: Boolean(isDefault)
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update email template
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { name, subject, bodyHtml, category, isDefault } = req.body;
    
    if (isDefault) {
      await EmailTemplate.updateMany({}, { isDefault: false });
    }

    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      { name, subject, bodyHtml, category, isDefault },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete email template
 */
exports.deleteTemplate = async (req, res) => {
  try {
    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Launch bulk email campaign
 */
exports.launchCampaign = async (req, res) => {
  try {
    const { leadIds, templateId, customSubject, customBody, sendDelayMs } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one lead for proposal dispatch.' });
    }

    const report = await emailQueueService.processCampaign({
      leadIds,
      templateId,
      customSubject,
      customBody,
      sendDelayMs: parseInt(sendDelayMs, 10) || 350
    });

    res.json({
      success: true,
      message: 'Campaign initialized in rate-limited queue.',
      data: report
    });
  } catch (error) {
    console.error('[Email Controller] launchCampaign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get active campaign status/report
 */
exports.getActiveReport = (req, res) => {
  const report = emailQueueService.getActiveReport();
  res.json({ success: true, isProcessing: emailQueueService.isProcessing, data: report });
};
