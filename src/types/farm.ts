export type ThemeMode = 'moon' | 'sun';
export type DashboardPage = 'farm' | 'summary' | 'analytics';
export type RotationGoal = 'water' | 'nitrogen' | 'pest';
export type AnchorCrop = 'tomatoes' | 'peppers' | 'potatoes' | 'wheat' | 'corn' | 'melons';

export type CustomCropId =
  | 'tomatoes'
  | 'peppers'
  | 'potatoes'
  | 'wheat'
  | 'corn'
  | 'melons'
  | 'chickpeas'
  | 'clover'
  | 'mustard'
  | 'onions'
  | 'sunflower'
  | 'fallow';

export interface MonthlyTelemetry {
  months: string[];
  rootMoisture: number[];
  topMoisture: number[];
  tempMax: number[];
  tempMin: number[];
  landSkinTemp: number[];
  ndvi: number[];
  evi: number[];
  rainfall: number[];
  waterDemand: number[];
}

export interface RecentDailyObservation {
  date: string;
  rainMm: number;
  rootMoisturePct: number;
  topMoisturePct: number;
  tempMaxC: number;
  tempMinC: number;
  skinTempC: number;
}

export interface ForecastDay {
  date: string;
  rainMm: number;
  rainChancePct: number;
  tempMaxC: number;
  tempMinC: number;
}

export interface RainfallPredictor {
  next7DaysMm: number;
  next14DaysMm: number;
  rainChancePct: number;
  rainyDaysNext14: number;
  verdictLabel: string;
  plainSummary: string;
  source:
    | 'Open-Meteo Forecast'
    | 'NASA POWER climatology'
    | 'Open-Meteo historical reanalysis'
    | 'Regional seasonal estimate';
  dailyForecast: ForecastDay[];
}

export interface SurvivalPredictor {
  cropKey: AnchorCrop;
  cropName: string;
  survivalPct: number;
  dieOutRiskPct: number;
  verdictLabel: string;
  verdictTone: 'safe' | 'caution' | 'danger';
  willSurviveSummary: string;
  risks: {
    label: string;
    level: 'Low' | 'Medium' | 'High';
    detail: string;
  }[];
}

export interface CropPlaybook {
  cropKey: AnchorCrop;
  cropName: string;
  emoji: string;
  daysToMaturityMin: number;
  daysToMaturityMax: number;
  idealTempRangeC: string;
  idealPhRange: string;
  waterFrequencyDaysDry: number;
  waterGuide: string;
  harvestSigns: string;
  preservationMethods: {
    method: string;
    detail: string;
  }[];
  careTips: string[];
}

export interface SoilProfile {
  type: string;
  ph: number;
  phNote: string;
  organicMatterPct: number;
  clayPct: number;
  sandPct: number;
  source: 'ISRIC SoilGrids (modeled)' | 'Regional Soil Baseline';
}

export interface RotationSeasonStep {
  order: number;
  season: string;
  crop: string;
  family: string;
  tag: string;
  tagTone: 'terracotta' | 'sky' | 'forest' | 'amber';
  waterNeed: string;
  waterSavedPct: number;
  note: string;
  plantingWindow: string;
}

export interface QuickActionTip {
  headline: string;
  verdictBadge: string;
  verdictTone: 'optimal' | 'watch' | 'action';
  summary: string;
  plantingOrderSummary: string;
  estimatedWaterSavingsPct: number;
  doNowSteps: {
    category: 'water' | 'soil' | 'canopy';
    title: string;
    detail: string;
  }[];
  metricsSnapshot: {
    currentRootMoisturePct: number;
    recent14dRainMm: number;
    currentSkinTempC: number;
    currentNdvi: number;
    annualRainMm: number;
    bestPlantingMonth: string;
    bestPlantingNightTempC: number;
    peakSummerMonth: string;
    peakSummerTempC: number;
    currentMonthDeficitMm: number;
    currentMonthRainMm: number;
    currentMonthDemandMm: number;
  };
}

export interface DatasetFeedProof {
  id: string;
  name: string;
  provider: string;
  status:
    | 'Current forecast'
    | 'Current model conditions'
    | 'Historical data'
    | 'Historical estimate'
    | 'Climatology'
    | 'Modeled'
    | 'Estimated'
    | 'Fallback'
    | 'Unavailable';
  endpointUrl?: string;
  sampleReading: string;
  lastCheckedIso: string;
}

