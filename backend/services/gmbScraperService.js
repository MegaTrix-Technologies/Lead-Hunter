const Lead = require('../models/Lead');
const ScrapeJob = require('../models/ScrapeJob');
const crypto = require('crypto');

// Terminal or active contact statuses that must ALWAYS be excluded from extraction
const EXCLUDED_CALL_STATUSES = [
  'IVR',
  'Receptionist',
  'Do Not Call',
  'Shows Interest',
  'Follow Up',
  'Lead / Sale'
];

/**
 * Generates realistic GMB-style profiles based on keyword and area
 */
const generateSimulatedGmbPool = (keyword, area, count = 35) => {
  const city = area.split(',')[0].trim();
  const sanitizedCity = city.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  const prefixes = ['Apex', 'Prime', 'Elite', 'Metro', 'Pro', 'Summit', 'Vanguard', 'Precision', 'Crown', 'Golden', 'True', 'Master', 'Benchmark', 'First Choice', 'All-Star', 'Titan', 'United', 'NextGen', 'Direct', 'Signature'];
  const suffixes = ['Services', 'Solutions', 'Group', 'Specialists', 'Pros', 'Co.', 'Associates', 'Studio', 'Hub', 'Experts', 'Care', 'Works', 'Partners', 'Dynamics', 'Masters'];
  
  const streetNames = ['Main St', 'Market St', 'Broadway', 'Oak Ave', 'Maple Rd', 'Washington Blvd', 'Lincoln Ave', 'Pine St', 'Cedar Ln', 'Commerce Dr', 'Industrial Pkwy', 'Center St'];

  const results = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[(i * 3 + 7) % prefixes.length];
    const suffix = suffixes[(i * 5 + 11) % suffixes.length];
    const businessName = `${prefix} ${keyword} ${suffix}`;
    
    // Deterministic unique placeId
    const placeHash = crypto.createHash('md5').update(`${businessName}-${area}-${i}`).digest('hex');
    const placeId = `gmb_${placeHash.substring(0, 16)}`;
    
    // Rating distribution from 1.5 to 4.9
    const ratingValues = [1.8, 2.4, 2.9, 3.1, 3.4, 3.7, 4.0, 4.2, 4.5, 4.8, 2.7, 3.2, 1.9, 4.6];
    const rating = ratingValues[i % ratingValues.length];
    const reviewCount = Math.floor((15 + (i * 17)) % 140) + 3;

    // Website logic: ~30% have no website to test noWebsiteOnly filter
    const hasWebsite = (i % 3 !== 0);
    const domainName = `${prefix.toLowerCase()}${keyword.replace(/\s+/g, '').toLowerCase()}${sanitizedCity}.com`;
    const website = hasWebsite ? `https://www.${domainName}` : '';
    
    // Email logic: direct contact email
    const emailPrefixes = ['contact', 'info', 'office', 'service', 'admin', 'hello'];
    const emailPrefix = emailPrefixes[i % emailPrefixes.length];
    const email = `${emailPrefix}@${hasWebsite ? domainName : `${prefix.toLowerCase()}${sanitizedCity}.net`}`;
    
    // Phone number logic
    const areaCodes = ['415', '212', '312', '713', '305', '206', '602', '404', '702', '512', '617', '214', '720'];
    const areaCode = areaCodes[i % areaCodes.length];
    const phoneMid = String(100 + ((i * 73) % 899));
    const phoneEnd = String(1000 + ((i * 137) % 8999));
    const phoneNumber = `+1 (${areaCode}) ${phoneMid}-${phoneEnd}`;

    // Registration date: ~25% registered within last 90 days
    const isRecent = (i % 4 === 0);
    const daysAgo = isRecent ? Math.floor(Math.random() * 85) + 2 : Math.floor(Math.random() * 600) + 100;
    const registeredDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Address
    const streetNumber = 100 + (i * 28);
    const street = streetNames[i % streetNames.length];
    const address = `${streetNumber} ${street}, ${area}`;

    // Avatar
    const avatarIndex = (i % 4) + 1;
    const avatarUrl = `https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80`;

    results.push({
      placeId,
      businessName,
      avatarUrl,
      rating,
      reviewCount,
      phoneNumber,
      email,
      website,
      address,
      area,
      category: keyword,
      registeredDate,
      callStatus: 'Uncontacted',
      callNotes: [],
      emailSentCount: 0,
      emailHistory: []
    });
  }

  return results;
};

