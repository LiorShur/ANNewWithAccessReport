/**
 * Geocoding Helper
 * Adds city and country data to report locations
 * 
 * File: src/helpers/geocoding.js
 */

/**
 * Reverse geocode coordinates to get location details
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Location details
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    console.log(`🌍 Reverse geocoding: ${latitude}, ${longitude}`);
    
    // Use JSONP approach to avoid CORS issues
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }).catch(async (error) => {
      // CORS fallback: try without headers
      console.log('⚠️ CORS error, trying alternative approach...');
      return await fetch(url);
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    const location = {
      city: extractCity(data.address),
      country: data.address.country || 'Unknown',
      state: data.address.state || data.address.province || null,
      postcode: data.address.postcode || null,
      displayName: data.display_name || null,
      raw: data.address
    };
    
    console.log('✅ Geocoded:', location);
    
    return location;
    
  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error);
    console.log('💡 Using coordinates as fallback');
    
    // Return coordinates as fallback
    return {
      city: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      country: 'Location',
      state: null,
      postcode: null,
      displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      raw: null
    };
  }
}

/**
 * Extract city name from address data
 * Tries multiple fields in order of preference
 */
function extractCity(address) {
  if (!address) return 'Unknown';
  
  // Try in order of preference
  return address.city 
    || address.town 
    || address.village 
    || address.municipality
    || address.suburb
    || address.county
    || 'Unknown';
}

/**
 * Batch reverse geocode multiple locations
 * Includes rate limiting to respect API limits
 * @param {Array} locations - Array of {latitude, longitude} objects
 * @param {Function} progressCallback - Called after each geocode
 * @returns {Promise<Array>} Array of location details
 */
export async function batchReverseGeocode(locations, progressCallback = null) {
  const results = [];
  const delay = 1100; // Nominatim rate limit: 1 request per second
  
  console.log(`🌍 Batch geocoding ${locations.length} locations...`);
  
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    
    // Geocode
    const details = await reverseGeocode(location.latitude, location.longitude);
    results.push({
      ...location,
      ...details
    });
    
    // Progress callback
    if (progressCallback) {
      progressCallback(i + 1, locations.length);
    }
    
    // Rate limit delay (except for last request)
    if (i < locations.length - 1) {
      await sleep(delay);
    }
  }
  
  console.log(`✅ Batch geocoding complete: ${results.length} locations`);
  
  return results;
}

/**
 * Forward geocode address to get coordinates
 * @param {string} address - Address string to geocode
 * @returns {Promise<Object>} Coordinates and details
 */
export async function forwardGeocode(address) {
  try {
    console.log(`🌍 Forward geocoding: ${address}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`,
      {
        headers: {
          'User-Agent': 'AccessNature/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('No results found');
    }
    
    const result = data[0];
    
    const location = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: extractCity(result.address),
      country: result.address.country || 'Unknown',
      state: result.address.state || result.address.province || null,
      displayName: result.display_name || null,
      raw: result.address
    };
    
    console.log('✅ Forward geocoded:', location);
    
    return location;
    
  } catch (error) {
    console.error('❌ Forward geocoding failed:', error);
    return null;
  }
}

/**
 * Get location name for display
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Display name
 */
export async function getLocationDisplayName(latitude, longitude) {
  const details = await reverseGeocode(latitude, longitude);
  
  if (details.city && details.country) {
    return `${details.city}, ${details.country}`;
  } else if (details.country) {
    return details.country;
  } else {
    return 'Unknown Location';
  }
}

/**
 * Check if two locations are in the same city
 * @param {Object} loc1 - {city, country}
 * @param {Object} loc2 - {city, country}
 * @returns {boolean}
 */
export function isSameCity(loc1, loc2) {
  if (!loc1 || !loc2) return false;
  
  return loc1.city === loc2.city && 
         loc1.country === loc2.country;
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cache for geocoding results to avoid repeated API calls
 */
const geocodeCache = new Map();

/**
 * Reverse geocode with caching
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {boolean} useCache - Whether to use cache
 * @returns {Promise<Object>}
 */
export async function reverseGeocodeWithCache(latitude, longitude, useCache = true) {
  // Round to 4 decimal places for cache key (~11m precision)
  const lat = Math.round(latitude * 10000) / 10000;
  const lng = Math.round(longitude * 10000) / 10000;
  const cacheKey = `${lat},${lng}`;
  
  if (useCache && geocodeCache.has(cacheKey)) {
    console.log('📦 Using cached geocode result');
    return geocodeCache.get(cacheKey);
  }
  
  const result = await reverseGeocode(latitude, longitude);
  
  if (useCache) {
    geocodeCache.set(cacheKey, result);
    console.log(`📦 Cached geocode result (${geocodeCache.size} entries)`);
  }
  
  return result;
}

/**
 * Clear geocode cache
 */
export function clearGeocodeCache() {
  const size = geocodeCache.size;
  geocodeCache.clear();
  console.log(`🧹 Cleared ${size} cached geocode results`);
}

export default {
  reverseGeocode,
  batchReverseGeocode,
  forwardGeocode,
  getLocationDisplayName,
  isSameCity,
  reverseGeocodeWithCache,
  clearGeocodeCache
};