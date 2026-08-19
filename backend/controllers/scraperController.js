const axios = require('axios');
const gmbScraperService = require('../services/gmbScraperService');
const ScrapeJob = require('../models/ScrapeJob');

/**
 * Execute GMB Extraction with multi-parameter filter rules and deduplication
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

    console.log(`[Scraper Controller] Incoming scrape request: "${keyword}" in "${area}" — Target Count: ${targetMax}`);

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
      datasetDescription
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

    // Try Places API (New) Autocomplete
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
      // Fallback to Classic Places Autocomplete
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
 * Get historical extraction jobs
 */
exports.getScrapeHistory = async (req, res) => {
  try {
    const jobs = await ScrapeJob.find()
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
