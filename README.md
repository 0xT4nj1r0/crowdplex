# Crowdplex

Real-time movie popularity tracker that ranks films by actual seat occupancy at nearby Cineplex theatres across Canada.

## Features

- **Live Occupancy Data** - Shows real seat availability percentages
- **Multi-Location Search** - Select multiple neighbourhoods to see all nearby theatres
- **Smart Ranking** - Movies sorted by popularity (Super Hot 🔥, Trending 📈, Popular ⭐, Plenty of Seats 💺)
- **Metro Area Support** - Vancouver, Toronto, Calgary + individual cities

## Tech Stack

**Frontend**: React 18, Vite  
**Backend**: Node.js, Express  
**API**: Cineplex Theatrical API  
**Deployment**: Vercel

## Project Structure

```
crowdplex/
├── backend/              # Express proxy server
│   ├── src/
│   │   ├── index.js     # Main server + API routes
│   │   ├── cache.js     # In-memory caching
│   │   └── rateLimiter.js
│   └── package.json
├── frontend/             # React app
│   ├── src/
│   │   ├── components/  # LocationInput, MovieCard, TheatreList
│   │   ├── services/    # API client
│   │   └── App.jsx      # Main app logic
│   └── package.json
└── package.json          # Root workspace
```

## Local Development

### Prerequisites
- Node.js 18+
- Cineplex API key

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your CINEPLEX_API_KEY
   ```

3. **Run dev servers**
   ```bash
   cd ..
   npm run dev
   ```

   Frontend: http://localhost:5173  
   Backend: http://localhost:5174

## Deployment (Vercel)

### Backend
1. Deploy backend as separate Vercel project
2. Add `CINEPLEX_API_KEY` to environment variables
3. Note the deployed URL

### Frontend
1. Update `frontend/.env` with backend URL
2. Deploy frontend to Vercel
3. Done!

## How It Works

1. **CORS Bypass** - Backend proxy adds required API headers
2. **Multi-Area Search** - Fetches theatres from multiple locations, deduplicates
3. **Seat Availability** - Calls `/seat-availability` endpoint for real occupancy %
4. **Smart Caching** - 5min (theatres), 2min (showtimes), 1min (seats)
5. **Popularity Ranking** - Sorts by average occupancy across all showtimes

## API Rate Limits

- 500 requests/minute per IP
- Caching reduces actual API calls significantly

## License

MIT

---

Built with ❤️ for movie lovers
