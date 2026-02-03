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

## Vercel Web Analytics

This Express backend is configured to support Vercel Web Analytics for monitoring API performance, deployment metrics, and usage patterns.

### Getting Started with Web Analytics

#### Prerequisites

- A Vercel account. If you don't have one, you can [sign up for free](https://vercel.com/signup).
- A Vercel project. If you don't have one, you can [create a new project](https://vercel.com/new).
- The Vercel CLI installed (optional, for command-line deployments):
  ```bash
  npm install -g vercel
  ```

#### Step 1: Enable Web Analytics in Vercel

1. Navigate to your [Vercel dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Analytics** tab
4. Click **Enable** to activate Web Analytics

> **Note:** Enabling Web Analytics will add new routes (scoped at `/_vercel/insights/*`) after your next deployment.

#### Step 2: Configuration (Already Complete)

✅ This backend is **pre-configured** for Vercel Web Analytics:

- The `vercel.json` file includes the necessary route configuration for `/_vercel/insights/*`
- No additional packages or code changes are required for Express backend APIs
- Analytics tracking is automatically enabled once you enable it in the dashboard

**Current configuration in `vercel.json`:**
```json
{
  "routes": [
    {
      "src": "/_vercel/insights/(.*)",
      "dest": "/_vercel/insights/$1"
    },
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

> **Note:** Unlike frontend frameworks (Next.js, React, Vue), backend APIs do **not** require the `@vercel/analytics` package. Analytics are collected automatically by Vercel's infrastructure.

#### Step 3: Deploy Your API to Vercel

Deploy your backend using one of these methods:

**Using Vercel CLI:**
```bash
vercel deploy
```

**Using Git Integration (Recommended):**
- Connect your repository in the Vercel dashboard
- Push to your main branch for automatic deployments
- All commits will be automatically deployed

Once deployed, analytics tracking will begin automatically.

> **Verification:** After deployment, you should see Vercel's analytics infrastructure recording API requests. Check the Network tab in your browser's developer tools for requests to `/_vercel/insights/` endpoints.

#### Step 4: View Your Data in the Dashboard

1. Go to your [Vercel dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Analytics** tab
4. View comprehensive metrics including:
   - **Request Volume**: Total API calls over time
   - **Response Times**: P50, P75, P95, P99 latency percentiles
   - **Error Rates**: 4xx and 5xx status codes
   - **Geographic Distribution**: Request origins by country/region
   - **Top Routes**: Most frequently accessed endpoints
   - **Status Code Distribution**: Breakdown of response codes

After a few days of traffic, you'll be able to filter and analyze your data by:
- Time range (last 24 hours, 7 days, 30 days)
- Specific routes (e.g., `/api/theatres`, `/api/showtimes`)
- Status codes
- Geographic regions

### What Metrics Are Tracked

For this Express backend, Vercel Web Analytics automatically tracks:

1. **Performance Metrics**
   - Request duration and latency
   - Time to first byte (TTFB)
   - Cold start performance (for serverless functions)

2. **Traffic Metrics**
   - Request count and rate
   - Unique visitors (based on IP)
   - Geographic distribution

3. **Reliability Metrics**
   - HTTP status codes (2xx, 4xx, 5xx)
   - Error rates and patterns
   - Availability and uptime

4. **Endpoint Analytics**
   - Per-route performance (e.g., `/api/theatres`, `/api/showtimes`)
   - Most popular endpoints
   - Slowest endpoints

### Backend vs Frontend Analytics

| Feature | Backend (Express API) | Frontend (React/Next.js) |
|---------|----------------------|--------------------------|
| Package Required | ❌ No (`@vercel/analytics` not needed) | ✅ Yes (`@vercel/analytics` required) |
| Installation | Pre-configured via `vercel.json` | Manual installation and component integration |
| Metrics Tracked | API performance, requests, errors | Page views, user interactions, custom events |
| Route Support | Automatic for all Express routes | Framework-specific (Next.js, React Router, etc.) |
| Custom Events | Not applicable | Supported for user interactions |

> **Note:** For the **frontend** application in this monorepo, you'll need to install `@vercel/analytics` and add the Analytics component. See the [frontend documentation](../frontend/README.md) for instructions.

### Privacy and Compliance

Vercel Web Analytics is designed with privacy in mind:

- **No cookies**: Analytics work without browser cookies
- **GDPR compliant**: No personal data is collected
- **Anonymous**: IP addresses are not stored
- **Lightweight**: Minimal performance impact (<1KB)
- **First-party**: Data is not shared with third parties

Learn more: [Vercel Analytics Privacy Policy](https://vercel.com/docs/analytics/privacy-policy)

### Troubleshooting

**Analytics not showing data:**
1. Verify Web Analytics is enabled in the Vercel dashboard
2. Ensure your latest code is deployed to Vercel
3. Check that the `vercel.json` configuration is correct
4. Wait 5-10 minutes after deployment for data to appear
5. Make some test requests to your API endpoints

**Verifying analytics are working:**
```bash
# Test an endpoint
curl https://your-deployment-url.vercel.app/api/theatres?latitude=49.2765&longitude=-123.1247

# Check the dashboard after a few minutes
```

**Common issues:**
- Analytics only work on Vercel deployments (not local development)
- Data may take a few minutes to appear in the dashboard
- Historical data is retained based on your Vercel plan

### Next Steps

- [Learn about Web Analytics limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing)
- [Explore Web Analytics filtering](https://vercel.com/docs/analytics/filtering)
- [Read the full Web Analytics documentation](https://vercel.com/docs/analytics)
- For frontend user tracking, implement `@vercel/analytics` in the React app

## Development

The server uses Node's `--watch` flag for auto-reloading during development.

To test endpoints:
```bash
# Get theatres
curl "http://localhost:5174/api/theatres?latitude=49.2765&longitude=-123.1247"

# Get showtimes
curl "http://localhost:5174/api/showtimes?theatreId=1422&date=2/1/2026"
```
