import type {
  AnchorCrop,
  CustomCropId,
  CustomRotationEvaluation,
  ForecastDay,
  MonthlyTelemetry,
  QuickActionTip,
  RainfallPredictor,
  RecentDailyObservation,
  RotationGoal,
  RotationSeasonStep,
  SoilProfile,
  SurvivalPredictor,
} from '../src/types/farm.ts';
import type { ResolvedLocation } from './nasaService.ts';

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ANCHOR_LABELS: Record<
  AnchorCrop,
  { name: string; shortName: string; family: string; waterTag: string; transplantMinNightC: number; frostKillC: number }
> = {
  tomatoes: {
    name: 'Roma Tomatoes',
    shortName: 'Tomatoes',
    family: 'Solanaceae',
    waterTag: 'Medium (Drip + Mulch)',
    transplantMinNightC: 10,
    frostKillC: 2,
  },
  peppers: {
    name: 'Sweet & Chili Peppers',
    shortName: 'Peppers',
    family: 'Solanaceae',
    waterTag: 'Medium (Drip)',
    transplantMinNightC: 12,
    frostKillC: 3,
  },
  potatoes: {
    name: 'Early Ridge Potatoes',
    shortName: 'Potatoes',
    family: 'Solanaceae',
    waterTag: 'Medium',
    transplantMinNightC: 7,
    frostKillC: -1,
  },
  wheat: {
    name: 'Winter Wheat',
    shortName: 'Wheat',
    family: 'Poaceae',
    waterTag: 'Low–Medium',
    transplantMinNightC: 3,
    frostKillC: -12,
  },
  corn: {
    name: 'Sweet Corn',
    shortName: 'Corn',
    family: 'Poaceae',
    waterTag: 'High Water Need',
    transplantMinNightC: 11,
    frostKillC: 1,
  },
  melons: {
    name: 'Watermelon & Melon',
    shortName: 'Melons',
    family: 'Cucurbitaceae',
    waterTag: 'Low–Medium',
    transplantMinNightC: 13,
    frostKillC: 3,
  },
};

export interface CustomCropMeta {
  id: CustomCropId;
  name: string;
  family: string;
  waterNeed: 'none' | 'low' | 'medium' | 'high';
  frostHardinessC: number; // min survivable night temp
  heatLimitC: number;
  nitrogenEffect: 'adds' | 'neutral' | 'heavy_feeder';
  breaksTomatoDisease: boolean;
}

export const CUSTOM_CROPS: Record<CustomCropId, CustomCropMeta> = {
  tomatoes: {
    id: 'tomatoes',
    name: 'Tomatoes',
    family: 'Solanaceae',
    waterNeed: 'medium',
    frostHardinessC: 2,
    heatLimitC: 36,
    nitrogenEffect: 'heavy_feeder',
    breaksTomatoDisease: false,
  },
  peppers: {
    id: 'peppers',
    name: 'Peppers',
    family: 'Solanaceae',
    waterNeed: 'medium',
    frostHardinessC: 3,
    heatLimitC: 36,
    nitrogenEffect: 'heavy_feeder',
    breaksTomatoDisease: false,
  },
  potatoes: {
    id: 'potatoes',
    name: 'Potatoes',
    family: 'Solanaceae',
    waterNeed: 'medium',
    frostHardinessC: -1,
    heatLimitC: 32,
    nitrogenEffect: 'heavy_feeder',
    breaksTomatoDisease: false,
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat / Barley',
    family: 'Poaceae',
    waterNeed: 'low',
    frostHardinessC: -14,
    heatLimitC: 35,
    nitrogenEffect: 'neutral',
    breaksTomatoDisease: true,
  },
  corn: {
    id: 'corn',
    name: 'Sweet Corn',
    family: 'Poaceae',
    waterNeed: 'high',
    frostHardinessC: 1,
    heatLimitC: 37,
    nitrogenEffect: 'heavy_feeder',
    breaksTomatoDisease: true,
  },
  melons: {
    id: 'melons',
    name: 'Melons / Squash',
    family: 'Cucurbitaceae',
    waterNeed: 'medium',
    frostHardinessC: 3,
    heatLimitC: 39,
    nitrogenEffect: 'heavy_feeder',
    breaksTomatoDisease: true,
  },
  chickpeas: {
    id: 'chickpeas',
    name: 'Chickpeas / Beans',
    family: 'Fabaceae',
    waterNeed: 'low',
    frostHardinessC: -2,
    heatLimitC: 36,
    nitrogenEffect: 'adds',
    breaksTomatoDisease: true,
  },
  clover: {
    id: 'clover',
    name: 'Clover & Winter Rye',
    family: 'Fabaceae + Poaceae',
    waterNeed: 'low',
    frostHardinessC: -15,
    heatLimitC: 34,
    nitrogenEffect: 'adds',
    breaksTomatoDisease: true,
  },
  mustard: {
    id: 'mustard',
    name: 'Mustard & Radish Cover',
    family: 'Brassicaceae',
    waterNeed: 'low',
    frostHardinessC: -8,
    heatLimitC: 33,
    nitrogenEffect: 'neutral',
    breaksTomatoDisease: true,
  },
  onions: {
    id: 'onions',
    name: 'Onions / Garlic',
    family: 'Amaryllidaceae',
    waterNeed: 'medium',
    frostHardinessC: -10,
    heatLimitC: 35,
    nitrogenEffect: 'neutral',
    breaksTomatoDisease: true,
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sorghum / Sunflower',
    family: 'Asteraceae / Poaceae',
    waterNeed: 'low',
    frostHardinessC: 1,
    heatLimitC: 40,
    nitrogenEffect: 'neutral',
    breaksTomatoDisease: true,
  },
  fallow: {
    id: 'fallow',
    name: 'Straw Mulch Rest',
    family: 'Rest',
    waterNeed: 'none',
    frostHardinessC: -30,
    heatLimitC: 50,
    nitrogenEffect: 'neutral',
    breaksTomatoDisease: true,
  },
};

