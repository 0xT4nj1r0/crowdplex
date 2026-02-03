import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cache from './cache.js';
import { createRateLimiter } from './rateLimiter.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5174;
const API_KEY = process.env.CINEPLEX_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Validate API key
if (!API_KEY) {
  console.error('ERROR: CINEPLEX_API_KEY is not set in .env file');
  console.error('Please copy .env.example to .env and add your API key');
  process.exit(1);
}

// CORS configuration - only allow your frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      FRONTEND_URL,
      'https://crowdplex.vercel.app',
      'https://crowdplex-git-main-0xt4nj1r0s-projects.vercel.app', // Vercel preview deployments
    ];
    
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Apply rate limiting to API routes
const rateLimiter = createRateLimiter({
  maxRequests: 500,
  windowMs: 60 * 1000 // 500 requests per minute
});

// Cineplex API base configuration
const CINEPLEX_BASE_URL = 'https://apis.cineplex.com/prod/cpx/theatrical/api/v1';
const CINEPLEX_HEADERS = {
  'Accept': '*/*',
  'Accept-Language': 'en',
  'Ocp-Apim-Subscription-Key': API_KEY,
  'Referer': 'https://www.cineplex.com/',
  'Origin': 'https://www.cineplex.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const cacheStats = cache.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: cacheStats
  });
});

/**
 * GET /api/theatres
 * Fetch nearby theatres based on location
 * 
 * Query parameters:
 * - latitude (required): Decimal latitude
 * - longitude (required): Decimal longitude
 * - accuracyKm (optional): Search radius in km (default: 5)
 * - city, region, regionCode, country, postalCode (optional): Location context
 */
