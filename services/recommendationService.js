/**
 * recommendationService.js - T2YD Location-Aware Recommendation Engine
 * 
 * Implements role-based feeds, regional location-priority ranking,
 * strict vs broader filtering, and eligibility checks.
 */

const Lorry = require('../models/Lorry');
const Delivery = require('../models/Delivery');
const Request = require('../models/Request');
const locationService = require('./locationService');

/**
 * Get role-based recommendations
 * 
 * @param {Object} options
 * @param {string} options.userRole - 'transporter' | 'shipper' | null
 * @param {string} options.userId - current user id (if authenticated)
 * @param {Object} options.region - { city, district, state, pincode, lat, lng }
 * @param {boolean} options.strict - strict region filter flag (default true)
 * @param {string} options.tab - 'trucks' | 'loads' (for guests)
 * @param {string} options.query - search text query
 * @param {string} options.filter - vehicle type or weight filter
 * @param {number} options.page - 1-based page
 * @param {number} options.limit - items per page
 */
async function getRecommendations(options = {}) {
  const {
    userRole = null,
    userId = null,
    region = null,
    strict = true,
    tab = null,
    query = '',
    filter = 'all',
    page = 1,
    limit = 20
  } = options;

  // Determine feed category based on authenticated user role:
  // - Transporters (drivers/truck owners) MUST see loads posted by shippers
  // - Shippers MUST see trucks posted by transporters
  // - Guests can choose between both
  let targetCategory;
  if (userRole === 'transporter') {
    targetCategory = 'loads';
  } else if (userRole === 'shipper') {
    targetCategory = 'trucks';
  } else {
    targetCategory = (tab === 'loads' || tab === 'deliveries') ? 'loads' : 'trucks';
  }

  const parsedRegion = locationService.parseLocation(region);
  const hasRegion = Boolean(parsedRegion && (parsedRegion.city || parsedRegion.district || parsedRegion.state));

  let rawListings = [];

  if (targetCategory === 'loads') {
    // DRIVER / TRANSPORTER FEED: Available Loads requiring transportation
    // Only eligible, pending loads (exclude in-transit, delivered, cancelled)
    const baseFilter = {
      status: 'pending'
    };

    // If text query provided
    if (query && query.trim()) {
      const q = query.trim();
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseFilter.$or = [
        { pickupLocation: { $regex: esc, $options: 'i' } },
        { dropLocation: { $regex: esc, $options: 'i' } },
        { goodsType: { $regex: esc, $options: 'i' } },
        { description: { $regex: esc, $options: 'i' } }
      ];
    }

    // Fetch active loads
    const loads = await Delivery.find(baseFilter)
      .populate('shipper', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Map and score loads based on region
    rawListings = loads.map(load => {
      const match = evaluateLoadRelevance(load, parsedRegion);
      return {
        ...load,
        itemType: 'load',
        matchTier: match.matchTier,
        relevanceScore: match.score,
        distanceKm: match.distanceKm,
        isRegionalMatch: match.isMatch
      };
    });

  } else {
    // SHIPPER FEED: Available Trucks posted by Transporters
    // Only eligible trucks (exclude offline or deleted)
    const baseFilter = {
      status: { $in: ['available', 'busy'] }
    };

    if (query && query.trim()) {
      const q = query.trim();
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseFilter.$or = [
        { location: { $regex: esc, $options: 'i' } },
        { vehicleType: { $regex: esc, $options: 'i' } },
        { vehicleNumber: { $regex: esc, $options: 'i' } },
        { ownerName: { $regex: esc, $options: 'i' } },
        { description: { $regex: esc, $options: 'i' } }
      ];
    }

    const trucks = await Lorry.find(baseFilter)
      .populate('transporter', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Map and score trucks based on region
    rawListings = trucks.map(truck => {
      const match = evaluateTruckRelevance(truck, parsedRegion);
      return {
        ...truck,
        itemType: 'truck',
        matchTier: match.matchTier,
        relevanceScore: match.score,
        distanceKm: match.distanceKm,
        isRegionalMatch: match.isMatch
      };
    });
  }

  // Quick Filter Chips (Vehicle Type, Weight, etc.)
  if (filter && filter !== 'all') {
    const f = filter.toLowerCase().trim();
    rawListings = rawListings.filter(item => {
      if (item.itemType === 'truck') {
        const vType = (item.vehicleType || '').toLowerCase();
        const cap = parseFloat(item.capacity || 0);
        if (f === '10+ tons') return cap >= 10;
        return vType.includes(f);
      } else {
        const gType = (item.goodsType || '').toLowerCase();
        const wt = parseFloat(item.weight || 0);
        if (f === '10+ tons') return wt >= 10000;
        return gType.includes(f);
      }
    });
  }

  // Apply Region Filter & Ranking:
  // If strict is enabled and user has chosen a region:
  // Only keep matches where pickup / truck location matches the region (EXACT, DISTRICT, or NEARBY <= 60km)
  let eligibleListings = rawListings;
  if (hasRegion && strict) {
    eligibleListings = rawListings.filter(item => {
      return (
        item.matchTier === 'EXACT' ||
        item.matchTier === 'DISTRICT' ||
        (item.matchTier === 'NEARBY' && item.distanceKm !== null && item.distanceKm <= 60)
      );
    });
  }

  // Sort by Recommendation Hierarchy:
  // 1. Relevance Score (Location relevance: EXACT > DISTRICT > NEARBY > STATE > OTHER)
  // 2. Recency (createdAt timestamp)
  eligibleListings.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // Pagination
  const totalCount = eligibleListings.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedItems = eligibleListings.slice(startIndex, startIndex + limitNum);
  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    targetCategory,
    userRole,
    listings: paginatedItems,
    totalCount,
    page: pageNum,
    totalPages,
    hasMore: pageNum < totalPages,
    activeRegion: parsedRegion,
    isStrict: Boolean(strict),
    hasRegion
  };
}

/**
 * Evaluate Load Relevance for Driver
 * A driver wants to see loads originating in their operating region.
 */
function evaluateLoadRelevance(load, userRegion) {
  const pickup = load.pickupLocation || (load.exactPickup && load.exactPickup.address) || '';
  const exact = load.exactPickup || null;
  return locationService.evaluateLocationMatch(userRegion, pickup, exact);
}

/**
 * Evaluate Truck Relevance for Shipper
 * A shipper wants to find available trucks located near their cargo pickup.
 */
function evaluateTruckRelevance(truck, userRegion) {
  const truckLoc = truck.location || '';
  return locationService.evaluateLocationMatch(userRegion, truckLoc, null);
}

module.exports = {
  getRecommendations,
  evaluateLoadRelevance,
  evaluateTruckRelevance
};
