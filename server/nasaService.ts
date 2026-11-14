import type {
  DatasetFeedProof,
  DatasetFeedStatus,
  ForecastDay,
  MonthlyTelemetry,
  RecentDailyObservation,
  SoilProfile,
} from '../src/types/farm.ts';

export interface ResolvedLocation {
  name: string;
  lat: number;
  lon: number;
  coordsLabel: string;
  climateZone: 'Arid' | 'Semi-Arid' | 'Temperate' | 'Humid';
  countryCode?: string;
  countryName?: string;
  presetKey?: string;
}

export const REGION_PRESETS: Record<
  string,
  { name: string; lat: number; lon: number; soil: string; ph: number; countryCode: string; countryName: string }
> = {
  tashkent: {
    name: 'Tashkent Valley, Uzbekistan',
    lat: 41.2995,
    lon: 69.2401,
    soil: 'Silty Clay Loam',
    ph: 7.4,
    countryCode: 'UZ',
    countryName: 'Uzbekistan',
  },
  fergana: {
    name: 'Fergana Basin, Uzbekistan',
    lat: 40.3842,
    lon: 71.7843,
    soil: 'Alluvial Loam',
    ph: 7.2,
    countryCode: 'UZ',
    countryName: 'Uzbekistan',
  },
  california: {
    name: 'Central Valley, California',
    lat: 36.7783,
    lon: -119.4179,
    soil: 'Sandy Loam',
    ph: 6.8,
    countryCode: 'US',
    countryName: 'United States',
  },
  alentejo: {
    name: 'Alentejo Plains, Portugal',
    lat: 38.5667,
    lon: -7.9,
    soil: 'Mediterranean Loam',
    ph: 7.5,
    countryCode: 'PT',
    countryName: 'Portugal',
  },
};

export function formatCoords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

export function phNote(ph: number): string {
  if (ph < 6.4) return 'Slightly Acidic';
  if (ph > 7.6) return 'Slightly Alkaline';
  return 'Balanced';
}

