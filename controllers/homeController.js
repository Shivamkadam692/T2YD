const Lorry = require('../models/Lorry');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const recommendationService = require('../services/recommendationService');
const locationService = require('../services/locationService');

/**
 * Helper to resolve user operating region from query, session, or profile
 */
async function resolveUserOperatingRegion(req) {
  // 1. Explicit query param
  if (req.query.region || req.query.city) {
    const raw = req.query.region || req.query.city;
    return locationService.parseLocation(raw);
  }
  // 2. Session preference
  if (req.session && req.session.exploreLocation) {
    return req.session.exploreLocation;
  }
  // 3. Authenticated user profile preference
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).lean();
      if (user && user.operatingRegion && (user.operatingRegion.city || user.operatingRegion.district)) {
        return locationService.parseLocation(user.operatingRegion);
      }
    } catch (e) {
      console.warn('Error reading user operatingRegion:', e.message);
    }
  }
  return null;
}

/**
 * Render home page
 */
exports.getHome = async (req, res) => {
  try {
    const isTransporter = req.session?.userId && req.session.userRole === 'transporter';
    const lorryQuery = isTransporter 
      ? Lorry.find({ transporter: req.session.userId }).lean() 
      : Lorry.find().lean();
    
    const [lorries, deliveries] = await Promise.all([
      lorryQuery,
      Delivery.find().lean()
    ]);
    
    res.render('index', { lorries, deliveries });
  } catch (error) {
    console.error('Error in getHome:', error);
    res.status(500).render('error', { message: 'Unable to load home page' });
  }
};

/**
 * Render Explore Transport Opportunities Feed
 */
exports.getExplore = async (req, res) => {
  try {
    const userRole = req.session?.userRole || (res.locals.user ? res.locals.user.role : null);
    const userId = req.session?.userId || (res.locals.user ? res.locals.user._id : null);
    
    // Resolve user's operating region
    const savedRegion = await resolveUserOperatingRegion(req);
    const hasRegion = Boolean(savedRegion && (savedRegion.city || savedRegion.district));
    const isStrict = req.query.strict !== undefined ? (req.query.strict === 'true' || req.query.strict === '1') : true;
    
    const initialTab = req.query.tab || (userRole === 'transporter' ? 'loads' : 'trucks');
    const initialQuery = (req.query.query || req.query.q || '').trim();
    const filter = (req.query.filter || 'all').trim();
    
    // Fetch recommendation feed
    const feed = await recommendationService.getRecommendations({
      userRole,
      userId,
      region: savedRegion,
      strict: isStrict,
      tab: initialTab,
      query: initialQuery,
      filter,
      page: 1,
      limit: 30
    });
    
    res.render('explore', {
      listings: feed.listings || [],
      category: feed.targetCategory,
      totalCount: feed.totalCount,
      page: feed.page,
      totalPages: feed.totalPages,
      hasMore: feed.hasMore,
      activeRegion: feed.activeRegion || { formatted: 'All Regions' },
      isStrict: feed.isStrict,
      hasRegion,
      needsLocationPrompt: !hasRegion,
      initialTab: feed.targetCategory,
      initialQuery,
      filter,
      userRole,
      title: 'Explore Transport Opportunities | T2YD'
    });
  } catch (error) {
    console.error('Error in getExplore:', error);
    res.status(500).render('error', { message: 'Unable to load explore page' });
  }
};

/**
 * API: Get JSON Explore Feed (for AJAX location changes, filtering, pagination)
 */
