/**
 * locationService.js - T2YD Location Normalization & Matching Engine
 * 
 * Provides robust location normalization, Indian district-to-state resolution,
 * spelling variant normalization, Haversine geographic distance calculation,
 * and regional match classification.
 */

// Known Major Logistics Hubs Centroid Coordinates (Lat, Lng) in India
const KNOWN_COORDINATES = {
  'nanded': { lat: 19.1383, lng: 77.3210, district: 'Nanded', state: 'Maharashtra' },
  'mumbai': { lat: 19.0760, lng: 72.8777, district: 'Mumbai', state: 'Maharashtra' },
  'pune': { lat: 18.5204, lng: 73.8567, district: 'Pune', state: 'Maharashtra' },
  'nagpur': { lat: 21.1458, lng: 79.0882, district: 'Nagpur', state: 'Maharashtra' },
  'nashik': { lat: 19.9975, lng: 73.7898, district: 'Nashik', state: 'Maharashtra' },
  'chhatrapati sambhaji nagar': { lat: 19.8762, lng: 75.3433, district: 'Chhatrapati Sambhaji Nagar', state: 'Maharashtra' },
  'aurangabad': { lat: 19.8762, lng: 75.3433, district: 'Chhatrapati Sambhaji Nagar', state: 'Maharashtra' },
  'solapur': { lat: 17.6599, lng: 75.9064, district: 'Solapur', state: 'Maharashtra' },
  'kolhapur': { lat: 16.7050, lng: 74.2433, district: 'Kolhapur', state: 'Maharashtra' },
  'latur': { lat: 18.4088, lng: 76.5604, district: 'Latur', state: 'Maharashtra' },
  'parbhani': { lat: 19.2686, lng: 76.7708, district: 'Parbhani', state: 'Maharashtra' },
  'jalna': { lat: 19.8410, lng: 75.8864, district: 'Jalna', state: 'Maharashtra' },
  'amravati': { lat: 20.9374, lng: 77.7796, district: 'Amravati', state: 'Maharashtra' },
  'akola': { lat: 20.7002, lng: 77.0082, district: 'Akola', state: 'Maharashtra' },
  'ahilyanagar': { lat: 19.0948, lng: 74.7480, district: 'Ahilyanagar', state: 'Maharashtra' },
  'ahmednagar': { lat: 19.0948, lng: 74.7480, district: 'Ahilyanagar', state: 'Maharashtra' },
  'dharashiv': { lat: 18.1853, lng: 76.0419, district: 'Dharashiv', state: 'Maharashtra' },
  'osmanabad': { lat: 18.1853, lng: 76.0419, district: 'Dharashiv', state: 'Maharashtra' },
  'delhi': { lat: 28.6139, lng: 77.2090, district: 'Delhi', state: 'Delhi' },
  'new delhi': { lat: 28.6139, lng: 77.2090, district: 'Delhi', state: 'Delhi' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, district: 'Hyderabad', state: 'Telangana' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, district: 'Bengaluru', state: 'Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, district: 'Bengaluru', state: 'Karnataka' },
  'chennai': { lat: 13.0827, lng: 80.2707, district: 'Chennai', state: 'Tamil Nadu' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, district: 'Ahmedabad', state: 'Gujarat' },
  'surat': { lat: 21.1702, lng: 72.8311, district: 'Surat', state: 'Gujarat' },
  'vadodara': { lat: 22.3072, lng: 73.1812, district: 'Vadodara', state: 'Gujarat' },
  'jaipur': { lat: 26.9124, lng: 75.7873, district: 'Jaipur', state: 'Rajasthan' },
  'indore': { lat: 22.7196, lng: 75.8577, district: 'Indore', state: 'Madhya Pradesh' },
  'bhopal': { lat: 23.2599, lng: 77.4126, district: 'Bhopal', state: 'Madhya Pradesh' },
  'lucknow': { lat: 26.8467, lng: 80.9462, district: 'Lucknow', state: 'Uttar Pradesh' },
  'kanpur': { lat: 26.4499, lng: 80.3319, district: 'Kanpur', state: 'Uttar Pradesh' },
  'kolkata': { lat: 22.5726, lng: 88.3639, district: 'Kolkata', state: 'West Bengal' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, district: 'Chandigarh', state: 'Chandigarh' }
};

// Aliases and Synonyms mapping for equivalent location formats
const LOCATION_ALIASES = {
  'bombay': 'mumbai',
  'poona': 'pune',
  'aurangabad': 'chhatrapati sambhaji nagar',
  'sambhaji nagar': 'chhatrapati sambhaji nagar',
  'osmanabad': 'dharashiv',
  'ahmednagar': 'ahilyanagar',
  'bangalore': 'bengaluru',
  'madras': 'chennai',
  'calcutta': 'kolkata',
  'baroda': 'vadodara',
  'nasik': 'nashik',
  'cochin': 'kochi',
  'vizag': 'visakhapatnam',
  'nanded waghala': 'nanded',
  'nandigram': 'nanded'
};

// Indian States and Union Territories list for matching
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry'
];