function classifyClimateZone(annualRainMm: number): 'Arid' | 'Semi-Arid' | 'Temperate' | 'Humid' {
  if (annualRainMm < 260) return 'Arid';
  if (annualRainMm < 520) return 'Semi-Arid';
  if (annualRainMm < 950) return 'Temperate';
  return 'Humid';
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'TomatoesWithTARS/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number
): Promise<{ response: Response; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'TomatoesWithTARS/1.0' },
    });
    const data = response.ok ? ((await response.json()) as T) : null;
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveLocation(
  query?: string,
  latParam?: number,
  lonParam?: number
): Promise<ResolvedLocation> {
  if (
    typeof latParam === 'number' &&
    typeof lonParam === 'number' &&
    Number.isFinite(latParam) &&
    Number.isFinite(lonParam) &&
    Math.abs(latParam) <= 90 &&
    Math.abs(lonParam) <= 180
  ) {
    const label = formatCoords(latParam, lonParam);
    return {
      name: query?.trim() || `Farm Plot (${label})`,
      lat: latParam,
      lon: lonParam,
      coordsLabel: label,
      climateZone: 'Semi-Arid',
    };
  }

  const raw = (query || 'Tashkent Valley, Uzbekistan').trim();
  const qLower = raw.toLowerCase();

  for (const [key, preset] of Object.entries(REGION_PRESETS)) {
    const full = preset.name.toLowerCase();
    const short = full.split(',')[0];
    if (qLower === key || qLower === full || qLower === short || qLower.includes(short)) {
      return {
        name: preset.name,
        lat: preset.lat,
        lon: preset.lon,
        coordsLabel: formatCoords(preset.lat, preset.lon),
        climateZone: 'Semi-Arid',
        countryCode: preset.countryCode,
        countryName: preset.countryName,
        presetKey: key,
      };
    }
  }

  const coordMatch = raw.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const label = formatCoords(lat, lon);
      return {
        name: `Plot (${label})`,
        lat,
        lon,
        coordsLabel: label,
        climateZone: 'Semi-Arid',
      };
    }
  }

  if (raw.length >= 2) {
    try {
      const geoRes = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(raw)}&count=1&language=en&format=json`,
        4000
      );
      if (geoRes.ok) {
        const geoJson = (await geoRes.json()) as {
          results?: Array<{
            name: string;
            admin1?: string;
            country?: string;
            country_code?: string;
            latitude: number;
            longitude: number;
          }>;
        };
        const place = geoJson.results?.[0];
        if (place) {
          const fullName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
          return {
            name: fullName,
            lat: place.latitude,
            lon: place.longitude,
            coordsLabel: formatCoords(place.latitude, place.longitude),
            climateZone: 'Semi-Arid',
            countryCode: place.country_code,
            countryName: place.country,
          };
        }
      }
    } catch {
      // Fall back to default coordinates below
    }
  }

  const fallback = REGION_PRESETS.tashkent;
  return {
    name: fallback.name,
    lat: fallback.lat,
    lon: fallback.lon,
    coordsLabel: formatCoords(fallback.lat, fallback.lon),
    climateZone: 'Semi-Arid',
    countryCode: fallback.countryCode,
    countryName: fallback.countryName,
    presetKey: 'tashkent',
  };
}

interface RawNasaPayload {
  telemetry: MonthlyTelemetry;
  recentDaily: RecentDailyObservation[];
  forecastDaily: ForecastDay[];
  soil: SoilProfile;
  feeds: DatasetFeedStatus;
}

const cache = new Map<string, { expiresAt: number; data: RawNasaPayload }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const POWER_MKEYS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const CLIMATOLOGY_DAYS_PER_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function baselineTelemetry(lat: number): MonthlyTelemetry {
  const southern = lat < 0;
  const shift = (arr: number[]) => (southern ? [...arr.slice(6), ...arr.slice(0, 6)] : arr);
  return {
    months: MONTHS_SHORT,
    rootMoisture: shift([34, 36, 35, 33, 30, 27, 25, 26, 28, 31, 33, 34]),
    topMoisture: shift([30, 32, 29, 25, 20, 16, 14, 15, 18, 23, 27, 29]),
    tempMax: shift([4, 7, 14, 20, 27, 33, 36, 35, 28, 20, 11, 5]),
    tempMin: shift([-3, -2, 3, 8, 14, 19, 21, 20, 15, 8, 2, -3]),
    landSkinTemp: shift([-2, 1, 8, 14, 20, 27, 30, 28, 22, 13, 5, -1]),
    ndvi: shift([0.35, 0.39, 0.54, 0.7, 0.81, 0.85, 0.82, 0.75, 0.62, 0.49, 0.41, 0.36]),
    evi: shift([0.25, 0.29, 0.42, 0.56, 0.68, 0.72, 0.69, 0.61, 0.48, 0.37, 0.3, 0.26]),
    rainfall: shift([54, 62, 68, 58, 32, 12, 5, 4, 11, 28, 44, 52]),
    waterDemand: shift([22, 30, 48, 72, 102, 130, 142, 132, 94, 56, 32, 22]),
  };
}

function formatYyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function isValidPowerNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > -900;
}

function estimatedVegetationIndices(
  tempMax: number[],
  rootMoisture: number[]
): { ndvi: number[]; evi: number[] } {
  const ndvi = tempMax.map((temperature, idx) => {
    const thermalFit = Math.max(0, Math.min(1, (temperature - 5) / 23));
    const moistureFit = Math.max(0.28, Math.min(1, rootMoisture[idx] / 32));
    return Math.round((0.26 + 0.61 * thermalFit * moistureFit) * 100) / 100;
  });
  return { ndvi, evi: ndvi.map((value) => Math.round(value * 0.84 * 100) / 100) };
}

async function fetchPowerClimatology(
  lat: number,
  lon: number
): Promise<{ telemetry: MonthlyTelemetry; url: string; period: string } | null> {
  const url =
    `https://power.larc.nasa.gov/api/temporal/climatology/point` +
    `?parameters=PRECTOTCORR,T2M,T2M_RANGE,TS,GWETROOT,GWETTOP,ALLSKY_SFC_SW_DWN` +
    `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;

  const res = await fetchWithTimeout(url, 7000);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    properties?: { parameter?: Record<string, Record<string, number>> };
    messages?: string[] | string;
  };
  const p = json.properties?.parameter;
  if (!p) return null;

  const requiredParameters = [
    'PRECTOTCORR',
    'T2M',
    'T2M_RANGE',
    'TS',
    'GWETROOT',
    'GWETTOP',
    'ALLSKY_SFC_SW_DWN',
  ];
  const hasCompleteMonthlyData = requiredParameters.every((parameter) =>
    POWER_MKEYS.every((month) => isValidPowerNum(p[parameter]?.[month]))
  );
  if (!hasCompleteMonthlyData) return null;

  const rootMoisture = POWER_MKEYS.map((k) => {
    return Math.max(0, Math.min(100, Math.round(p.GWETROOT[k] * 100)));
  });
  const topMoisture = POWER_MKEYS.map((k) => {
    return Math.max(0, Math.min(100, Math.round(p.GWETTOP[k] * 100)));
  });
  const tempMax = POWER_MKEYS.map((k) =>
    Math.round((p.T2M[k] + p.T2M_RANGE[k] / 2) * 10) / 10
  );
  const tempMin = POWER_MKEYS.map((k) =>
    Math.round((p.T2M[k] - p.T2M_RANGE[k] / 2) * 10) / 10
  );
  const landSkinTemp = POWER_MKEYS.map((k, i) =>
    Math.round(p.TS[k] * 10) / 10
  );
  const rainfall = POWER_MKEYS.map((k, idx) =>
    Math.max(0, Math.round(p.PRECTOTCORR[k] * CLIMATOLOGY_DAYS_PER_MONTH[idx]))
  );
  const waterDemand = POWER_MKEYS.map((k, idx) => {
    const rad = p.ALLSKY_SFC_SW_DWN[k];
    return Math.max(18, Math.round(rad * 4.2 + Math.max(0, tempMax[idx] - 5) * 2.1));
  });
  const { ndvi, evi } = estimatedVegetationIndices(tempMax, rootMoisture);

  return {
    url,
    period:
      (Array.isArray(json.messages) ? json.messages[0] : json.messages) ||
      'NASA POWER climatology period',
    telemetry: {
      months: MONTHS_SHORT,
      rootMoisture,
      topMoisture,
      tempMax,
      tempMin,
      landSkinTemp,
      ndvi,
      evi,
      rainfall,
      waterDemand,
    },
  };
}

async function fetchPowerRecentDaily(
  lat: number,
  lon: number
): Promise<{ rows: RecentDailyObservation[]; url: string }> {
  const now = new Date();
  const end = new Date(now.getTime() - 5 * 86400_000);
  const start = new Date(end.getTime() - 15 * 86400_000);

  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=PRECTOTCORR,T2M_MAX,T2M_MIN,TS,GWETROOT,GWETTOP` +
    `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}` +
    `&start=${formatYyyymmdd(start)}&end=${formatYyyymmdd(end)}&format=JSON`;

  try {
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return { rows: [], url };
    const json = (await res.json()) as {
      properties?: { parameter?: Record<string, Record<string, number>> };
    };
    const p = json.properties?.parameter;
    if (!p?.T2M_MAX) return { rows: [], url };

    const dates = Object.keys(p.T2M_MAX).sort();
    const rows: RecentDailyObservation[] = [];
    for (const d of dates) {
      const tmax = p.T2M_MAX?.[d];
      const tmin = p.T2M_MIN?.[d];
      const ts = p.TS?.[d];
      const rain = p.PRECTOTCORR?.[d];
      const gwRoot = p.GWETROOT?.[d];
      const gwTop = p.GWETTOP?.[d];
      if (
        ![
          tmax,
          tmin,
          ts,
          rain,
          gwRoot,
          gwTop,
        ].every(isValidPowerNum)
      ) {
        continue;
      }
      rows.push({
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        rainMm: Math.round(rain * 10) / 10,
        rootMoisturePct: Math.max(0, Math.min(100, Math.round(gwRoot * 100))),
        topMoisturePct: Math.max(0, Math.min(100, Math.round(gwTop * 100))),
        tempMaxC: Math.round(tmax * 10) / 10,
        tempMinC: Math.round(tmin * 10) / 10,
        skinTempC: Math.round(ts * 10) / 10,
      });
    }
    return { rows, url };
  } catch {
    return { rows: [], url };
  }
}