exports.getExploreFeed = async (req, res) => {
  try {
    const userRole = req.session?.userRole || (res.locals.user ? res.locals.user.role : null);
    const userId = req.session?.userId || (res.locals.user ? res.locals.user._id : null);
    
    let region = null;
    if (req.query.city || req.query.district || req.query.state || req.query.region) {
      region = locationService.parseLocation({
        city: req.query.city || req.query.region,
        district: req.query.district,
        state: req.query.state,
        pincode: req.query.pincode,
        lat: req.query.lat,
        lng: req.query.lng
      });
    } else {
      region = await resolveUserOperatingRegion(req);
    }
    
    const isStrict = req.query.strict !== undefined ? (req.query.strict === 'true' || req.query.strict === '1') : true;
    const tab = req.query.tab || (userRole === 'transporter' ? 'loads' : 'trucks');
    const query = (req.query.query || req.query.q || '').trim();
    const filter = (req.query.filter || 'all').trim();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const feed = await recommendationService.getRecommendations({
      userRole,
      userId,
      region,
      strict: isStrict,
      tab,
      query,
      filter,
      page,
      limit
    });
    
    res.json({
      success: true,
      category: feed.targetCategory,
      listings: feed.listings,
      totalCount: feed.totalCount,
      page: feed.page,
      totalPages: feed.totalPages,
      hasMore: feed.hasMore,
      activeRegion: feed.activeRegion,
      isStrict: feed.isStrict,
      hasRegion: feed.hasRegion,
      userRole
    });
  } catch (error) {
    console.error('Error in getExploreFeed API:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch explore feed' });
  }
};

/**
 * API: Save Selected Operating Region Preference
 */
