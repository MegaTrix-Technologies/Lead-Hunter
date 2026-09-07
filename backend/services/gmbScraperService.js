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
  'Closer Follow Up',
  'Lead / Sale',
  'Lead',
  'processing',
  'sale'
];

// ────────────────────────────────────────────────────────────
//  Pakistan Defaults — All searches are restricted to PK
// ────────────────────────────────────────────────────────────
const PAKISTAN_CENTER = { latitude: 31.5204, longitude: 74.3587 }; // Lahore center default
const REGION_CODE = 'pk';

// Known city coordinates for locationBias centering (expandable)
const CITY_COORDS = {
  'lahore':    { latitude: 31.5204, longitude: 74.3587 },
  'karachi':   { latitude: 24.8607, longitude: 67.0011 },
  'islamabad': { latitude: 33.6844, longitude: 73.0479 },
  'rawalpindi': { latitude: 33.5651, longitude: 73.0169 },
  'faisalabad': { latitude: 31.4504, longitude: 73.1350 },
  'multan':    { latitude: 30.1575, longitude: 71.5249 },
  'peshawar':  { latitude: 34.0151, longitude: 71.5249 },
  'quetta':    { latitude: 30.1798, longitude: 66.9750 },
  'sialkot':   { latitude: 32.4945, longitude: 74.5229 },
  'gujranwala': { latitude: 32.1877, longitude: 74.1945 },
};

/**
 * Extract the parent city name from an area string
 * e.g. "DHA Phase 5, Lahore" → "Lahore"
 *      "Gulberg III, Lahore, Pakistan" → "Lahore"
 *      "Johar Town" → null (no comma, can't extract city)
 */
function extractCity(area) {
  if (!area) return null;
  const parts = area.split(',').map(p => p.trim()).filter(Boolean);
  // Walk backwards — skip "Pakistan", take first non-generic part
  for (let i = parts.length - 1; i >= 1; i--) {
    const lower = parts[i].toLowerCase();
    if (lower === 'pakistan' || lower === 'pk') continue;
    // Check if it's a known city
    if (CITY_COORDS[lower]) return parts[i];
    // Accept anything that looks like a city name (not the sub-area itself)
    if (i >= 1) return parts[i];
  }
  return null;
}

/**
 * Get coordinates for a city (defaults to Lahore if unknown)
 */
function getCityCoords(cityName) {
  if (!cityName) return PAKISTAN_CENTER;
  const lower = cityName.toLowerCase().trim();
  return CITY_COORDS[lower] || PAKISTAN_CENTER;
}

class GmbScraperService {
  /**
   * Execute a single page of Google Places Text Search (New)
   * Returns { places: [], nextPageToken: string|null }
   */
  async _searchPage(apiKey, payload) {
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
    return {
      places: response.data.places || [],
      nextPageToken: response.data.nextPageToken || null
    };
  }

  /**
   * Fetch ALL pages for a single query (up to maxPages pages)
   * Deduplicates by place.id against the seenIds set
   */
  async _fetchAllPages(apiKey, basePayload, maxPages, seenIds) {
    const collected = [];
    let pageToken = null;
    let pageCount = 0;

    while (pageCount < maxPages) {
      pageCount++;
      const payload = { ...basePayload, pageSize: 20 };
      if (pageToken) {
        payload.pageToken = pageToken;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Google token activation latency
      }

      try {
        const result = await this._searchPage(apiKey, payload);
        let newCount = 0;

        for (const place of result.places) {
          if (!seenIds.has(place.id)) {
            seenIds.add(place.id);
            collected.push(place);
            newCount++;
          }
        }

        console.log(`[MegaTrix GMB Live]   Page ${pageCount}: ${result.places.length} results, ${newCount} new (cumulative unique: ${collected.length})`);

        pageToken = result.nextPageToken;
        if (!pageToken || result.places.length === 0) break;
      } catch (err) {
        console.error(`[MegaTrix GMB Live]   Page ${pageCount} error:`, err.response?.data?.error?.message || err.message);
        break;
      }
    }

    return collected;
  }

  /**
   * Multi-Stage Broadened Search — fetches real live Google Places profiles
   * 
   * Stage 1: Exact area query "{keyword} in {area}" — catches precisely tagged businesses
   * Stage 2: City-level query "{keyword} in {city}" + locationBias (10km) — catches nearby businesses  
   * Stage 3: Keyword-only query "{keyword}" + locationBias (20km) — maximum geographic reach
   * 
   * All stages are restricted to Pakistan (regionCode: 'pk')
   * Deduplication happens across all stages via place.id
   */
  async fetchLiveGooglePlaces(keyword, area, maxResults = 10) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.Key;
    if (!apiKey) {
      throw new Error('Google Places API key is missing. Please set GOOGLE_PLACES_API_KEY in .env');
    }

    const boundedMax = Math.min(100, Math.max(1, parseInt(maxResults, 10) || 10));
    const seenIds = new Set();
    const allPlaces = [];

    // Determine city and coordinates for locationBias
    const city = extractCity(area);
    const coords = getCityCoords(city);

    console.log(`[MegaTrix GMB Live] ═══ Multi-Stage Broadened Search ═══`);
    console.log(`[MegaTrix GMB Live] Keyword: "${keyword}" | Area: "${area}" | City: "${city || 'default (Lahore)'}" | Target: ${boundedMax} profiles`);

