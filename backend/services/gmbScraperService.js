const axios = require('axios');
const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');
const ScrapeJob = require('../models/ScrapeJob');

// Terminal statuses that must ALWAYS be excluded from new extractions
// NOTE: 'Unreachable' and 'Uncontacted' are explicitly NOT here so they remain retryable
const EXCLUDED_CALL_STATUSES = [
  'IVR',
  'Receptionist',
  'Do Not Call',
  'Shows Interest',
  'Follow Up',
  'Lead / Sale'
];

class GmbScraperService {
  /**
   * Helper to fetch real live Google Places profiles using Places API (New)
   * Supports fetching 1 to 100 profiles with multi-page token resolution.
   */
  async fetchLiveGooglePlaces(keyword, area, maxResults = 10) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;
    if (!apiKey) {
      throw new Error('Google Places API key is missing. Please set GOOGLE_PLACES_API_KEY in .env');
    }

    const textQuery = `${keyword} in ${area}`;
    const allPlaces = [];
    let pageToken = null;
    let pageCount = 0;
    const boundedMax = Math.min(100, Math.max(1, parseInt(maxResults, 10) || 10));
    const maxPages = Math.min(5, Math.ceil(boundedMax / 20));

    console.log(`[MegaTrix GMB Live] Executing live search: "${textQuery}" (Target: ${boundedMax} profiles, max pages: ${maxPages})`);