exports.saveExploreLocation = async (req, res) => {
  try {
    const { city, district, state, pincode, lat, lng, address, strict } = req.body;
    
    if (!city && !district && !address) {
      return res.status(400).json({ success: false, error: 'Valid city or region is required' });
    }
    
    const parsed = locationService.parseLocation({
      city: city || address,
      district,
      state,
      pincode,
      lat,
      lng,
      address
    });
    
    const isStrict = strict !== undefined ? Boolean(strict) : true;
    parsed.strict = isStrict;
    
    // Save to session
    req.session.exploreLocation = parsed;
    
    // If authenticated, persist to User document without overwriting permanent address
    if (req.session?.userId) {
      await User.findByIdAndUpdate(req.session.userId, {
        operatingRegion: {
          city: parsed.city,
          district: parsed.district,
          state: parsed.state,
          pincode: parsed.pincode,
          lat: parsed.lat,
          lng: parsed.lng,
          address: parsed.formatted,
          strict: isStrict,
          updatedAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Operating location saved successfully',
      region: parsed
    });
  } catch (error) {
    console.error('Error in saveExploreLocation:', error);
    res.status(500).json({ success: false, error: 'Failed to save location' });
  }
};

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Handle search
 */
exports.search = async (req, res) => {
  try {
    const rawQuery = (req.query.query || req.query.q || '').trim();
    const filterType = (req.query.type || 'all').toLowerCase();

    // If query is empty, return latest active records as a discovery feed
    if (!rawQuery) {
      const [allLorries, allDeliveries] = await Promise.all([
        Lorry.find({ status: { $ne: 'offline' } }).sort({ createdAt: -1 }).limit(18).lean(),
        Delivery.find({ status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).limit(18).lean()
      ]);

      let results = [];
      if (filterType === 'lorry' || filterType === 'lorries') {
        results = allLorries;
      } else if (filterType === 'delivery' || filterType === 'deliveries') {
        results = allDeliveries;
      } else {
        results = [...allLorries, ...allDeliveries];
      }

      return res.render('searchResults', {
        results,
        query: '',
        totalCount: allLorries.length + allDeliveries.length,
        lorryCount: allLorries.length,
        deliveryCount: allDeliveries.length,
        filterType
      });
    }

    const cleanQuery = escapeRegex(rawQuery);
    const words = rawQuery
      .replace(/\b(to|in|from|for|at|the|and)\b/gi, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const numericMatch = rawQuery.match(/(\d+(\.\d+)?)/);
    const numericVal = numericMatch ? parseFloat(numericMatch[1]) : null;
    const rawAlphaNum = rawQuery.replace(/[^a-zA-Z0-9]/g, '');

    // 1. Build Lorry Search Conditions
    const lorryOrConditions = [
      { location: { $regex: cleanQuery, $options: 'i' } },
      { vehicleType: { $regex: cleanQuery, $options: 'i' } },
      { vehicleNumber: { $regex: cleanQuery, $options: 'i' } },
      { ownerName: { $regex: cleanQuery, $options: 'i' } },
      { description: { $regex: cleanQuery, $options: 'i' } },
      { contact: { $regex: cleanQuery, $options: 'i' } }
    ];

    if (rawAlphaNum && rawAlphaNum.length >= 2) {
      lorryOrConditions.push({
        vehicleNumber: { $regex: escapeRegex(rawAlphaNum), $options: 'i' }
      });
    }

    if (numericVal !== null && !isNaN(numericVal)) {
      lorryOrConditions.push({
        capacity: { $gte: Math.max(0, numericVal - 2), $lte: numericVal + 5 }
      });
    }

    let lorryQueryFilter = { $or: lorryOrConditions };

    if (words.length > 1) {
      const tokenConditions = words.map(w => {
        const esc = escapeRegex(w);
        const subConds = [
          { location: { $regex: esc, $options: 'i' } },
          { vehicleType: { $regex: esc, $options: 'i' } },
          { vehicleNumber: { $regex: esc, $options: 'i' } },
          { ownerName: { $regex: esc, $options: 'i' } },
          { description: { $regex: esc, $options: 'i' } }
        ];
        const n = parseFloat(w);
        if (!isNaN(n)) {
          subConds.push({ capacity: { $gte: Math.max(0, n - 2), $lte: n + 5 } });
        }
        return { $or: subConds };
      });

      lorryQueryFilter = {
        $or: [
          { $or: lorryOrConditions },
          { $and: tokenConditions }
        ]
      };
    }

    // 2. Build Delivery Search Conditions
    const deliveryOrConditions = [
      { pickupLocation: { $regex: cleanQuery, $options: 'i' } },
      { dropLocation: { $regex: cleanQuery, $options: 'i' } },
      { 'exactPickup.address': { $regex: cleanQuery, $options: 'i' } },
      { 'exactDrop.address': { $regex: cleanQuery, $options: 'i' } },
      { goodsType: { $regex: cleanQuery, $options: 'i' } },
      { shipperName: { $regex: cleanQuery, $options: 'i' } },
      { description: { $regex: cleanQuery, $options: 'i' } },
      { contact: { $regex: cleanQuery, $options: 'i' } }
    ];

    if (numericVal !== null && !isNaN(numericVal)) {
      deliveryOrConditions.push(
        { weight: { $gte: Math.max(0, numericVal - 2), $lte: numericVal + 5 } },
        { weight: { $gte: Math.max(0, (numericVal * 1000) - 2000), $lte: (numericVal * 1000) + 5000 } }
      );
    }

    let deliveryQueryFilter = { $or: deliveryOrConditions };

    if (words.length > 1) {
      const tokenConditions = words.map(w => {
        const esc = escapeRegex(w);
        return {
          $or: [
            { pickupLocation: { $regex: esc, $options: 'i' } },
            { dropLocation: { $regex: esc, $options: 'i' } },
            { 'exactPickup.address': { $regex: esc, $options: 'i' } },
            { 'exactDrop.address': { $regex: esc, $options: 'i' } },
            { goodsType: { $regex: esc, $options: 'i' } },
            { shipperName: { $regex: esc, $options: 'i' } },
            { description: { $regex: esc, $options: 'i' } }
          ]
        };
      });

      deliveryQueryFilter = {
        $or: [
          { $or: deliveryOrConditions },
          { $and: tokenConditions }
        ]
      };
    }

    // 3. Execute queries based on filterType
    const [lorryResults, deliveryResults] = await Promise.all([
      Lorry.find(lorryQueryFilter).lean(),
      Delivery.find(deliveryQueryFilter).lean()
    ]);

    let results = [];
    if (filterType === 'lorry' || filterType === 'lorries') {
      results = lorryResults;
    } else if (filterType === 'delivery' || filterType === 'deliveries') {
      results = deliveryResults;
    } else {
      results = [...lorryResults, ...deliveryResults];
    }

    res.render('searchResults', {
      results,
      query: rawQuery,
      totalCount: lorryResults.length + deliveryResults.length,
      lorryCount: lorryResults.length,
      deliveryCount: deliveryResults.length,
      filterType
    });
  } catch (error) {
    console.error('Search error:', error);
    res.render('searchResults', {
      results: [],
      query: req.query.query || req.query.q || '',
      totalCount: 0,
      lorryCount: 0,
      deliveryCount: 0,
      filterType: req.query.type || 'all',
      error: 'An unexpected error occurred during search. Please try again with different keywords.'
    });
  }
};

