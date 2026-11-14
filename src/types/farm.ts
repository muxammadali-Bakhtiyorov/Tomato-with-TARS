export type ThemeMode = 'moon' | 'sun';
export type DashboardPage = 'summary' | 'rotations' | 'telemetry' | 'datasets';
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
  source: 'Open-Meteo Forecast + NASA POWER' | 'NASA POWER 30-Yr Estimate';
  dailyForecast: ForecastDay[];
}

export interface SurvivalPredictor {
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

export interface SoilProfile {
  type: string;
  ph: number;
  phNote: string;
  organicMatterPct: number;
  clayPct: number;
  sandPct: number;
  source: 'ISRIC SoilGrids Live' | 'Regional Soil Baseline';
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
  status: 'Live' | 'Fallback';
  endpointUrl: string;
  sampleReading: string;
  lastCheckedIso: string;
}

export interface DatasetFeedStatus {
  powerClimatology: 'Live' | 'Cached Baseline';
  powerDaily: 'Live' | 'Unavailable';
  modisNdvi: 'Live (ORNL MOD13Q1)' | 'Live (HLS 10–30m)' | 'NASA Agro-Model';
  soilGrids: 'Live (ISRIC v2.0)' | 'Regional Baseline';
  forecast: 'Live' | 'NASA Climatology';
  lastUpdatedIso: string;
  proofs: DatasetFeedProof[];
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
}

export interface NasaFarmResponse {
  location: {
    name: string;
    lat: number;
    lon: number;
    coordsLabel: string;
    climateZone: 'Arid' | 'Semi-Arid' | 'Temperate' | 'Humid';
  };
  soil: SoilProfile;
  goal: RotationGoal;
  anchorCrop: AnchorCrop;
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
