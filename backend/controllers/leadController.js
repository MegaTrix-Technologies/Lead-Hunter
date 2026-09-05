const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.email === 'sales@megatrixai.com') return true;
  if (user.role === 'superadmin') return true;
  if (Array.isArray(user.roles) && user.roles.includes('super_admin')) return true;
  return false;
};

/**
 * Get leads with server-side pagination (strictly 10 per page default) and multi-field filters
 */
exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    const andConditions = [];

    // Filter by Dataset ID
    if (req.query.datasetId) {
      andConditions.push({
        $or: [
          { datasetId: req.query.datasetId },
          { datasetIds: req.query.datasetId }
        ]
      });
    }

    // Filter by call status
    if (req.query.status && req.query.status !== 'ALL') {
      query.callStatus = req.query.status;
    }

    // Filter by area
    if (req.query.area) {
      query.area = new RegExp(req.query.area, 'i');
    }

    // Filter by category/niche
    if (req.query.category) {
      query.category = new RegExp(req.query.category, 'i');
    }

    // Filter by website presence
    if (req.query.noWebsiteOnly === 'true') {
      query.website = { $in: ['', null] };
    }

    // Filter by maximum rating
    if (req.query.maxRating) {
      const maxR = parseFloat(req.query.maxRating);
      if (!isNaN(maxR) && maxR < 5.0) {
        query.rating = { $lte: maxR };
      }
    }

    // Search term (business name, phone, email, address)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { businessName: searchRegex },
          { phoneNumber: searchRegex },
          { email: searchRegex },
          { address: searchRegex }
        ]
      });
    }

    // Role-based scoping: Non-superadmins only see their extracted or generated leads
    const user = req.user;
    if (!isSuperAdminUser(user) && user) {
      andConditions.push({
        $or: [
          { extractedBy: user._id },
          { generatedBy: user._id },
          { followUpBy: user._id }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Sort option
    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'rating_asc':
          sort = { rating: 1 };
          break;
        case 'rating_desc':
          sort = { rating: -1 };
          break;
        case 'reviews_desc':
          sort = { reviewCount: -1 };
          break;
        case 'name_asc':
          sort = { businessName: 1 };
          break;
        case 'updated_desc':
          sort = { updatedAt: -1 };
          break;
      }
    }

    const totalLeads = await Lead.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit) || 1;

    const leads = await Lead.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Summary counts for UI badges (scoped to user if agent)
    const statusMatch = user && user.role === 'agent' ? { extractedBy: user._id } : {};
    const statusCounts = await Lead.aggregate([
      { $match: statusMatch },
      { $group: { _id: '$callStatus', count: { $sum: 1 } } }
    ]);

    const statusMap = {
      Uncontacted: 0,
      Unreachable: 0,
      IVR: 0,
      Receptionist: 0,
      'Do Not Call': 0,
      'Shows Interest': 0,
      'Follow Up': 0,
      'Lead / Sale': 0
    };

    statusCounts.forEach(item => {
      if (item._id && statusMap.hasOwnProperty(item._id)) {
        statusMap[item._id] = item.count;
      }
    });

    res.json({
      success: true,
      data: leads,
      pagination: {
        totalLeads,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      statusCounts: statusMap
    });
  } catch (error) {
    console.error('[Lead Controller] getLeads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get active calling queue leads
 */
exports.getCallingQueue = async (req, res) => {
  try {
    const { status, area, category } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.callStatus = status;
    }
    if (area) query.area = new RegExp(area, 'i');
    if (category) query.category = new RegExp(category, 'i');

    // Role-based scoping: Agents only queue their extracted leads
    const user = req.user;
    if (user && user.role === 'agent') {
      query.extractedBy = user._id;
    }

    // Retrieve active queue up to 150 leads for quick workstation navigation
    const leads = await Lead.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(150)
      .lean();

    res.json({
      success: true,
      totalQueue: leads.length,
      data: leads
    });
  } catch (error) {
    console.error('[Lead Controller] getCallingQueue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single lead by ID
 */
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Call Status & Add Call Note
 */
exports.updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { callStatus, note, followUpDate, interestedProducts } = req.body;

    const validStatuses = [
      'Uncontacted', 'Unreachable', 'IVR', 'Receptionist', 
      'Do Not Call', 'Shows Interest', 'Follow Up', 'Closer Follow Up', 'Lead / Sale',
      'Lead', 'processing', 'denied', 'sale'
    ];
    if (callStatus && !validStatuses.includes(callStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid call status provided.' });
    }

    const { additionalInfo } = req.body;

    const updateDoc = {
      lastCalledAt: new Date()
    };

    if (callStatus) {
      updateDoc.callStatus = callStatus;
      if (callStatus === 'Lead' || callStatus === 'Lead / Sale') {
        updateDoc.callStatus = 'Lead';
        updateDoc.status = 'lead';
        if (req.user) {
          updateDoc.generatedBy = req.user._id;
          updateDoc.generatedByName = req.user.name;
        }
        updateDoc.disposedAt = new Date();
      } else if (callStatus === 'Follow Up') {
        updateDoc.callStatus = 'Follow Up';
        updateDoc.followUpType = 'sales_agent';
        if (req.user) {
          updateDoc.followUpBy = req.user._id;
          updateDoc.followUpByName = req.user.name;
          updateDoc.generatedBy = req.user._id;
          updateDoc.generatedByName = req.user.name;
        }
      }
    }

    if (additionalInfo !== undefined) {
      updateDoc.additionalInfo = additionalInfo.trim();
    }

    if (followUpDate) {
      updateDoc.followUpDate = new Date(followUpDate);
    }

    if (Array.isArray(interestedProducts)) {
      updateDoc.interestedProducts = interestedProducts.map(p => ({
        productId: p.productId || null,
        name: p.name,
        category: p.category || '',
        basePrice: Number(p.basePrice) || 0,
        discountPercent: Math.min(100, Math.max(0, Number(p.discountPercent) || 0)),
        finalPrice: Number(p.finalPrice) || Number(p.basePrice) || 0,
        currency: p.currency || 'PKR',
        addedAt: p.addedAt || new Date()
      }));

      // Calculate total deal value from all attached products
      updateDoc.dealValue = updateDoc.interestedProducts.reduce((sum, p) => sum + p.finalPrice, 0);
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const authorName = req.user ? req.user.name : 'MegaTrix Outbound Agent';

    if (note && note.trim()) {
      lead.callNotes.push({
        note: note.trim(),
        timestamp: new Date(),
        author: authorName
      });
    }

    Object.assign(lead, updateDoc);
    await lead.save();

    res.json({
      success: true,
      message: `Lead updated with status "${lead.callStatus}"`,
      data: lead
    });
  } catch (error) {
    console.error('[Lead Controller] updateCallStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add standalone note to a lead
 */
exports.addCallNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, author } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty.' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const authorName = req.user ? req.user.name : (author || 'MegaTrix Agent');

    lead.callNotes.push({
      note: note.trim(),
      timestamp: new Date(),
      author: authorName
    });

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new lead manually (Sales Agent + Sales Closer + Super Admin)
 */
exports.createLead = async (req, res) => {
  try {
    const user = req.user;
    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    const isSuperAdmin = isSuperAdminUser(user);
    const isAllowedRole = isSuperAdmin || userRoles.includes('sales_agent') || userRoles.includes('sales_closer');

    if (!isAllowedRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Sales Agents, Sales Closers, and Super Admins can add leads manually.'
      });
    }

    const {
      businessName,
      phoneNumber,
      email,
      website,
      address,
      area,
      category,
      rating,
      reviewCount,
      additionalInfo,
      callStatus,
      followUpDate,
      closerFollowUpDate,
      datasetId,
      notes
    } = req.body;
    
    if (!businessName || !area || !category) {
      return res.status(400).json({ success: false, message: 'Business Name, Area, and Category are required.' });
    }

    const placeId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Status resolution
    const validStatuses = [
      'Uncontacted', 'Unreachable', 'IVR', 'Receptionist', 
      'Do Not Call', 'Shows Interest', 'Follow Up', 'Closer Follow Up', 'Lead / Sale',
      'Lead', 'processing', 'denied', 'sale'
    ];
    const initialStatus = validStatuses.includes(callStatus) ? callStatus : 'Uncontacted';

    // Follow-up attributes
    let followUpDateVal = null;
    let followUpTypeVal = null;
    let followUpByVal = null;
    let followUpByNameVal = '';
    let closerIdVal = null;
    let closerNameVal = '';
    let closerFollowUpDateVal = null;

    if (initialStatus === 'Follow Up') {
      followUpDateVal = followUpDate ? new Date(followUpDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      followUpTypeVal = 'sales_agent';
      followUpByVal = user ? user._id : null;
      followUpByNameVal = user ? user.name : 'Sales Agent';
    } else if (initialStatus === 'Closer Follow Up') {
      closerFollowUpDateVal = closerFollowUpDate ? new Date(closerFollowUpDate) : (followUpDate ? new Date(followUpDate) : new Date(Date.now() + 24 * 60 * 60 * 1000));
      followUpTypeVal = 'sales_closer';
      closerIdVal = user ? user._id : null;
      closerNameVal = user ? user.name : 'Sales Closer';
    } else if (initialStatus === 'Lead' && userRoles.includes('sales_closer')) {
      closerIdVal = user._id;
      closerNameVal = user.name;
    }

    // Call notes
    const initialNotes = [];
    const noteText = notes || additionalInfo;
    if (noteText && noteText.trim()) {
      initialNotes.push({
        note: noteText.trim(),
        author: user ? user.name : 'MegaTrix Agent',
        timestamp: new Date()
      });
    }

    const leadData = {
      placeId,
      businessName: businessName.trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      website: website ? website.trim() : '',
      address: address ? address.trim() : '',
      area: area.trim(),
      category: category.trim(),
      rating: parseFloat(rating) || 0,
      reviewCount: parseInt(reviewCount, 10) || 0,
      callStatus: initialStatus,
      additionalInfo: noteText ? noteText.trim() : '',
      callNotes: initialNotes,
      followUpDate: followUpDateVal,
      followUpType: followUpTypeVal,
      followUpBy: followUpByVal,
      followUpByName: followUpByNameVal,
      closerId: closerIdVal,
      closerName: closerNameVal,
      closerFollowUpDate: closerFollowUpDateVal,
      extractedBy: user ? user._id : null,
      extractedByName: user ? user.name : 'Super Admin',
      generatedBy: user ? user._id : null,
      generatedByName: user ? user.name : 'Super Admin'
    };

    if (datasetId) {
      leadData.datasetId = datasetId;
      leadData.datasetIds = [datasetId];
    }

    const newLead = await Lead.create(leadData);

    // If dataset assigned, increment dataset totalLeads count
    if (datasetId) {
      try {
        await Dataset.findByIdAndUpdate(datasetId, { $inc: { totalLeads: 1 } });
      } catch (dErr) {
        console.warn('Could not increment dataset lead count:', dErr.message);
      }
    }

    res.status(201).json({ success: true, data: newLead, message: 'Lead created successfully.' });
  } catch (error) {
    console.error('Error in createLead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a lead
 */
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }
    res.json({ success: true, message: 'Lead removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk delete leads
 */
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided for deletion.' });
    }

    await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `Successfully deleted ${ids.length} leads.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export leads to CSV / JSON format
 */
exports.exportLeads = async (req, res) => {
  try {
    const { format = 'json', status, area, category } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.callStatus = status;
    if (area) query.area = new RegExp(area, 'i');
    if (category) query.category = new RegExp(category, 'i');

    const user = req.user;
    if (user && user.role === 'agent') {
      query.extractedBy = user._id;
    }

    const leads = await Lead.find(query).lean();

    if (format === 'csv') {
      const isSuperAdmin = !user || user.role === 'superadmin';
      const headers = ['Business Name', 'Category', 'Area', 'Rating', 'Review Count', 'Phone', 'Email', 'Website', 'Address', 'Call Status', 'Email Sent Count'];
      if (isSuperAdmin) headers.push('Created By');

      const rows = leads.map(l => {
        const row = [
          `"${(l.businessName || '').replace(/"/g, '""')}"`,
          `"${(l.category || '').replace(/"/g, '""')}"`,
          `"${(l.area || '').replace(/"/g, '""')}"`,
          l.rating || 0,
          l.reviewCount || 0,
          `"${l.phoneNumber || ''}"`,
          `"${l.email || ''}"`,
          `"${l.website || ''}"`,
          `"${(l.address || '').replace(/"/g, '""')}"`,
          `"${l.callStatus || ''}"`,
          l.emailSentCount || 0
        ];
        if (isSuperAdmin) row.push(`"${l.extractedByName || 'Super Admin'}"`);
        return row;
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="megatrix_leads_${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