/**
 * Standardize text: lowercase, remove punctuation, collapse whitespace
 */
function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[,\-_/\\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve an alias or spelling variant
 */
function resolveAlias(raw) {
  const cleaned = cleanText(raw);
  return LOCATION_ALIASES[cleaned] || cleaned;
}

/**
 * Extract 6-digit Indian PIN code from address
 */
function extractPincode(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/\b([1-9][0-9]{5})\b/);
  return match ? match[1] : null;
}

/**
 * Calculate Haversine geographic distance between two coordinates in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  
  const nLat1 = parseFloat(lat1);
  const nLon1 = parseFloat(lon1);
  const nLat2 = parseFloat(lat2);
  const nLon2 = parseFloat(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return null;
  }

  // Same point
  if (nLat1 === nLat2 && nLon1 === nLon2) return 0;

  const R = 6371; // Earth radius in kilometers
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

/**
 * Parse arbitrary location string or object into structured fields:
 * { city, district, state, pincode, lat, lng, formatted }
 */
function parseLocation(input) {
  if (!input) {
    return {
      city: '',
      district: '',
      state: '',
      pincode: '',
      lat: null,
      lng: null,
      formatted: 'All Regions'
    };
  }

  // If already an object
  if (typeof input === 'object') {
    let city = (input.city || input.locality || '').trim();
    let district = (input.district || '').trim();
    let state = (input.state || '').trim();
    let pincode = input.pincode || extractPincode(input.address) || '';
    let lat = (input.lat !== undefined && input.lat !== null) ? parseFloat(input.lat) : null;
    let lng = (input.lng !== undefined && input.lng !== null) ? parseFloat(input.lng) : null;

    if (!city && input.address) {
      const parts = input.address.split(',').map(s => s.trim()).filter(Boolean);
      city = parts[0] || '';
      if (!state && parts.length > 1) {
        state = parts[parts.length - 1];
      }
    }

    // Resolve aliases
    const resolvedCity = resolveAlias(city);
    const resolvedDistrict = resolveAlias(district || city);

    // Fallback coordinates from known cities table if missing
    if ((lat === null || isNaN(lat)) && KNOWN_COORDINATES[resolvedCity]) {
      lat = KNOWN_COORDINATES[resolvedCity].lat;
      lng = KNOWN_COORDINATES[resolvedCity].lng;
      if (!district) district = KNOWN_COORDINATES[resolvedCity].district;
      if (!state) state = KNOWN_COORDINATES[resolvedCity].state;
    }

    const formatted = city || 'All Regions';

    return {
      city,
      district: district || city,
      state,
      pincode,
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      formatted
    };
  }

  // If string, parse tokens
  const rawStr = String(input).trim();
  const pincode = extractPincode(rawStr) || '';
  const cleanStr = rawStr.replace(/\b[1-9][0-9]{5}\b/g, '').trim();
  const parts = cleanStr.split(/[,;\-]+/).map(s => s.trim()).filter(Boolean);

  let city = '';
  let district = '';
  let state = '';

  if (parts.length === 1) {
    city = parts[0];
  } else if (parts.length === 2) {
    city = parts[0];
    state = parts[1];
  } else if (parts.length >= 3) {
    city = parts[0];
    district = parts[1];
    state = parts[parts.length - 1];
  }

  // Check state against list
  for (const s of INDIAN_STATES) {
    if (cleanStr.toLowerCase().includes(s.toLowerCase())) {
      state = s;
      break;
    }
  }

  const resolvedCity = resolveAlias(city);
  let lat = null;
  let lng = null;

  if (KNOWN_COORDINATES[resolvedCity]) {
    lat = KNOWN_COORDINATES[resolvedCity].lat;
    lng = KNOWN_COORDINATES[resolvedCity].lng;
    if (!district) district = KNOWN_COORDINATES[resolvedCity].district;
    if (!state) state = KNOWN_COORDINATES[resolvedCity].state;
  }

  const formatted = city || rawStr;

  return {
    city,
    district: district || city,
    state,
    pincode,
    lat,
    lng,
    formatted
  };
}

