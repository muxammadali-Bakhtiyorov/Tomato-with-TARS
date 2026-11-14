import type {
  CountryMarketDataset,
  CropMarketQuote,
  CustomCropId,
  SandboxEconomics,
  SandboxSeasonEconomics,
} from '../src/types/farm.ts';

interface CountryEconomicProfile {
  currencyCode: string;
  currencySymbol: string;
  fallbackUsdRate: number;
  priceMultiplier: number; // Farmgate produce price relative to US baseline
  costMultiplier: number; // Seed/labor/irrigation cost relative to US baseline
}

const COUNTRY_PROFILES: Record<string, CountryEconomicProfile> = {
  US: { currencyCode: 'USD', currencySymbol: '$', fallbackUsdRate: 1, priceMultiplier: 1.0, costMultiplier: 1.0 },
  UZ: { currencyCode: 'UZS', currencySymbol: 'UZS ', fallbackUsdRate: 12800, priceMultiplier: 0.42, costMultiplier: 0.34 },
  KZ: { currencyCode: 'KZT', currencySymbol: '₸', fallbackUsdRate: 495, priceMultiplier: 0.55, costMultiplier: 0.44 },
  PT: { currencyCode: 'EUR', currencySymbol: '€', fallbackUsdRate: 0.92, priceMultiplier: 0.94, costMultiplier: 0.85 },
  ES: { currencyCode: 'EUR', currencySymbol: '€', fallbackUsdRate: 0.92, priceMultiplier: 0.91, costMultiplier: 0.82 },
  IT: { currencyCode: 'EUR', currencySymbol: '€', fallbackUsdRate: 0.92, priceMultiplier: 0.98, costMultiplier: 0.88 },
  FR: { currencyCode: 'EUR', currencySymbol: '€', fallbackUsdRate: 0.92, priceMultiplier: 1.02, costMultiplier: 0.94 },
  DE: { currencyCode: 'EUR', currencySymbol: '€', fallbackUsdRate: 0.92, priceMultiplier: 1.05, costMultiplier: 0.97 },
  GB: { currencyCode: 'GBP', currencySymbol: '£', fallbackUsdRate: 0.79, priceMultiplier: 1.08, costMultiplier: 1.02 },
  TR: { currencyCode: 'TRY', currencySymbol: '₺', fallbackUsdRate: 34.5, priceMultiplier: 0.58, costMultiplier: 0.48 },
  IN: { currencyCode: 'INR', currencySymbol: '₹', fallbackUsdRate: 84.4, priceMultiplier: 0.38, costMultiplier: 0.30 },
  PK: { currencyCode: 'PKR', currencySymbol: 'Rs ', fallbackUsdRate: 278, priceMultiplier: 0.35, costMultiplier: 0.28 },
  CN: { currencyCode: 'CNY', currencySymbol: '¥', fallbackUsdRate: 7.24, priceMultiplier: 0.68, costMultiplier: 0.56 },
  BR: { currencyCode: 'BRL', currencySymbol: 'R$', fallbackUsdRate: 5.75, priceMultiplier: 0.62, costMultiplier: 0.52 },
  MX: { currencyCode: 'MXN', currencySymbol: 'MX$', fallbackUsdRate: 20.1, priceMultiplier: 0.65, costMultiplier: 0.53 },
  AR: { currencyCode: 'ARS', currencySymbol: 'ARS ', fallbackUsdRate: 1005, priceMultiplier: 0.58, costMultiplier: 0.49 },
  EG: { currencyCode: 'EGP', currencySymbol: 'E£', fallbackUsdRate: 49.3, priceMultiplier: 0.44, costMultiplier: 0.35 },
  MA: { currencyCode: 'MAD', currencySymbol: 'MAD ', fallbackUsdRate: 9.9, priceMultiplier: 0.56, costMultiplier: 0.45 },
  KE: { currencyCode: 'KES', currencySymbol: 'KSh ', fallbackUsdRate: 129, priceMultiplier: 0.46, costMultiplier: 0.36 },
  AU: { currencyCode: 'AUD', currencySymbol: 'A$', fallbackUsdRate: 1.53, priceMultiplier: 1.06, costMultiplier: 0.98 },
  CA: { currencyCode: 'CAD', currencySymbol: 'C$', fallbackUsdRate: 1.39, priceMultiplier: 1.02, costMultiplier: 0.95 },
  UA: { currencyCode: 'UAH', currencySymbol: '₴', fallbackUsdRate: 41.3, priceMultiplier: 0.48, costMultiplier: 0.39 },
  RU: { currencyCode: 'RUB', currencySymbol: '₽', fallbackUsdRate: 98, priceMultiplier: 0.52, costMultiplier: 0.42 },
  SA: { currencyCode: 'SAR', currencySymbol: 'SAR ', fallbackUsdRate: 3.75, priceMultiplier: 0.88, costMultiplier: 0.78 },
  AE: { currencyCode: 'AED', currencySymbol: 'AED ', fallbackUsdRate: 3.67, priceMultiplier: 0.95, costMultiplier: 0.84 },
  JP: { currencyCode: 'JPY', currencySymbol: '¥', fallbackUsdRate: 154, priceMultiplier: 1.28, costMultiplier: 1.15 },
};

