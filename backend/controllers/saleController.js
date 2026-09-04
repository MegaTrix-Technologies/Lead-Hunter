const Sale = require('../models/Sale');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * GET /api/sales/closer-queue
 * Queue of leads pending closer action (First-come, first-served)
 */
exports.getCloserQueue = async (req, res) => {
  try {
    const { search, category, area } = req.query;

    const query = {
      callStatus: { $in: ['Lead', 'Lead / Sale', 'sale', 'Shows Interest', 'Follow Up'] }
    };

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { businessName: regex },
        { phoneNumber: regex },
        { email: regex },
        { area: regex }
      ];
    }

    if (category && category !== 'ALL') {
      query.category = new RegExp(category, 'i');
    }

    if (area) {
      query.area = new RegExp(area, 'i');
    }

    // Exclude leads that already have an active/completed Sale record
    const existingSaleLeadIds = await Sale.distinct('leadId', { leadId: { $ne: null } });
    if (existingSaleLeadIds.length > 0) {
      query._id = { $nin: existingSaleLeadIds };
    }

    const leads = await Lead.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    console.error('[Sale Controller] getCloserQueue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sales/close-lead/:id
 * Closer marks lead as Completed (creates Sale + Project), Follow Up, or Denied
 */
exports.closeLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, products, advanceAmount, notes, followUpDate } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead record not found.' });
    }

    const closerUser = req.user;

    if (outcome === 'Completed') {
      // Product selection is mandatory at closing
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Product Selection Mandatory: You must attach at least one product with agreed pricing to complete this sale.'
        });
      }

      // Compute total amount from selected products
      const cleanProducts = products.map(p => ({
        productId: p.productId || p._id || null,
        name: p.name,
        category: p.category || '',
        basePrice: Number(p.basePrice) || 0,
        discountPercent: Math.min(100, Math.max(0, Number(p.discountPercent) || 0)),
        finalPrice: Number(p.finalPrice) || Number(p.basePrice) || 0,
        currency: p.currency || 'PKR'
      }));

      const totalAmount = cleanProducts.reduce((sum, p) => sum + p.finalPrice, 0);
      const cleanAdvance = Math.max(0, parseFloat(advanceAmount) || 0);
      const remainingAmount = Math.max(0, totalAmount - cleanAdvance);
      const saleStatus = remainingAmount === 0 ? 'payment_completed' : 'advance_paid';

      // Create Sale document
      const sale = await Sale.create({
        leadId: lead._id,
        customer: {
          businessName: lead.businessName,
          phoneNumber: lead.phoneNumber || '',
          email: lead.email || '',
          address: lead.address || '',
          area: lead.area || 'Lahore',
          category: lead.category || 'General'
        },
        leadGeneratedBy: lead.generatedBy || lead.extractedBy || null,
        leadGeneratedByName: lead.generatedByName || lead.extractedByName || 'Sales Agent',
        closedBy: closerUser._id,
        closedByName: closerUser.name,
        assignedDevelopers: [],
        assignedDeveloperNames: [],
        products: cleanProducts,
        totalAmount,
        advanceAmount: cleanAdvance,
        remainingAmount,
        status: saleStatus,
        source: 'manual',
        notes: notes ? notes.trim() : '',
        closedAt: new Date(),
        paymentCompletedAt: saleStatus === 'payment_completed' ? new Date() : null
      });

      // Auto-instantiate an Active Project for execution
      const project = await Project.create({
        saleId: sale._id,
        assignedDevelopers: [],
        assignedDeveloperNames: [],
        status: 'active',
        deliveryNotes: [{
          note: `Deal closed by ${closerUser.name}. Advance collected: PKR ${cleanAdvance.toLocaleString()} of PKR ${totalAmount.toLocaleString()}.`,
          author: closerUser.name,
          authorId: closerUser._id,
          timestamp: new Date()
        }]
      });

      // Update lead state
      lead.callStatus = 'sale';
      lead.dealValue = totalAmount;
      lead.interestedProducts = cleanProducts;
      lead.callNotes.push({
        note: `Deal Won & Closed by ${closerUser.name}. Advance: PKR ${cleanAdvance.toLocaleString()} / Total: PKR ${totalAmount.toLocaleString()}`,
        author: closerUser.name,
        timestamp: new Date()
      });
      await lead.save();

      return res.status(201).json({
        success: true,
        message: `Sale successfully completed for "${lead.businessName}". Active project created.`,
        data: { sale, project }
      });
    }

    if (outcome === 'Follow Up') {
      lead.callStatus = 'Follow Up';
      if (followUpDate) lead.followUpDate = new Date(followUpDate);
      if (notes) {
        lead.callNotes.push({
          note: `[Closer Callback] ${notes.trim()}`,
          author: closerUser.name,
          timestamp: new Date()
        });
      }
      if (Array.isArray(products) && products.length > 0) {
        lead.interestedProducts = products.map(p => ({
          productId: p.productId || p._id || null,
          name: p.name,
          category: p.category || '',
          basePrice: Number(p.basePrice) || 0,
          discountPercent: Math.min(100, Math.max(0, Number(p.discountPercent) || 0)),
          finalPrice: Number(p.finalPrice) || Number(p.basePrice) || 0,
          currency: p.currency || 'PKR'
        }));
        lead.dealValue = lead.interestedProducts.reduce((sum, p) => sum + p.finalPrice, 0);
      }
      await lead.save();

      return res.json({
        success: true,
        message: `Follow-up scheduled by closer for "${lead.businessName}".`,
        data: lead
      });
    }

    if (outcome === 'Denied') {
      lead.callStatus = 'Do Not Call';
      lead.callNotes.push({
        note: `[Deal Declined/Denied] ${notes ? notes.trim() : 'Customer declined proposal.'}`,
        author: closerUser.name,
        timestamp: new Date()
      });
      await lead.save();

      return res.json({
        success: true,
        message: `Lead marked as Denied/Opted-Out.`,
        data: lead
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid closer outcome specified.' });
  } catch (error) {
    console.error('[Sale Controller] closeLead error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/sales
 * List sales (Super Admin sees all; Closers see their closed sales; Developers see their assigned sales)
 */
exports.getSales = async (req, res) => {
  try {
    const { status, search, startDate, endDate, page = 1, limit = 15 } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.closedAt = {};
      if (startDate) query.closedAt.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.closedAt.$lte = e;
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'customer.businessName': regex },
        { 'customer.phoneNumber': regex },
        { 'customer.area': regex },
        { leadGeneratedByName: regex },
        { closedByName: regex }
      ];
    }

    // Role-based filtering:
    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';

    if (!isSuperAdmin) {
      const conditions = [];
      if (user.roles?.includes('sales_closer')) {
        conditions.push({ closedBy: user._id });
      }
      if (user.roles?.includes('sales_agent')) {
        conditions.push({ leadGeneratedBy: user._id });
      }
      if (user.roles?.includes('developer')) {
        conditions.push({ assignedDevelopers: user._id });
      }

      if (conditions.length > 0) {
        query.$or = query.$or ? [{ $and: [{ $or: query.$or }, { $or: conditions }] }] : conditions;
      } else {
        query._id = null; // No access
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [total, sales] = await Promise.all([
      Sale.countDocuments(query),
      Sale.find(query)
        .sort({ closedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[Sale Controller] getSales error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sales/manual
 * Super Admin creates a manual/off-pipeline sale
 */
exports.createManualSale = async (req, res) => {
  try {
    const {
      customer,
      leadGeneratedBy,
      closedBy,
      assignedDevelopers,
      products,
      totalAmount,
      advanceAmount,
      notes
    } = req.body;

    if (!customer || !customer.businessName) {
      return res.status(400).json({ success: false, message: 'Customer business name is required.' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product is required.' });
    }

    const cleanTotal = parseFloat(totalAmount) || products.reduce((sum, p) => sum + (Number(p.finalPrice) || 0), 0);
    const cleanAdvance = Math.max(0, parseFloat(advanceAmount) || 0);
    const remainingAmount = Math.max(0, cleanTotal - cleanAdvance);
    const saleStatus = remainingAmount === 0 ? 'payment_completed' : 'advance_paid';

    // Resolve user names
    let genByName = 'Direct Inbound';
    if (leadGeneratedBy) {
      const u = await User.findById(leadGeneratedBy);
      if (u) genByName = u.name;
    }

    let closerName = req.user.name;
    let closerId = req.user._id;
    if (closedBy) {
      const u = await User.findById(closedBy);
      if (u) {
        closerName = u.name;
        closerId = u._id;
      }
    }

    const devNames = [];
    const validDevIds = [];
    if (Array.isArray(assignedDevelopers) && assignedDevelopers.length > 0) {
      const devs = await User.find({ _id: { $in: assignedDevelopers } });
      devs.forEach(d => {
        devNames.push(d.name);
        validDevIds.push(d._id);
      });
    }

    const sale = await Sale.create({
      customer: {
        businessName: customer.businessName.trim(),
        phoneNumber: customer.phoneNumber || '',
        email: customer.email || '',
        address: customer.address || '',
        area: customer.area || 'Lahore',
        category: customer.category || 'General'
      },
      leadGeneratedBy: leadGeneratedBy || null,
      leadGeneratedByName: genByName,
      closedBy: closerId,
      closedByName: closerName,
      assignedDevelopers: validDevIds,
      assignedDeveloperNames: devNames,
      products: products.map(p => ({
        productId: p.productId || null,
        name: p.name,
        category: p.category || '',
        basePrice: Number(p.basePrice) || 0,
        discountPercent: Number(p.discountPercent) || 0,
        finalPrice: Number(p.finalPrice) || Number(p.basePrice) || 0,
        currency: p.currency || 'PKR'
      })),
      totalAmount: cleanTotal,
      advanceAmount: cleanAdvance,
      remainingAmount,
      status: saleStatus,
      source: 'manual',
      notes: notes ? notes.trim() : '',
      closedAt: new Date(),
      paymentCompletedAt: saleStatus === 'payment_completed' ? new Date() : null
    });

    // Auto-create Active Project
    const project = await Project.create({
      saleId: sale._id,
      assignedDevelopers: validDevIds,
      assignedDeveloperNames: devNames,
      status: 'active',
      deliveryNotes: [{
        note: `Manual sale created by ${req.user.name}. Project ready for execution.`,
        author: req.user.name,
        authorId: req.user._id,
        timestamp: new Date()
      }]
    });

    res.status(201).json({
      success: true,
      message: `Manual sale created for "${customer.businessName}".`,
      data: { sale, project }
    });
  } catch (error) {
    console.error('[Sale Controller] createManualSale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/sales/:id/collect-payment
 * Closer or Super Admin collects remaining final payment
 */
exports.collectFinalPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentNotes } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    if (sale.status === 'payment_completed') {
      return res.status(400).json({ success: false, message: 'This sale has already received full payment.' });
    }

    // Mark full payment collected
    const collectedRemaining = sale.remainingAmount;
    sale.advanceAmount = sale.totalAmount;
    sale.remainingAmount = 0;
    sale.status = 'payment_completed';
    sale.paymentCompletedAt = new Date();

    if (paymentNotes) {
      sale.notes = sale.notes ? `${sale.notes}\n[Payment Finalized] ${paymentNotes.trim()}` : `[Payment Finalized] ${paymentNotes.trim()}`;
    }

    await sale.save();

    res.json({
      success: true,
      message: `Final payment of PKR ${collectedRemaining.toLocaleString()} collected. Deal fully closed!`,
      data: sale
    });
  } catch (error) {
    console.error('[Sale Controller] collectFinalPayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
