import { useState } from 'react';
import './TheatreList.css';

function TheatreList({ theatres }) {
  const [expanded, setExpanded] = useState(false);

  // Sort theatres by distance
  const sortedTheatres = [...theatres].sort((a, b) => {
    const distanceA = a.location?.distanceToOriginInMeters || Infinity;
    const distanceB = b.location?.distanceToOriginInMeters || Infinity;
    return distanceA - distanceB;
  });

  return (
    <div className="theatre-list-container">
      <button 
        className="theatre-list-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
        View Theatre List ({theatres.length})
      </button>

      {expanded && (
        <div className="theatre-list">
          {sortedTheatres.map((theatre) => {
            const distanceKm = theatre.location?.distanceToOriginInMeters 
              ? (theatre.location.distanceToOriginInMeters / 1000).toFixed(1)
              : 'N/A';

            return (
              <div key={theatre.theatreId} className="theatre-item">
                <div className="theatre-main-info">
                  <span className="theatre-item-name">
                    🎭 {theatre.theatreName}
                  </span>
                  <span className="theatre-distance">
                    📍 {distanceKm} km
                  </span>
                </div>
                {theatre.location?.address && (
                  <div className="theatre-address">
                    {theatre.location.address}
                    {theatre.location.city && `, ${theatre.location.city}`}
                    {theatre.location.postalCode && ` ${theatre.location.postalCode}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TheatreList;
