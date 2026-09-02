const Dataset = require('../models/Dataset');
const Lead = require('../models/Lead');
const gmbScraperService = require('../services/gmbScraperService');
const pdfReportService = require('../services/pdfReportService');

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Get all datasets with live aggregated metrics and user attribution
 */
exports.getDatasets = async (req, res) => {
  try {
    const user = req.user;
    const isAgent = user && user.role === 'agent';

    // Role-based scoping: Agents only see datasets they created; Super Admin sees all
    const datasetQuery = {};
    if (isAgent) {
      datasetQuery.createdBy = user._id;
    }

    const datasets = await Dataset.find(datasetQuery).sort({ updatedAt: -1 }).lean();

    const enrichedDatasets = await Promise.all(datasets.map(async (ds) => {
      const leadQuery = { datasetId: ds._id };
      if (isAgent) {
        leadQuery.extractedBy = user._id;
      }

      const leads = await Lead.find(leadQuery).lean();
      const totalLeads = leads.length;
      const uncontactedCount = leads.filter(l => l.callStatus === 'Uncontacted').length;
      const unreachableCount = leads.filter(l => l.callStatus === 'Unreachable').length;
      const contactedCount = leads.filter(l => l.callStatus !== 'Uncontacted').length;
      const pipelineCount = leads.filter(l => ['Shows Interest', 'Follow Up', 'Lead / Sale'].includes(l.callStatus)).length;
      const closedCount = leads.filter(l => l.callStatus === 'Lead / Sale').length;

      return {
        ...ds,
        createdByName: ds.createdByName || 'Super Admin',
        totalLeads,
        uncontactedCount,
        unreachableCount,
        contactedCount,
        pipelineCount,
        closedCount
      };
    }));

    res.json({
      success: true,
      data: enrichedDatasets
    });
  } catch (error) {
    console.error('[Dataset Controller] getDatasets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single dataset by ID with paginated leads
 */
exports.getDatasetById = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || 'ALL';
    const search = req.query.search || '';
    const user = req.user;
    const isAgent = user && user.role === 'agent';

    const dataset = await Dataset.findById(id).lean();
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (isAgent && dataset.createdBy && dataset.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view datasets created by your account.' });
    }

    const query = { datasetId: id };
    if (isAgent) {
      query.extractedBy = user._id;
    }

    if (status && status !== 'ALL') {
      query.callStatus = status;
    }
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const totalLeads = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const baseLeadQuery = { datasetId: id };
    if (isAgent) baseLeadQuery.extractedBy = user._id;

    const allDatasetLeads = await Lead.find(baseLeadQuery).lean();
    const statusCounts = {
      Uncontacted: allDatasetLeads.filter(l => l.callStatus === 'Uncontacted').length,
      Unreachable: allDatasetLeads.filter(l => l.callStatus === 'Unreachable').length,
      IVR: allDatasetLeads.filter(l => l.callStatus === 'IVR').length,
      Receptionist: allDatasetLeads.filter(l => l.callStatus === 'Receptionist').length,
      'Do Not Call': allDatasetLeads.filter(l => l.callStatus === 'Do Not Call').length,
      'Shows Interest': allDatasetLeads.filter(l => l.callStatus === 'Shows Interest').length,
      'Follow Up': allDatasetLeads.filter(l => l.callStatus === 'Follow Up').length,
      'Lead / Sale': allDatasetLeads.filter(l => l.callStatus === 'Lead / Sale').length
    };

    res.json({
      success: true,
      data: {
        dataset: {
          ...dataset,
          createdByName: dataset.createdByName || 'Super Admin'
        },
        leads,
        statusCounts,
        pagination: {
          totalLeads,
          totalPages: Math.ceil(totalLeads / limit) || 1,
          currentPage: page,
          limit,
          hasNextPage: page * limit < totalLeads,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('[Dataset Controller] getDatasetById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Dataset details
 */
exports.updateDataset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const dataset = await Dataset.findById(id);
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit datasets created by your account.' });
    }

    if (name) dataset.name = name.trim();
    if (description !== undefined) dataset.description = description.trim();

    await dataset.save();

    res.json({
      success: true,
      message: 'Dataset updated successfully.',
      data: dataset
    });
  } catch (error) {
    console.error('[Dataset Controller] updateDataset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Dataset and its assigned leads
 */
exports.deleteDataset = async (req, res) => {
  try {
    const { id } = req.params;
    const dataset = await Dataset.findById(id);
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete datasets created by your account.' });
    }

    const deleteResult = await Lead.deleteMany({ datasetId: id });
    await Dataset.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Dataset "${dataset.name}" and ${deleteResult.deletedCount} leads deleted successfully.`
    });
  } catch (error) {
    console.error('[Dataset Controller] deleteDataset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Append GMB extraction results to an existing dataset with agent limit checks
 */
exports.appendLeadsToDataset = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, area, maxResults, noWebsiteOnly, recentlyRegistered, maxRating, strictSearch } = req.body;

    const dataset = await Dataset.findById(id);
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only append leads to datasets created by your account.' });
    }

    const targetMax = Math.min(100, Math.max(1, parseInt(maxResults, 10) || 10));
    const user = req.user;
    const isSuperAdmin = !user || user.role === 'superadmin';

    // Agent Daily Quota Enforcement
    if (!isSuperAdmin && user) {
      const dailyLimit = user.dailyGmbLimit || 150;
      const usedToday = await Lead.countDocuments({
        extractedBy: user._id,
        createdAt: { $gte: getStartOfToday() }
      });
      const remainingToday = Math.max(0, dailyLimit - usedToday);

      if (remainingToday <= 0) {
        return res.status(400).json({
          success: false,
          message: `Daily extraction limit reached (${dailyLimit}/${dailyLimit} profiles used today). Please contact your Super Administrator.`
        });
      }

      if (targetMax > remainingToday) {
        return res.status(400).json({
          success: false,
          message: `Requested extraction (${targetMax} profiles) exceeds your remaining daily limit of ${remainingToday} profiles.`
        });
      }
    }

    const result = await gmbScraperService.scrapeLeads({
      keyword: keyword || dataset.keyword,
      area: area || dataset.area,
      maxResults: targetMax,
      noWebsiteOnly,
      recentlyRegistered,
      maxRating,
      strictSearch,
      datasetId: id,
      user
    });

    res.json({
      success: true,
      message: `Appended ${result.stats.totalQualified} new leads to "${dataset.name}".`,
      data: result
    });
  } catch (error) {
    console.error('[Dataset Controller] appendLeadsToDataset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Calling Queue for a specific Dataset
 */
exports.getDatasetQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const dataset = await Dataset.findById(id).lean();
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only queue datasets created by your account.' });
    }

    const query = { datasetId: id };
    if (req.user && req.user.role === 'agent') {
      query.extractedBy = req.user._id;
    }

    const queue = await Lead.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      dataset,
      totalQueue: queue.length,
      data: queue
    });
  } catch (error) {
    console.error('[Dataset Controller] getDatasetQueue error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export dataset to CSV
 */
exports.exportDataset = async (req, res) => {
  try {
    const { id } = req.params;
    const dataset = await Dataset.findById(id).lean();
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only export datasets created by your account.' });
    }

    const query = { datasetId: id };
    if (req.user && req.user.role === 'agent') {
      query.extractedBy = req.user._id;
    }

    const leads = await Lead.find(query).lean();

    const headers = ['Business Name', 'Category', 'Area', 'Rating', 'Reviews', 'Phone', 'Email', 'Website', 'Address', 'Call Status', 'Follow Up Date'];
    if (!req.user || req.user.role === 'superadmin') headers.push('Created By');

    const rows = leads.map(l => {
      const row = [
        `"${(l.businessName || '').replace(/"/g, '""')}"`,
        `"${(l.category || '').replace(/"/g, '""')}"`,
        `"${(l.area || '').replace(/"/g, '""')}"`,
        l.rating || 0,
        l.reviewCount || 0,
        `"${(l.phoneNumber || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.website || '').replace(/"/g, '""')}"`,
        `"${(l.address || '').replace(/"/g, '""')}"`,
        `"${(l.callStatus || '').replace(/"/g, '""')}"`,
        l.followUpDate ? new Date(l.followUpDate).toISOString() : ''
      ];
      if (!req.user || req.user.role === 'superadmin') row.push(`"${l.extractedByName || 'Super Admin'}"`);
      return row;
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_leads.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('[Dataset Controller] exportDataset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export dataset to High-Graphic PDF Dossier
 */
exports.exportDatasetPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const dataset = await Dataset.findById(id).lean();
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    if (req.user && req.user.role === 'agent' && dataset.createdBy && dataset.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only export datasets created by your account.' });
    }

    const query = { datasetId: id };
    if (req.user && req.user.role === 'agent') {
      query.extractedBy = req.user._id;
    }

    const leads = await Lead.find(query).sort({ rating: -1, reviewCount: -1 }).lean();
    await pdfReportService.generateDatasetPdf(dataset, leads, res);
  } catch (error) {
    console.error('[Dataset Controller] exportDatasetPdf error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
