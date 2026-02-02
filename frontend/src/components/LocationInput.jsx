import { useState } from 'react';
import './LocationInput.css';

// Vancouver Metro regions with different search centers
const METRO_AREAS = {
  'Vancouver Metro': [
    { name: 'Downtown Vancouver', latitude: 49.2827, longitude: -123.1207, radius: 8 },
    { name: 'Burnaby', latitude: 49.2488, longitude: -122.9805, radius: 8 },
    { name: 'Surrey', latitude: 49.1913, longitude: -122.8490, radius: 10 },
    { name: 'Richmond', latitude: 49.1666, longitude: -123.1336, radius: 8 },
    { name: 'Coquitlam', latitude: 49.2838, longitude: -122.7932, radius: 8 },
    { name: 'New Westminster', latitude: 49.2069, longitude: -122.9110, radius: 6 },
  ],
  'Toronto Metro': [
    { name: 'Downtown Toronto', latitude: 43.6532, longitude: -79.3832, radius: 8 },
    { name: 'Scarborough', latitude: 43.7764, longitude: -79.2318, radius: 10 },
    { name: 'Mississauga', latitude: 43.5890, longitude: -79.6441, radius: 10 },
    { name: 'North York', latitude: 43.7615, longitude: -79.4111, radius: 8 },
    { name: 'Etobicoke', latitude: 43.6205, longitude: -79.5132, radius: 8 },
    { name: 'Markham', latitude: 43.8561, longitude: -79.3370, radius: 8 },
  ],
  'Calgary Metro': [
    { name: 'Downtown Calgary', latitude: 51.0447, longitude: -114.0719, radius: 10 },
    { name: 'North Calgary', latitude: 51.1350, longitude: -114.0628, radius: 10 },
    { name: 'South Calgary', latitude: 50.9430, longitude: -114.0581, radius: 10 },
  ],
  'Other Cities': [
    { name: 'Montreal', latitude: 45.5017, longitude: -73.5673, radius: 12 },
    { name: 'Ottawa', latitude: 45.4215, longitude: -75.6972, radius: 12 },
    { name: 'Edmonton', latitude: 53.5461, longitude: -113.4938, radius: 12 },
    { name: 'Winnipeg', latitude: 49.8951, longitude: -97.1384, radius: 12 },
    { name: 'Quebec City', latitude: 46.8139, longitude: -71.2080, radius: 12 },
    { name: 'Hamilton', latitude: 43.2557, longitude: -79.8711, radius: 10 },
  ],
};

function LocationInput({ onLocationSet, loading }) {
  const [selectedMetro, setSelectedMetro] = useState('');
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [useGPS, setUseGPS] = useState(false);
  const [error, setError] = useState('');

  const requestGeolocation = () => {
    setError('');
    setUseGPS(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setUseGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSet({
          mode: 'single',
          locations: [{
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius: 8,
            name: 'Your Location'
          }]
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to get your location. Please select areas manually.');
        setUseGPS(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleMetroChange = (e) => {
    const metro = e.target.value;
    setSelectedMetro(metro);
    setSelectedAreas([]);
  };

  const toggleArea = (area) => {
    setSelectedAreas(prev => {
      const exists = prev.find(a => a.name === area.name);
      if (exists) {
        return prev.filter(a => a.name !== area.name);
      } else {
        return [...prev, area];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (selectedAreas.length === 0) {
      setError('Please select at least one area');
      return;
    }

    onLocationSet({
      mode: 'multi',
      locations: selectedAreas.map(area => ({
        latitude: area.latitude,
        longitude: area.longitude,
        radius: area.radius,
        name: area.name
      }))
    });
  };

  const availableAreas = selectedMetro ? METRO_AREAS[selectedMetro] : [];

  return (
    <div className="location-input">
      <div className="location-header">
        <div className="cinema-icon">🎬</div>
        <h2>Find Your Movies</h2>
        <p className="location-subtitle">Select areas to see showtimes <span className="sorted-tag">(Sorted by popularity)</span></p>
      </div>

      {!useGPS ? (
        <div className="location-content">
          <button 
            onClick={requestGeolocation} 
            disabled={loading}
            className="btn-primary gps-btn"
          >
            <span className="btn-icon">📍</span>
            {loading ? 'Finding Theatres...' : 'Use My Current Location'}
          </button>

          <div className="divider">
            <span>or select areas</span>
          </div>

          <form onSubmit={handleSubmit} className="area-selector">
            <div className="form-group">
              <label htmlFor="metro">Choose Metro Area</label>
              <select
                id="metro"
                value={selectedMetro}
                onChange={handleMetroChange}
                disabled={loading}
                required
              >
                <option value="">-- Select a metro area --</option>
                {Object.keys(METRO_AREAS).map((metro) => (
                  <option key={metro} value={metro}>
                    {metro}
                  </option>
                ))}
              </select>
            </div>

            {selectedMetro && (
              <div className="areas-grid">
                <label className="areas-label">Select Areas ({selectedAreas.length} selected)</label>
                <div className="area-chips">
                  {availableAreas.map((area) => {
                    const isSelected = selectedAreas.find(a => a.name === area.name);
                    return (
                      <button
                        key={area.name}
                        type="button"
                        className={`area-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleArea(area)}
                        disabled={loading}
                      >
                        {isSelected && <span className="check-icon">✓</span>}
                        {area.name}
                        <span className="area-radius">{area.radius}km</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedAreas.length > 0 && (
              <button 
                type="submit" 
                className="btn-primary submit-btn"
                disabled={loading}
              >
                <span className="btn-icon">🎭</span>
                {loading ? 'Loading...' : `Search ${selectedAreas.length} Area${selectedAreas.length > 1 ? 's' : ''}`}
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="gps-active">
          <p>Using your current location...</p>
          <button 
            onClick={() => setUseGPS(false)}
            className="btn-text"
            disabled={loading}
          >
            ← Choose Different Areas
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
}

export default LocationInput;
