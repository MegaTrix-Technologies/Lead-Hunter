const axios = require('axios');
const gmbScraperService = require('../services/gmbScraperService');
const ScrapeJob = require('../models/ScrapeJob');
const Lead = require('../models/Lead');

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Execute GMB Extraction with multi-parameter filter rules, user attribution, and daily agent limit enforcement
 */
exports.scrapeLeads = async (req, res) => {
  try {
    const { 
      keyword, 
      area, 
      maxResults, 
      noWebsiteOnly, 
      recentlyRegistered, 
      maxRating, 
      strictSearch,
      datasetId,
      datasetName,
      datasetDescription
    } = req.body;

    if (!keyword || !area) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both keyword/niche and area/location are required.' 
      });
    }

    const targetMax = Math.min(100, Math.max(1, parseInt(maxResults, 10) || 10));
    const user = req.user;
    const isSuperAdmin = !user || user.role === 'superadmin';

    // Agent Daily Quota Enforcement
    let dailyLimit = 999999;
    let remainingToday = 999999;
    let usedToday = 0;

    if (!isSuperAdmin && user) {
      dailyLimit = user.dailyGmbLimit || 150;
      usedToday = await Lead.countDocuments({
        extractedBy: user._id,
        createdAt: { $gte: getStartOfToday() }
      });

      remainingToday = Math.max(0, dailyLimit - usedToday);

      if (remainingToday <= 0) {
        return res.status(400).json({
          success: false,
          message: `Daily extraction limit reached (${dailyLimit}/${dailyLimit} profiles used today). Please contact your Super Administrator.`
        });
      }

      if (targetMax > remainingToday) {
        return res.status(400).json({
          success: false,
          message: `Requested extraction (${targetMax} profiles) exceeds your remaining daily limit (${remainingToday} profiles remaining).`
        });
      }
    }

    console.log(`[Scraper Controller] Scrape request by ${user?.name || 'Super Admin'} (${user?.role || 'admin'}): "${keyword}" in "${area}" — Target Count: ${targetMax}`);

    const result = await gmbScraperService.scrapeLeads({
      keyword,
      area,
      maxResults: targetMax,
      noWebsiteOnly: noWebsiteOnly === true || noWebsiteOnly === 'true',
      recentlyRegistered: recentlyRegistered === true || recentlyRegistered === 'true',
      maxRating: parseFloat(maxRating) || 5.0,
      strictSearch: strictSearch === true || strictSearch === 'true',
      datasetId,
      datasetName,
      datasetDescription,
      user
    });

    const newUsedToday = usedToday + result.stats.totalQualified;
    const newRemainingToday = isSuperAdmin ? 999999 : Math.max(0, dailyLimit - newUsedToday);

    res.json({
      success: true,
      message: `Extraction complete: ${result.stats.totalQualified} qualified leads found (${result.stats.totalExcluded} excluded as duplicates or terminal statuses).`,
      data: result,
      quota: {
        isSuperAdmin,
        dailyLimit,
        usedToday: newUsedToday,
        remainingToday: newRemainingToday
      }
    });
  } catch (error) {
    console.error('[Scraper Controller] scrapeLeads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get remaining daily GMB extraction quota for current user
 */
exports.getQuota = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = !user || user.role === 'superadmin';

    if (isSuperAdmin) {
      return res.json({
        success: true,
        quota: {
          isSuperAdmin: true,
          dailyLimit: 999999,
          usedToday: 0,
          remainingToday: 999999
        }
      });
    }

    const dailyLimit = user.dailyGmbLimit || 150;
    const usedToday = await Lead.countDocuments({
      extractedBy: user._id,
      createdAt: { $gte: getStartOfToday() }
    });

    res.json({
      success: true,
      quota: {
        isSuperAdmin: false,
        dailyLimit,
        usedToday,
        remainingToday: Math.max(0, dailyLimit - usedToday)
      }
    });
  } catch (error) {
    console.error('[Scraper Controller] getQuota error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Worldwide Google Places Location Autocomplete
 */
exports.autocompleteArea = async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || input.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;
    if (!apiKey) {
      return res.json({ success: true, suggestions: [] });
    }

    try {
      const response = await axios.post(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          input: input.trim(),
          includedPrimaryTypes: ['locality']
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey
          },
          timeout: 4000
        }
      );

      const suggestions = (response.data.suggestions || [])
        .map(s => s.placePrediction?.text?.text)
        .filter(Boolean);

      if (suggestions.length > 0) {
        return res.json({ success: true, suggestions: suggestions.slice(0, 6) });
      }
    } catch (newApiErr) {
      const classicRes = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${apiKey}`,
        { timeout: 4000 }
      );

      const predictions = (classicRes.data.predictions || [])
        .map(p => p.description)
        .filter(Boolean);

      return res.json({ success: true, suggestions: predictions.slice(0, 6) });
    }

    res.json({ success: true, suggestions: [] });
  } catch (error) {
    console.error('[Scraper Controller] autocompleteArea error:', error.message);
    res.json({ success: true, suggestions: [] });
  }
};

/**
 * Get historical extraction jobs (filtered by agent for agents, all for super admin)
 */
exports.getScrapeHistory = async (req, res) => {
  try {
    const user = req.user;
    const query = {};
    if (user && user.role === 'agent') {
      query.userId = user._id;
    }

    const jobs = await ScrapeJob.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('[Scraper Controller] getScrapeHistory error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getScrapeJobs = exports.getScrapeHistory;

/**
 * Get current user GMB daily extraction quota
 */
exports.getQuota = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.role === 'superadmin';
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let usedToday = 0;
    if (!isSuperAdmin) {
      usedToday = await Lead.countDocuments({
        extractedBy: user._id,
        createdAt: { $gte: startOfToday }
      });
    }

    const dailyLimit = isSuperAdmin ? 999999 : (user.dailyGmbLimit || 150);
    const remainingToday = isSuperAdmin ? 999999 : Math.max(0, dailyLimit - usedToday);

    res.json({
      success: true,
      data: {
        isSuperAdmin,
        dailyLimit,
        usedToday,
        remainingToday
      }
    });
  } catch (error) {
    console.error('[Scraper Controller] getQuota error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