async function fetchUpcomingForecast(
  lat: number,
  lon: number
): Promise<{ days: ForecastDay[]; url: string }> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=14&timezone=auto`;

  try {
    const res = await fetchWithTimeout(url, 4500);
    if (!res.ok) return { days: [], url };
    const json = (await res.json()) as {
      daily?: {
        time?: string[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };
    const d = json.daily;
    if (!d?.time || d.time.length === 0) return { days: [], url };

    const days: ForecastDay[] = [];
    for (const [idx, date] of d.time.entries()) {
      const rain = d.precipitation_sum?.[idx];
      const rainChance = d.precipitation_probability_max?.[idx];
      const tempMax = d.temperature_2m_max?.[idx];
      const tempMin = d.temperature_2m_min?.[idx];
      if (
        typeof rain !== 'number' ||
        typeof rainChance !== 'number' ||
        typeof tempMax !== 'number' ||
        typeof tempMin !== 'number' ||
        ![rain, rainChance, tempMax, tempMin].every(Number.isFinite)
      ) {
        continue;
      }
      days.push({
        date,
        rainMm: Math.round(rain * 10) / 10,
        rainChancePct: Math.round(rainChance),
        tempMaxC: Math.round(tempMax * 10) / 10,
        tempMinC: Math.round(tempMin * 10) / 10,
      });
    }
    return { days, url };
  } catch {
    return { days: [], url };
  }
}

async function fetchHistoricalWeather(
  lat: number,
  lon: number
): Promise<{ telemetry: MonthlyTelemetry; url: string; period: string } | null> {
  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = endYear - 2;
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum` +
    `&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&timezone=UTC`;

  try {
    const res = await fetchWithTimeout(url, 12000);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
        shortwave_radiation_sum?: Array<number | null>;
      };
      hourly?: {
        time?: string[];
        soil_moisture_0_to_7cm?: Array<number | null>;
        soil_moisture_7_to_28cm?: Array<number | null>;
      };
    };
    const daily = json.daily;
    const hourly = json.hourly;
    if (!daily?.time?.length || !hourly?.time?.length) return null;

    type MonthAggregate = {
      month: number;
      days: number;
      precipitation: number;
      maxTemp: number;
      minTemp: number;
      solar: number;
      topMoisture: number;
      topMoistureCount: number;
      rootMoisture: number;
      rootMoistureCount: number;
    };
    const byYearMonth = new Map<string, MonthAggregate>();
    const getAggregate = (date: string): MonthAggregate => {
      const key = date.slice(0, 7);
      let aggregate = byYearMonth.get(key);
      if (!aggregate) {
        aggregate = {
          month: Number(date.slice(5, 7)) - 1,
          days: 0,
          precipitation: 0,
          maxTemp: 0,
          minTemp: 0,
          solar: 0,
          topMoisture: 0,
          topMoistureCount: 0,
          rootMoisture: 0,
          rootMoistureCount: 0,
        };
        byYearMonth.set(key, aggregate);
      }
      return aggregate;
    };
    const isFiniteNumber = (value: unknown): value is number =>
      typeof value === 'number' && Number.isFinite(value);

    for (const [idx, date] of daily.time.entries()) {
      const max = daily.temperature_2m_max?.[idx];
      const min = daily.temperature_2m_min?.[idx];
      const rain = daily.precipitation_sum?.[idx];
      const solar = daily.shortwave_radiation_sum?.[idx];
      if (
        typeof max !== 'number' ||
        typeof min !== 'number' ||
        typeof rain !== 'number' ||
        typeof solar !== 'number' ||
        ![max, min, rain, solar].every(Number.isFinite)
      ) {
        continue;
      }
      const aggregate = getAggregate(date);
      aggregate.days += 1;
      aggregate.maxTemp += max;
      aggregate.minTemp += min;
      aggregate.precipitation += rain;
      aggregate.solar += solar;
    }

    for (const [idx, time] of hourly.time.entries()) {
      const top = hourly.soil_moisture_0_to_7cm?.[idx];
      const root = hourly.soil_moisture_7_to_28cm?.[idx];
      const aggregate = getAggregate(time);
      if (isFiniteNumber(top) && top >= 0 && top <= 1) {
        aggregate.topMoisture += top;
        aggregate.topMoistureCount += 1;
      }
      if (isFiniteNumber(root) && root >= 0 && root <= 1) {
        aggregate.rootMoisture += root;
        aggregate.rootMoistureCount += 1;
      }
    }

    const monthGroups = POWER_MKEYS.map((_, month) =>
      Array.from(byYearMonth.values()).filter(
        (aggregate) =>
          aggregate.month === month &&
          aggregate.days >= 25 &&
          aggregate.topMoistureCount > 0 &&
          aggregate.rootMoistureCount > 0
      )
    );
    if (monthGroups.some((group) => group.length < 2)) return null;
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const tempMax = monthGroups.map((group) =>
      Math.round(mean(group.map((item) => item.maxTemp / item.days)) * 10) / 10
    );
    const tempMin = monthGroups.map((group) =>
      Math.round(mean(group.map((item) => item.minTemp / item.days)) * 10) / 10
    );
    const rootMoisture = monthGroups.map((group) =>
      Math.round(mean(group.map((item) => (item.rootMoisture / item.rootMoistureCount) * 100)))
    );
    const topMoisture = monthGroups.map((group) =>
      Math.round(mean(group.map((item) => (item.topMoisture / item.topMoistureCount) * 100)))
    );
    const rainfall = monthGroups.map((group) =>
      Math.round(mean(group.map((item) => item.precipitation)))
    );
    const landSkinTemp = tempMax.map((max, idx) =>
      Math.round(((max + tempMin[idx]) / 2) * 10) / 10
    );
    const waterDemand = monthGroups.map((group, idx) => {
      const dailySolarKwh = mean(group.map((item) => item.solar / item.days)) / 3.6;
      return Math.max(18, Math.round(dailySolarKwh * 4.2 + Math.max(0, tempMax[idx] - 5) * 2.1));
    });
    const { ndvi, evi } = estimatedVegetationIndices(tempMax, rootMoisture);

    return {
      url,
      period: `${startDate} through ${endDate}`,
      telemetry: {
        months: MONTHS_SHORT,
        rootMoisture,
        topMoisture,
        tempMax,
        tempMin,
        landSkinTemp,
        ndvi,
        evi,
        rainfall,
        waterDemand,
      },
    };
  } catch {
    return null;
  }
}