app.get('/api/theatres', rateLimiter, async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      accuracyKm = '5',
      city = '',
      region = '',
      regionCode = '',
      country = 'Canada',
      postalCode = ''
    } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'latitude and longitude are required'
      });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid latitude or longitude values'
      });
    }

    // Create cache key
    const cacheKey = `theatres:${lat}:${lon}:${accuracyKm}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return res.json(cachedData);
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    // Build query parameters (Cineplex API expects both camelCase and PascalCase)
    const params = new URLSearchParams({
      language: 'en',
      latitude,
      longitude,
      accuracyKm,
      Latitude: latitude,
      Longitude: longitude,
      AccuracyKm: accuracyKm,
      Country: country
    });

    // Add optional parameters if provided
    if (city) {
      params.append('city', city);
      params.append('City', city);
    }
    if (region) {
      params.append('region', region);
      params.append('Region', region);
    }
    if (regionCode) {
      params.append('regionCode', regionCode);
      params.append('RegionCode', regionCode);
    }
    if (postalCode) {
      params.append('postalCode', postalCode);
      params.append('PostalCode', postalCode);
    }

    const url = `${CINEPLEX_BASE_URL}/theatres?${params}`;
    console.log(`[API] Fetching theatres from Cineplex API`);

    const response = await fetch(url, {
      method: 'GET',
      headers: CINEPLEX_HEADERS
    });

    if (!response.ok) {
      console.error(`[API Error] Cineplex theatres API returned ${response.status}`);
      return res.status(response.status).json({
        error: 'Upstream API Error',
        message: `Cineplex API returned status ${response.status}`,
        status: response.status
      });
    }

    const data = await response.json();

    // Cache for 5 minutes (theatres don't change frequently)
    cache.set(cacheKey, data, 5 * 60 * 1000);

    res.json(data);

  } catch (error) {
    console.error('[Error] /api/theatres:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch theatres'
    });
  }
});

/**
 * GET /api/showtimes
 * Fetch showtimes for a specific theatre and date
 * 
 * Query parameters:
 * - theatreId (required): Theatre ID from theatres endpoint
 * - date (required): Date in format M/D/YYYY (e.g., 2/1/2026)
 */
app.get('/api/showtimes', rateLimiter, async (req, res) => {
  try {
    const { theatreId, date } = req.query;

    // Validate required parameters
    if (!theatreId || !date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'theatreId and date are required'
      });
    }

    // Validate theatreId is a number
    const theatreIdNum = parseInt(theatreId, 10);
    if (isNaN(theatreIdNum)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'theatreId must be a valid number'
      });
    }

    // Create cache key
    const cacheKey = `showtimes:${theatreId}:${date}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return res.json(cachedData);
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    // Build query parameters
    const params = new URLSearchParams({
      language: 'en',
      locationId: theatreId,
      date: date
    });

    const url = `${CINEPLEX_BASE_URL}/showtimes?${params}`;
    console.log(`[API] Fetching showtimes for theatre ${theatreId} on ${date}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: CINEPLEX_HEADERS
    });

    if (!response.ok) {
      console.error(`[API Error] Cineplex showtimes API returned ${response.status}`);
      return res.status(response.status).json({
        error: 'Upstream API Error',
        message: `Cineplex API returned status ${response.status}`,
        status: response.status
      });
    }

    const data = await response.json();

    // Cache for 2 minutes (showtimes change more frequently)
    cache.set(cacheKey, data, 2 * 60 * 1000);

    res.json(data);

  } catch (error) {
    console.error('[Error] /api/showtimes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch showtimes'
    });
  }
});

/**
 * GET /api/seat-availability
 * Fetch seat availability for a specific showtime
 * 
 * Query parameters:
 * - theatreId (required): Theatre ID
 * - showtimeId (required): Showtime/session ID (vistaSessionId)
 */
app.get('/api/seat-availability', rateLimiter, async (req, res) => {
  try {
    const { theatreId, showtimeId } = req.query;

    // Validate required parameters
    if (!theatreId || !showtimeId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'theatreId and showtimeId are required'
      });
    }

    // Create cache key
    const cacheKey = `seats:${theatreId}:${showtimeId}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return res.json(cachedData);
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    const url = `https://apis.cineplex.com/prod/ticketing/api/v1/theatre/${theatreId}/showtime/${showtimeId}/seat-availability`;
    console.log(`[API] Fetching seat availability for showtime ${showtimeId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: CINEPLEX_HEADERS
    });

    if (!response.ok) {
      console.error(`[API Error] Seat availability API returned ${response.status}`);
      return res.status(response.status).json({
        error: 'Upstream API Error',
        message: `Cineplex API returned status ${response.status}`,
        status: response.status
      });
    }

    const data = await response.json();

    // Calculate totals from seat data
    const seatAvailabilities = data.seatAvailabilities || {};
    const totalSeats = Object.keys(seatAvailabilities).length;
    const occupiedSeats = Object.values(seatAvailabilities).filter(s => s === 'Occupied').length;
    const availableSeats = Object.values(seatAvailabilities).filter(s => s === 'Available').length;

    const enrichedData = {
      ...data,
      totalSeats,
      occupiedSeats,
      availableSeats,
      occupancyPercentage: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0
    };

    // Cache for 1 minute (seat availability changes frequently)
    cache.set(cacheKey, enrichedData, 60 * 1000);

    res.json(enrichedData);

  } catch (error) {
    console.error('[Error] /api/seat-availability:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch seat availability'
    });
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎬 Cineplex Showtime Proxy Backend');
  console.log('='.repeat(60));
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API Key configured: ${API_KEY.substring(0, 8)}...`);
  console.log(`✓ Rate limit: 500 requests/minute per IP`);
  console.log(`✓ Cache: 5min (theatres), 2min (showtimes), 1min (seats)`);
  console.log('='.repeat(60));
  console.log('\nEndpoints:');
  console.log(`  GET  /health                - Health check`);
  console.log(`  GET  /api/theatres          - Find nearby theatres`);
  console.log(`  GET  /api/showtimes         - Get theatre showtimes`);
  console.log(`  GET  /api/seat-availability - Get seat occupancy`);
  console.log('='.repeat(60));
});