function buildRainfallPredictor(
  location: ResolvedLocation,
  telemetry: MonthlyTelemetry,
  forecastDaily: ForecastDay[]
): RainfallPredictor {
  const curMonthIdx = new Date().getUTCMonth();

  if (forecastDaily.length > 0) {
    const next7 = forecastDaily.slice(0, 7);
    const next14 = forecastDaily.slice(0, 14);
    const next7DaysMm = Math.round(next7.reduce((s, d) => s + d.rainMm, 0) * 10) / 10;
    const next14DaysMm = Math.round(next14.reduce((s, d) => s + d.rainMm, 0) * 10) / 10;
    const rainChancePct = Math.max(...next7.map((d) => d.rainChancePct), 0);
    const rainyDaysNext14 = next14.filter((d) => d.rainMm >= 1.0 || d.rainChancePct >= 45).length;

    let verdictLabel = 'Dry Week Ahead';
    let plainSummary = `Very little rain is expected in ${location.name} over the next 2 weeks (about ${next14DaysMm} mm total). Plan to water gently with drip lines.`;
    if (next7DaysMm >= 20 || rainyDaysNext14 >= 4) {
      verdictLabel = 'Good Rain Coming';
      plainSummary = `Good rainfall is on the way — roughly ${next7DaysMm} mm over the next 7 days (${rainChancePct}% peak chance). You can hold off on watering.`;
    } else if (next7DaysMm >= 5 || next14DaysMm >= 10) {
      verdictLabel = 'Light Showers Possible';
      plainSummary = `Expect light passing showers — around ${next7DaysMm} mm in the next 7 days and ${next14DaysMm} mm over 14 days (${rainChancePct}% peak chance).`;
    }

    return {
      next7DaysMm,
      next14DaysMm,
      rainChancePct,
      rainyDaysNext14,
      verdictLabel,
      plainSummary,
      source: 'Open-Meteo Forecast + NASA POWER',
      dailyForecast: next14,
    };
  }

  // Fallback rough estimate from NASA POWER monthly climatology
  const monthRain = telemetry.rainfall[curMonthIdx];
  const next7DaysMm = Math.round((monthRain / 4.3) * 10) / 10;
  const next14DaysMm = Math.round((monthRain / 2.15) * 10) / 10;
  const rainChancePct = Math.min(85, Math.max(10, Math.round((monthRain / 75) * 100)));

  return {
    next7DaysMm,
    next14DaysMm,
    rainChancePct,
    rainyDaysNext14: Math.round((monthRain / 18)),
    verdictLabel: next14DaysMm >= 18 ? 'Seasonal Rain Likely' : 'Mostly Dry Stretch',
    plainSummary: `Based on NASA 25-year rainfall records, expect roughly ${next14DaysMm} mm of rain over the next 2 weeks (~${rainChancePct}% chance).`,
    source: 'NASA POWER 30-Yr Estimate',
    dailyForecast: [],
  };
}