    while (pageCount < maxPages && allPlaces.length < boundedMax) {
      pageCount++;
      const payload = {
        textQuery,
        pageSize: 20
      };

      if (pageToken) {
        payload.pageToken = pageToken;
        await new Promise(resolve => setTimeout(resolve, 1800)); // Google token activation latency
      }

      try {
        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.types,places.photos,nextPageToken'
            },
            timeout: 15000
          }
        );

        const places = response.data.places || [];
        allPlaces.push(...places);
        console.log(`[MegaTrix GMB Live] Page ${pageCount}: Retrieved ${places.length} live places (Total: ${allPlaces.length})`);

        pageToken = response.data.nextPageToken;
        if (!pageToken || places.length === 0) {
          break;
        }
      } catch (err) {
        console.error(`[MegaTrix GMB Live] API Error on page ${pageCount}:`, err.response?.data || err.message);
        if (allPlaces.length > 0) {
          break;
        } else {
          const errMsg = err.response?.data?.error?.message || err.message;
          throw new Error(`Google Places API Error: ${errMsg}`);
        }
      }
    }

    return allPlaces.slice(0, boundedMax);
  }

  /**
   * Scrapes and filters REAL GMB profiles and saves into a named or existing Dataset
   */
  async scrapeLeads({ 
    keyword, 
    area, 
    maxResults = 10, 
    noWebsiteOnly = false, 
    recentlyRegistered = false, 
    maxRating = 5.0, 
    strictSearch = false,
    datasetId = null,
    datasetName = null,
    datasetDescription = ''
  }) {
    if (!keyword || !area) {
      throw new Error('Keyword/Niche and Area/Location are required parameters.');
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;
    const maxRatingNum = parseFloat(maxRating) || 5.0;
    const isNoWebsite = Boolean(noWebsiteOnly);
    const isRecentlyReg = Boolean(recentlyRegistered);
    const isStrict = Boolean(strictSearch);
    const boundedMax = Math.min(100, Math.max(1, parseInt(maxResults, 10) || 10));

    // 1. Determine or create Dataset
    let targetDataset = null;
    if (datasetId) {
      targetDataset = await Dataset.findById(datasetId);
    }
    
    if (!targetDataset) {
      const generatedName = datasetName && datasetName.trim() 
        ? datasetName.trim() 
        : `${keyword} in ${area.split(',')[0].trim()} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

      targetDataset = await Dataset.create({
        name: generatedName,
        description: datasetDescription || `Targeting ${keyword} in ${area}`,
        keyword,
        area,
        totalLeads: 0,
        uncontactedCount: 0,
        contactedCount: 0,
        unreachableCount: 0,
        pipelineCount: 0,
        closedCount: 0,
        searchHistory: []
      });
    }

    // 2. Fetch real live candidate pool from Google Places API
    const rawPlaces = await this.fetchLiveGooglePlaces(keyword, area, boundedMax);
    const totalExtracted = rawPlaces.length;

    if (totalExtracted === 0) {
      return {
        dataset: targetDataset,
        keyword,
        area,
        stats: { totalExtracted: 0, totalQualified: 0, totalExcluded: 0 },
        leads: []
      };
    }

    // 3. Map Google Place objects to Lead schema
    const rawCandidates = rawPlaces.map(place => {
      const placeId = place.id;
      const businessName = place.displayName?.text || 'Business';
      const rating = typeof place.rating === 'number' ? place.rating : 0;
      const reviewCount = place.userRatingCount || 0;
      const phoneNumber = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
      const website = place.websiteUri || '';
      const address = place.formattedAddress || area;
      const category = place.primaryType ? place.primaryType.replace(/_/g, ' ') : keyword;
      
      let avatarUrl = '';
      if (place.photos && place.photos.length > 0 && apiKey) {
        avatarUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=300&maxWidthPx=300&key=${apiKey}`;
      }

      return {
        placeId,
        businessName,
        avatarUrl,
        rating,
        reviewCount,
        phoneNumber,
        email: '',
        website,
        address,
        area,
        category,
        registeredDate: new Date(),
        callStatus: 'Uncontacted',
        callNotes: [],
        emailSentCount: 0,
        emailHistory: [],
        datasetId: targetDataset._id,
        datasetIds: [targetDataset._id]
      };
    });

    // 4. Query MongoDB for existing records in this dataset or global terminal exclusions
    const placeIds = rawCandidates.map(c => c.placeId);
    const existingDbLeads = await Lead.find({
      $or: [
        { placeId: { $in: placeIds } },
        { area: new RegExp(`^${area.split(',')[0].trim()}$`, 'i'), businessName: { $in: rawCandidates.map(c => c.businessName) } }
      ]
    }).lean();

    const existingMap = new Map();
    existingDbLeads.forEach(lead => {
      if (lead.placeId) existingMap.set(lead.placeId, lead);
      existingMap.set(`${lead.businessName.toLowerCase()}_${lead.area.toLowerCase()}`, lead);
    });

    // 5. Deduplication & Terminal Status Exclusion Logic
    let totalExcluded = 0;
    const qualifiedList = [];
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    for (const candidate of rawCandidates) {
      const existingInDb = existingMap.get(candidate.placeId) || 
                           existingMap.get(`${candidate.businessName.toLowerCase()}_${candidate.area.toLowerCase()}`);

      if (existingInDb) {
        // Exclude only if marked with a terminal status
        if (EXCLUDED_CALL_STATUSES.includes(existingInDb.callStatus)) {
          totalExcluded++;
          continue;
        }

        // If lead already exists in this specific dataset, avoid duplicate
        if (existingInDb.datasetId && String(existingInDb.datasetId) === String(targetDataset._id)) {
          totalExcluded++;
          continue;
        }
      }

      // 6. Apply User Filters (Strictly and accurately!)
      const passesNoWebsite = isNoWebsite ? (!candidate.website || candidate.website.trim() === '') : true;
      const passesRating = (maxRatingNum >= 5.0) ? true : (candidate.rating <= maxRatingNum);
      const passesRecent = isRecentlyReg ? (new Date(candidate.registeredDate) >= ninetyDaysAgo) : true;
      
      let passesStrict = true;
      if (isStrict) {
        const kw = keyword.toLowerCase().trim();
        const bName = (candidate.businessName || '').toLowerCase();
        const bCat = (candidate.category || '').toLowerCase();
        passesStrict = bName.includes(kw) || bCat.includes(kw);
      }

      // Candidate must pass ALL active criteria
      if (passesNoWebsite && passesRating && passesRecent && passesStrict) {
        qualifiedList.push(existingInDb ? { ...candidate, ...existingInDb, datasetId: targetDataset._id } : candidate);
      } else {
        totalExcluded++;
      }
    }

    // Limit to requested count
    const cappedQualifiedList = qualifiedList.slice(0, boundedMax);

    // 7. Persist qualified real leads and link to Dataset
    const savedLeads = [];
    for (const leadData of cappedQualifiedList) {
      try {
        let leadDoc = await Lead.findOne({ placeId: leadData.placeId });
        if (!leadDoc) {
          leadDoc = await Lead.create(leadData);
        } else {
          // Link existing non-terminal lead to this dataset
          leadDoc.datasetId = targetDataset._id;
          if (!leadDoc.datasetIds) leadDoc.datasetIds = [];
          if (!leadDoc.datasetIds.includes(targetDataset._id)) {
            leadDoc.datasetIds.push(targetDataset._id);
          }
          await leadDoc.save();
        }
        savedLeads.push(leadDoc);
      } catch (err) {
        const existing = await Lead.findOne({ placeId: leadData.placeId });
        if (existing) savedLeads.push(existing);
      }
    }

    // 8. Update Dataset Metrics
    const datasetLeads = await Lead.find({ datasetId: targetDataset._id }).lean();
    targetDataset.totalLeads = datasetLeads.length;
    targetDataset.uncontactedCount = datasetLeads.filter(l => l.callStatus === 'Uncontacted').length;
    targetDataset.unreachableCount = datasetLeads.filter(l => l.callStatus === 'Unreachable').length;
    targetDataset.contactedCount = datasetLeads.filter(l => l.callStatus !== 'Uncontacted').length;
    targetDataset.pipelineCount = datasetLeads.filter(l => ['Shows Interest', 'Follow Up', 'Lead / Sale'].includes(l.callStatus)).length;
    targetDataset.closedCount = datasetLeads.filter(l => l.callStatus === 'Lead / Sale').length;
    
    targetDataset.searchHistory.push({
      keyword,
      area,
      resultsCount: savedLeads.length,
      executedAt: new Date()
    });

    await targetDataset.save();

    // 9. Record Scrape Job History
    const job = await ScrapeJob.create({
      keyword,
      area,
      filtersApplied: {
        noWebsiteOnly: isNoWebsite,
        recentlyRegistered: isRecentlyReg,
        maxRating: maxRatingNum,
        strictSearch: isStrict,
        maxResults: boundedMax
      },
      totalExtracted,
      totalQualified: savedLeads.length,
      totalExcluded,
      status: 'completed'
    });

    return {
      jobId: job._id,
      dataset: targetDataset,
      keyword,
      area,
      filtersApplied: {
        noWebsiteOnly: isNoWebsite,
        recentlyRegistered: isRecentlyReg,
        maxRating: maxRatingNum,
        strictSearch: isStrict
      },
      stats: {
        totalExtracted,
        totalQualified: savedLeads.length,
        totalExcluded
      },
      leads: savedLeads
    };
  }
}

module.exports = new GmbScraperService();
