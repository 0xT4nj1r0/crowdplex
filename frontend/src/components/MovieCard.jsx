import { useState } from 'react';
import './MovieCard.css';

function MovieCard({ movie }) {
  const [expanded, setExpanded] = useState(false);

  const getBusynessLevel = () => {
    const occupancy = movie.averageOccupancy || 0;
    
    if (occupancy >= 90) return { label: 'Super Hot 🔥', class: 'sold-out', color: '#ef4444' };
    if (occupancy >= 70) return { label: 'Trending 📈', class: 'very-busy', color: '#f59e0b' };
    if (occupancy >= 40) return { label: 'Popular ⭐', class: 'moderate', color: '#3b82f6' };
    return { label: 'Plenty of Seats 💺', class: 'available', color: '#10b981' };
  };

  const busyness = getBusynessLevel();

  const formatTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group showtimes by theatre
  const showtimesByTheatre = {};
  movie.showtimes.forEach((showtime) => {
    const key = `${showtime.theatreId}`;
    if (!showtimesByTheatre[key]) {
      showtimesByTheatre[key] = {
        theatreName: showtime.theatreName,
        theatreId: showtime.theatreId,
        sessions: [],
      };
    }
    showtimesByTheatre[key].sessions.push(showtime);
  });

  // Sort sessions by time within each theatre
  Object.values(showtimesByTheatre).forEach((theatre) => {
    theatre.sessions.sort(
      (a, b) => new Date(a.showStartDateTime) - new Date(b.showStartDateTime)
    );
  });

  return (
    <div className="movie-card">
      <div className="movie-header" onClick={() => setExpanded(!expanded)}>
        <div className="movie-info">
          {movie.posterUrl && (
            <img
              src={movie.posterUrl}
              alt={movie.name}
              className="movie-poster"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="movie-details">
            <h3 className="movie-title">{movie.name}</h3>
            <div className="movie-meta">
              {movie.runtime && <span>{movie.runtime} min</span>}
              {movie.availableCount > 0 && (
                <span className="showings-count">{movie.availableCount} showing{movie.availableCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="movie-status">
          {movie.averageOccupancy !== undefined ? (
            <div className="occupancy-section">
              <div className="occupancy-header">
                <span className="occupancy-label">Occupancy</span>
                <span className="occupancy-percentage" style={{ color: busyness.color }}>
                  {movie.averageOccupancy}%
                </span>
              </div>
              <div className="occupancy-bar-container">
                <div className="occupancy-bar">
                  <div 
                    className="occupancy-fill" 
                    style={{ 
                      width: `${movie.averageOccupancy}%`,
                      backgroundColor: busyness.color
                    }}
                  ></div>
                </div>
                <span className="busyness-label" style={{ color: busyness.color }}>
                  {busyness.label}
                </span>
              </div>
              {movie.totalSeatsBooked !== undefined && movie.totalSeatsAvailable !== undefined && (
                <div className="seats-info">
                  <span className="seats-booked">{movie.totalSeatsBooked.toLocaleString()}</span>
                  <span className="seats-separator">/</span>
                  <span className="seats-total">{movie.totalSeatsAvailable.toLocaleString()} seats</span>
                </div>
              )}
            </div>
          ) : (
            <div className="occupancy-section">
              <div className="no-occupancy-header">
                <span className="showings-count">{movie.availableCount} showing{movie.availableCount !== 1 ? 's' : ''}</span>
                <span className="estimated-label">Seat data loading...</span>
              </div>
            </div>
          )}
          <button className="expand-btn" aria-label="Expand showtimes">
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="movie-showtimes">
          {movie.showtimes.length === 0 ? (
            <p className="no-showtimes">No showtimes available</p>
          ) : (
            Object.values(showtimesByTheatre).map((theatre) => (
              <div key={theatre.theatreId} className="theatre-section">
                <h4 className="theatre-name">
                  {theatre.theatreName}
                </h4>
                <div className="sessions-grid">
                  {theatre.sessions.map((session, idx) => (
                    <div
                      key={`${session.vistaSessionId || idx}`}
                      className={`session-card ${session.isSoldOut ? 'sold-out-session' : ''}`}
                    >
                      <div className="session-time">
                        <strong>{formatTime(session.showStartDateTime)}</strong>
                        <span className="session-date">
                          {formatDate(session.showStartDateTime)}
                        </span>
                      </div>
                      {session.experienceTypes && session.experienceTypes.length > 0 && (
                        <div className="session-experiences">
                          {session.experienceTypes.join(' • ')}
                        </div>
                      )}
                      <div className="session-info">
                        {session.auditorium && (
                          <span className="auditorium">{session.auditorium}</span>
                        )}
                        
                        {session.totalSeats !== undefined ? (
                          <div className="seat-details">
                            <div className="seat-occupancy-bar">
                              <div 
                                className="seat-occupancy-fill" 
                                style={{ 
                                  width: `${session.occupancyPercentage || 0}%`,
                                  backgroundColor: session.occupancyPercentage >= 90 ? '#ef4444' : 
                                                   session.occupancyPercentage >= 70 ? '#f59e0b' :
                                                   session.occupancyPercentage >= 40 ? '#3b82f6' : '#10b981'
                                }}
                              ></div>
                            </div>
                            <div className="seat-count">
                              {session.isSoldOut ? (
                                <span className="sold-out-text">SOLD OUT</span>
                              ) : (
                                <>
                                  <span className="booked">{session.occupiedSeats}</span>
                                  <span className="separator">/</span>
                                  <span className="total">{session.totalSeats}</span>
                                  <span className="percent">({session.occupancyPercentage}%)</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="seat-details">
                            <div className="seat-occupancy-bar">
                              <div 
                                className="seat-occupancy-fill estimated" 
                                style={{ 
                                  width: session.isSoldOut ? '100%' : '50%',
                                  backgroundColor: session.isSoldOut ? '#ef4444' : '#64748b'
                                }}
                              ></div>
                            </div>
                            <div className="seat-count estimated">
                              {session.isSoldOut ? (
                                <span className="sold-out-text">SOLD OUT</span>
                              ) : (
                                <span className="seats-left">{session.seatsRemaining} seats left</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {session.seatMapUrl && !session.isSoldOut && (
                        <a
                          href={session.seatMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="seat-map-link"
                        >
                          Select Seats →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MovieCard;