/**
 * Match a target location against a selected user operating region.
 * Returns match analysis:
 * {
 *   isMatch: Boolean,
 *   matchTier: 'EXACT' | 'DISTRICT' | 'NEARBY' | 'STATE' | 'NONE',
 *   score: Number,
 *   distanceKm: Number | null
 * }
 */
function evaluateLocationMatch(userRegion, targetLocationStr, targetExact = null) {
  if (!userRegion || (!userRegion.city && !userRegion.district && !userRegion.state)) {
    // If no region filter is chosen, treat all as match
    return {
      isMatch: true,
      matchTier: 'ALL',
      score: 100,
      distanceKm: null
    };
  }

  const targetParsed = parseLocation(targetLocationStr);
  const userParsed = parseLocation(userRegion);

  const uCity = cleanText(resolveAlias(userParsed.city));
  const uDist = cleanText(resolveAlias(userParsed.district || userParsed.city));
  const uState = cleanText(userParsed.state);

  const tCity = cleanText(resolveAlias(targetParsed.city));
  const tDist = cleanText(resolveAlias(targetParsed.district || targetParsed.city));
  const tState = cleanText(targetParsed.state);
  const targetFullText = cleanText(targetLocationStr || '');

  // Calculate coordinates distance if available
  let distanceKm = null;
  const targetLat = targetExact && targetExact.lat ? targetExact.lat : targetParsed.lat;
  const targetLng = targetExact && targetExact.lng ? targetExact.lng : targetParsed.lng;

  if (userParsed.lat && userParsed.lng && targetLat && targetLng) {
    distanceKm = calculateDistance(userParsed.lat, userParsed.lng, targetLat, targetLng);
  }

  // 1. Exact Locality / City Match
  if (uCity && (tCity === uCity || targetFullText.includes(uCity))) {
    return {
      isMatch: true,
      matchTier: 'EXACT',
      score: 1000,
      distanceKm
    };
  }

  // 2. District Match
  if (uDist && (tDist === uDist || targetFullText.includes(uDist))) {
    return {
      isMatch: true,
      matchTier: 'DISTRICT',
      score: 800,
      distanceKm
    };
  }

  // 3. Proximity / Nearby Match (within 100km)
  if (distanceKm !== null && distanceKm <= 100) {
    const proximityScore = Math.max(500, 750 - Math.round(distanceKm * 2.5));
    return {
      isMatch: true,
      matchTier: 'NEARBY',
      score: proximityScore,
      distanceKm
    };
  }

  // 4. Same State Match
  if (uState && (tState === uState || targetFullText.includes(uState))) {
    return {
      isMatch: true,
      matchTier: 'STATE',
      score: 400,
      distanceKm
    };
  }

  // 5. Broader Non-matching Region
  return {
    isMatch: false,
    matchTier: 'NONE',
    score: 50,
    distanceKm
  };
}

module.exports = {
  KNOWN_COORDINATES,
  LOCATION_ALIASES,
  INDIAN_STATES,
  cleanText,
  resolveAlias,
  extractPincode,
  calculateDistance,
  parseLocation,
  evaluateLocationMatch
};