function buildSurvivalPredictor(params: {
  anchorCrop: AnchorCrop;
  currentRootMoisturePct: number;
  recent14dRainMm: number;
  rainfallPredictor: RainfallPredictor;
  telemetry: MonthlyTelemetry;
  forecastDaily: ForecastDay[];
  goal: RotationGoal;
}): SurvivalPredictor {
  const {
    anchorCrop,
    currentRootMoisturePct,
    rainfallPredictor,
    telemetry,
    forecastDaily,
    goal,
  } = params;

  const anchor = ANCHOR_LABELS[anchorCrop] || ANCHOR_LABELS.tomatoes;
  const curMonthIdx = new Date().getUTCMonth();

  const upcomingMinC =
    forecastDaily.length > 0
      ? Math.min(...forecastDaily.slice(0, 7).map((d) => d.tempMinC))
      : telemetry.tempMin[curMonthIdx];
  const upcomingMaxC =
    forecastDaily.length > 0
      ? Math.max(...forecastDaily.slice(0, 7).map((d) => d.tempMaxC))
      : telemetry.tempMax[curMonthIdx];

  let score = 94;

  // 1. Cold / Frost check
  let frostLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let frostDetail = `Night temperatures (~${upcomingMinC}°C) are warm enough for ${anchor.shortName}.`;
  if (upcomingMinC <= anchor.frostKillC) {
    score -= 48;
    frostLevel = 'High';
    frostDetail = `Nights drop to ${upcomingMinC}°C! ${anchor.shortName} left uncovered outdoors will freeze and die out — wait for spring or cover them.`;
  } else if (upcomingMinC < anchor.transplantMinNightC) {
    score -= 18;
    frostLevel = 'Medium';
    frostDetail = `Nights are chilly (${upcomingMinC}°C). Growth will slow down unless protected with row covers or mulch.`;
  }

  // 2. Soil Water / Drought check
  let droughtLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let droughtDetail = `Soil holds plenty of water (${currentRootMoisturePct}%) for healthy roots.`;
  if (currentRootMoisturePct < 19 && rainfallPredictor.next7DaysMm < 5) {
    score -= 26;
    droughtLevel = 'High';
    droughtDetail = `Soil is very dry (${currentRootMoisturePct}%) with little rain coming. Without watering, plants can wilt and die.`;
  } else if (currentRootMoisturePct < 27 && rainfallPredictor.next7DaysMm < 8) {
    score -= 11;
    droughtLevel = 'Medium';
    droughtDetail = `Soil moisture is getting low (${currentRootMoisturePct}%). Add straw mulch and run light morning drip.`;
  }

  // 3. Heat stress check
  let heatLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let heatDetail = `Daytime heat (${upcomingMaxC}°C) is comfortable for your crop.`;
  if (upcomingMaxC >= 37) {
    score -= 20;
    heatLevel = 'High';
    heatDetail = `Extreme heat (${upcomingMaxC}°C) can drop flowers and scorch leaves. Use shade cloth and mulch.`;
  } else if (upcomingMaxC >= 33) {
    score -= 8;
    heatLevel = 'Medium';
    heatDetail = `Warm weather (${upcomingMaxC}°C). Water early in the morning so it doesn't evaporate.`;
  }

  // 4. Rotation / Disease check
  const diseaseLevel: 'Low' | 'Medium' | 'High' = goal === 'pest' ? 'Low' : 'Low';
  const diseaseDetail =
    goal === 'pest'
      ? 'Your 4-season rotation breaks soil fungus and root pest cycles.'
      : 'Rotating out of the same plant family keeps soil diseases low.';

  const survivalPct = Math.max(12, Math.min(97, score));
  const dieOutRiskPct = 100 - survivalPct;

  let verdictLabel = 'Likely to Thrive';
  let verdictTone: SurvivalPredictor['verdictTone'] = 'safe';
  let willSurviveSummary = `Roughly ${survivalPct}% chance your ${anchor.shortName.toLowerCase()} stay healthy right now with normal care.`;

  if (survivalPct < 55) {
    verdictLabel = 'High Die-Out Risk';
    verdictTone = 'danger';
    willSurviveSummary = `High risk of dying out right now (${dieOutRiskPct}% risk, only ${survivalPct}% survival outdoors) — ${frostLevel === 'High' ? `nights are too cold (${upcomingMinC}°C).` : 'severe heat/drought stress.'}`;
  } else if (survivalPct < 80) {
    verdictLabel = 'Needs Extra Care';
    verdictTone = 'caution';
    willSurviveSummary = `Moderate chance of stress (${survivalPct}% survival, ${dieOutRiskPct}% risk) — follow the watering & cover tips below so plants don't struggle.`;
  }

  return {
    survivalPct,
    dieOutRiskPct,
    verdictLabel,
    verdictTone,
    willSurviveSummary,
    risks: [
      { label: 'Soil Water', level: droughtLevel, detail: droughtDetail },
      { label: 'Cold / Frost', level: frostLevel, detail: frostDetail },
      { label: 'Heat Stress', level: heatLevel, detail: heatDetail },
      { label: 'Soil Disease', level: diseaseLevel, detail: diseaseDetail },
    ],
  };
}