interface CropEconomicsBaseline {
  cropName: string;
  farmgatePricePerKgUsd: number;
  investmentPerHaUsd: number;
  baselineYieldTonPerHa: number;
  unitNote: string;
}

const CROP_BASELINES: Record<CustomCropId, CropEconomicsBaseline> = {
  tomatoes: {
    cropName: 'Tomatoes',
    farmgatePricePerKgUsd: 0.72,
    investmentPerHaUsd: 6400,
    baselineYieldTonPerHa: 42,
    unitNote: 'Fresh market / processing harvest',
  },
  peppers: {
    cropName: 'Peppers',
    farmgatePricePerKgUsd: 1.05,
    investmentPerHaUsd: 5900,
    baselineYieldTonPerHa: 26,
    unitNote: 'Sweet bell & chili market yield',
  },
  potatoes: {
    cropName: 'Potatoes',
    farmgatePricePerKgUsd: 0.44,
    investmentPerHaUsd: 4300,
    baselineYieldTonPerHa: 30,
    unitNote: 'Storage tuber yield',
  },
  wheat: {
    cropName: 'Wheat / Barley',
    farmgatePricePerKgUsd: 0.25,
    investmentPerHaUsd: 780,
    baselineYieldTonPerHa: 5.2,
    unitNote: 'Dry grain harvest',
  },
  corn: {
    cropName: 'Sweet Corn',
    farmgatePricePerKgUsd: 0.34,
    investmentPerHaUsd: 1450,
    baselineYieldTonPerHa: 12.5,
    unitNote: 'Irrigated cob / grain yield',
  },
  melons: {
    cropName: 'Melons / Squash',
    farmgatePricePerKgUsd: 0.42,
    investmentPerHaUsd: 2900,
    baselineYieldTonPerHa: 31,
    unitNote: 'High-brix melon harvest',
  },
  chickpeas: {
    cropName: 'Chickpeas / Beans',
    farmgatePricePerKgUsd: 0.96,
    investmentPerHaUsd: 720,
    baselineYieldTonPerHa: 2.3,
    unitNote: 'Dried pulse crop + nitrogen bonus',
  },
  clover: {
    cropName: 'Clover & Winter Rye',
    farmgatePricePerKgUsd: 0.14,
    investmentPerHaUsd: 310,
    baselineYieldTonPerHa: 4.5,
    unitNote: 'Forage / hay cut + fertilizer savings',
  },
  mustard: {
    cropName: 'Mustard & Radish Cover',
    farmgatePricePerKgUsd: 0.35,
    investmentPerHaUsd: 260,
    baselineYieldTonPerHa: 1.8,
    unitNote: 'Biofumigant seed / green manure credit',
  },
  onions: {
    cropName: 'Onions / Garlic',
    farmgatePricePerKgUsd: 0.56,
    investmentPerHaUsd: 4200,
    baselineYieldTonPerHa: 28,
    unitNote: 'Cured bulb market yield',
  },
  sunflower: {
    cropName: 'Sorghum / Sunflower',
    farmgatePricePerKgUsd: 0.54,
    investmentPerHaUsd: 790,
    baselineYieldTonPerHa: 3.1,
    unitNote: 'Oilseed & drought-hardy forage',
  },
  fallow: {
    cropName: 'Straw Mulch Rest',
    farmgatePricePerKgUsd: 0,
    investmentPerHaUsd: 140,
    baselineYieldTonPerHa: 0,
    unitNote: 'Soil moisture & structure recovery',
  },
};

