const Product = require('../models/Product');

/**
 * Get all products (Agents get active only, Super Admin gets all)
 */
exports.getProducts = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user && user.role === 'superadmin';

    const query = isSuperAdmin ? {} : { isActive: true };
    const products = await Product.find(query)
      .sort({ category: 1, basePrice: 1 })
      .lean({ virtuals: true });

    res.json({
      success: true,
      total: products.length,
      data: products
    });
  } catch (error) {
    console.error('[Product Controller] getProducts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new product (Super Admin Only)
 */
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, 
      category, 
      basePrice, 
      billingType = 'one_time',
      defaultDurationMonths = 1,
      maxDiscountPercent, 
      currency, 
      description, 
      deliverables, 
      isActive 
    } = req.body;

    if (!name || basePrice === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product name and base price are required.' 
      });
    }

    const discountVal = Math.min(100, Math.max(0, parseFloat(maxDiscountPercent) || 0));
    const cleanBillingType = ['one_time', 'monthly'].includes(billingType) ? billingType : 'one_time';
    const cleanDuration = Math.max(1, parseInt(defaultDurationMonths, 10) || 1);

    const product = await Product.create({
      name: name.trim(),
      category: category || 'Web Development',
      basePrice: Math.max(0, parseFloat(basePrice) || 0),
      billingType: cleanBillingType,
      defaultDurationMonths: cleanDuration,
      maxDiscountPercent: discountVal,
      currency: currency || 'PKR',
      description: (description || '').trim(),
      deliverables: Array.isArray(deliverables) 
        ? deliverables.map(d => d.trim()).filter(Boolean)
        : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: `Product "${product.name}" created successfully.`,
      data: product
    });
  } catch (error) {
    console.error('[Product Controller] createProduct error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing product (Super Admin Only)
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.billingType && !['one_time', 'monthly'].includes(updates.billingType)) {
      updates.billingType = 'one_time';
    }
    if (updates.defaultDurationMonths !== undefined) {
      updates.defaultDurationMonths = Math.max(1, parseInt(updates.defaultDurationMonths, 10) || 1);
    }
    if (updates.maxDiscountPercent !== undefined) {
      updates.maxDiscountPercent = Math.min(100, Math.max(0, parseFloat(updates.maxDiscountPercent) || 0));
    }
    if (updates.basePrice !== undefined) {
      updates.basePrice = Math.max(0, parseFloat(updates.basePrice) || 0);
    }
    if (updates.deliverables && Array.isArray(updates.deliverables)) {
      updates.deliverables = updates.deliverables.map(d => d.trim()).filter(Boolean);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({
      success: true,
      message: `Product "${product.name}" updated successfully.`,
      data: product
    });
  } catch (error) {
    console.error('[Product Controller] updateProduct error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a product (Super Admin Only)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({
      success: true,
      message: `Product "${product.name}" deleted successfully.`
    });
  } catch (error) {
    console.error('[Product Controller] deleteProduct error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Seed default web agency products tailored to Lahore / Pakistan market
 */
exports.seedDefaultProducts = async () => {
  try {
    const totalCount = await Product.countDocuments();

    const defaultOneTimeCatalog = [
      {
        name: 'Custom Business Website',
        category: 'Web Development',
        basePrice: 25000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Modern 5-page responsive website designed for local businesses with WhatsApp integration, contact lead forms, and on-page SEO.',
        deliverables: [
          '5 Custom Responsive Pages',
          'WhatsApp Floating Connect Button',
          'Contact & Lead Capture Form',
          'Mobile & Tablet Friendly UI',
          'Google Maps Location Embed',
          'Fast Page Speed Optimization'
        ],
        isActive: true
      },
      {
        name: 'E-Commerce Online Store',
        category: 'E-Commerce',
        basePrice: 50000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 20,
        currency: 'PKR',
        description: 'Full-featured online store with product catalog, shopping cart, cash-on-delivery (COD) setup, and customer ordering dashboard.',
        deliverables: [
          'Up to 50 Initial Products Uploaded',
          'Cash On Delivery (COD) Checkout',
          'Automated Order Invoices & Slips',
          'Inventory & Stock Tracking',
          'Customer Account Portal',
          'Coupon & Promotional Code System'
        ],
        isActive: true
      },
      {
        name: 'High-Converting Landing Page',
        category: 'Web Development',
        basePrice: 15000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Ultra-fast single-page sales funnel built to convert visitors from Google/Facebook ads into direct phone and WhatsApp inquiries.',
        deliverables: [
          'Single High-Impact Landing Page',
          'Speed Optimized (<1.2s load time)',
          'Direct Call & WhatsApp CTA Banners',
          'Customer Reviews & Proof Section',
          'Instant Email Notification for Leads'
        ],
        isActive: true
      },
      {
        name: 'Google Business Profile & Local SEO',
        category: 'SEO',
        basePrice: 18000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 10,
        currency: 'PKR',
        description: 'Google Maps 3-pack optimization, NAP citation cleanup, review strategy, and local search visibility for Lahore businesses.',
        deliverables: [
          'Google Maps 3-Pack Optimization',
          'Local Directory & Citation Submissions',
          'Category & Secondary Tags Tuning',
          'Review Collection Blueprint',
          'Monthly Search Ranking Report'
        ],
        isActive: true
      },
      {
        name: 'Social Media Ads & Lead Generation',
        category: 'Digital Marketing',
        basePrice: 20000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Targeted Meta (Facebook & Instagram) advertising campaign to drive qualified local customers directly to WhatsApp or phone calls.',
        deliverables: [
          'Custom Ad Creatives & Video Graphics',
          'Audience Geo-Targeting (Lahore/Punjab)',
          'Meta Pixel & Conversion Setup',
          'Direct WhatsApp Messaging Ads',
          'Bi-Weekly ROI & Leads Report'
        ],
        isActive: true
      },
      {
        name: 'Corporate Branding & Logo Kit',
        category: 'Design & Branding',
        basePrice: 10000,
        billingType: 'one_time',
        defaultDurationMonths: 1,
        maxDiscountPercent: 10,
        currency: 'PKR',
        description: 'Professional vector logo design, print-ready business cards, letterhead, and brand color guidelines.',
        deliverables: [
          '3 Premium Unique Logo Concepts',
          'Print-Ready Double-Sided Business Card',
          'Official Letterhead & Invoice Template',
          'Social Media Display Avatar & Cover',
          'Vector Source Files (.AI, .EPS, .PNG, .SVG)'
        ],
        isActive: true
      }
    ];

    const defaultMonthlyCatalog = [
      {
        name: 'Website Maintenance, Security & Hosting',
        category: 'Maintenance & Hosting',
        basePrice: 8000,
        billingType: 'monthly',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Monthly website maintenance retainer: WordPress/CMS updates, daily backups, 24/7 uptime monitoring, security patching, and up to 3 hours of technical content changes.',
        deliverables: [
          'Daily Cloud Backups & Instant Restore',
          'Core, Theme & Plugin Security Updates',
          '24/7 Uptime & Server Health Monitoring',
          'Malware Firewall & Virus Scanning',
          '3 Hours Monthly Technical Support / Content Edits',
          'Monthly Speed & Performance Report'
        ],
        isActive: true
      },
      {
        name: 'Dedicated E-Commerce Store Maintenance & Support',
        category: 'Maintenance & Hosting',
        basePrice: 15000,
        billingType: 'monthly',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Ongoing technical care for online stores: checkout flow auditing, speed optimization, payment gateway sync, and monthly product/catalog additions.',
        deliverables: [
          'Weekly Checkout & Cart Friction Testing',
          'Payment Gateway & Order Webhook Monitoring',
          'Up to 25 New Products Added / Updated per Month',
          'Database Cleanup & Image WebP Optimization',
          'Promotional Banners & Discount Code Setup'
        ],
        isActive: true
      },
      {
        name: 'Continuous SEO Growth & Backlinks Retainer',
        category: 'SEO',
        basePrice: 20000,
        billingType: 'monthly',
        defaultDurationMonths: 1,
        maxDiscountPercent: 10,
        currency: 'PKR',
        description: 'Monthly search engine optimization: target keyword ranking management, technical site fixes, publishing 2 SEO blog articles, and building high-DA local backlinks.',
        deliverables: [
          'Weekly Keyword Tracking & Competitor Intelligence',
          '2 Keyword-Optimized Blog Articles Published / Mo',
          'High-DA Niche Citations & Backlinks',
          'Google Search Console Crawl Error Rectification',
          'Monthly Organic Search & Lead Attribution Report'
        ],
        isActive: true
      },
      {
        name: 'Social Media Management & Creative Retainer',
        category: 'Digital Marketing',
        basePrice: 25000,
        billingType: 'monthly',
        defaultDurationMonths: 1,
        maxDiscountPercent: 15,
        currency: 'PKR',
        description: 'Full-service monthly brand growth across Instagram & Facebook: 12 professionally branded graphics/reels, copywriting, community comment replies, and growth analytics.',
        deliverables: [
          '12 Custom Branded Graphics & Short Reels / Mo',
          'Strategic Content Calendar & Copywriting',
          'Community Engagement & Daily Comment/DM Monitoring',
          'Bio & Profile Highlight Upgrades',
          'Monthly Reach & Follower Growth Report'
        ],
        isActive: true
      }
    ];

    if (totalCount === 0) {
      console.log('[Product Boot] Seeding complete agency product catalog (One-Time & Monthly)...');
      await Product.insertMany([...defaultOneTimeCatalog, ...defaultMonthlyCatalog]);
      console.log(`✔ Successfully seeded ${defaultOneTimeCatalog.length + defaultMonthlyCatalog.length} agency products into catalog.`);
      return;
    }

    // Ensure monthly maintenance products exist even if previous catalog was seeded
    const monthlyCount = await Product.countDocuments({ billingType: 'monthly' });
    if (monthlyCount === 0) {
      console.log('[Product Boot] Seeding missing monthly maintenance offerings...');
      await Product.insertMany(defaultMonthlyCatalog);
      console.log(`✔ Successfully added ${defaultMonthlyCatalog.length} monthly maintenance offerings.`);
    }

    // Ensure any products missing billingType default to 'one_time'
    await Product.updateMany(
      { billingType: { $exists: false } },
      { $set: { billingType: 'one_time', defaultDurationMonths: 1 } }
    );
  } catch (error) {
    console.error('[Product Boot] Seeding error:', error.message);
  }
};
