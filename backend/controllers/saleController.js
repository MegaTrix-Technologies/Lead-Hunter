const Sale = require('../models/Sale');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const User = require('../models/User');

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.email === 'sales@megatrixai.com') return true;
  if (user.role === 'superadmin') return true;
  if (Array.isArray(user.roles) && user.roles.includes('super_admin')) return true;
  return false;
};

/**
 * GET /api/sales/closer-queue
 * Queue of leads pending closer action (First-come, first-served) + Closer Follow-ups
 */
exports.getCloserQueue = async (req, res) => {
  try {
    const { search, category, area, tab } = req.query;
    const user = req.user;
    const isSuperAdmin = isSuperAdminUser(user);

    // Exclude leads that already have an active/completed Sale record
    const existingSaleLeadIds = await Sale.distinct('leadId', { leadId: { $ne: null } });
    const excludeFilter = existingSaleLeadIds.length > 0 ? { _id: { $nin: existingSaleLeadIds } } : {};

    // Live counts for tabs
    const poolCount = await Lead.countDocuments({
      ...excludeFilter,
      callStatus: { $in: ['Lead', 'Lead / Sale'] }
    });

    const myFollowUpsCount = user ? await Lead.countDocuments({
      ...excludeFilter,
      callStatus: 'Closer Follow Up',
      closerId: user._id
    }) : 0;

    const allFollowUpsCount = await Lead.countDocuments({
      ...excludeFilter,
      callStatus: 'Closer Follow Up'
    });

    const query = { ...excludeFilter };

    if (tab === 'pool') {
      query.callStatus = { $in: ['Lead', 'Lead / Sale'] };
    } else if (tab === 'my_followups') {
      query.callStatus = 'Closer Follow Up';
      if (!isSuperAdmin && user) {
        query.closerId = user._id;
      }
    } else if (tab === 'all_followups') {
      query.callStatus = 'Closer Follow Up';
    } else {
      // Default: show pool + my follow-ups
      if (isSuperAdmin) {
        query.callStatus = { $in: ['Lead', 'Lead / Sale', 'Closer Follow Up'] };
      } else if (user) {
        query.$or = [
          { callStatus: { $in: ['Lead', 'Lead / Sale'] } },
          { callStatus: 'Closer Follow Up', closerId: user._id }
        ];
      } else {
        query.callStatus = { $in: ['Lead', 'Lead / Sale'] };
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      const searchOr = [
        { businessName: regex },
        { phoneNumber: regex },
        { email: regex },
        { area: regex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    if (category && category !== 'ALL') {
      query.category = new RegExp(category, 'i');
    }

    if (area) {
      query.area = new RegExp(area, 'i');
    }

    const leads = await Lead.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: leads.length,
      counts: {
        pool: poolCount,
        myFollowUps: myFollowUpsCount,
        allFollowUps: allFollowUpsCount
      },
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
      const { paymentMethod, paymentReference } = req.body;
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
      // Even if 100% paid upfront, the project is active/in progress until delivery!
      const saleStatus = cleanAdvance > 0 ? 'advance_paid' : 'project_active';

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
        isProjectDelivered: false,
        paymentMethod: paymentMethod || 'Bank Transfer',
        paymentReference: paymentReference ? paymentReference.trim() : '',
        source: 'manual',
        notes: notes ? notes.trim() : '',
        closedAt: new Date(),
        paymentCompletedAt: remainingAmount === 0 ? new Date() : null
      });

      // Auto-instantiate an Active Project for execution
      const project = await Project.create({
        saleId: sale._id,
        assignedDevelopers: [],
        assignedDeveloperNames: [],
        status: 'active',
        deliveryNotes: [{
          note: `Deal closed by ${closerUser.name}. Advance collected: PKR ${cleanAdvance.toLocaleString()} (${paymentMethod || 'Bank Transfer'}) of PKR ${totalAmount.toLocaleString()}. Remaining: PKR ${remainingAmount.toLocaleString()}`,
          author: closerUser.name,
          authorId: closerUser._id,
          timestamp: new Date()
        }]
      });

      // Link project ID to sale
      sale.projectId = project._id;
      await sale.save();

      // Update lead state
      lead.callStatus = 'sale';
      lead.closerId = closerUser._id;
      lead.closerName = closerUser.name;
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
        message: `Sale successfully recorded for "${lead.businessName}". Project instantiated in progress.`,
        data: { sale, project }
      });
    }

    if (outcome === 'Follow Up') {
      lead.callStatus = 'Closer Follow Up';
      lead.followUpType = 'sales_closer';
      lead.closerId = closerUser._id;
      lead.closerName = closerUser.name;
      lead.followUpBy = closerUser._id;
      lead.followUpByName = closerUser.name;
      if (followUpDate) {
        lead.followUpDate = new Date(followUpDate);
        lead.closerFollowUpDate = new Date(followUpDate);
      }
      if (notes) {
        lead.callNotes.push({
          note: `[Closer Callback Scheduled: ${followUpDate ? new Date(followUpDate).toLocaleString() : 'Pending Date'}] ${notes.trim()}`,
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
        message: `Closer follow-up scheduled by ${closerUser.name} for "${lead.businessName}".`,
        data: lead
      });
    }

    if (outcome === 'Denied') {
      lead.callStatus = 'denied';
      lead.closerId = closerUser._id;
      lead.closerName = closerUser.name;
      lead.callNotes.push({
        note: `[Deal Declined/Denied by Closer: ${closerUser.name}] ${notes ? notes.trim() : 'Customer declined proposal.'}`,
        author: closerUser.name,
        timestamp: new Date()
      });
      await lead.save();

      return res.json({
        success: true,
        message: `Lead marked as Denied by closer.`,
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
      if (status === 'in_progress') {
        query.status = { $ne: 'payment_completed' };
      } else {
        query.status = status;
      }
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
      agreedAdvanceAmount,
      advanceAmount,
      advanceScheduleNotes,
      isProjectDelivered,
      notes
    } = req.body;

    if (!customer || !customer.businessName) {
      return res.status(400).json({ success: false, message: 'Customer business name is required.' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product is required.' });
    }

    const isDelivered = Boolean(isProjectDelivered);
    const cleanTotal = parseFloat(totalAmount) || products.reduce((sum, p) => sum + (Number(p.finalPrice) || 0), 0);

    let cleanAdvance = 0;
    let cleanAgreedAdvance = 0;
    let cleanPendingAdvance = 0;
    let cleanCompletion = 0;
    let remainingAmount = 0;
    let saleStatus = 'project_active';
    let deliveryCompletedAt = null;
    let paymentCompletedAt = null;

    if (isDelivered) {
      // 100% full payment collected upfront and project already delivered
      cleanAdvance = cleanTotal;
      cleanAgreedAdvance = cleanTotal;
      cleanPendingAdvance = 0;
      cleanCompletion = 0;
      remainingAmount = 0;
      saleStatus = 'payment_completed';
      deliveryCompletedAt = new Date();
      paymentCompletedAt = new Date();
    } else {
      cleanAdvance = Math.max(0, parseFloat(advanceAmount) || 0);
      cleanAgreedAdvance = agreedAdvanceAmount !== undefined && agreedAdvanceAmount !== ''
        ? Math.max(0, parseFloat(agreedAdvanceAmount) || 0)
        : cleanAdvance;
      cleanPendingAdvance = Math.max(0, cleanAgreedAdvance - cleanAdvance);
      cleanCompletion = Math.max(0, cleanTotal - cleanAgreedAdvance);
      remainingAmount = Math.max(0, cleanTotal - cleanAdvance);
      saleStatus = cleanAdvance > 0 ? 'advance_paid' : 'project_active';
      if (remainingAmount === 0) {
        paymentCompletedAt = new Date();
      }
    }

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
      products: products.map(p => {
        const bp = Number(p.basePrice) || 0;
        const discAmt = Number(p.discountAmount) || 0;
        const discPct = Number(p.discountPercent) || (bp > 0 ? Math.round((discAmt / bp) * 100) : 0);
        const fp = Number(p.finalPrice) !== undefined && Number(p.finalPrice) !== 0 ? Number(p.finalPrice) : Math.max(0, bp - discAmt);
        return {
          productId: p.productId || null,
          name: p.name,
          category: p.category || '',
          billingType: p.billingType === 'monthly' ? 'monthly' : 'one_time',
          billingDurationMonths: Math.max(1, parseInt(p.billingDurationMonths, 10) || 1),
          monthlyPrice: Number(p.monthlyPrice) || bp,
          basePrice: bp,
          discountAmount: discAmt,
          discountPercent: discPct,
          finalPrice: fp,
          currency: p.currency || 'PKR'
        };
      }),
      totalAmount: cleanTotal,
      agreedAdvanceAmount: cleanAgreedAdvance,
      advanceAmount: cleanAdvance,
      pendingAdvanceAmount: cleanPendingAdvance,
      completionAmount: cleanCompletion,
      advanceScheduleNotes: advanceScheduleNotes ? advanceScheduleNotes.trim() : '',
      remainingAmount,
      status: saleStatus,
      isProjectDelivered: isDelivered,
      source: 'manual',
      notes: notes ? notes.trim() : '',
      closedAt: new Date(),
      deliveryCompletedAt,
      paymentCompletedAt
    });

    // Auto-create Project (Completed if already delivered, otherwise active)
    const project = await Project.create({
      saleId: sale._id,
      assignedDevelopers: validDevIds,
      assignedDeveloperNames: devNames,
      status: isDelivered ? 'completed' : 'active',
      completedAt: isDelivered ? new Date() : null,
      deliveryNotes: [{
        note: isDelivered
          ? `Direct sale logged as already delivered by ${req.user.name}. 100% full amount (PKR ${cleanTotal.toLocaleString()}) collected.`
          : `Manual sale created by ${req.user.name}. Advance collected: PKR ${cleanAdvance.toLocaleString()} / Agreed Advance: PKR ${cleanAgreedAdvance.toLocaleString()}${cleanPendingAdvance > 0 ? ` (Pending Advance: PKR ${cleanPendingAdvance.toLocaleString()})` : ''} / Due on completion: PKR ${cleanCompletion.toLocaleString()}.`,
        author: req.user.name,
        authorId: req.user._id,
        timestamp: new Date()
      }]
    });

    sale.projectId = project._id;
    await sale.save();

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
    const { paymentNotes, paymentMethod, paymentReference } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    if (sale.remainingAmount === 0 && sale.status === 'payment_completed') {
      return res.status(400).json({ success: false, message: 'This sale has already received full payment and is completed.' });
    }

    // Mark full payment collected
    const collectedRemaining = sale.remainingAmount;
    sale.advanceAmount = sale.totalAmount;
    sale.remainingAmount = 0;
    sale.paymentCompletedAt = new Date();
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (paymentReference) sale.paymentReference = paymentReference;

    // Check if the associated project is already delivered
    const linkedProject = await Project.findOne({ saleId: sale._id });
    const isDelivered = sale.isProjectDelivered || (linkedProject && linkedProject.status === 'completed');

    if (isDelivered) {
      sale.status = 'payment_completed';
      sale.isProjectDelivered = true;
    } else {
      // Full payment is received, but project is still being delivered!
      sale.status = 'project_active';
    }

    if (paymentNotes) {
      sale.notes = sale.notes ? `${sale.notes}\n[Payment Finalized] ${paymentNotes.trim()}` : `[Payment Finalized] ${paymentNotes.trim()}`;
    }

    await sale.save();

    res.json({
      success: true,
      message: isDelivered 
        ? `Final payment of PKR ${collectedRemaining.toLocaleString()} collected and project delivered. Deal marked Completed!` 
        : `Final payment of PKR ${collectedRemaining.toLocaleString()} collected. Project is in progress; deal will complete upon delivery.`,
      data: sale
    });
  } catch (error) {
    console.error('[Sale Controller] collectFinalPayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
