/**
 * API Service for communicating with the backend proxy
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5174';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Fetch nearby theatres based on location
 * @param {Object} params - Location parameters
 * @returns {Promise<Object>} Theatre data
 */
export async function fetchTheatres(params) {
  const queryParams = new URLSearchParams();

  // Required parameters
  queryParams.append('latitude', params.latitude);
  queryParams.append('longitude', params.longitude);

  // Optional parameters
  if (params.accuracyKm) queryParams.append('accuracyKm', params.accuracyKm);
  if (params.city) queryParams.append('city', params.city);
  if (params.region) queryParams.append('region', params.region);
  if (params.regionCode) queryParams.append('regionCode', params.regionCode);
  if (params.country) queryParams.append('country', params.country);
  if (params.postalCode) queryParams.append('postalCode', params.postalCode);

  return fetchAPI(`/api/theatres?${queryParams}`);
}

/**
 * Fetch showtimes for a specific theatre and date
 * @param {number} theatreId - Theatre ID
 * @param {string} date - Date in format M/D/YYYY
 * @returns {Promise<Array>} Showtime data
 */
export async function fetchShowtimes(theatreId, date) {
  const queryParams = new URLSearchParams({
    theatreId,
    date,
  });

  return fetchAPI(`/api/showtimes?${queryParams}`);
}

/**
 * Fetch seat availability for a specific showtime
 * @param {number} theatreId - Theatre ID
 * @param {number} showtimeId - Vista session ID
 * @returns {Promise<Object>} Seat availability data with occupancy stats
 */
export async function fetchSeatAvailability(theatreId, showtimeId) {
  const queryParams = new URLSearchParams({
    theatreId,
    showtimeId,
  });

  return fetchAPI(`/api/seat-availability?${queryParams}`);
}

/**
 * Fetch showtimes for multiple theatres concurrently
 * Implements basic concurrency control to avoid overwhelming the server
 * @param {Array<Object>} theatres - Array of theatre objects with theatreId
 * @param {string} date - Date in format M/D/YYYY
 * @param {number} concurrency - Maximum concurrent requests
 * @returns {Promise<Array>} Array of showtime results
 */
export async function fetchShowtimesForTheatres(theatres, date, concurrency = 5) {
  const results = [];
  const queue = [...theatres];

  async function processNext() {
    if (queue.length === 0) return;

    const theatre = queue.shift();
    try {
      const showtimes = await fetchShowtimes(theatre.theatreId, date);
      results.push({
        theatre,
        showtimes,
        success: true,
      });
    } catch (error) {
      console.error(`Failed to fetch showtimes for theatre ${theatre.theatreId}:`, error);
      results.push({
        theatre,
        error: error.message,
        success: false,
      });
    }

    // Process next item in queue
    await processNext();
  }

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, theatres.length))
    .fill(0)
    .map(() => processNext());

  await Promise.all(workers);

  return results;
}

/**
 * Fetch seat availability for multiple showtimes concurrently
 * @param {Array<Object>} showtimes - Array of showtime objects with theatreId and vistaSessionId
 * @param {number} concurrency - Maximum concurrent requests
 * @returns {Promise<Array>} Array of seat availability results
 */
export async function fetchSeatAvailabilityBatch(showtimes, concurrency = 10) {
  const results = [];
  const queue = [...showtimes];

  async function processNext() {
    if (queue.length === 0) return;

    const showtime = queue.shift();
    try {
      const seatData = await fetchSeatAvailability(showtime.theatreId, showtime.vistaSessionId);
      results.push({
        showtimeId: showtime.vistaSessionId,
        theatreId: showtime.theatreId,
        seatData,
        success: true,
      });
    } catch (error) {
      // Silently fail for seat availability - not critical
      results.push({
        showtimeId: showtime.vistaSessionId,
        theatreId: showtime.theatreId,
        error: error.message,
        success: false,
      });
    }

    await processNext();
  }

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, showtimes.length))
    .fill(0)
    .map(() => processNext());

  await Promise.all(workers);

  return results;
}

export default {
  fetchTheatres,
  fetchShowtimes,
  fetchShowtimesForTheatres,
  fetchSeatAvailability,
  fetchSeatAvailabilityBatch,
};
