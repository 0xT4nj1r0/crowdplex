# Cineplex Backend Proxy

Express server that acts as a CORS proxy for the Cineplex API.

## Purpose

The Cineplex API blocks direct browser requests due to CORS policies. This backend:
1. Receives requests from the frontend
2. Adds required authentication headers (including the API key)
3. Forwards requests to Cineplex APIs
4. Returns responses to the frontend

## Features

- **CORS Bypass**: Proxies requests with proper headers
- **Caching**: In-memory cache with TTL (5min for theatres, 2min for showtimes)
- **Rate Limiting**: 60 requests per minute per IP
- **Error Handling**: Graceful error responses
- **Security**: API key never exposed to client

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
CINEPLEX_API_KEY=your_actual_api_key_here
BACKEND_PORT=5174
NODE_ENV=development
```

## Installation

```bash
npm install
```

## Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### GET /health
Health check and cache statistics.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "cache": {
    "totalEntries": 15,
    "activeEntries": 12,
    "expiredEntries": 3
  }
}
```

### GET /api/theatres
Find nearby Cineplex theatres.

**Query Parameters:**
- `latitude` (required): Decimal latitude
- `longitude` (required): Decimal longitude  
- `accuracyKm` (optional, default: 5): Search radius in km
- `city`, `region`, `regionCode`, `country`, `postalCode` (optional): Location context

**Example:**
```
GET /api/theatres?latitude=49.2765&longitude=-123.1247&accuracyKm=5&city=Vancouver
```

### GET /api/showtimes
Get showtimes for a specific theatre and date.

**Query Parameters:**
- `theatreId` (required): Theatre ID from `/api/theatres`
- `date` (required): Date in format `M/D/YYYY` (e.g., `2/1/2026`)

**Example:**
```
GET /api/showtimes?theatreId=1422&date=2/1/2026
```

## Cache Strategy

- **Theatres**: Cached for 5 minutes (theatres rarely change)
- **Showtimes**: Cached for 2 minutes (availability changes frequently)
- **Cleanup**: Expired entries removed every 5 minutes

## Rate Limiting

- **Limit**: 60 requests per minute per IP address
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response**: `429 Too Many Requests` when exceeded

## Error Responses

All errors return JSON:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

Status codes:
- `400` - Bad request (invalid parameters)
- `429` - Rate limit exceeded
- `500` - Internal server error
- `502`/`503` - Upstream Cineplex API error

## Security

- API key stored in `.env` (never committed)
- API key not logged or exposed in responses
- Rate limiting prevents abuse
- Input validation on all parameters

## Development

The server uses Node's `--watch` flag for auto-reloading during development.

To test endpoints:
```bash
# Get theatres
curl "http://localhost:5174/api/theatres?latitude=49.2765&longitude=-123.1247"

# Get showtimes
curl "http://localhost:5174/api/showtimes?theatreId=1422&date=2/1/2026"
```