/**
 * Core Scraping & Extraction Engine with Deduplication & Filter Rules
 */
class GmbScraperService {
  /**
   * Scrapes and filters GMB profiles according to parameters
   */
  async scrapeLeads({ keyword, area, noWebsiteOnly = false, recentlyRegistered = false, maxRating = 5.0, strictSearch = true }) {
    if (!keyword || !area) {
      throw new Error('Keyword/Niche and Area/Location are required parameters.');
    }

    const maxRatingNum = parseFloat(maxRating) || 5.0;
    const isNoWebsite = Boolean(noWebsiteOnly);
    const isRecentlyReg = Boolean(recentlyRegistered);
    const isStrict = Boolean(strictSearch);

    // 1. Fetch raw candidate pool
    const rawCandidates = generateSimulatedGmbPool(keyword, area, 40);
    const totalExtracted = rawCandidates.length;

    // 2. Query MongoDB for existing records in this area/category or with matching placeIds
    const placeIds = rawCandidates.map(c => c.placeId);
    const existingDbLeads = await Lead.find({
      $or: [
        { placeId: { $in: placeIds } },
        { area: new RegExp(`^${area.split(',')[0].trim()}$`, 'i'), category: new RegExp(`^${keyword.trim()}$`, 'i') }
      ]
    }).lean();

    const existingMap = new Map();
    existingDbLeads.forEach(lead => {
      existingMap.set(lead.placeId, lead);
      existingMap.set(`${lead.businessName.toLowerCase()}_${lead.area.toLowerCase()}`, lead);
    });

    // 3. Deduplication & Exclusion Logic
    // NEVER extract or display businesses previously tagged with terminal or active call statuses
    let totalExcluded = 0;
    const qualifiedList = [];
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    for (const candidate of rawCandidates) {
      // Check if lead already exists in DB
      const existingInDb = existingMap.get(candidate.placeId) || 
                           existingMap.get(`${candidate.businessName.toLowerCase()}_${candidate.area.toLowerCase()}`);

      if (existingInDb) {
        // If it was already contacted or tagged with any terminal status, completely exclude it!
        if (EXCLUDED_CALL_STATUSES.includes(existingInDb.callStatus)) {
          totalExcluded++;
          continue;
        }
      }

      // 4. Apply Multi-Parameter Filters
      let passesNoWebsite = true;
      if (isNoWebsite) {
        passesNoWebsite = (!candidate.website || candidate.website.trim() === '');
      }

      let passesRating = true;
      if (maxRatingNum < 5.0) {
        passesRating = (candidate.rating <= maxRatingNum);
      }

      let passesRecent = true;
      if (isRecentlyReg) {
        passesRecent = (new Date(candidate.registeredDate) >= ninetyDaysAgo);
      }

      // Check matching score
      const passesAllStrict = passesNoWebsite && passesRating && passesRecent;

      if (isStrict) {
        if (passesAllStrict) {
          qualifiedList.push(existingInDb ? { ...candidate, ...existingInDb } : candidate);
        }
      } else {
        // Relaxed mode: if strict filters are hard to meet, include leads matching rating and website first
        if (passesNoWebsite && passesRating) {
          qualifiedList.push(existingInDb ? { ...candidate, ...existingInDb } : candidate);
        } else if (passesRating) {
          qualifiedList.push(existingInDb ? { ...candidate, ...existingInDb } : candidate);
        }
      }
    }

    // 5. Persist qualified new leads to DB if they don't already exist
    const savedLeads = [];
    for (const leadData of qualifiedList) {
      try {
        const existing = await Lead.findOne({ placeId: leadData.placeId });
        if (!existing) {
          const newLead = await Lead.create(leadData);
          savedLeads.push(newLead);
        } else {
          savedLeads.push(existing);
        }
      } catch (err) {
        // If duplicate key error, fetch existing
        const existing = await Lead.findOne({ placeId: leadData.placeId });
        if (existing) savedLeads.push(existing);
      }
    }

    // 6. Record Scrape Job History
    const job = await ScrapeJob.create({
      keyword,
      area,
      filtersApplied: {
        noWebsiteOnly: isNoWebsite,
        recentlyRegistered: isRecentlyReg,
        maxRating: maxRatingNum,
        strictSearch: isStrict
      },
      totalExtracted,
      totalQualified: savedLeads.length,
      totalExcluded,
      status: 'completed'
    });

    return {
      jobId: job._id,
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
