import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Satellite } from 'lucide-react';
import { AnalyticsPage } from './components/AnalyticsPage';
import { DashboardHeader } from './components/DashboardHeader';
import { DatasetsPage } from './components/DatasetsPage';
import { OrbitalLanding } from './components/OrbitalLanding';
import { SummaryPage } from './components/SummaryPage';
import { TarsRobotChat } from './components/TarsRobotChat';
import { readStorage, STORAGE_KEYS, writeStorage } from './lib/persistence';
import type {
  AnchorCrop,
  DashboardPage,
  FarmFieldPlot,
  NasaFarmResponse,
  RotationGoal,
  SavedFarmPlan,
  ThemeMode,
} from './types/farm';

interface SavedAppPrefs {
  dashboardOpen: boolean;
  theme: ThemeMode;
  activePage: DashboardPage;
  activeFieldId: string;
  locationQuery: string;
  lat: number;
  lon: number;
  goal: RotationGoal;
  anchorCrop: AnchorCrop;
}

const INITIAL_FALLBACK_DATA: NasaFarmResponse = {
  location: {
    name: 'Tashkent Valley, Uzbekistan',
    lat: 41.2995,
    lon: 69.2401,
    coordsLabel: '41.2995° N, 69.2401° E',
    climateZone: 'Semi-Arid',
  },
  soil: {
    type: 'Silty Clay Loam',
    ph: 7.4,
    phNote: 'Balanced',
    organicMatterPct: 2.1,
    clayPct: 26,
    sandPct: 32,
    source: 'Regional Soil Baseline',
  },
  goal: 'water',
  anchorCrop: 'tomatoes',
  telemetry: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    rootMoisture: [34, 36, 35, 33, 30, 27, 25, 26, 28, 31, 33, 34],
    topMoisture: [30, 32, 29, 25, 20, 16, 14, 15, 18, 23, 27, 29],
    tempMax: [9, 12, 18, 24, 29, 34, 36, 35, 29, 22, 15, 10],
    tempMin: [1, 3, 8, 13, 17, 21, 22, 20, 15, 10, 5, 2],
    landSkinTemp: [7, 11, 17, 24, 31, 37, 39, 38, 31, 22, 14, 8],
    ndvi: [0.35, 0.39, 0.54, 0.7, 0.81, 0.85, 0.82, 0.75, 0.62, 0.49, 0.41, 0.36],
    evi: [0.25, 0.29, 0.42, 0.56, 0.68, 0.72, 0.69, 0.61, 0.48, 0.37, 0.3, 0.26],
    rainfall: [54, 62, 68, 58, 32, 12, 5, 4, 11, 28, 44, 52],
    waterDemand: [22, 30, 48, 72, 102, 130, 142, 132, 94, 56, 32, 22],
  },
  recentDaily: [],
  rainfallPredictor: {
    next7DaysMm: 4,
    next14DaysMm: 10,
    rainChancePct: 30,
    rainyDaysNext14: 2,
    verdictLabel: 'Syncing Forecast...',
    plainSummary: 'Checking 14-day rainfall outlook and NASA satellite soil moisture...',
    source: 'Open-Meteo Forecast + NASA POWER',
    dailyForecast: [],
  },
  survivalPredictor: {
    cropKey: 'tomatoes',
    cropName: 'Tomatoes',
    survivalPct: 88,
    dieOutRiskPct: 12,
    verdictLabel: 'Checking Tomatoes...',
    verdictTone: 'safe',
    willSurviveSummary: 'Checking upcoming cold, heat, and soil moisture risks for your tomatoes...',
    risks: [
      { label: 'Soil Water (Tomatoes)', level: 'Low', detail: 'Checking root-zone moisture...' },
      { label: 'Cold / Frost (Tomatoes)', level: 'Low', detail: 'Checking upcoming night temperatures...' },
      { label: 'Heat Stress (Tomatoes)', level: 'Low', detail: 'Checking daytime peak heat...' },
      { label: 'Soil Disease (Tomatoes)', level: 'Low', detail: 'Crop rotation keeps soil diseases low.' },
    ],
  },
  quickTip: {
    headline: 'Checking live NASA farm observations for Tashkent Valley...',
    verdictBadge: 'Soil Moisture Good',
    verdictTone: 'optimal',
    summary:
      'Plant Roma Tomatoes in spring, then follow with Winter Rye & Crimson Clover, Chickpeas, and Forage Sorghum to save water and keep your dirt healthy.',
    plantingOrderSummary:
      '1. Roma Tomatoes → 2. Winter Rye & Crimson Clover → 3. Drought-Hardy Chickpeas → 4. Forage Sorghum / Millet',
    estimatedWaterSavingsPct: 26,
    doNowSteps: [
      {
        category: 'water',
        title: 'Save Water Today',
        detail: 'Use early-morning drip lines to cut evaporation and keep root moisture steady.',
      },
      {
        category: 'soil',
        title: 'Spread 6 cm of Straw Mulch',
        detail: 'Mulch keeps roots cool during summer heat and locks water in the soil.',
      },
      {
        category: 'canopy',
        title: 'Plant in This 4-Step Order',
        detail: 'Never plant tomatoes or potatoes back-to-back; rotate with clover, beans, and grain.',
      },
    ],
    metricsSnapshot: {
      currentRootMoisturePct: 33,
      recent14dRainMm: 18,
      currentSkinTempC: 14,
      currentNdvi: 0.41,
      annualRainMm: 430,
      bestPlantingMonth: 'May',
      bestPlantingNightTempC: 14,
      peakSummerMonth: 'July',
      peakSummerTempC: 36,
      currentMonthDeficitMm: 12,
      currentMonthRainMm: 44,
      currentMonthDemandMm: 32,
    },
  },
  rotationPlan: {
    fitScore: 95,
    description: 'Tailored from NASA weather & soil data for Tashkent Valley, Uzbekistan',
    seasons: [
      {
        order: 1,
        season: 'Season 1 · Spring/Summer',
        crop: 'Roma Tomatoes',
        family: 'Solanaceae',
        tag: 'Main Cash Crop',
        tagTone: 'terracotta',
        waterNeed: 'Drip + Straw Mulch',
        waterSavedPct: 26,
        plantingWindow: 'Plant in May',
        note: 'Watering early in the morning + straw mulch keeps soil cool and cuts water loss.',
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
        note: 'Covers bare dirt over winter so wind and rain don’t wash away topsoil.',
      },
      {
        order: 3,
        season: 'Season 3 · Next Spring',
        crop: 'Drought-Hardy Chickpeas',
        family: 'Fabaceae',
        tag: 'Low-Water Bean',
        tagTone: 'forest',
        waterNeed: 'Very Low',
        waterSavedPct: 42,
        plantingWindow: 'Sow in April–May',
        note: 'Grows mostly on leftover deep moisture and puts natural fertilizer back into the dirt.',
      },
      {
        order: 4,
        season: 'Season 4 · Late Summer',
        crop: 'Forage Sorghum / Millet',
        family: 'Poaceae',
        tag: 'Deep Root Helper',
        tagTone: 'amber',
        waterNeed: 'Low',
        waterSavedPct: 30,
        plantingWindow: 'Mid-to-late summer',
        note: 'Deep roots break up hard soil so rain sinks straight down to the roots.',
      },
    ],
  },
  trajectory: {
    labels: ['Season 1', 'Season 2', 'Season 3', 'Season 4', 'Season 5'],
    adaptiveRotation: [74, 83, 89, 94, 96],
    monoculture: [74, 68, 61, 55, 51],
  },
  radar: {
    labels: ['Water Savings', 'Soil Nitrogen', 'Heat Buffer', 'Pest Shield', 'Yield Stability'],
    tarsPlan: [94, 85, 88, 87, 92],
    regionalAvg: [64, 58, 60, 55, 63],
  },
  feeds: {
    powerClimatology: 'Cached Baseline',
    powerDaily: 'Unavailable',
    modisNdvi: 'NASA Agro-Model',
    soilGrids: 'Regional Baseline',
    forecast: 'NASA Climatology',
    lastUpdatedIso: new Date().toISOString(),
    proofs: [],
  },
};

