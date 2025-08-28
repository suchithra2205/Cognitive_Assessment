import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const weatherCodeToText = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Drizzle: Light',
  53: 'Drizzle: Moderate',
  55: 'Drizzle: Dense',
  56: 'Freezing Drizzle: Light',
  57: 'Freezing Drizzle: Dense',
  61: 'Rain: Slight',
  63: 'Rain: Moderate',
  65: 'Rain: Heavy',
  66: 'Freezing Rain: Light',
  67: 'Freezing Rain: Heavy',
  71: 'Snow fall: Slight',
  73: 'Snow fall: Moderate',
  75: 'Snow fall: Heavy',
  77: 'Snow grains',
  80: 'Rain showers: Slight',
  81: 'Rain showers: Moderate',
  82: 'Rain showers: Violent',
  85: 'Snow showers: Slight',
  86: 'Snow showers: Heavy',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function getCacheKey(query) {
  return `wn_cache_v1::${query.toLowerCase()}`;
}

function readFromCache(query) {
  try {
    const raw = localStorage.getItem(getCacheKey(query));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // expire after 15 minutes
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeToCache(query, data) {
  try {
    localStorage.setItem(
      getCacheKey(query),
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {}
}

async function geocodeCity(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to search location');
  const json = await res.json();
  return json.results || [];
}

async function fetchCurrentWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code'
    ].join(',')
  });
  const res = await fetch(`${WEATHER_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

function App() {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [weather, setWeather] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setError('');
    if (!debounced || debounced.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const cached = readFromCache(`geo:${debounced}`);
      if (cached) {
        if (!cancelled) setSuggestions(cached);
        return;
      }
      try {
        const results = await geocodeCity(debounced);
        if (!cancelled) {
          setSuggestions(results);
          writeToCache(`geo:${debounced}`, results);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Search failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function handleSelect(place) {
    setSelected(place);
    setWeather(null);
    setError('');
    setLoading(true);
    try {
      const cacheKey = `weather:${place.latitude},${place.longitude}`;
      const cached = readFromCache(cacheKey);
      let data;
      if (cached) {
        data = cached;
      } else {
        data = await fetchCurrentWeather(place.latitude, place.longitude);
        writeToCache(cacheKey, data);
      }
      setWeather(data);
    } catch (e) {
      setError(e.message || 'Could not load weather');
    } finally {
      setLoading(false);
    }
  }

  const current = useMemo(() => {
    if (!weather || !weather.current) return null;
    const c = weather.current;
    const units = weather.current_units || {};
    return {
      temperature: `${c.temperature_2m}${units.temperature_2m || '°C'}`,
      feelsLike: `${c.apparent_temperature}${units.apparent_temperature || '°C'}`,
      humidity: `${c.relative_humidity_2m}${units.relative_humidity_2m || '%'}`,
      wind: `${c.wind_speed_10m}${units.wind_speed_10m || ' km/h'}`,
      code: c.weather_code
    };
  }, [weather]);

  return (
    <div className="app">
      <header className="header">
        <h1>Weather Now</h1>
        <p className="subtitle">Search any city to see current conditions</p>
      </header>

      <div className="search">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter city name..."
          aria-label="City name"
        />
        {!!suggestions.length && (
          <ul className="suggestions" role="listbox">
            {suggestions.map((s) => (
              <li
                key={`${s.id}-${s.latitude}-${s.longitude}`}
                className="suggestion"
                onClick={() => {
                  setQuery(`${s.name}, ${s.admin1 || s.country}`);
                  setSuggestions([]);
                  handleSelect(s);
                  inputRef.current?.blur();
                }}
                role="option"
              >
                <span className="city">{s.name}</span>
                <span className="meta">
                  {[s.admin1, s.country].filter(Boolean).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="loading">Loading current weather…</div>}
      {error && <div className="error" role="alert">{error}</div>}

      {selected && current && (
        <section className="card weather" aria-live="polite">
          <h2 className="location">
            {selected.name}
            {selected.admin1 ? `, ${selected.admin1}` : ''}
            {selected.country ? `, ${selected.country}` : ''}
          </h2>
          <div className="grid">
            <div className="temp">
              <div className="value">{current.temperature}</div>
              <div className="label">Temperature</div>
            </div>
            <div className="detail">
              <div className="value">{current.feelsLike}</div>
              <div className="label">Feels like</div>
            </div>
            <div className="detail">
              <div className="value">{current.humidity}</div>
              <div className="label">Humidity</div>
            </div>
            <div className="detail">
              <div className="value">{current.wind}</div>
              <div className="label">Wind</div>
            </div>
          </div>
          <div className="code">{weatherCodeToText[current.code] || '—'}</div>
        </section>
      )}

      {selected && current && (
        <div className="actions" style={{ justifyContent: 'center', marginTop: '.75rem' }}>
          <button
            type="button"
            className="clear"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setSelected(null);
              setWeather(null);
              setError('');
              inputRef.current?.focus();
            }}
          >
            Clear
          </button>
        </div>
      )}

      {!selected && !loading && (
        <p className="hint">Try searching for "London", "Mumbai", or "Nairobi".</p>
      )}

      {/* footer intentionally removed per requirements */}
    </div>
  );
}

export default App
