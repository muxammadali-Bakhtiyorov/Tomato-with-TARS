# Tomatoes with TARS

A farm-planning dashboard for crop rotation, weather context, soil estimates, and AI-assisted guidance. NASA and weather data provide regional context; they are not measurements from an on-farm sensor or a substitute for a soil test.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Browser geolocation is optional and requires permission; entering a location manually also works.

TARS AI advice requires `GEMINI_API_KEY`. Add it to a local `.env` file based on `.env.example`. The weather, NASA, and farm-planning features do not require a Gemini key.

## Supabase sign-in

The app requires an account before opening the farm planner. In Supabase, enable **Authentication → Providers → Email**. Set the project **Site URL** to `http://localhost:3000` for local work and add your deployed site URL to the allowed redirect URLs.

Copy the project URL and its public anon/publishable key from Supabase into `.env`:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
```

Restart `npm run dev`, then create an account or sign in. The `VITE_*` values are included in the browser build; only use the public anon/publishable key there. **Never use or expose a Supabase service-role/secret key.** In deployment, set the `VITE_*` variables in the build environment and the server variables in the runtime environment.

The server verifies the Supabase access token for every `/api/*` route except `/api/health`. Farm plots, plans, and notes are stored in separate per-user files by the current JSON storage adapter; authentication is not yet backed by Supabase database tables or RLS. On Vercel, the adapter uses ephemeral `/tmp` storage, so production farm data needs a persistent database to survive restarts. Pre-authentication shared JSON data is not automatically assigned to a user. The Supabase **Authentication → Users** page shows registered accounts, but this app does not currently record a user activity timeline or farm-action audit log.

For a production build:

```bash
npm run build
npm run start
```

`npm run lint` runs the TypeScript check.

## Data sources and freshness

The app requests its external feeds from the server, so browser CORS restrictions do not apply to those requests. Use **Refresh Data** to force a new provider check; it bypasses the app's 30-minute server cache and the browser cache. Ordinary loads may reuse the latest cached response.

| Feed | What the app requests | Important limitations |
| --- | --- | --- |
| NASA POWER Agroclimatology | Monthly climate normals for temperature, precipitation, radiation, and modeled soil wetness | A precomputed climatology (currently Jan 2001-Dec 2025), not current weather. |
| NASA POWER daily | Daily temperature, precipitation, land-surface temperature, and modeled soil wetness, searching the latest 30 days through yesterday | The API may publish with a delay. The app uses the newest valid date returned, not an assumed "today" value. |
| Open-Meteo current conditions and forecast | Current model-analysis conditions and a 14-day forecast | Current conditions are model output, not a local weather-station or farm-sensor reading. Forecast values are predictions. |
| Open-Meteo historical archive | The three most recent complete years of weather and modeled soil moisture | Used for historical context and to estimate vegetation when a MODIS pixel is unavailable. It is not current data. |
| NASA MODIS MOD13Q1 | The latest available 16-day vegetation-index composite when the provider returns a pixel | The feed can time out. If no valid pixel is returned, the vegetation index is estimated from weather history and labeled as an estimate. |
| ISRIC SoilGrids | Modeled soil properties at 0-5, 5-15, and 15-30 cm | A static modeled map, not a live soil measurement. If the queried location has no mapped values, the app labels its regional soil baseline as an estimate. |

GPM IMERG and NASA EONET are not currently integrated into this app. The related [Field Almanac project](https://github.com/muxammadali-Bakhtiyorov/field-almanac) explores both. Its IMERG request uses NASA POWER's `IMERG_PRECTOT` without `time-standard=UTC`; NASA reports that IMERG is unavailable in the default local-solar time standard. UTC requests return historical values, but the latest 30 days at the tested location contained no valid values, so they should not be presented as current rainfall.

## Reading provider status

- **Green:** the named provider returned usable data. This does not necessarily mean the product is real-time; climatology, historical data, and modeled soil maps can all be returned successfully.
- **Blue:** the app is showing a labeled estimate or fallback because the requested source did not provide usable data.
- **Gray:** the feed is unavailable and no usable value was returned.

The Data Sources page shows each feed's provider, latest reading or failure reason, and source URL. Each provider card links to an official dataset explainer with **About dataset** and to the requested response with **Inspect source**. Do not interpret a green climatology or soil-map badge as a live observation.

## Project layout

- `src/` - React dashboard and data-source views.
- `server/` - Express API, NASA/weather-provider requests, farm planning, storage, and TARS integration.
- `server/nasaService.ts` - location resolution, external data fetches, cache/refresh behavior, estimates, and provider provenance.
- `server/agronomyEngine.ts` - crop and rotation recommendations built from the returned telemetry, soil profile, and forecast.
- `server/app.ts` - HTTP API routes.

Useful API routes include `GET /api/health`, `GET /api/nasa/telemetry`, `GET /api/market`, and the farm, plan, notes, rotation, and chat endpoints in `server/app.ts`.