const MARKET_TTL_MS = 6 * 60 * 60 * 1000;
let fxCache: { expiresAt: number; rates: Record<string, number>; status: 'Live' | 'Baseline' } | null = null;
const countryMarketCache = new Map<string, { expiresAt: number; data: CountryMarketDataset }>();

async function fetchLiveFxRates(force = false): Promise<{ rates: Record<string, number>; status: 'Live' | 'Baseline' }> {
  if (!force && fxCache && fxCache.expiresAt > Date.now()) {
    return { rates: fxCache.rates, status: fxCache.status };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (json.result === 'success' && json.rates) {
        fxCache = { expiresAt: Date.now() + MARKET_TTL_MS, rates: json.rates, status: 'Live' };
        return { rates: json.rates, status: 'Live' };
      }
    }
  } catch {
    // Fall back to baseline FX table below
  }
  const fallbackRates: Record<string, number> = {};
  for (const profile of Object.values(COUNTRY_PROFILES)) {
    fallbackRates[profile.currencyCode] = profile.fallbackUsdRate;
  }
  fxCache = { expiresAt: Date.now() + 30 * 60 * 1000, rates: fallbackRates, status: 'Baseline' };
  return { rates: fallbackRates, status: 'Baseline' };
}

async function fetchWorldBankAgIndex(
  countryCode: string
): Promise<{ factor: number; status: 'Live' | 'Baseline' }> {
  try {
    const iso = countryCode.toUpperCase();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(iso)}/indicator/AG.PRD.FOOD.XD?format=json&mrv=4`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const json = (await res.json()) as [unknown, Array<{ value: number | null; date: string }>] | unknown[];
      const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
      const latest = rows.find((r) => typeof r?.value === 'number' && Number.isFinite(r.value));
      if (latest && typeof latest.value === 'number') {
        // Normalize index (base 2014-2016 = 100) into a mild seasonal market adjustment (0.90 .. 1.18)
        const normalized = Math.max(0.9, Math.min(1.18, Number((100 / Math.max(78, latest.value) * 1.06).toFixed(3))));
        return { factor: normalized, status: 'Live' };
      }
    }
  } catch {
    // Fall back gracefully
  }
  return { factor: 1.0, status: 'Baseline' };
}

function inferCountryCodeFromName(locationName: string): { code: string; name: string } {
  const lower = locationName.toLowerCase();
  const hints: Array<[RegExp, string, string]> = [
    [/uzbek|tashkent|fergana|samarkand|bukhara/, 'UZ', 'Uzbekistan'],
    [/california|texas|florida|iowa|usa|united states|fresno|salinas/, 'US', 'United States'],
    [/portugal|alentejo|lisbon|porto/, 'PT', 'Portugal'],
    [/spain|andalusia|madrid|valencia|murcia/, 'ES', 'Spain'],
    [/italy|sicily|tuscany|milan|rome/, 'IT', 'Italy'],
    [/france|paris|lyon|bordeaux/, 'FR', 'France'],
    [/germany|berlin|bavaria|munich/, 'DE', 'Germany'],
    [/uk|united kingdom|england|london|scotland/, 'GB', 'United Kingdom'],
    [/turkey|türkiye|antalya|izmir|ankara|konya/, 'TR', 'Turkey'],
    [/india|punjab|maharashtra|delhi|bengaluru/, 'IN', 'India'],
    [/pakistan|lahore|karachi|multan/, 'PK', 'Pakistan'],
    [/kazakh|almaty|astana|shymkent/, 'KZ', 'Kazakhstan'],
    [/china|shandong|beijing|shanghai/, 'CN', 'China'],
    [/brazil|são paulo|mato grosso/, 'BR', 'Brazil'],
    [/mexico|sinaloa|jalisco|sonora/, 'MX', 'Mexico'],
    [/egypt|cairo|nile|alexandria/, 'EG', 'Egypt'],
    [/morocco|casablanca|agadir|marrakesh/, 'MA', 'Morocco'],
    [/kenya|nairobi|nakuru/, 'KE', 'Kenya'],
    [/canada|ontario|alberta|saskatchewan/, 'CA', 'Canada'],
    [/australia|victoria|queensland|perth/, 'AU', 'Australia'],
    [/ukraine|kyiv|odessa/, 'UA', 'Ukraine'],
  ];
  for (const [re, code, name] of hints) {
    if (re.test(lower)) return { code, name };
  }
  return { code: 'US', name: 'Global Baseline (USD)' };
}

export async function getCountryMarketDataset(params: {
  countryCode?: string;
  countryName?: string;
  locationName?: string;
  forceRefresh?: boolean;
}): Promise<CountryMarketDataset> {
  const inferred = inferCountryCodeFromName(params.locationName || '');
  const countryCode = (params.countryCode || inferred.code || 'US').toUpperCase();
  const countryName = params.countryName || inferred.name;
  const cacheKey = countryCode;

  if (!params.forceRefresh) {
    const cached = countryMarketCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  const profile = COUNTRY_PROFILES[countryCode] ?? {
    currencyCode: 'USD',
    currencySymbol: '$',
    fallbackUsdRate: 1,
    priceMultiplier: 0.72,
    costMultiplier: 0.62,
  };

  const [fxRes, wbRes] = await Promise.all([
    fetchLiveFxRates(params.forceRefresh),
    fetchWorldBankAgIndex(countryCode),
  ]);

  const usdToLocalRate = fxRes.rates[profile.currencyCode] ?? profile.fallbackUsdRate;
  const foodPriceIndexFactor = Number((profile.priceMultiplier * wbRes.factor).toFixed(3));
  const inputCostFactor = profile.costMultiplier;

  const crops = {} as Record<CustomCropId, CropMarketQuote>;

  (Object.keys(CROP_BASELINES) as CustomCropId[]).forEach((cropId) => {
    const base = CROP_BASELINES[cropId];
    const priceUsd = Number((base.farmgatePricePerKgUsd * foodPriceIndexFactor).toFixed(3));
    const priceLocal =
      usdToLocalRate >= 100
        ? Math.round(priceUsd * usdToLocalRate)
        : Number((priceUsd * usdToLocalRate).toFixed(2));
    const investUsd = Math.round(base.investmentPerHaUsd * inputCostFactor);
    const investLocal = Math.round(investUsd * usdToLocalRate);

    crops[cropId] = {
      cropId,
      cropName: base.cropName,
      farmgatePricePerKgUsd: priceUsd,
      farmgatePricePerKgLocal: priceLocal,
      investmentPerHaUsd: investUsd,
      investmentPerHaLocal: investLocal,
      baselineYieldTonPerHa: base.baselineYieldTonPerHa,
      unitNote: base.unitNote,
    };
  });

  const sources: string[] = [
    fxRes.status === 'Live'
      ? 'Open Exchange Rates API (Daily Live FX)'
      : 'Regional FX Reference Table',
    wbRes.status === 'Live'
      ? `World Bank Food Production Index (${countryCode})`
      : 'FAO / USDA Farmgate Price Baseline',
  ];

  const dataset: CountryMarketDataset = {
    countryCode,
    countryName,
    currencyCode: profile.currencyCode,
    currencySymbol: profile.currencySymbol,
    usdToLocalRate,
    foodPriceIndexFactor,
    inputCostFactor,
    fxStatus: fxRes.status,
    wbIndexStatus: wbRes.status,
    fetchedAtIso: new Date().toISOString(),
    sources,
    crops,
  };

  countryMarketCache.set(cacheKey, {
    expiresAt: Date.now() + MARKET_TTL_MS,
    data: dataset,
  });

  return dataset;
}

export function estimateSandboxEconomics(params: {
  crops: [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
  seasonStatuses: Array<{ seasonLabel: string; status: 'safe' | 'caution' | 'danger' }>;
  survivalPct: number;
  waterImpactPct: number;
  areaHa: number;
  dataset: CountryMarketDataset;
}): SandboxEconomics {
  const areaHa = Math.max(0.5, Math.min(50000, Number(params.areaHa) || 10));
  const { dataset, crops, seasonStatuses, survivalPct, waterImpactPct } = params;

  const seasonBreakdown: SandboxSeasonEconomics[] = crops.map((cropId, idx) => {
    const quote = dataset.crops[cropId];
    const status = seasonStatuses[idx]?.status ?? 'safe';
    const seasonLabel = seasonStatuses[idx]?.seasonLabel ?? `Season ${idx + 1}`;

    // Scale yield by how healthy/survivable the crop is in that season slot + overall rotation health
    const slotPenalty = status === 'danger' ? 0.42 : status === 'caution' ? 0.78 : 1.0;
    const overallHealthMultiplier = 0.65 + (survivalPct / 100) * 0.4;
    const expectedYieldTons = Number(
      (quote.baselineYieldTonPerHa * areaHa * slotPenalty * overallHealthMultiplier).toFixed(1)
    );

    // Water savings slightly reduce irrigation pumping/input expenditure
    const waterCostModifier = Math.max(0.88, Math.min(1.12, 1 - waterImpactPct / 300));
    const investmentUsd = Math.round(quote.investmentPerHaUsd * areaHa * waterCostModifier);
    const investmentLocal = Math.round(investmentUsd * dataset.usdToLocalRate);

    // 1 ton = 1000 kg
    const revenueUsd = Math.round(expectedYieldTons * 1000 * quote.farmgatePricePerKgUsd);
    const revenueLocal = Math.round(revenueUsd * dataset.usdToLocalRate);
    const profitUsd = revenueUsd - investmentUsd;
    const profitLocal = revenueLocal - investmentLocal;

    return {
      seasonLabel,
      cropId,
      cropName: quote.cropName,
      expectedYieldTons,
      pricePerKgUsd: quote.farmgatePricePerKgUsd,
      pricePerKgLocal: quote.farmgatePricePerKgLocal,
      investmentUsd,
      investmentLocal,
      revenueUsd,
      revenueLocal,
      profitUsd,
      profitLocal,
    };
  });

  const totalInvestmentUsd = seasonBreakdown.reduce((s, r) => s + r.investmentUsd, 0);
  const totalInvestmentLocal = seasonBreakdown.reduce((s, r) => s + r.investmentLocal, 0);
  const totalRevenueUsd = seasonBreakdown.reduce((s, r) => s + r.revenueUsd, 0);
  const totalRevenueLocal = seasonBreakdown.reduce((s, r) => s + r.revenueLocal, 0);
  const netProfitUsd = totalRevenueUsd - totalInvestmentUsd;
  const netProfitLocal = totalRevenueLocal - totalInvestmentLocal;
  const roiPct =
    totalInvestmentUsd > 0 ? Math.round((netProfitUsd / totalInvestmentUsd) * 100) : 0;

  return {
    areaHa,
    countryName: dataset.countryName,
    countryCode: dataset.countryCode,
    currencyCode: dataset.currencyCode,
    currencySymbol: dataset.currencySymbol,
    totalInvestmentUsd,
    totalInvestmentLocal,
    totalRevenueUsd,
    totalRevenueLocal,
    netProfitUsd,
    netProfitLocal,
    roiPct,
    seasonBreakdown,
    datasetUpdatedIso: dataset.fetchedAtIso,
    marketSources: dataset.sources,
  };
}
