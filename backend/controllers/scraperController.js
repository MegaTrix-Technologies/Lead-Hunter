const gmbScraperService = require('../services/gmbScraperService');
const ScrapeJob = require('../models/ScrapeJob');

/**
 * Execute GMB Extraction with multi-parameter filter rules and deduplication
 */
exports.scrapeLeads = async (req, res) => {
  try {
    const { keyword, area, noWebsiteOnly, recentlyRegistered, maxRating, strictSearch } = req.body;

    if (!keyword || !area) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both keyword/niche and area/location are required.' 
      });
    }

    const result = await gmbScraperService.scrapeLeads({
      keyword,
      area,
      noWebsiteOnly: noWebsiteOnly === true || noWebsiteOnly === 'true',
      recentlyRegistered: recentlyRegistered === true || recentlyRegistered === 'true',
      maxRating: parseFloat(maxRating) || 5.0,
      strictSearch: strictSearch !== false && strictSearch !== 'false'
    });

    res.json({
      success: true,
      message: `Extraction complete: ${result.stats.totalQualified} qualified leads found (${result.stats.totalExcluded} excluded as duplicates or terminal statuses).`,
      data: result
    });
  } catch (error) {
    console.error('[Scraper Controller] scrapeLeads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get historical extraction jobs
 */
exports.getScrapeJobs = async (req, res) => {
  try {
    const jobs = await ScrapeJob.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
