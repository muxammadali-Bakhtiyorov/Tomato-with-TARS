import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  LocateFixed,
  Satellite,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { readStorage, STORAGE_KEYS, writeStorage } from '../lib/persistence';
import type {
  AnchorCrop,
  CustomCropId,
  CustomRotationEvaluation,
  NasaFarmResponse,
  RotationGoal,
} from '../types/farm';

interface RotationsPageProps {
  data: NasaFarmResponse;
  scanning: boolean;
  savingPlan: boolean;
  onScanLocation: (query: string, goal?: RotationGoal, crop?: AnchorCrop) => Promise<void>;
  onChangeGoal: (goal: RotationGoal) => void;
  onChangeAnchorCrop: (crop: AnchorCrop) => void;
  onSavePlan: () => Promise<void>;
}

const SAMPLE_REGIONS = [
  { key: 'tashkent', label: 'Tashkent Valley', query: 'Tashkent Valley, Uzbekistan' },
  { key: 'fergana', label: 'Fergana Basin', query: 'Fergana Basin, Uzbekistan' },
  { key: 'california', label: 'California Valley', query: 'Central Valley, California' },
  { key: 'alentejo', label: 'Alentejo, Portugal', query: 'Alentejo Plains, Portugal' },
];

const GOALS: { id: RotationGoal; title: string; emoji: string; desc: string }[] = [
  {
    id: 'water',
    title: 'Save Water & Beat Drought',
    emoji: '💧',
    desc: 'Pairs mulched main crops with low-water beans and winter soil covers.',
  },
  {
    id: 'nitrogen',
    title: 'Feed the Soil Naturally',
    emoji: '🌱',
    desc: 'Uses clover and peas to add natural nitrogen so you buy less fertilizer.',
  },
  {
    id: 'pest',
    title: 'Stop Plant Diseases & Pests',
    emoji: '🛡️',
    desc: 'Rotates mustard and grains so tomato wilt and root pests die out.',
  },
];

const CUSTOM_CROP_CHOICES: { id: CustomCropId; label: string }[] = [
  { id: 'tomatoes', label: '🍅 Tomatoes' },
  { id: 'peppers', label: '🫑 Peppers' },
  { id: 'potatoes', label: '🥔 Potatoes' },
  { id: 'wheat', label: '🌾 Wheat / Barley' },
  { id: 'corn', label: '🌽 Sweet Corn' },
  { id: 'melons', label: '🍉 Melons / Squash' },
  { id: 'chickpeas', label: '🫘 Chickpeas / Beans' },
  { id: 'clover', label: '🍀 Clover & Winter Rye' },
  { id: 'mustard', label: '🌼 Mustard & Radish Cover' },
  { id: 'onions', label: '🧅 Onions / Garlic' },
  { id: 'sunflower', label: '🌻 Sorghum / Sunflower' },
  { id: 'fallow', label: '🍂 Straw Mulch Rest' },
];

const TAG_TONE_CLASSES: Record<string, string> = {
  terracotta: 'bg-orange-100 badge-orange text-almanac-terracotta',
  sky: 'bg-sky-100 badge-sky text-sky-800',
  forest: 'bg-emerald-100 badge-emerald text-almanac-forest',
  amber: 'bg-amber-100 badge-amber text-amber-800',
};

type WaterSetup = 'drip' | 'rainfed' | 'furrow';

const WATER_SETUPS: { id: WaterSetup; label: string; tip: string }[] = [
  {
    id: 'drip',
    label: '💧 Drip Irrigation',
    tip: 'Best water efficiency (~30% less evaporation). Water early morning under straw mulch.',
  },
  {
    id: 'rainfed',
    label: '🌧️ Rain-Fed Only',
    tip: 'Prioritize winter cover crops to lock rain in soil and lean on chickpeas & sorghum over heavy water users.',
  },
  {
    id: 'furrow',
    label: '🚜 Furrow / Canal',
    tip: 'Use deep-root crops (sorghum/rye) to break hardpan so canal water soaks deep instead of running off.',
  },
];