    // ─── STAGE 1: Exact area query with locationBias ─────────────
    console.log(`[MegaTrix GMB Live] ── Stage 1: Primary query "${keyword} in ${area}" + 12km bias ──`);
    const stage1Payload = {
      textQuery: `${keyword} in ${area}`,
      regionCode: REGION_CODE,
      locationBias: {
        circle: {
          center: coords,
          radius: 12000.0
        }
      }
    };

    const stage1Pages = Math.min(3, Math.ceil(boundedMax / 20));
    const stage1Results = await this._fetchAllPages(apiKey, stage1Payload, stage1Pages, seenIds);
    allPlaces.push(...stage1Results);
    console.log(`[MegaTrix GMB Live] Stage 1 complete: ${stage1Results.length} unique profiles`);

    // ─── STAGE 2: City-level query with locationBias (10km) ──────
    if (allPlaces.length < boundedMax && city) {
      const cityQuery = `${keyword} in ${city}`;
      console.log(`[MegaTrix GMB Live] ── Stage 2: City broadened "${cityQuery}" + 10km bias ──`);

      const stage2Payload = {
        textQuery: cityQuery,
        regionCode: REGION_CODE,
        locationBias: {
          circle: {
            center: coords,
            radius: 10000.0
          }
        }
      };

      const stage2Pages = Math.min(3, Math.ceil((boundedMax - allPlaces.length) / 20));
      const stage2Results = await this._fetchAllPages(apiKey, stage2Payload, stage2Pages, seenIds);
      allPlaces.push(...stage2Results);
      console.log(`[MegaTrix GMB Live] Stage 2 complete: ${stage2Results.length} new profiles (total: ${allPlaces.length})`);
    }

    // ─── STAGE 3: Keyword-only with wide locationBias (20km) ─────
    if (allPlaces.length < boundedMax) {
      console.log(`[MegaTrix GMB Live] ── Stage 3: Wide bias "${keyword}" + 20km radius ──`);

      const stage3Payload = {
        textQuery: keyword,
        regionCode: REGION_CODE,
        locationBias: {
          circle: {
            center: coords,
            radius: 20000.0
          }
        }
      };

      const stage3Pages = Math.min(3, Math.ceil((boundedMax - allPlaces.length) / 20));
      const stage3Results = await this._fetchAllPages(apiKey, stage3Payload, stage3Pages, seenIds);
      allPlaces.push(...stage3Results);
      console.log(`[MegaTrix GMB Live] Stage 3 complete: ${stage3Results.length} new profiles (total: ${allPlaces.length})`);
    }

    console.log(`[MegaTrix GMB Live] ═══ Final Result: ${allPlaces.length} unique profiles extracted ═══`);
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
    datasetDescription = '',
    user = null
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
        searchHistory: [],
        createdBy: user ? user._id : null,
        createdByName: user ? user.name : 'Super Admin'
      });
    }

    // 2. Fetch real live candidate pool via multi-stage broadened search
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
        datasetIds: [targetDataset._id],
        extractedBy: user ? user._id : null,
        extractedByName: user ? user.name : 'Super Admin'
      };
    });

    // 4. Query MongoDB for existing records, DNC blacklists, and terminal exclusions
    const placeIds = rawCandidates.map(c => c.placeId).filter(Boolean);
    const phoneNumbers = rawCandidates
      .map(c => c.phoneNumber ? c.phoneNumber.replace(/\s+/g, '') : '')
      .filter(Boolean);

    const orConditions = [
      { placeId: { $in: placeIds } },
      { area: new RegExp(`^${area.split(',')[0].trim()}$`, 'i'), businessName: { $in: rawCandidates.map(c => c.businessName) } }
    ];

    if (phoneNumbers.length > 0) {
      orConditions.push({ phoneNumber: { $in: phoneNumbers } });
    }

    const existingDbLeads = await Lead.find({ $or: orConditions }).lean();

    const existingMap = new Map();
    const existingPhoneMap = new Map();

    existingDbLeads.forEach(lead => {
      if (lead.placeId) existingMap.set(lead.placeId, lead);
      if (lead.phoneNumber) {
        const cleanPhone = lead.phoneNumber.replace(/\s+/g, '');
        existingPhoneMap.set(cleanPhone, lead);
      }
      existingMap.set(`${lead.businessName.toLowerCase()}_${lead.area.toLowerCase()}`, lead);
    });

    // 5. Deduplication & Terminal Status Exclusion Logic
    let totalExcluded = 0;
    const qualifiedList = [];
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    for (const candidate of rawCandidates) {
      const cleanCandidatePhone = candidate.phoneNumber ? candidate.phoneNumber.replace(/\s+/g, '') : '';
      const existingInDb = existingMap.get(candidate.placeId) || 
                           (cleanCandidatePhone && existingPhoneMap.get(cleanCandidatePhone)) ||
                           existingMap.get(`${candidate.businessName.toLowerCase()}_${candidate.area.toLowerCase()}`);

      if (existingInDb) {
        // STRICT DNC CHECK: If ever marked Do Not Call, permanently exclude across all users!
        if (existingInDb.callStatus === 'Do Not Call') {
          console.log(`[MegaTrix GMB Live] DNC Opt-Out Skipped: "${candidate.businessName}" (${candidate.phoneNumber || candidate.placeId})`);
          totalExcluded++;
          continue;
        }

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

      // 6. Apply User Filters
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
      status: 'completed',
      userId: user ? user._id : null,
      userName: user ? user.name : 'Super Admin'
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
