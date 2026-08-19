const Lead = require('../models/Lead');

/**
 * Get leads with server-side pagination (strictly 10 per page default) and multi-field filters
 */
exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by Dataset ID
    if (req.query.datasetId) {
      query.$or = [
        { datasetId: req.query.datasetId },
        { datasetIds: req.query.datasetId }
      ];
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
      query.$or = [
        { businessName: searchRegex },
        { phoneNumber: searchRegex },
        { email: searchRegex },
        { address: searchRegex }
      ];
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

    // Summary counts for UI badges
    const statusCounts = await Lead.aggregate([
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

    // Retrieve active queue up to 100 leads for quick workstation navigation
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
    const { callStatus, note, followUpDate } = req.body;

    const validStatuses = ['Uncontacted', 'Unreachable', 'IVR', 'Receptionist', 'Do Not Call', 'Shows Interest', 'Follow Up', 'Lead / Sale'];
    if (callStatus && !validStatuses.includes(callStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid call status provided.' });
    }

    const updateDoc = {
      lastCalledAt: new Date()
    };

    if (callStatus) {
      updateDoc.callStatus = callStatus;
    }

    if (followUpDate) {
      updateDoc.followUpDate = new Date(followUpDate);
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (note && note.trim()) {
      lead.callNotes.push({
        note: note.trim(),
        timestamp: new Date(),
        author: 'MegaTrix Outbound Agent'
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

    lead.callNotes.push({
      note: note.trim(),
      timestamp: new Date(),
      author: author || 'MegaTrix Agent'
    });

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new lead manually
 */
exports.createLead = async (req, res) => {
  try {
    const { businessName, phoneNumber, email, website, address, area, category, rating, reviewCount } = req.body;
    
    if (!businessName || !area || !category) {
      return res.status(400).json({ success: false, message: 'Business Name, Area, and Category are required.' });
    }

    const placeId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newLead = await Lead.create({
      placeId,
      businessName,
      phoneNumber,
      email,
      website,
      address,
      area,
      category,
      rating: parseFloat(rating) || 0,
      reviewCount: parseInt(reviewCount, 10) || 0,
      callStatus: 'Uncontacted'
    });

    res.status(201).json({ success: true, data: newLead });
  } catch (error) {
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

    const leads = await Lead.find(query).lean();

    if (format === 'csv') {
      const headers = ['Business Name', 'Category', 'Area', 'Rating', 'Review Count', 'Phone', 'Email', 'Website', 'Address', 'Call Status', 'Email Sent Count'];
      const rows = leads.map(l => [
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
      ]);

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