function getSoilRoleExplanation(tag: string, family: string): string {
  const t = tag.toLowerCase();
  const f = family.toLowerCase();
  if (t.includes('cover') || t.includes('blanket')) {
    return 'Cover Crop: Shields bare dirt from wind/rain erosion and feeds humus over winter.';
  }
  if (t.includes('bean') || t.includes('nitrogen') || f.includes('fabaceae')) {
    return 'Nitrogen Fixer: Pulls nitrogen from air into roots, feeding the next crop naturally.';
  }
  if (t.includes('deep') || t.includes('root') || t.includes('disease') || t.includes('pest')) {
    return 'Deep-Root / Pest Breaker: Loosens compacted dirt and breaks tomato/soil pest cycles.';
  }
  if (t.includes('drought')) {
    return 'Drought-Tolerant: Survives on leftover deep moisture with minimal watering.';
  }
  return 'Main Cash Crop: Needs clean, fertile soil—never plant back-to-back in the same spot.';
}

export function RotationsPage({
  data,
  scanning,
  savingPlan,
  onScanLocation,
  onChangeGoal,
  onChangeAnchorCrop,
  onSavePlan,
}: RotationsPageProps) {
  const savedRotationInputs = readStorage<{
    waterSetup?: WaterSetup;
    customCrops?: [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
  }>(STORAGE_KEYS.ROTATION_INPUTS, {});

  const [searchText, setSearchText] = useState(data.location.name);
  const [waterSetup, setWaterSetup] = useState<WaterSetup>(savedRotationInputs.waterSetup ?? 'drip');
  const [customCrops, setCustomCrops] = useState<[CustomCropId, CustomCropId, CustomCropId, CustomCropId]>(
    savedRotationInputs.customCrops ?? ['tomatoes', 'clover', 'chickpeas', 'wheat']
  );
  const [evaluation, setEvaluation] = useState<CustomRotationEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ROTATION_INPUTS, { waterSetup, customCrops });
  }, [waterSetup, customCrops]);

  useEffect(() => {
    setSearchText(data.location.name);
  }, [data.location.name]);

  // Evaluate custom rotation whenever location or selected custom crops change
  const runEvaluation = async (cropsToCheck: [CustomCropId, CustomCropId, CustomCropId, CustomCropId]) => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/rotations/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: data.location.name,
          lat: data.location.lat,
          lon: data.location.lon,
          crops: cropsToCheck,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as CustomRotationEvaluation;
        setEvaluation(json);
      }
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    runEvaluation(customCrops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.location.lat, data.location.lon]);

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || scanning) return;
    onScanLocation(searchText.trim());
  };

  const handleCustomCropChange = (index: 0 | 1 | 2 | 3, value: CustomCropId) => {
    const next: [CustomCropId, CustomCropId, CustomCropId, CustomCropId] = [...customCrops] as [
      CustomCropId,
      CustomCropId,
      CustomCropId,
      CustomCropId,
    ];
    next[index] = value;
    setCustomCrops(next);
    runEvaluation(next);
  };

  const activeRegionKey = SAMPLE_REGIONS.find((r) =>
    data.location.name.toLowerCase().includes(r.label.split(',')[0].toLowerCase())
  )?.key;

  const verdictStyle =
    evaluation?.verdict === 'good'
      ? 'bg-emerald-100 badge-emerald text-almanac-forest border-almanac-forest/40'
      : evaluation?.verdict === 'okay'
        ? 'bg-amber-100 badge-amber text-amber-800 border-almanac-amber/40'
        : 'bg-orange-100 badge-orange text-almanac-terracotta border-almanac-terracotta/40';

  return (
    <section className="space-y-8">
      {/* Location & Goal Setup */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-almanac-border pb-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
              Step 1 &bull; Farm Location &amp; Soil
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink mt-1">
              Where is your farm located?
            </h2>
            <p className="text-xs sm:text-sm text-almanac-muted mt-1">
              Type your town, valley, or GPS coordinates to pull NASA rain, temperature, and soil moisture records.
            </p>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-almanac-pill border border-almanac-border font-mono text-xs text-almanac-ink flex items-center gap-2 self-start md:self-auto tabular-nums">
            <LocateFixed className="w-3.5 h-3.5 text-almanac-terracotta shrink-0" />
            <span>{data.location.coordsLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <form onSubmit={handleSubmitLocation} className="lg:col-span-7 space-y-2">
            <label
              htmlFor="location-search-input"
              className="block text-xs font-bold uppercase tracking-wider text-almanac-ink"
            >
              Farm Location / Coordinates
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-almanac-muted" />
                <input
                  id="location-search-input"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Region, village, or latitude, longitude..."
                  autoComplete="off"
                  className="w-full bg-white surface-soft border border-almanac-borderDark focus:border-almanac-forest rounded-2xl pl-11 pr-4 py-3 text-sm text-almanac-ink focus:outline-none shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={scanning}
                className="bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl transition shadow-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Satellite className="w-4 h-4" />
                <span>{scanning ? 'Checking NASA...' : 'Check Field'}</span>
              </button>
            </div>
          </form>

          <div className="lg:col-span-5 space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-almanac-ink">
              Sample Farming Regions
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_REGIONS.map((region) => {
                const isActive = region.key === activeRegionKey;
                return (
                  <button
                    key={region.key}
                    type="button"
                    onClick={() => {
                      setSearchText(region.query);
                      onScanLocation(region.query);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-almanac-forest btn-forest text-white font-bold'
                        : 'bg-almanac-pill hover:bg-almanac-border text-almanac-ink font-semibold'
                    }`}
                  >
                    {region.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Soil & Main Crop Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5">
            <div className="text-[11px] text-almanac-muted">Soil Texture</div>
            <div className="font-serif font-bold text-sm text-almanac-ink mt-0.5">{data.soil.type}</div>
          </div>
          <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5">
            <div className="text-[11px] text-almanac-muted">Soil pH</div>
            <div className="font-serif font-bold text-sm text-almanac-ink mt-0.5 tabular-nums">
              pH {data.soil.ph.toFixed(1)} ({data.soil.phNote})
            </div>
          </div>
          <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5">
            <div className="text-[11px] text-almanac-muted">Climate &amp; Humus</div>
            <div className="font-serif font-bold text-sm text-almanac-forest mt-0.5 tabular-nums">
              {data.location.climateZone} &bull; {data.soil.organicMatterPct}%
            </div>
          </div>
          <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5">
            <label htmlFor="anchor-crop-select" className="block text-[11px] text-almanac-muted">
              Main Crop
            </label>
            <select
              id="anchor-crop-select"
              value={data.anchorCrop}
              onChange={(e) => onChangeAnchorCrop(e.target.value as AnchorCrop)}
              className="w-full bg-transparent font-serif font-bold text-sm text-almanac-terracotta mt-0.5 focus:outline-none cursor-pointer"
            >
              <option value="tomatoes">Tomatoes</option>
              <option value="peppers">Peppers</option>
              <option value="potatoes">Potatoes</option>
              <option value="wheat">Winter Wheat</option>
              <option value="corn">Sweet Corn</option>
              <option value="melons">Melons</option>
            </select>
          </div>
        </div>

        {/* Step 2: Primary Farm Goal */}
        <div className="space-y-3 pt-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-almanac-ink">
            Step 2 &bull; What matters most on your farm?
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GOALS.map((g) => {
              const selected = data.goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChangeGoal(g.id)}
                  className={`text-left p-5 rounded-2xl transition cursor-pointer ${
                    selected
                      ? 'bg-white surface-soft border-2 border-almanac-forest shadow-sm'
                      : 'bg-almanac-pill/50 border-2 border-transparent hover:border-almanac-borderDark'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-serif font-bold text-base text-almanac-ink">{g.title}</span>
                    <span className="text-lg">{g.emoji}</span>
                  </div>
                  <p className="text-xs text-almanac-muted leading-relaxed">{g.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Optional Farmer Water Setup Constraint */}
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-almanac-pill/50 border border-almanac-border rounded-2xl p-4">
            <div className="space-y-1">
              <span className="block text-[11px] font-mono font-bold uppercase text-almanac-muted">
                Your Water &amp; Equipment Constraint
              </span>
              <p className="text-xs text-almanac-ink">
                {WATER_SETUPS.find((w) => w.id === waterSetup)?.tip}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {WATER_SETUPS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWaterSetup(w.id)}
                  className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                    waterSetup === w.id
                      ? 'bg-almanac-forest btn-forest text-white font-bold'
                      : 'bg-almanac-card hover:bg-almanac-pill border border-almanac-border text-almanac-ink font-semibold'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended 4-Season Crop Rotation Order */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-bold text-2xl text-almanac-ink">
              Recommended 4-Season Planting Order
            </h3>
            <p className="text-xs sm:text-sm text-almanac-muted mt-0.5">{data.rotationPlan.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-xs font-bold tabular-nums">
              {data.rotationPlan.fitScore}% Climate Fit
            </span>
            <button
              onClick={onSavePlan}
              disabled={savingPlan}
              className="px-4 py-2 rounded-full bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{savingPlan ? 'Saving...' : 'Save This Plan'}</span>
            </button>
          </div>
        </div>

        <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl px-4 py-3 text-xs font-medium text-almanac-ink flex flex-wrap items-center gap-2">
          <span className="font-mono uppercase text-[10px] font-bold text-almanac-forest">Plant Order:</span>
          <span>{data.quickTip.plantingOrderSummary}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.rotationPlan.seasons.map((step) => (
            <div
              key={step.order}
              className="bg-white surface-soft border border-almanac-border rounded-2xl p-5 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-almanac-muted">
                    {step.season}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-almanac-forest tabular-nums">
                    Step {step.order}/4
                  </span>
                </div>
                <span
                  className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                    TAG_TONE_CLASSES[step.tagTone] || TAG_TONE_CLASSES.forest
                  }`}
                >
                  {step.tag}
                </span>
                <h4 className="font-serif font-bold text-lg text-almanac-ink leading-snug">{step.crop}</h4>
                <div className="text-[11px] font-mono text-almanac-muted mt-1">{step.plantingWindow}</div>
                <p className="text-xs text-almanac-muted mt-2.5 leading-relaxed">{step.note}</p>
                <div className="mt-2.5 bg-almanac-pill/55 border border-almanac-border/80 rounded-xl p-2.5 text-[11px] text-almanac-ink leading-snug">
                  {getSoilRoleExplanation(step.tag, step.family)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-almanac-border flex items-center justify-between text-[11px] font-semibold">
                <span className="text-almanac-muted">Water Need:</span>
                <span className="text-almanac-forest tabular-nums">
                  {waterSetup === 'rainfed' && step.waterNeed.toLowerCase().includes('drip')
                    ? 'Rain-Fed + Heavy Mulch'
                    : step.waterNeed}{' '}
                  ({step.waterSavedPct}% saved)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CUSTOM ROTATION BUILDER & SURVIVAL GRADER */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-almanac-border pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Your Own Idea</span>
            </span>
            <h3 className="font-serif font-bold text-2xl text-almanac-ink mt-1">
              Build Your Own 4-Season Plan
            </h3>
            <p className="text-xs sm:text-sm text-almanac-muted mt-1">
              Pick the exact crops you want to plant in order. We’ll check your local NASA weather &amp; soil data to tell you if it’s good, bad, or if the plants might die out.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const badTest: [CustomCropId, CustomCropId, CustomCropId, CustomCropId] = [
                'tomatoes',
                'tomatoes',
                'potatoes',
                'corn',
              ];
              setCustomCrops(badTest);
              runEvaluation(badTest);
            }}
            className="px-3.5 py-2 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-xs font-semibold text-almanac-ink transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Try Risky Example
          </button>
        </div>

        {/* 4 Season Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            'Season 1 · Spring/Summer',
            'Season 2 · Autumn/Winter',
            'Season 3 · Next Spring',
            'Season 4 · Late Summer',
          ].map((label, idx) => (
            <div key={label} className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-4 space-y-2">
              <label
                htmlFor={`custom-season-${idx}`}
                className="block text-[11px] font-mono font-bold uppercase text-almanac-muted"
              >
                {label}
              </label>
              <select
                id={`custom-season-${idx}`}
                value={customCrops[idx]}
                onChange={(e) => handleCustomCropChange(idx as 0 | 1 | 2 | 3, e.target.value as CustomCropId)}
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2.5 text-sm font-semibold text-almanac-ink cursor-pointer"
              >
                {CUSTOM_CROP_CHOICES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Grader Output */}
        {evaluating && !evaluation && (
          <div className="text-xs text-almanac-muted font-mono py-4">Checking your plan against NASA weather...</div>
        )}

        {evaluation && (
          <div className="space-y-5">
            {/* Big Verdict Strip */}
            <div className={`border rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${verdictStyle}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-serif font-bold text-xl">
                  {evaluation.verdict === 'good' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  {evaluation.verdict === 'okay' && <AlertTriangle className="w-5 h-5 shrink-0" />}
                  {evaluation.verdict === 'bad' && <XCircle className="w-5 h-5 shrink-0" />}
                  <span>{evaluation.verdictTitle}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">{evaluation.willDieVerdict}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono tabular-nums text-xs">
                <div className="bg-white/75 surface-soft px-3.5 py-2 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Survival</div>
                  <div className="font-bold text-base">{evaluation.survivalPct}%</div>
                </div>
                <div className="bg-white/75 surface-soft px-3.5 py-2 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Die-Out Risk</div>
                  <div className="font-bold text-base">{evaluation.dieOutRiskPct}%</div>
                </div>
                <div className="bg-white/75 surface-soft px-3.5 py-2 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Water Impact</div>
                  <div className="font-bold text-base">
                    {evaluation.waterImpactPct >= 0
                      ? `Saves ${evaluation.waterImpactPct}%`
                      : `Uses +${Math.abs(evaluation.waterImpactPct)}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Good vs Bad Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-almanac-forest flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>What’s Good About Your Plan</span>
                </div>
                <ul className="space-y-1.5 text-xs text-almanac-muted list-disc pl-4">
                  {evaluation.goodPoints.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-almanac-terracotta flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>What’s Risky / Could Fail</span>
                </div>
                {evaluation.badPoints.length === 0 ? (
                  <p className="text-xs text-almanac-forest">
                    No major weather, frost, or plant-disease risks spotted for {data.location.name}!
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-almanac-muted list-disc pl-4">
                    {evaluation.badPoints.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Season-by-Season Safety Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {evaluation.seasonChecks.map((chk) => (
                <div
                  key={chk.seasonLabel}
                  className="bg-almanac-pill/50 border border-almanac-border rounded-2xl p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-almanac-muted">{chk.seasonLabel}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        chk.status === 'safe'
                          ? 'bg-emerald-100 badge-emerald text-almanac-forest'
                          : chk.status === 'caution'
                            ? 'bg-amber-100 badge-amber text-amber-800'
                            : 'bg-orange-100 badge-orange text-almanac-terracotta'
                      }`}
                    >
                      {chk.status === 'safe' ? 'Safe' : chk.status === 'caution' ? 'Careful' : 'Will Struggle'}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-sm text-almanac-ink">{chk.cropName}</div>
                  <p className="text-[11px] text-almanac-muted leading-snug">{chk.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
