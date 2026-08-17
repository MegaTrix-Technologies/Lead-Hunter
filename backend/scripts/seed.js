require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const EmailTemplate = require('../models/EmailTemplate');
const seedLeads = require('../data/seedData');

const seedDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadhunter';
    console.log(`[Seed Script] Connecting to MongoDB: ${uri.replace(/\/\/.*@/, '//<redacted>@')}`);
    
    await mongoose.connect(uri);
    console.log('[Seed Script] Connected to MongoDB.');

    // Seed Leads
    for (const leadData of seedLeads) {
      await Lead.findOneAndUpdate(
        { placeId: leadData.placeId },
        leadData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[Seed Script] Seeded ${seedLeads.length} initial leads into database.`);

    // Seed Templates
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
      }
    ];

    for (const tpl of defaultTemplates) {
      await EmailTemplate.findOneAndUpdate(
        { name: tpl.name },
        tpl,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('[Seed Script] Seeded default email templates.');

    console.log('[Seed Script] Database successfully seeded with MegaTrix initial data.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Script] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