async function fetchModisNdviLatest(
  lat: number,
  lon: number
): Promise<{
  observation: { ndvi: number; evi: number | null; date: string; url: string } | null;
  error?: string;
}> {
  const datesUrl = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  try {
    const { response: datesRes, data: datesJson } = await fetchJsonWithTimeout<{
      dates?: Array<{ modis_date: string; calendar_date?: string }>;
    }>(datesUrl, 15000);
    if (!datesRes.ok) return { observation: null, error: `NASA MODIS dates endpoint returned HTTP ${datesRes.status}` };
    const list = datesJson?.dates;
    if (!list || list.length === 0) return { observation: null, error: 'NASA MODIS returned no composite dates for this location' };
    const latest = list[list.length - 1];

    const fetchBand = async (
      band: string
    ): Promise<{ value: number | null; error?: string }> => {
      const subUrl = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&band=${band}&startDate=${latest.modis_date}&endDate=${latest.modis_date}&kmAboveBelow=0&kmLeftRight=0`;
      try {
        const { response: subRes, data: subJson } = await fetchJsonWithTimeout<{
          subset?: Array<{ data: number[] }>;
        }>(subUrl, 15000);
        if (!subRes.ok) return { value: null, error: `NASA MODIS ${band} endpoint returned HTTP ${subRes.status}` };
        const rawValue = subJson?.subset?.[0]?.data?.[0];
        if (typeof rawValue !== 'number' || rawValue < -2000 || rawValue > 10000) {
          return { value: null, error: `NASA MODIS returned no valid ${band} pixel value` };
        }
        return { value: Math.round(rawValue * 0.0001 * 100) / 100 };
      } catch (error) {
        return {
          value: null,
          error:
            error instanceof Error && error.name === 'AbortError'
              ? `NASA MODIS ${band} request timed out`
              : `NASA MODIS ${band} request failed`,
        };
      }
    };
    const [ndviResult, eviResult] = await Promise.all([
      fetchBand('250m_16_days_NDVI'),
      fetchBand('250m_16_days_EVI'),
    ]);
    if (ndviResult.value === null) {
      return { observation: null, error: ndviResult.error };
    }
    const subUrl = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&band=250m_16_days_NDVI&startDate=${latest.modis_date}&endDate=${latest.modis_date}&kmAboveBelow=0&kmLeftRight=0`;
    return {
      observation: {
        ndvi: ndviResult.value,
        evi: eviResult.value,
        date: latest.calendar_date || latest.modis_date,
        url: subUrl,
      },
    };
  } catch (error) {
    return {
      observation: null,
      error:
        error instanceof Error && error.name === 'AbortError'
          ? 'NASA MODIS dates request timed out'
          : 'NASA MODIS dates request failed',
    };
  }
}

async function fetchSoilGridsProfile(
  lat: number,
  lon: number,
  presetKey?: string
): Promise<{ soil: SoilProfile; url: string; error?: string }> {
  const preset = presetKey ? REGION_PRESETS[presetKey] : undefined;
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query` +
    `?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}` +
    `&property=phh2o&property=soc&property=clay&property=sand&depth=0-5cm&value=mean`;

  const fallback: SoilProfile = {
    type:
      preset?.soil ||
      (Math.abs(lat) > 48
        ? 'Boreal Silt Loam'
        : Math.abs(lat) < 23
          ? 'Tropical Clay Loam'
          : 'Alluvial Loam'),
    ph: preset?.ph ?? (lat > 34 && lat < 46 ? 7.3 : 6.7),
    phNote: phNote(preset?.ph ?? (lat > 34 && lat < 46 ? 7.3 : 6.7)),
    organicMatterPct: 2.1,
    clayPct: 24,
    sandPct: 38,
    source: 'Regional Soil Baseline',
  };

  try {
    const { response: res, data: json } = await fetchJsonWithTimeout<{
      properties?: {
        layers?: Array<{
          name: string;
          depths?: Array<{ values?: { mean?: number } }>;
        }>;
      };
    }>(url, 15000);
    if (!res.ok) return { soil: fallback, url, error: `ISRIC returned HTTP ${res.status}` };
    const layers = json?.properties?.layers;
    if (!layers || layers.length === 0) {
      return { soil: fallback, url, error: 'ISRIC returned no soil-property layers' };
    }

    const getVal = (name: string): number | null => {
      const layer = layers.find((l) => l.name === name);
      const mean = layer?.depths?.[0]?.values?.mean;
      return typeof mean === 'number' && Number.isFinite(mean) ? mean : null;
    };

    const rawPh = getVal('phh2o');
    const rawSoc = getVal('soc');
    const rawClay = getVal('clay');
    const rawSand = getVal('sand');

    if (rawPh === null || rawSoc === null || rawClay === null || rawSand === null) {
      const missing = [
        rawPh === null ? 'pH' : null,
        rawSoc === null ? 'organic carbon' : null,
        rawClay === null ? 'clay' : null,
        rawSand === null ? 'sand' : null,
      ].filter((value): value is string => value !== null);
      return { soil: fallback, url, error: `ISRIC response had no mapped value for ${missing.join(', ')}` };
    }

    const ph = Math.round((rawPh / 10) * 10) / 10;
    const clayPct = Math.round(rawClay / 10);
    const sandPct = Math.round(rawSand / 10);
    const organicMatterPct = Math.max(0, Math.round((rawSoc / 10) * 1.724 * 10) / 10);

    let soilType = 'Loam';
    if (clayPct >= 35) soilType = sandPct > 40 ? 'Sandy Clay' : 'Clay Loam';
    else if (sandPct >= 62) soilType = 'Sandy Loam';
    else if (clayPct >= 25 && sandPct < 25) soilType = 'Silty Clay Loam';
    else if (clayPct < 20 && sandPct < 40) soilType = 'Silt Loam';

    return {
      url,
      soil: {
        type: soilType,
        ph,
        phNote: phNote(ph),
        organicMatterPct,
        clayPct,
        sandPct,
        source: 'ISRIC SoilGrids (modeled)',
      },
    };
  } catch (error) {
    return {
      soil: fallback,
      url,
      error:
        error instanceof Error && error.name === 'AbortError'
          ? 'ISRIC request timed out'
          : 'ISRIC request failed',
    };
  }
}

export async function getNasaEnvironmentData(loc: ResolvedLocation): Promise<{
  location: ResolvedLocation;
  telemetry: MonthlyTelemetry;
  recentDaily: RecentDailyObservation[];
  forecastDaily: ForecastDay[];
  soil: SoilProfile;
  feeds: DatasetFeedStatus;
}> {
  const cacheKey = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const annualRain = cached.data.telemetry.rainfall.reduce((a, b) => a + b, 0);
    return {
      location: { ...loc, climateZone: classifyClimateZone(annualRain) },
      ...cached.data,
    };
  }

  const [
    powerClimoRes,
    recentDailyRes,
    forecastRes,
    modisRes,
    soilRes,
  ] = await Promise.all([
    fetchPowerClimatology(loc.lat, loc.lon).catch(() => null),
    fetchPowerRecentDaily(loc.lat, loc.lon),
    fetchUpcomingForecast(loc.lat, loc.lon),
    fetchModisNdviLatest(loc.lat, loc.lon),
    fetchSoilGridsProfile(loc.lat, loc.lon, loc.presetKey),
  ]);

  const modisLatest = modisRes.observation;
  const historicalWeatherRes = powerClimoRes
    ? null
    : await fetchHistoricalWeather(loc.lat, loc.lon).catch(() => null);
  const climateSource: DatasetFeedStatus['climateSource'] = powerClimoRes
    ? 'NASA POWER climatology'
    : historicalWeatherRes
      ? 'Open-Meteo historical reanalysis'
      : 'Regional seasonal estimate';
  const telemetry =
    powerClimoRes?.telemetry ??
    historicalWeatherRes?.telemetry ??
    baselineTelemetry(loc.lat);
  const recentDaily = recentDailyRes.rows;
  const forecastDaily = forecastRes.days;
  const soil = soilRes.soil;

  const curMonthIdx = new Date().getUTCMonth();
  if (modisLatest) {
    telemetry.ndvi[curMonthIdx] = modisLatest.ndvi;
    if (modisLatest.evi !== null) telemetry.evi[curMonthIdx] = modisLatest.evi;
  }

  const annualRain = telemetry.rainfall.reduce((a, b) => a + b, 0);
  const nowIso = new Date().toISOString();
  const latestDaily = recentDaily[recentDaily.length - 1];
  const next7Rain = Math.round(forecastDaily.slice(0, 7).reduce((s, d) => s + d.rainMm, 0) * 10) / 10;
  const currentRootMoist = latestDaily?.rootMoisturePct ?? telemetry.rootMoisture[curMonthIdx];
  const currentNdvi = telemetry.ndvi[curMonthIdx];

  const powerClimoUrl =
    powerClimoRes?.url ||
    `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,T2M,T2M_RANGE,TS,GWETROOT,GWETTOP,ALLSKY_SFC_SW_DWN&community=AG&longitude=${loc.lon.toFixed(4)}&latitude=${loc.lat.toFixed(4)}&format=JSON`;
  const modisDatesUrl = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?latitude=${loc.lat.toFixed(4)}&longitude=${loc.lon.toFixed(4)}`;
  const vegetationEstimateSource =
    climateSource === 'NASA POWER climatology'
      ? 'NASA POWER climate variables'
      : climateSource === 'Open-Meteo historical reanalysis'
        ? 'Open-Meteo historical reanalysis'
        : 'regional fallback climate values';
  const proofs: DatasetFeedProof[] = [
    {
      id: 'power-climo',
      name: 'NASA POWER Agroclimatology',
      provider: 'NASA Langley Research Center',
      status: powerClimoRes ? 'Climatology' : 'Unavailable',
      endpointUrl: powerClimoUrl,
      sampleReading: powerClimoRes
        ? `${powerClimoRes.period} · July typical daily high ${telemetry.tempMax[6]}°C · annual precipitation ${annualRain} mm`
        : 'No complete NASA POWER monthly climatology was returned for this location.',
      lastCheckedIso: nowIso,
    },
  ];
  if (historicalWeatherRes) {
    proofs.push({
      id: 'open-meteo-history',
      name: 'Historical Weather Reanalysis',
      provider: 'Open-Meteo archive API',
      status: 'Historical data',
      endpointUrl: historicalWeatherRes.url,
      sampleReading: `${historicalWeatherRes.period} · monthly temperature, precipitation and modeled soil moisture; surface temperature and vegetation indices remain estimates.`,
      lastCheckedIso: nowIso,
    });
  } else if (!powerClimoRes) {
    proofs.push({
      id: 'seasonal-estimate',
      name: 'Regional Seasonal Fallback',
      provider: 'Built-in estimate',
      status: 'Fallback',
      sampleReading: `No complete NASA POWER or Open-Meteo historical data was returned. Regional seasonal estimates are being shown · July high ${telemetry.tempMax[6]}°C · annual precipitation ${annualRain} mm.`,
      lastCheckedIso: nowIso,
    });
  }
  proofs.push(
    {
      id: 'power-daily',
      name: 'NASA POWER Daily Point Data',
      provider: 'NASA Langley Research Center',
      status: latestDaily ? 'Historical data' : 'Unavailable',
      endpointUrl: recentDailyRes.url,
      sampleReading: latestDaily
        ? `Latest available date ${latestDaily.date}: ${latestDaily.tempMaxC}°/${latestDaily.tempMinC}°C · ${latestDaily.rainMm} mm precipitation · modeled root-zone wetness ${latestDaily.rootMoisturePct}%`
        : 'No complete daily observation returned; daily values are omitted.',
      lastCheckedIso: nowIso,
    },
    {
      id: 'modis',
      name: 'NASA MODIS 250m Vegetation Index (MOD13Q1)',
      provider: 'NASA ORNL DAAC REST Service',
      status: modisLatest ? 'Historical data' : 'Unavailable',
      endpointUrl: modisLatest?.url || modisDatesUrl,
      sampleReading: modisLatest
        ? `MODIS observation ${modisLatest.date}: NDVI ${modisLatest.ndvi.toFixed(2)}${modisLatest.evi !== null ? ` · EVI ${modisLatest.evi.toFixed(2)}` : ''}. Other months use an estimate from ${vegetationEstimateSource}.`
        : `${modisRes.error || 'No MODIS pixel value returned'}; NDVI is supplied by the separate estimate below.`,
      lastCheckedIso: nowIso,
    },
    {
      id: 'vegetation-estimate',
      name: 'Seasonal Vegetation Index Estimate',
      provider: `${vegetationEstimateSource} (app-derived proxy)`,
      status: 'Estimated',
      endpointUrl:
        climateSource === 'NASA POWER climatology'
          ? powerClimoUrl
          : historicalWeatherRes?.url,
      sampleReading: modisLatest
        ? `Only the ${modisLatest.date} composite is a MODIS pixel value. Other monthly NDVI/EVI values are estimates; current NDVI ${currentNdvi.toFixed(2)}.`
        : `No MODIS pixel value was available. NDVI ${currentNdvi.toFixed(2)} is estimated from climate variables, not satellite imagery.`,
      lastCheckedIso: nowIso,
    },
    {
      id: 'soilgrids',
      name: 'ISRIC SoilGrids 250m Soil Properties',
      provider: 'ISRIC World Soil Information (modeled map)',
      status: soil.source === 'ISRIC SoilGrids (modeled)' ? 'Modeled' : 'Fallback',
      endpointUrl: soilRes.url,
      sampleReading:
        soil.source === 'ISRIC SoilGrids (modeled)'
          ? `Mapped 0–5 cm properties: ${soil.type} · pH ${soil.ph.toFixed(1)} · estimated organic matter ${soil.organicMatterPct}%`
          : `${soilRes.error || 'ISRIC data unavailable'}; regional baseline assumption (not a local soil test): ${soil.type} · pH ${soil.ph.toFixed(1)}`,
      lastCheckedIso: nowIso,
    },
    {
      id: 'forecast',
      name: '14-Day Rainfall & Frost Forecast',
      provider: 'Open-Meteo Global Weather API',
      status: forecastDaily.length > 0
        ? 'Current forecast'
        : climateSource === 'Regional seasonal estimate'
          ? 'Fallback'
          : climateSource === 'NASA POWER climatology'
            ? 'Climatology'
            : 'Historical data',
      endpointUrl: forecastRes.url,
      sampleReading:
        forecastDaily.length > 0
          ? `Open-Meteo forecast · next 7 days: ${next7Rain} mm rain · minimum ${Math.min(...forecastDaily.slice(0, 7).map((d) => d.tempMinC))}°C`
          : `Forecast unavailable; ${climateSource} provides seasonal context, not a forecast.`,
      lastCheckedIso: nowIso,
    }
  );

  const feeds: DatasetFeedStatus = {
    climateSource,
    powerDaily: recentDaily.length > 0 ? 'NASA POWER daily' : 'Unavailable',
    modisNdvi: modisLatest
      ? 'NASA MODIS observation'
      : climateSource === 'NASA POWER climatology'
        ? 'Estimated from NASA POWER'
        : climateSource === 'Open-Meteo historical reanalysis'
          ? 'Estimated from Open-Meteo reanalysis'
          : 'Regional vegetation estimate',
    soilGrids: soil.source === 'ISRIC SoilGrids (modeled)' ? 'ISRIC modeled soil map' : 'Regional baseline',
    forecast: forecastDaily.length > 0 ? 'Open-Meteo forecast' : climateSource,
    lastUpdatedIso: nowIso,
    proofs,
  };

  const payload: RawNasaPayload = { telemetry, recentDaily, forecastDaily, soil, feeds };
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: payload });

  return {
    location: { ...loc, climateZone: classifyClimateZone(annualRain) },
    ...payload,
  };
}