export default function App() {
  const initialPrefs = useMemo(
    () =>
      readStorage<Partial<SavedAppPrefs>>(STORAGE_KEYS.APP_PREFS, {}),
    []
  );

  const [dashboardOpen, setDashboardOpen] = useState<boolean>(initialPrefs.dashboardOpen ?? false);
  const [theme, setTheme] = useState<ThemeMode>(initialPrefs.theme ?? 'moon');
  const [activePage, setActivePage] = useState<DashboardPage>(() => {
    const p = initialPrefs.activePage;
    return p === 'summary' || p === 'telemetry' || p === 'datasets' ? p : 'summary';
  });
  const [data, setData] = useState<NasaFarmResponse>(INITIAL_FALLBACK_DATA);
  const [fields, setFields] = useState<FarmFieldPlot[]>(() => {
    const cached = readStorage<FarmFieldPlot[]>(STORAGE_KEYS.FIELDS, []);
    return cached.filter((f) => f.id !== 'north' && f.id !== 'clover' && f.id !== 'river');
  });
  const [activeFieldId, setActiveFieldId] = useState<string>(initialPrefs.activeFieldId ?? '');
  const [savedPlans, setSavedPlans] = useState<SavedFarmPlan[]>(() =>
    readStorage<SavedFarmPlan[]>(STORAGE_KEYS.PLANS, [])
  );

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('Locking onto NASA POWER & SMAP moisture...');
  const [savingPlan, setSavingPlan] = useState(false);

  const [bloomStyle, setBloomStyle] = useState<{ opacity: number; background: string }>({
    opacity: 0,
    background: 'radial-gradient(circle at 75% 22%, #ffffff 0%, #fef08a 18%, #fde68a 42%, #f7f2e7 78%)',
  });

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const [tarsChatOpen, setTarsChatOpen] = useState(false);

  const spaceStars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        size: (Math.random() * 2.2 + 0.8).toFixed(1),
        top: `${(Math.random() * 100).toFixed(2)}%`,
        left: `${(Math.random() * 100).toFixed(2)}%`,
        delay: `${(Math.random() * 4).toFixed(2)}s`,
      })),
    []
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 3200);
  }, []);

  // Sync html and body classes with Moon / Sun theme
  useEffect(() => {
    const isSun = theme === 'sun';
    [document.documentElement, document.body].forEach((el) => {
      el.classList.toggle('sun-mode', isSun);
      el.classList.toggle('moon-mode', !isSun);
    });
  }, [theme]);

  const fetchTelemetry = useCallback(
    async (
      opts: {
        q?: string;
        lat?: number;
        lon?: number;
        goal?: RotationGoal;
        crop?: AnchorCrop;
        farmName?: string;
        areaHa?: number;
        plantedDate?: string;
        showModal?: boolean;
      } = {}
    ) => {
      const showModal = opts.showModal ?? false;
      if (showModal) {
        setScanning(true);
        setScanProgress(22);
        setScanMessage('Resolving farm coordinates & SoilGrids profile...');
      }

      const params = new URLSearchParams();
      if (opts.q) params.set('q', opts.q);
      if (typeof opts.lat === 'number') params.set('lat', String(opts.lat));
      if (typeof opts.lon === 'number') params.set('lon', String(opts.lon));
      params.set('goal', opts.goal || data.goal);
      params.set('crop', opts.crop || data.anchorCrop);
      if (opts.farmName) params.set('farmName', opts.farmName);
      if (typeof opts.areaHa === 'number' && opts.areaHa > 0) params.set('areaHa', String(opts.areaHa));
      if (opts.plantedDate) params.set('plantedDate', opts.plantedDate);

      try {
        if (showModal) {
          window.setTimeout(() => {
            setScanProgress(58);
            setScanMessage('Querying NASA POWER moisture, rainfall, temperature & MODIS NDVI...');
          }, 150);
        }
        const res = await fetch(`/api/nasa/telemetry?${params.toString()}`);
        if (!res.ok) throw new Error('Telemetry request failed');
        const nextData = (await res.json()) as NasaFarmResponse;
        setData(nextData);
        if (showModal) {
          setScanProgress(100);
          setScanMessage('Agronomic rotation & water-saving summary ready.');
          window.setTimeout(() => {
            setScanning(false);
            setScanProgress(0);
            showToast(`NASA telemetry updated for ${nextData.location.name}`);
          }, 320);
        }
      } catch {
        if (showModal) {
          setScanning(false);
          setScanProgress(0);
          showToast('Using cached NASA baseline (network timeout)');
        }
      }
    },
    [data.anchorCrop, data.goal, showToast]
  );

  // Initial load: hydrate fields, saved plans, and live NASA telemetry (preserving saved local prefs)
  useEffect(() => {
    const LEGACY_SEED_IDS = new Set(['north', 'clover', 'river']);
    const localFields = readStorage<FarmFieldPlot[]>(STORAGE_KEYS.FIELDS, []).filter(
      (lf) => !LEGACY_SEED_IDS.has(lf.id)
    );
    fetch('/api/fields')
      .then((r) => r.json())
      .then(async (j: { fields?: FarmFieldPlot[] }) => {
        const serverFields = j.fields ?? [];
        // Merge if local has user-created plots not on server (e.g. after Vercel cold start)
        const serverIds = new Set(serverFields.map((f) => f.id));
        const missingLocal = localFields.filter((lf) => !serverIds.has(lf.id));
        let resolvedFields = serverFields;
        if (missingLocal.length > 0) {
          let latestFields = serverFields;
          for (const mf of missingLocal) {
            const postRes = await fetch('/api/fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: mf.name,
                areaHa: mf.areaHa,
                locationQuery: mf.locationQuery,
                anchorCrop: mf.anchorCrop,
                goal: mf.goal,
                plantedDate: mf.plantedDate,
              }),
            }).catch(() => null);
            if (postRes && postRes.ok) {
              const postJson = (await postRes.json()) as { fields?: FarmFieldPlot[] };
              if (Array.isArray(postJson.fields)) {
                latestFields = postJson.fields;
              }
            }
          }
          resolvedFields = latestFields;
        }

        setFields(resolvedFields);
        writeStorage(STORAGE_KEYS.FIELDS, resolvedFields);

        if (resolvedFields.length > 0) {
          const matchedActive =
            resolvedFields.find((f) => f.id === initialPrefs.activeFieldId) || resolvedFields[0];
          setActiveFieldId(matchedActive.id);
          fetchTelemetry({
            q: matchedActive.locationQuery,
            lat: matchedActive.lat,
            lon: matchedActive.lon,
            goal: matchedActive.goal,
            crop: matchedActive.anchorCrop,
            farmName: matchedActive.name,
            areaHa: matchedActive.areaHa,
            plantedDate: matchedActive.plantedDate,
            showModal: false,
          });
        } else {
          setActiveFieldId('');
          fetchTelemetry({
            q: initialPrefs.locationQuery || 'Tashkent Valley, Uzbekistan',
            lat: initialPrefs.lat,
            lon: initialPrefs.lon,
            goal: initialPrefs.goal || 'water',
            crop: initialPrefs.anchorCrop || 'tomatoes',
            showModal: false,
          });
        }
      })
      .catch(() => {
        fetchTelemetry({
          q: initialPrefs.locationQuery || 'Tashkent Valley, Uzbekistan',
          lat: initialPrefs.lat,
          lon: initialPrefs.lon,
          goal: initialPrefs.goal || 'water',
          crop: initialPrefs.anchorCrop || 'tomatoes',
          showModal: false,
        });
      });

    const localPlans = readStorage<SavedFarmPlan[]>(STORAGE_KEYS.PLANS, []);
    fetch('/api/plans')
      .then((r) => r.json())
      .then((j: { plans?: SavedFarmPlan[] }) => {
        const serverPlans = j.plans ?? [];
        const serverIds = new Set(serverPlans.map((p) => p.id));
        const merged = [...serverPlans, ...localPlans.filter((lp) => !serverIds.has(lp.id))];
        setSavedPlans(merged);
        writeStorage(STORAGE_KEYS.PLANS, merged);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically persist app navigation, theme, active field, and farm location/crop preferences
  useEffect(() => {
    writeStorage<SavedAppPrefs>(STORAGE_KEYS.APP_PREFS, {
      dashboardOpen,
      theme,
      activePage,
      activeFieldId,
      locationQuery: data.location.name,
      lat: data.location.lat,
      lon: data.location.lon,
      goal: data.goal,
      anchorCrop: data.anchorCrop,
    });
  }, [
    dashboardOpen,
    theme,
    activePage,
    activeFieldId,
    data.location.name,
    data.location.lat,
    data.location.lon,
    data.goal,
    data.anchorCrop,
  ]);

  const flashTransition = useCallback(
    (targetTheme: ThemeMode, origin: { x: number; y: number }, midFn: () => void) => {
      const bg =
        targetTheme === 'sun'
          ? `radial-gradient(circle at ${origin.x}% ${origin.y}%, #ffffff 0%, #fef08a 16%, #fde68a 40%, #f7f2e7 75%)`
          : `radial-gradient(circle at ${origin.x}% ${origin.y}%, #17323a 0%, #0c161a 35%, #070d10 75%)`;
      setBloomStyle({ opacity: 1, background: bg });
      window.setTimeout(() => {
        midFn();
        setBloomStyle((prev) => ({ ...prev, opacity: 0 }));
      }, targetTheme === 'sun' ? 520 : 440);
    },
    []
  );

  const handleEnterDashboard = (
    page: DashboardPage,
    mode: ThemeMode,
    origin: { x: number; y: number } = { x: 50, y: 20 }
  ) => {
    flashTransition(mode, origin, () => {
      setTheme(mode);
      setActivePage(page);
      setDashboardOpen(true);
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const handleSelectTheme = (nextTheme: ThemeMode, btnEl: HTMLButtonElement | null) => {
    if (nextTheme === theme) return;
    let origin = { x: 50, y: 20 };
    if (btnEl) {
      const r = btnEl.getBoundingClientRect();
      origin = {
        x: Number((((r.left + r.width / 2) / window.innerWidth) * 100).toFixed(1)),
        y: Number((((r.top + r.height / 2) / window.innerHeight) * 100).toFixed(1)),
      };
    }
    flashTransition(nextTheme, origin, () => setTheme(nextTheme));
  };

  const handleReturnToOrbit = () => {
    setDashboardOpen(false);
    setTheme('moon');
  };

  const handleSelectField = (field: FarmFieldPlot) => {
    setActiveFieldId(field.id);
    fetchTelemetry({
      q: field.locationQuery,
      lat: field.lat,
      lon: field.lon,
      goal: field.goal,
      crop: field.anchorCrop,
      farmName: field.name,
      areaHa: field.areaHa,
      plantedDate: field.plantedDate,
      showModal: true,
    });
  };

  const handleCreateField = async (payload: {
    name: string;
    areaHa: number;
    locationQuery: string;
    anchorCrop: AnchorCrop;
    goal: RotationGoal;
    plantedDate?: string;
  }) => {
    const res = await fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      showToast('Could not save farm plot');
      return;
    }
    const json = (await res.json()) as { field: FarmFieldPlot; fields: FarmFieldPlot[] };
    setFields(json.fields);
    writeStorage(STORAGE_KEYS.FIELDS, json.fields);
    setActiveFieldId(json.field.id);
    showToast(`Added farm: ${json.field.name}`);
    await fetchTelemetry({
      q: json.field.locationQuery,
      lat: json.field.lat,
      lon: json.field.lon,
      goal: json.field.goal,
      crop: json.field.anchorCrop,
      farmName: json.field.name,
      areaHa: json.field.areaHa,
      plantedDate: json.field.plantedDate,
      showModal: true,
    });
  };

  const handleUpdateField = async (
    id: string,
    payload: Partial<{
      name: string;
      areaHa: number;
      locationQuery: string;
      anchorCrop: AnchorCrop;
      goal: RotationGoal;
      plantedDate: string;
    }>
  ) => {
    const res = await fetch(`/api/fields/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      showToast('Could not update farm plot');
      return;
    }
    const json = (await res.json()) as { field: FarmFieldPlot; fields: FarmFieldPlot[] };
    setFields(json.fields);
    writeStorage(STORAGE_KEYS.FIELDS, json.fields);
    showToast(`Updated farm: ${json.field.name}`);
    if (id === activeFieldId) {
      await fetchTelemetry({
        q: json.field.locationQuery,
        lat: json.field.lat,
        lon: json.field.lon,
        goal: json.field.goal,
        crop: json.field.anchorCrop,
        farmName: json.field.name,
        areaHa: json.field.areaHa,
        plantedDate: json.field.plantedDate,
        showModal: false,
      });
    }
  };

  const handleDeleteField = async (id: string) => {
    const res = await fetch(`/api/fields/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast('Could not delete farm plot');
      return;
    }
    const json = (await res.json()) as { fields: FarmFieldPlot[] };
    setFields(json.fields);
    writeStorage(STORAGE_KEYS.FIELDS, json.fields);
    showToast('Farm plot removed');
    if (id === activeFieldId) {
      if (json.fields.length > 0) {
        const next = json.fields[0];
        setActiveFieldId(next.id);
        await fetchTelemetry({
          q: next.locationQuery,
          lat: next.lat,
          lon: next.lon,
          goal: next.goal,
          crop: next.anchorCrop,
          farmName: next.name,
          areaHa: next.areaHa,
          plantedDate: next.plantedDate,
          showModal: false,
        });
      } else {
        setActiveFieldId('');
      }
    }
  };

  const handleSaveCurrentPlan = async () => {
    if (savingPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: data.location.name,
          coordsLabel: data.location.coordsLabel,
          lat: data.location.lat,
          lon: data.location.lon,
          goal: data.goal,
          anchorCrop: data.anchorCrop,
          soilType: data.soil.type,
          soilPh: data.soil.ph,
          waterSavingsPct: data.quickTip.estimatedWaterSavingsPct,
          plantingOrderSummary: data.quickTip.plantingOrderSummary,
          headlineTip: data.quickTip.headline,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const json = (await res.json()) as { plans: SavedFarmPlan[] };
      setSavedPlans(json.plans);
      writeStorage(STORAGE_KEYS.PLANS, json.plans);
      showToast(`Saved farm plan for ${data.location.name}`);
    } catch {
      showToast('Failed to save farm plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = (await res.json()) as { plans: SavedFarmPlan[] };
      setSavedPlans(json.plans);
      writeStorage(STORAGE_KEYS.PLANS, json.plans);
      showToast('Removed saved plan');
    } catch {
      showToast('Failed to remove saved plan');
    }
  };

  const handleLoadSavedPlan = (plan: SavedFarmPlan) => {
    fetchTelemetry({
      q: plan.locationName,
      lat: plan.lat,
      lon: plan.lon,
      goal: plan.goal,
      crop: plan.anchorCrop,
      showModal: true,
    });
  };

  const handleExportJson = () => {
    const payload = {
      project: 'Tomatoes with TARS — NASA Farm Almanac',
      exportedAt: new Date().toISOString(),
      ...data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tars_nasa_farm_report_${data.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported NASA Farm Report (.json)');
  };

  return (
    <>
      {/* Persistent atmosphere: stars (moon mode) / sun glow (sun mode) */}
      <div id="space-bg" className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-36 w-[540px] h-[540px] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[460px] h-[460px] rounded-full bg-teal-900/25 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[440px] h-[320px] rounded-full bg-amber-900/10 blur-[110px]" />
        <div className="absolute inset-0">
          {spaceStars.map((s) => (
            <div
              key={s.id}
              className="star-dot"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                top: s.top,
                left: s.left,
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>
      </div>
      <div id="sun-glow" className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />

      {/* Radial Bloom Transition Overlay */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none transition-opacity duration-500"
        style={bloomStyle}
        aria-hidden="true"
      />

      {/* 1. Space Orbital Landing Page */}
      <OrbitalLanding
        visible={!dashboardOpen}
        currentNdvi={data.quickTip.metricsSnapshot.currentNdvi}
        onEnterDashboard={handleEnterDashboard}
      />

      {/* 2. Dashboard (works in BOTH Moon and Sun themes) */}
      {dashboardOpen && (
        <div id="sun-dashboard" className="relative z-10 flex-1 flex flex-col text-almanac-ink min-h-screen">
          <DashboardHeader
            activePage={activePage}
            theme={theme}
            onSelectPage={(p) => {
              setActivePage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectTheme={handleSelectTheme}
            onToggleTarsChat={() => setTarsChatOpen((v) => !v)}
            onReturnToOrbit={handleReturnToOrbit}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36">
            {activePage === 'summary' && (
              <SummaryPage
                theme={theme}
                data={data}
                fields={fields}
                activeFieldId={activeFieldId}
                savedPlans={savedPlans}
                scanning={scanning}
                savingPlan={savingPlan}
                onSelectField={handleSelectField}
                onCreateField={handleCreateField}
                onUpdateField={handleUpdateField}
                onDeleteField={handleDeleteField}
                onScanLocation={(query) => {
                  const af = fields.find((f) => f.id === activeFieldId);
                  return fetchTelemetry({
                    q: query,
                    farmName: af?.name,
                    areaHa: af?.areaHa,
                    plantedDate: af?.plantedDate,
                    showModal: true,
                  });
                }}
                onChangeGoal={(goal) => {
                  const af = fields.find((f) => f.id === activeFieldId);
                  fetchTelemetry({
                    q: data.location.name,
                    lat: data.location.lat,
                    lon: data.location.lon,
                    goal,
                    crop: data.anchorCrop,
                    farmName: af?.name,
                    areaHa: af?.areaHa,
                    plantedDate: af?.plantedDate,
                    showModal: false,
                  });
                }}
                onChangeAnchorCrop={(crop) => {
                  const af = fields.find((f) => f.id === activeFieldId);
                  fetchTelemetry({
                    q: data.location.name,
                    lat: data.location.lat,
                    lon: data.location.lon,
                    goal: data.goal,
                    crop,
                    farmName: af?.name,
                    areaHa: af?.areaHa,
                    plantedDate: af?.plantedDate,
                    showModal: false,
                  });
                }}
                onSaveCurrentPlan={handleSaveCurrentPlan}
                onDeletePlan={handleDeletePlan}
                onLoadSavedPlan={handleLoadSavedPlan}
                onExportJson={handleExportJson}
              />
            )}

            {activePage === 'telemetry' && (
              <AnalyticsPage
                theme={theme}
                data={data}
                scanning={scanning}
                onRefresh={() =>
                  fetchTelemetry({
                    q: data.location.name,
                    lat: data.location.lat,
                    lon: data.location.lon,
                    showModal: true,
                  })
                }
              />
            )}

            {activePage === 'datasets' && <DatasetsPage data={data} />}
          </main>
        </div>
      )}

      {/* 3. Walking TARS Robot + Multi-Turn Gemini AI Farm Chat */}
      <TarsRobotChat
        visible={dashboardOpen}
        chatOpen={tarsChatOpen}
        onToggleChat={setTarsChatOpen}
        farmData={data}
        activeField={fields.find((f) => f.id === activeFieldId)}
      />

      {/* 4. NASA Telemetry Loading Modal */}
      {scanning && (
        <div
          id="telemetry-loading-modal"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-almanac-card border border-almanac-borderDark rounded-3xl max-w-md w-full p-7 shadow-2xl text-center space-y-5">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-almanac-forest/15 text-almanac-forest">
              <Satellite className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-almanac-forest font-bold">
                Tomatoes with TARS &bull; Downlink
              </div>
              <h3 className="font-serif font-bold text-xl text-almanac-ink mt-1">
                Scanning NASA Earth Observations
              </h3>
              <p className="text-xs text-almanac-muted mt-1.5 font-mono">{scanMessage}</p>
            </div>
            <div className="w-full h-2.5 bg-almanac-pill rounded-full overflow-hidden border border-almanac-border">
              <div
                className="h-full bg-almanac-forest btn-forest transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-24 right-4 z-50 max-w-[calc(100vw-2rem)] bg-almanac-ink text-almanac-card px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-medium transition-all duration-300 pointer-events-none ${
          toastVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
        }`}
      >
        <span>{toastMsg}</span>
      </div>
    </>
  );
}
