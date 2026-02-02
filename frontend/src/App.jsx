import { useState, useEffect } from 'react';
import LocationInput from './components/LocationInput';
import MovieCard from './components/MovieCard';
import TheatreList from './components/TheatreList';
import { fetchTheatres, fetchShowtimesForTheatres, fetchSeatAvailabilityBatch } from './services/api';
import './App.css';

function App() {
  const [location, setLocation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [theatres, setTheatres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ stage: '', current: 0, total: 0 });

  function getTodayDate() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  }

  function formatDateForInput() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateForAPI(inputDate) {
    const [year, month, day] = inputDate.split('-');
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }

  useEffect(() => {
    if (location) {
      loadTheatresAndShowtimes();
    }
  }, [location, selectedDate]);

  async function loadTheatresAndShowtimes() {
    setLoading(true);
    setError('');
    setMovies([]);
    setProgress({ stage: 'theatres', current: 0, total: 0 });

    try {
      // Step 1: Fetch theatres from all selected locations
      console.log('Fetching theatres...');
      setProgress({ stage: 'theatres', current: 0, total: location.locations.length });
      
      const allTheatres = [];
      const seenTheatreIds = new Set();

      for (let i = 0; i < location.locations.length; i++) {
        const loc = location.locations[i];
        setProgress({ stage: 'theatres', current: i + 1, total: location.locations.length });
        
        try {
          const theatreData = await fetchTheatres({
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracyKm: loc.radius,
          });
          
          const nearbyTheatres = theatreData.nearbyTheatres || [];
          
          // Add unique theatres only
          nearbyTheatres.forEach(theatre => {
            if (!seenTheatreIds.has(theatre.theatreId)) {
              seenTheatreIds.add(theatre.theatreId);
              allTheatres.push(theatre);
            }
          });
        } catch (error) {
          console.error(`Failed to fetch theatres for ${loc.name}:`, error);
        }
      }
      
      if (allTheatres.length === 0) {
        setError('No theatres found in the selected areas. Try selecting different areas.');
        setLoading(false);
        return;
      }

      setTheatres(allTheatres);
      console.log(`Found ${allTheatres.length} unique theatres across ${location.locations.length} area(s)`);

      // Rest of the code remains the same...
      // Step 2: Fetch showtimes for all theatres
      setProgress({ stage: 'showtimes', current: 0, total: allTheatres.length });
      
      const showtimeResults = await fetchShowtimesForTheatres(
        allTheatres,
        selectedDate,
        5
      );

      // Step 3: Process and aggregate showtimes
      console.log('Processing showtimes...');
      const allSessions = [];

      showtimeResults.forEach((result) => {
        if (!result.success || !result.showtimes || result.showtimes.length === 0) {
          return;
        }

        result.showtimes.forEach((theatreData) => {
          const theatreId = theatreData.theatreId;
          const theatreName = theatreData.theatre;

          theatreData.dates?.forEach((dateData) => {
            dateData.movies?.forEach((movie) => {
              movie.experiences?.forEach((experience) => {
                const experienceTypes = experience.experienceTypes || [];
                
                experience.sessions?.forEach((session) => {
                  allSessions.push({
                    movieId: movie.id,
                    movieName: movie.name,
                    posterUrl: movie.mediumPosterImageUrl || movie.smallPosterImageUrl,
                    runtime: movie.runtimeInMinutes,
                    presentationType: movie.presentationType,
                    theatreId,
                    theatreName,
                    showStartDateTime: session.showStartDateTime,
                    seatsRemaining: session.seatsRemaining,
                    isSoldOut: session.isSoldOut || session.seatsRemaining === 0,
                    seatMapUrl: session.seatMapUrl,
                    auditorium: session.auditorium,
                    vistaSessionId: session.vistaSessionId,
                    experienceTypes,
                  });
                });
              });
            });
          });
        });
      });

      if (allSessions.length === 0) {
        setError('No showtimes found for the selected date at nearby theatres.');
        setLoading(false);
        return;
      }

      console.log(`Found ${allSessions.length} total sessions`);

      // Step 4: Fetch seat availability for sessions (prioritize earlier showtimes)
      setProgress({ stage: 'seats', current: 0, total: Math.min(allSessions.length, 200) });
      
      // Sort sessions by showtime (earlier first) to prioritize upcoming shows
      const sortedSessions = [...allSessions].sort((a, b) => 
        new Date(a.showStartDateTime) - new Date(b.showStartDateTime)
      );
      
      // Fetch seat data for up to 200 sessions (should cover most cases)
      const sessionsToFetch = sortedSessions.slice(0, 200);
      const seatResults = await fetchSeatAvailabilityBatch(sessionsToFetch, 15); // Increased concurrency
      
      // Create a map of seat data
      const seatDataMap = {};
      seatResults.forEach((result) => {
        if (result.success && result.seatData) {
          const key = `${result.theatreId}-${result.showtimeId}`;
          seatDataMap[key] = result.seatData;
        }
      });

      // Enrich sessions with seat data
      allSessions.forEach((session) => {
        const key = `${session.theatreId}-${session.vistaSessionId}`;
        const seatData = seatDataMap[key];
        
        if (seatData) {
          session.totalSeats = seatData.totalSeats;
          session.occupiedSeats = seatData.occupiedSeats;
          session.availableSeats = seatData.availableSeats;
          session.occupancyPercentage = seatData.occupancyPercentage;
        }
      });

      // Step 5: Group by movie
      const movieGroups = {};

      allSessions.forEach((session) => {
        const key = `${session.movieId}`;
        
        if (!movieGroups[key]) {
          movieGroups[key] = {
            movieId: session.movieId,
            name: session.movieName,
            posterUrl: session.posterUrl,
            runtime: session.runtime,
            presentationType: session.presentationType,
            showtimes: [],
          };
        }

        movieGroups[key].showtimes.push(session);
      });

      // Step 6: Calculate occupancy metrics for each movie
      const rankedMovies = Object.values(movieGroups).map((movie) => {
        const availableCount = movie.showtimes.filter((s) => !s.isSoldOut).length;
        
        // Calculate average occupancy from sessions with seat data
        const sessionsWithSeatData = movie.showtimes.filter(s => s.occupancyPercentage !== undefined);
        const averageOccupancy = sessionsWithSeatData.length > 0
          ? Math.round(
              sessionsWithSeatData.reduce((sum, s) => sum + s.occupancyPercentage, 0) / 
              sessionsWithSeatData.length
            )
          : undefined;

        // Calculate total seats booked/available
        const totalSeatsBooked = movie.showtimes
          .filter(s => s.occupiedSeats !== undefined)
          .reduce((sum, s) => sum + s.occupiedSeats, 0);
        
        const totalSeatsAvailable = movie.showtimes
          .filter(s => s.totalSeats !== undefined)
          .reduce((sum, s) => sum + s.totalSeats, 0);

        // Find earliest showtime for tie-breaking
        const earliestShowtime = movie.showtimes.reduce((earliest, current) => {
          const currentDate = new Date(current.showStartDateTime);
          const earliestDate = new Date(earliest.showStartDateTime);
          return currentDate < earliestDate ? current : earliest;
        });

        return {
          ...movie,
          availableCount,
          averageOccupancy,
          totalSeatsBooked: totalSeatsBooked > 0 ? totalSeatsBooked : undefined,
          totalSeatsAvailable: totalSeatsAvailable > 0 ? totalSeatsAvailable : undefined,
          earliestShowtime: earliestShowtime.showStartDateTime,
        };
      });

      // Step 7: Sort by average occupancy (descending - highest occupancy first)
      rankedMovies.sort((a, b) => {
        // Movies with occupancy data come first
        if (a.averageOccupancy !== undefined && b.averageOccupancy === undefined) return -1;
        if (a.averageOccupancy === undefined && b.averageOccupancy !== undefined) return 1;
        
        // Both have occupancy data - sort by occupancy descending
        if (a.averageOccupancy !== undefined && b.averageOccupancy !== undefined) {
          if (a.averageOccupancy !== b.averageOccupancy) {
            return b.averageOccupancy - a.averageOccupancy; // Higher occupancy first
          }
        }
        
        // Tie-breaker: earliest showtime
        return new Date(a.earliestShowtime) - new Date(b.earliestShowtime);
      });

      console.log(`Ranked ${rankedMovies.length} movies`);
      setMovies(rankedMovies);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Failed to load showtimes: ${err.message}`);
    } finally {
      setLoading(false);
      setProgress({ stage: '', current: 0, total: 0 });
    }
  }

  function handleDateChange(e) {
    const newDate = formatDateForAPI(e.target.value);
    setSelectedDate(newDate);
  }

  function getProgressMessage() {
    if (progress.stage === 'theatres') {
      return `Finding theatres in area ${progress.current}/${progress.total}...`;
    }
    if (progress.stage === 'showtimes') {
      return `Loading showtimes... ${progress.current}/${progress.total}`;
    }
    if (progress.stage === 'seats') {
      return `Checking seat availability... ${progress.current}/${progress.total}`;
    }
    return 'Loading...';
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Crowdplex</h1>
          <p className="subtitle">Discover what's hot at the movies</p>
        </div>
      </header>

      <main className="app-main">
        {!location ? (
          <LocationInput onLocationSet={setLocation} loading={loading} />
        ) : (
          <>
            <div className="controls">
              <div className="control-group">
                <label htmlFor="date-picker">📅 Select Date:</label>
                <input
                  type="date"
                  id="date-picker"
                  defaultValue={formatDateForInput()}
                  onChange={handleDateChange}
                  disabled={loading}
                  min={formatDateForInput()}
                />
              </div>

              <button
                onClick={() => setLocation(null)}
                className="btn-change-location"
                disabled={loading}
              >
                📍 Change Location
              </button>
            </div>

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>{getProgressMessage()}</p>
              </div>
            )}

            {error && <div className="error-message">⚠️ {error}</div>}

            {!loading && theatres.length > 0 && (
              <>
                <div className="info-section">
                  <p>
                    Found <strong>{theatres.length}</strong> theatre{theatres.length !== 1 ? 's' : ''} nearby
                    {movies.length > 0 && (
                      <>
                        {' '}• Showing <strong>{movies.length}</strong> movie{movies.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </p>
                </div>

                <TheatreList theatres={theatres} />
              </>
            )}

            {!loading && movies.length > 0 && (
              <div className="movies-section">
                <h2>Movies Near You</h2>
                <p className="section-subtitle">
                  Sorted by popularity — crowd favorites at the top
                </p>
                <div className="movies-list">
                  {movies.map((movie) => (
                    <MovieCard key={movie.movieId} movie={movie} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with ❤️ for movie lovers
        </p>
      </footer>
    </div>
  );
}

export default App;