export function evaluateCustomRotation(params: {
  crops: [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
  telemetry: MonthlyTelemetry;
  soil: SoilProfile;
  location: ResolvedLocation;
}): CustomRotationEvaluation {
  const { crops, telemetry, soil, location } = params;
  const metas = crops.map((id) => CUSTOM_CROPS[id] || CUSTOM_CROPS.tomatoes);

  const annualRain = telemetry.rainfall.reduce((a, b) => a + b, 0);
  const isDryRegion = annualRain < 450;
  // Approximate seasonal temperatures (Northern vs Southern hemisphere)
  const north = location.lat >= 0;
  const seasonIdx = north ? [4, 10, 4, 7] : [10, 4, 10, 1]; // May, Nov, May, Aug (or flipped)
  const seasonNames = [
    'Season 1 (Spring/Summer)',
    'Season 2 (Autumn/Winter)',
    'Season 3 (Next Spring)',
    'Season 4 (Late Summer)',
  ];

  let survivalScore = 92;
  let waterScore = 0; // positive = saves water, negative = wastes water
  const goodPoints: string[] = [];
  const badPoints: string[] = [];
  const seasonChecks: CustomRotationEvaluation['seasonChecks'] = [];

  let heavyFeeders = 0;
  let nitrogenFixers = 0;
  let sameFamilyStreak = 0;

  metas.forEach((crop, idx) => {
    const mIdx = seasonIdx[idx];
    // For winter slot (idx 1), check the coldest winter month too
    const minSeasonTemp =
      idx === 1
        ? Math.min(telemetry.tempMin[mIdx], telemetry.tempMin[(mIdx + 2) % 12])
        : telemetry.tempMin[mIdx];
    const maxSeasonTemp = telemetry.tempMax[mIdx];

    let status: 'safe' | 'caution' | 'danger' = 'safe';
    const notes: string[] = [];

    // 1. Frost / Die-out check for that season
    if (minSeasonTemp < crop.frostHardinessC) {
      status = 'danger';
      survivalScore -= idx === 1 ? 30 : 20;
      const msg = `${crop.name} in ${seasonNames[idx]} will freeze when nights hit ${minSeasonTemp}°C — high chance it dies out.`;
      notes.push(msg);
      badPoints.push(msg);
    }

    // 2. Heat check
    if (maxSeasonTemp > crop.heatLimitC) {
      if (status !== 'danger') status = 'caution';
      survivalScore -= 10;
      const msg = `${crop.name} faces ${maxSeasonTemp}°C heat in ${seasonNames[idx]} — needs shade or straw mulch.`;
      notes.push(msg);
      badPoints.push(msg);
    }

    // 3. Back-to-back same family check (disease build-up!)
    if (idx > 0 && crop.family !== 'Rest' && crop.family === metas[idx - 1].family) {
      sameFamilyStreak++;
      status = 'danger';
      survivalScore -= 22;
      const msg = `Planting ${crop.name} right after ${metas[idx - 1].name} (same plant family) builds up wilt, blight, and root pests.`;
      notes.push(msg);
      badPoints.push(msg);
    }

    // 4. Water check
    if (crop.waterNeed === 'high') {
      waterScore -= isDryRegion ? 18 : 8;
      if (isDryRegion) {
        if (status === 'safe') status = 'caution';
        survivalScore -= 8;
        const msg = `${crop.name} needs heavy watering in a dry climate (${annualRain} mm/yr rain).`;
        notes.push(msg);
        badPoints.push(msg);
      }
    } else if (crop.waterNeed === 'low' || crop.waterNeed === 'none') {
      waterScore += 10;
    }

    // 5. Nitrogen & Soil Health
    if (crop.nitrogenEffect === 'adds') {
      nitrogenFixers++;
      waterScore += 4;
      notes.push(`${crop.name} naturally adds nitrogen back to your ${soil.type.toLowerCase()}.`);
    } else if (crop.nitrogenEffect === 'heavy_feeder') {
      heavyFeeders++;
    }

    if (notes.length === 0) {
      notes.push(`${crop.name} fits ${seasonNames[idx]} weather nicely (${minSeasonTemp}°C to ${maxSeasonTemp}°C).`);
    }

    seasonChecks.push({
      seasonLabel: seasonNames[idx],
      cropName: crop.name,
      status,
      note: notes.join(' '),
    });
  });

  if (nitrogenFixers >= 1) {
    goodPoints.push(`Includes ${nitrogenFixers} soil-feeding crop(s) (legumes/clover) to naturally recharge nitrogen.`);
  } else if (heavyFeeders >= 3) {
    survivalScore -= 12;
    badPoints.push('Too many hungry crops in a row with no beans, peas, or clover to rebuild soil nutrients.');
  }

  if (sameFamilyStreak === 0) {
    goodPoints.push('No back-to-back plant family repeats — helps starve soil pests and fungal wilt.');
  }

  const lowWaterCount = metas.filter((m) => m.waterNeed === 'low' || m.waterNeed === 'none').length;
  if (lowWaterCount >= 2) {
    goodPoints.push(`${lowWaterCount} out of 4 seasons use very little water, protecting your underground moisture.`);
  }

  if (metas[1].id === 'clover' || metas[1].id === 'wheat' || metas[1].id === 'mustard' || metas[1].id === 'fallow') {
    goodPoints.push('Good winter soil cover in Season 2 keeps rain and snowmelt from washing away topsoil.');
  }

  if (goodPoints.length === 0) {
    goodPoints.push('Rotating crops across 4 seasons is better than leaving the same plant all year.');
  }

  const survivalPct = Math.max(10, Math.min(96, survivalScore));
  const dieOutRiskPct = 100 - survivalPct;
  const waterImpactPct = Math.max(-25, Math.min(42, waterScore));

  let verdict: 'good' | 'okay' | 'bad' = 'good';
  let verdictTitle = 'Great Plan — Strong Soil & Water Balance';
  let willDieVerdict = `Safe to plant (${survivalPct}% survival chance). Crops fit your local temperatures and protect the soil.`;

  if (survivalPct < 58 || badPoints.length >= 3) {
    verdict = 'bad';
    verdictTitle = 'Bad Plan — High Risk of Crops Dying Out';
    willDieVerdict = `Watch out: only ${survivalPct}% survival chance (${dieOutRiskPct}% die-out risk). Fix the red warnings below before planting.`;
  } else if (survivalPct < 80 || badPoints.length >= 1) {
    verdict = 'okay';
    verdictTitle = 'Okay Plan — Works With a Few Tweaks';
    willDieVerdict = `Should survive (${survivalPct}% chance), though fixing the cautions below will save more water and boost yield.`;
  }

  const soilHealthImpact =
    nitrogenFixers >= 1 && sameFamilyStreak === 0
      ? 'Improves soil fertility & breaks disease'
      : sameFamilyStreak > 0
        ? 'Risks soil disease build-up'
        : 'Needs extra compost or legumes';

  return {
    crops,
    verdict,
    verdictTitle,
    willDieVerdict,
    survivalPct,
    dieOutRiskPct,
    waterImpactPct,
    soilHealthImpact,
    goodPoints,
    badPoints,
    seasonChecks,
  };
}

export function buildAgronomicPlan(params: {
  location: ResolvedLocation;
  soil: SoilProfile;
  telemetry: MonthlyTelemetry;
  recentDaily: RecentDailyObservation[];
  forecastDaily: ForecastDay[];
  goal: RotationGoal;
  anchorCrop: AnchorCrop;
}): {
  rainfallPredictor: RainfallPredictor;
  survivalPredictor: SurvivalPredictor;
  quickTip: QuickActionTip;
  rotationPlan: { fitScore: number; description: string; seasons: RotationSeasonStep[] };
  trajectory: { labels: string[]; adaptiveRotation: number[]; monoculture: number[] };
  radar: { labels: string[]; tarsPlan: number[]; regionalAvg: number[] };
} {
  const { location, soil, telemetry, recentDaily, forecastDaily, goal, anchorCrop } = params;
  const anchor = ANCHOR_LABELS[anchorCrop] || ANCHOR_LABELS.tomatoes;

  const curMonthIdx = new Date().getUTCMonth();
  const annualRainMm = telemetry.rainfall.reduce((a, b) => a + b, 0);
  const peakSummerIdx = telemetry.tempMax.indexOf(Math.max(...telemetry.tempMax));
  const peakSummerTempC = telemetry.tempMax[peakSummerIdx];

  let bestPlantIdx = telemetry.tempMin.findIndex(
    (tmin, i) => tmin >= anchor.transplantMinNightC && telemetry.tempMax[i] <= 34
  );
  if (bestPlantIdx === -1) bestPlantIdx = location.lat >= 0 ? 3 : 9;

  const recent14 = recentDaily.slice(-14);
  const recent14dRainMm =
    recent14.length > 0
      ? Math.round(recent14.reduce((s, d) => s + d.rainMm, 0) * 10) / 10
      : Math.round((telemetry.rainfall[curMonthIdx] / 2) * 10) / 10;

  const latestDay = recentDaily[recentDaily.length - 1];
  const currentRootMoisturePct = latestDay
    ? latestDay.rootMoisturePct
    : telemetry.rootMoisture[curMonthIdx];
  const currentSkinTempC = latestDay
    ? latestDay.skinTempC
    : telemetry.landSkinTemp[curMonthIdx];
  const currentNdvi = telemetry.ndvi[curMonthIdx];

  const curMonthRain = telemetry.rainfall[curMonthIdx];
  const curMonthDemand = telemetry.waterDemand[curMonthIdx];
  const currentMonthDeficitMm = Math.max(0, curMonthDemand - curMonthRain);

  const rainfallPredictor = buildRainfallPredictor(location, telemetry, forecastDaily);
  const survivalPredictor = buildSurvivalPredictor({
    anchorCrop,
    currentRootMoisturePct,
    recent14dRainMm,
    rainfallPredictor,
    telemetry,
    forecastDaily,
    goal,
  });

  const isArid = annualRainMm < 360;
  const isHotSummer = peakSummerTempC >= 33;
  const isSandy = soil.sandPct >= 55;

  const season1AnchorName =
    goal === 'nitrogen' && anchorCrop === 'tomatoes'
      ? 'Heirloom Tomatoes'
      : goal === 'pest' && anchorCrop === 'tomatoes'
        ? 'Grafted Wilt-Resistant Tomatoes'
        : anchor.name;

  let seasons: RotationSeasonStep[] = [];
  let baseSavings = 24;

  if (goal === 'water') {
    baseSavings = isArid ? 34 : 26;
    const legumeCrop = isArid ? 'Drought-Hardy Chickpeas' : 'Bush Lentils & Cowpeas';
    const deepBufferCrop = isHotSummer ? 'Forage Sorghum / Millet' : 'Daikon Radish & Oats';

    seasons = [
      {
        order: 1,
        season: 'Season 1 · Spring/Summer',
        crop: season1AnchorName,
        family: anchor.family,
        tag: 'Main Cash Crop',
        tagTone: 'terracotta',
        waterNeed: isArid ? 'Drip + Straw Mulch' : anchor.waterTag,
        waterSavedPct: baseSavings,
        plantingWindow: `Plant in ${MONTH_FULL[bestPlantIdx]}`,
        note: `Watering early in the morning + ${isSandy ? 'compost' : 'straw'} mulch keeps soil cool and cuts water loss by ${baseSavings}%.`,
      },
      {
        order: 2,
        season: 'Season 2 · Autumn/Winter',
        crop: 'Winter Rye & Crimson Clover',
        family: 'Poaceae + Fabaceae',
        tag: 'Winter Blanket',
        tagTone: 'sky',
        waterNeed: 'Rain Only',
        waterSavedPct: 38,
        plantingWindow: 'Sow after harvest',
        note: 'Covers bare dirt over winter so wind and rain don’t wash away your best topsoil.',
      },
      {
        order: 3,
        season: 'Season 3 · Next Spring',
        crop: legumeCrop,
        family: 'Fabaceae',
        tag: 'Low-Water Bean',
        tagTone: 'forest',
        waterNeed: 'Very Low',
        waterSavedPct: 42,
        plantingWindow: `Sow in ${MONTH_FULL[(bestPlantIdx + 11) % 12]}–${MONTH_FULL[bestPlantIdx]}`,
        note: 'Grows mostly on leftover deep moisture and puts natural fertilizer back into the dirt.',
      },
      {
        order: 4,
        season: 'Season 4 · Late Summer',
        crop: deepBufferCrop,
        family: isHotSummer ? 'Poaceae' : 'Brassicaceae + Poaceae',
        tag: 'Deep Root Helper',
        tagTone: 'amber',
        waterNeed: 'Low',
        waterSavedPct: 30,
        plantingWindow: 'Mid-to-late summer',
        note: 'Deep roots break up hard soil so next season’s rain sinks straight down to the roots.',
      },
    ];
  } else if (goal === 'nitrogen') {
    baseSavings = isArid ? 24 : 20;
    seasons = [
      {
        order: 1,
        season: 'Season 1 · Spring/Summer',
        crop: season1AnchorName,
        family: anchor.family,
        tag: 'Main Cash Crop',
        tagTone: 'terracotta',
        waterNeed: anchor.waterTag,
        waterSavedPct: baseSavings,
        plantingWindow: `Plant in ${MONTH_FULL[bestPlantIdx]}`,
        note: 'Uses the natural plant food left behind by the cover crops so you spend less on fertilizer.',
      },
      {
        order: 2,
        season: 'Season 2 · Autumn/Winter',
        crop: 'Hairy Vetch & Winter Pea',
        family: 'Fabaceae',
        tag: 'Soil Feeder',
        tagTone: 'forest',
        waterNeed: 'Rain Only',
        waterSavedPct: 32,
        plantingWindow: 'Early autumn',
        note: 'Adds natural nitrogen all winter long and keeps earthworms active.',
      },
      {
        order: 3,
        season: 'Season 3 · Next Spring',
        crop: anchorCrop === 'corn' ? 'Soybeans & Sunn Hemp' : 'Sweet Corn + Bush Beans',
        family: 'Poaceae + Fabaceae',
        tag: 'Rich Compost Builder',
        tagTone: 'amber',
        waterNeed: 'Medium',
        waterSavedPct: 22,
        plantingWindow: `Plant in ${MONTH_FULL[bestPlantIdx]}`,
        note: 'Tall stalks + climbing beans build rich dark soil that holds water like a sponge.',
      },
      {
        order: 4,
        season: 'Season 4 · Autumn',
        crop: 'Buckwheat & Phacelia',
        family: 'Polygonaceae + Boraginaceae',
        tag: 'Weed & Soil Helper',
        tagTone: 'sky',
        waterNeed: 'Low',
        waterSavedPct: 28,
        plantingWindow: 'Late summer',
        note: 'Grows fast to crowd out weeds, brings in bees, and softens the soil for spring.',
      },
    ];
  } else {
    baseSavings = isArid ? 27 : 22;
    const grainCrop = isArid ? 'Dryland Barley or Millet' : 'Spring Wheat or Barley';
    seasons = [
      {
        order: 1,
        season: 'Season 1 · Spring/Summer',
        crop: season1AnchorName,
        family: anchor.family,
        tag: 'Main Cash Crop',
        tagTone: 'terracotta',
        waterNeed: anchor.waterTag,
        waterSavedPct: baseSavings,
        plantingWindow: `Plant in ${MONTH_FULL[bestPlantIdx]}`,
        note: 'Straw mulch stops mud from splashing disease onto lower leaves.',
      },
      {
        order: 2,
        season: 'Season 2 · Autumn Cleanse',
        crop: 'White Mustard & Oilseed Radish',
        family: 'Brassicaceae',
        tag: 'Natural Pest Cleaner',
        tagTone: 'amber',
        waterNeed: 'Low',
        waterSavedPct: 29,
        plantingWindow: 'Autumn',
        note: 'Natural mustard oils clean the dirt and help stop tomato wilt before next year.',
      },
      {
        order: 3,
        season: 'Season 3 · Next Spring',
        crop: grainCrop,
        family: 'Poaceae',
        tag: 'Disease Breaker',
        tagTone: 'forest',
        waterNeed: 'Low–Medium',
        waterSavedPct: 35,
        plantingWindow: 'Early spring',
        note: 'Grains don’t share tomato diseases, so old pests starve out naturally.',
      },
      {
        order: 4,
        season: 'Season 4 · Late Summer',
        crop: 'French Marigold & Alfalfa',
        family: 'Asteraceae + Fabaceae',
        tag: 'Root Protector',
        tagTone: 'sky',
        waterNeed: 'Low',
        waterSavedPct: 31,
        plantingWindow: 'Late summer',
        note: 'Marigold roots chase away harmful root worms while alfalfa loosens deep dirt.',
      },
    ];
  }

  const plantingOrderSummary = seasons.map((s) => `${s.order}. ${s.crop}`).join(' → ');

  // Friendly, plain-English farmer tip
  let verdictBadge = 'Soil Moisture Good';
  let verdictTone: QuickActionTip['verdictTone'] = 'optimal';
  let headline = `Hold off on watering — soil moisture looks good (${currentRootMoisturePct}%)`;
  let waterStepDetail = `Rain gave your plot ${recent14dRainMm} mm recently and ${rainfallPredictor.next7DaysMm} mm is forecast this week. Skip watering for a few days.`;

  if (currentRootMoisturePct < 24 && rainfallPredictor.next7DaysMm < 6) {
    verdictBadge = 'Water Soon';
    verdictTone = 'action';
    headline = `Soil is getting dry (${currentRootMoisturePct}%) — water gently tomorrow morning`;
    waterStepDetail = `Only ${recent14dRainMm} mm of rain fell in the last 2 weeks and little rain is forecast. Run drip lines early in the morning so water reaches the roots.`;
  } else if (currentRootMoisturePct < 30 || currentSkinTempC >= 30) {
    verdictBadge = 'Save Moisture';
    verdictTone = 'watch';
    headline = `Cover your soil with straw — ground is warming up (${currentSkinTempC}°C)`;
    waterStepDetail = `Water evaporates quickly right now. Only water lightly if the top 5 cm of dirt feels dry to the touch.`;
  }

  const summary = `For ${location.name}, the best simple plan is to plant ${seasons[0].crop} in ${MONTH_FULL[bestPlantIdx]}, then follow with ${seasons[1].crop}, ${seasons[2].crop}, and ${seasons[3].crop}. Rotating in this order protects your soil and saves roughly ${baseSavings}% on watering.`;

  const doNowSteps: QuickActionTip['doNowSteps'] = [
    {
      category: 'water',
      title:
        currentRootMoisturePct < 26 && rainfallPredictor.next7DaysMm < 6
          ? 'Water Early in the Morning'
          : 'Save Water Today',
      detail: waterStepDetail,
    },
    {
      category: 'soil',
      title: isHotSummer ? 'Spread 6 cm of Straw Mulch' : 'Keep Dirt Covered',
      detail: `Your ${soil.type.toLowerCase()} warms up to ${peakSummerTempC}°C in ${MONTH_FULL[peakSummerIdx]}. A simple layer of straw keeps roots cool and moist.`,
    },
    {
      category: 'canopy',
      title: `Plant in This 4-Step Order`,
      detail: `Wait until ${MONTH_FULL[bestPlantIdx]} (nights ~${telemetry.tempMin[bestPlantIdx]}°C) for warm crops, and never plant the same crop family twice in a row.`,
    },
  ];

  const fitScore = Math.max(
    82,
    Math.min(
      98,
      Math.round(
        88 +
          (soil.ph >= 6.2 && soil.ph <= 7.8 ? 4 : 0) +
          (goal === 'water' && isArid ? 4 : 2) +
          (currentNdvi >= 0.45 ? 2 : 0)
      )
    )
  );

  const adaptiveRotation = [
    74,
    Math.min(97, 80 + Math.round(baseSavings / 8)),
    Math.min(97, 85 + Math.round(baseSavings / 7)),
    Math.min(98, 90 + Math.round(baseSavings / 6)),
    Math.min(99, fitScore),
  ];
  const monoculture = [74, 68, 61, 55, isArid ? 47 : 51];

  const radar = {
    labels: ['Water Savings', 'Soil Nitrogen', 'Heat Buffer', 'Pest Shield', 'Yield Stability'],
    tarsPlan: [
      goal === 'water' ? 94 : 84,
      goal === 'nitrogen' ? 95 : 85,
      isHotSummer ? 88 : 84,
      goal === 'pest' ? 96 : 87,
      fitScore - 4,
    ],
    regionalAvg: [isArid ? 54 : 64, 58, 60, 55, 63],
  };

  return {
    rainfallPredictor,
    survivalPredictor,
    quickTip: {
      headline,
      verdictBadge,
      verdictTone,
      summary,
      plantingOrderSummary,
      estimatedWaterSavingsPct: baseSavings,
      doNowSteps,
      metricsSnapshot: {
        currentRootMoisturePct,
        recent14dRainMm,
        currentSkinTempC,
        currentNdvi,
        annualRainMm,
        bestPlantingMonth: MONTH_FULL[bestPlantIdx],
        bestPlantingNightTempC: telemetry.tempMin[bestPlantIdx],
        peakSummerMonth: MONTH_FULL[peakSummerIdx],
        peakSummerTempC,
        currentMonthDeficitMm,
        currentMonthRainMm: curMonthRain,
        currentMonthDemandMm: curMonthDemand,
      },
    },
    rotationPlan: {
      fitScore,
      description: `Tailored from NASA weather & soil data for ${location.name}`,
      seasons,
    },
    trajectory: {
      labels: ['Season 1', 'Season 2', 'Season 3', 'Season 4', 'Season 5'],
      adaptiveRotation,
      monoculture,
    },
    radar,
  };
}
