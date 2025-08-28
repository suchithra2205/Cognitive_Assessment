# Weather Now

Check the current weather for any city. Built with React + Vite and styled with plain CSS. Data comes from Open‑Meteo (no API key required).

##  Features

-  city search with suggestions
- Current conditions: temperature, feels‑like, humidity, wind, summary
- Loading and error states; cancellation‑safe search
- LocalStorage caching (~15 min) for speed and fewer requests
- Responsive layout and accessible controls (ARIA roles, focus management)
- Clear button to reset and start a new search

##  Tech Stack

- React 18, Vite
- Plain CSS (no framework)
- Open‑Meteo Geocoding API + Forecast API

##  Quick Start

Requirements: Node.js 20.19+ (or 22.12+)

```bash
cd weather-now
npm install
npm run dev
```

Open the URL printed by Vite (e.g. `http://localhost:5173`). 

## Build & Preview

```bash
npm run build    # outputs static files to dist/
npm run preview  # serve the production build locally
```



##  Code Tour

- Entry point: `src/main.jsx` mounts `<App />`
- Main logic/UI: `src/App.jsx`
  - Debounce hook `useDebouncedValue`
  - Cache helpers using `localStorage`
  - `geocodeCity(query)` → Open‑Meteo Geocoding API
  - `fetchCurrentWeather(lat, lon)` → Open‑Meteo Forecast API (current fields)
  - Accessible suggestion list and weather card
- Styles: `src/index.css` (base) and `src/App.css` (components, responsive grid)

##  APIs Used

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<query>&count=5&language=en&format=json`
- Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`