export interface DatasetFeedStatus {
  climateSource:
    | 'NASA POWER climatology'
    | 'Open-Meteo historical reanalysis'
    | 'Regional seasonal estimate';
  powerDaily:
    | 'NASA POWER daily'
    | 'Historical estimate'
    | 'Climatology'
    | 'Regional estimate';
  modisNdvi:
    | 'NASA MODIS observation'
    | 'Estimated from NASA POWER'
    | 'Estimated from Open-Meteo reanalysis'
    | 'Regional vegetation estimate';
  soilGrids: 'ISRIC modeled soil map' | 'Regional baseline';
  forecast:
    | 'Open-Meteo forecast'
    | 'NASA POWER climatology'
    | 'Open-Meteo historical reanalysis'
    | 'Regional seasonal estimate';
  lastUpdatedIso: string;
  proofs: DatasetFeedProof[];
}

export interface CropMarketQuote {
  cropId: CustomCropId;
  cropName: string;
  farmgatePricePerKgUsd: number;
  farmgatePricePerKgLocal: number;
  investmentPerHaUsd: number;
  investmentPerHaLocal: number;
  baselineYieldTonPerHa: number;
  unitNote: string;
}

export interface CountryMarketDataset {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  usdToLocalRate: number;
  foodPriceIndexFactor: number;
  inputCostFactor: number;
  fxStatus: 'Live' | 'Baseline';
  wbIndexStatus: 'Live' | 'Baseline';
  fetchedAtIso: string;
  sources: string[];
  crops: Record<CustomCropId, CropMarketQuote>;
}

export interface SandboxSeasonEconomics {
  seasonLabel: string;
  cropId: CustomCropId;
  cropName: string;
  expectedYieldTons: number;
  pricePerKgUsd: number;
  pricePerKgLocal: number;
  investmentUsd: number;
  investmentLocal: number;
  revenueUsd: number;
  revenueLocal: number;
  profitUsd: number;
  profitLocal: number;
}

export interface SandboxEconomics {
  areaHa: number;
  countryName: string;
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  totalInvestmentUsd: number;
  totalInvestmentLocal: number;
  totalRevenueUsd: number;
  totalRevenueLocal: number;
  netProfitUsd: number;
  netProfitLocal: number;
  roiPct: number;
  seasonBreakdown: SandboxSeasonEconomics[];
  datasetUpdatedIso: string;
  marketSources: string[];
}

export interface CustomRotationEvaluation {
  crops: [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
  verdict: 'good' | 'okay' | 'bad';
  verdictTitle: string;
  willDieVerdict: string;
  survivalPct: number;
  dieOutRiskPct: number;
  waterImpactPct: number;
  soilHealthImpact: string;
  goodPoints: string[];
  badPoints: string[];
  seasonChecks: {
    seasonLabel: string;
    cropName: string;
    status: 'safe' | 'caution' | 'danger';
    note: string;
  }[];
  marketDataset?: CountryMarketDataset;
  economics?: SandboxEconomics;
}

export interface FarmAiAdvice {
  headline: string;
  harvestForecast: string;
  wateringAdvice: string;
  preservationTip: string;
  survivalRisks: string[];
  actionTips: string[];
  source: 'Gemini AI' | 'Agronomy Engine';
  generatedAtIso: string;
}

export interface NasaFarmResponse {
  location: {
    name: string;
    lat: number;
    lon: number;
    coordsLabel: string;
    climateZone: 'Arid' | 'Semi-Arid' | 'Temperate' | 'Humid';
    countryCode?: string;
    countryName?: string;
  };
  soil: SoilProfile;
  goal: RotationGoal;
  anchorCrop: AnchorCrop;
  cropPlaybook?: CropPlaybook;
  telemetry: MonthlyTelemetry;
  recentDaily: RecentDailyObservation[];
  rainfallPredictor: RainfallPredictor;
  survivalPredictor: SurvivalPredictor;
  quickTip: QuickActionTip;
  rotationPlan: {
    fitScore: number;
    description: string;
    seasons: RotationSeasonStep[];
  };
  trajectory: {
    labels: string[];
    adaptiveRotation: number[];
    monoculture: number[];
  };
  radar: {
    labels: string[];
    tarsPlan: number[];
    regionalAvg: number[];
  };
  feeds: DatasetFeedStatus;
}

export interface FarmFieldPlot {
  id: string;
  name: string;
  emoji: string;
  areaHa: number;
  locationQuery: string;
  lat: number;
  lon: number;
  anchorCrop: AnchorCrop;
  goal: RotationGoal;
  plantedDate?: string;
  cropStrength: number;
  soilMoisturePct: number;
  healthBadge: string;
  moistureBadge: string;
  spotsBadge: string;
  reminderTitle: string;
  reminderNote: string;
  reminderFoot: string;
}

export interface SavedFarmPlan {
  id: string;
  locationName: string;
  coordsLabel: string;
  lat: number;
  lon: number;
  goal: RotationGoal;
  anchorCrop: AnchorCrop;
  soilType: string;
  soilPh: number;
  waterSavingsPct: number;
  plantingOrderSummary: string;
  headlineTip: string;
  savedAt: string;
}

export interface FarmNote {
  id: string;
  text: string;
  createdAt: string;
}
