import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  CloudRain,
  Download,
  Droplets,
  Leaf,
  LocateFixed,
  Pencil,
  Satellite,
  Search,
  Sparkles,
  Sprout,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { readStorage, STORAGE_KEYS, writeStorage } from '../lib/persistence';
import { apiFetch } from '../lib/supabase';
import type {
  AnchorCrop,
  CustomCropId,
  CustomRotationEvaluation,
  FarmFieldPlot,
  NasaFarmResponse,
  RotationGoal,
  SavedFarmPlan,
  ThemeMode,
} from '../types/farm';
import { NasaChart, hexRgba } from './NasaChart';

interface SummaryPageProps {
  theme: ThemeMode;
  data: NasaFarmResponse;
  fields: FarmFieldPlot[];
  activeFieldId: string;
  savedPlans: SavedFarmPlan[];
  scanning: boolean;
  savingPlan: boolean;
  onOpenFarmPage: () => void;
  onSelectField: (field: FarmFieldPlot) => void;
  onUpdateField: (
    id: string,
    payload: {
      name: string;
      areaHa: number;
      locationQuery: string;
      anchorCrop: AnchorCrop;
      goal: RotationGoal;
      plantedDate?: string;
    }
  ) => Promise<void>;
  onDeleteField: (id: string) => Promise<void>;
  onScanLocation: (query: string) => Promise<void>;
  onChangeGoal: (goal: RotationGoal) => void;
  onChangeAnchorCrop: (crop: AnchorCrop) => void;
  onSaveCurrentPlan: () => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
  onLoadSavedPlan: (plan: SavedFarmPlan) => void;
  onExportJson: () => void;
}

const SAMPLE_REGIONS = [
  { key: 'tashkent', label: 'Tashkent', query: 'Tashkent Valley, Uzbekistan' },
  { key: 'fergana', label: 'Fergana', query: 'Fergana Basin, Uzbekistan' },
  { key: 'california', label: 'California', query: 'Central Valley, California' },
  { key: 'alentejo', label: 'Alentejo', query: 'Alentejo Plains, Portugal' },
];

const GOALS: { id: RotationGoal; label: string }[] = [
  { id: 'water', label: '💧 Save Water' },
  { id: 'nitrogen', label: '🌱 Feed Soil' },
  { id: 'pest', label: '🛡️ Stop Pests' },
];

type WaterSetup = 'drip' | 'rainfed' | 'furrow';

const WATER_SETUPS: { id: WaterSetup; label: string; tip: string }[] = [
  {
    id: 'drip',
    label: '💧 Drip',
    tip: 'Drip + early-morning cycles cut evaporation ~30% under straw mulch.',
  },
  {
    id: 'rainfed',
    label: '🌧️ Rain-Fed',
    tip: 'Lean on winter cover crops, chickpeas & sorghum over heavy water users.',
  },
  {
    id: 'furrow',
    label: '🚜 Furrow',
    tip: 'Use deep-root crops (sorghum/rye) so canal water soaks deep without runoff.',
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

function getSoilRoleExplanation(tag: string, family: string): string {
  const t = tag.toLowerCase();
  const f = family.toLowerCase();
  if (t.includes('cover') || t.includes('blanket')) {
    return 'Cover Crop: Shields bare soil from erosion and builds winter humus.';
  }
  if (t.includes('bean') || t.includes('nitrogen') || f.includes('fabaceae')) {
    return 'Nitrogen Fixer: Pulls nitrogen from air into roots for the next crop.';
  }
  if (t.includes('deep') || t.includes('root') || t.includes('disease') || t.includes('pest')) {
    return 'Deep-Root / Pest Breaker: Loosens hardpan and breaks tomato wilt cycles.';
  }
  if (t.includes('drought')) {
    return 'Drought-Tolerant: Thrives on leftover deep moisture with minimal watering.';
  }
  return 'Main Cash Crop: Needs fertile soil—avoid planting back-to-back.';
}

export function SummaryPage({
  theme,
  data,
  fields,
  activeFieldId,
  savedPlans,
  scanning,
  savingPlan,
  onOpenFarmPage,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onScanLocation,
  onChangeGoal,
  onChangeAnchorCrop,
  onSaveCurrentPlan,
  onDeletePlan,
  onLoadSavedPlan,
  onExportJson,
}: SummaryPageProps) {
  const isSun = theme === 'sun';
  const activeField = fields.find((f) => f.id === activeFieldId) || fields[0];
  const { quickTip, soil, location, feeds, trajectory, radar, rainfallPredictor, rotationPlan } =
    data;
  const snap = quickTip.metricsSnapshot;

  // Plot CRUD drawer state
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('50');
  const [plotLocation, setPlotLocation] = useState(location.name);
  const [plotCrop, setPlotCrop] = useState<AnchorCrop>(data.anchorCrop);
  const [plotGoal, setPlotGoal] = useState<RotationGoal>(data.goal);
  const [plotPlantedDate, setPlotPlantedDate] = useState('');
  const [savingPlot, setSavingPlot] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compact Location + Rotation state (persisted)
  const savedRotationInputs = readStorage<{
    waterSetup?: WaterSetup;
    customCrops?: [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
  }>(STORAGE_KEYS.ROTATION_INPUTS, {});

  const [searchText, setSearchText] = useState(location.name);
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
    setSearchText(location.name);
  }, [location.name]);

  const runEvaluation = async (cropsToCheck: [CustomCropId, CustomCropId, CustomCropId, CustomCropId]) => {
    setEvaluating(true);
    try {
      const res = await apiFetch('/api/rotations/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: location.name,
          lat: location.lat,
          lon: location.lon,
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
  }, [location.lat, location.lon]);

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || scanning) return;
    onScanLocation(searchText.trim());
  };

  const handleCustomCropChange = (index: 0 | 1 | 2 | 3, value: CustomCropId) => {
    const next = [...customCrops] as [CustomCropId, CustomCropId, CustomCropId, CustomCropId];
    next[index] = value;
    setCustomCrops(next);
    runEvaluation(next);
  };

  const openEditPlotForm = (field: FarmFieldPlot) => {
    setConfirmDeleteId(null);
    setEditingFieldId(field.id);
    setPlotName(field.name);
    setPlotArea(String(field.areaHa));
    setPlotLocation(field.locationQuery);
    setPlotCrop(field.anchorCrop);
    setPlotGoal(field.goal);
    setPlotPlantedDate(field.plantedDate || '');
    setShowPlotForm(true);
  };

  const closePlotForm = () => {
    setShowPlotForm(false);
    setEditingFieldId(null);
    setConfirmDeleteId(null);
  };

  const handleSubmitPlotForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFieldId || !plotName.trim() || savingPlot) return;
    setSavingPlot(true);
    try {
      const payload = {
        name: plotName.trim(),
        areaHa: Math.max(1, Number(plotArea) || 50),
        locationQuery: plotLocation.trim() || location.name,
        anchorCrop: plotCrop,
        goal: plotGoal,
        plantedDate: plotPlantedDate.trim() || undefined,
      };
      await onUpdateField(editingFieldId, payload);
      setPlotName('');
      setPlotPlantedDate('');
      setEditingFieldId(null);
      setShowPlotForm(false);
    } finally {
      setSavingPlot(false);
    }
  };

  const handleConfirmDeleteField = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteField(id);
      if (editingFieldId === id) {
        closePlotForm();
      }
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const verdictColor =
    quickTip.verdictTone === 'optimal'
      ? 'bg-emerald-100 badge-emerald text-almanac-forest'
      : quickTip.verdictTone === 'watch'
        ? 'bg-amber-100 badge-amber text-amber-800'
        : 'bg-orange-100 badge-orange text-almanac-terracotta';

  const evalVerdictStyle =
    evaluation?.verdict === 'good'
      ? 'bg-emerald-100 badge-emerald text-almanac-forest border-almanac-forest/40'
      : evaluation?.verdict === 'okay'
        ? 'bg-amber-100 badge-amber text-amber-800 border-almanac-amber/40'
        : 'bg-orange-100 badge-orange text-almanac-terracotta border-almanac-terracotta/40';

  const currentMoisturePct = snap.currentRootMoisturePct;
  const moistureWord =
    currentMoisturePct >= 30 ? 'Plenty of Water' : currentMoisturePct >= 22 ? 'Getting Dry' : 'Needs Water';
  const plantHealthLabel =
    snap.currentNdvi >= 0.65 ? 'Lush & Green' : snap.currentNdvi >= 0.42 ? 'Growing Steady' : 'Resting / Light Cover';

  return (
    <section className="space-y-8">
      {/* Greeting + Quick Field Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100/80 badge-amber border border-amber-300/60 text-amber-900 text-xs font-semibold">
            {isSun ? '☀️ Know your Farm • Warm Sunlit Almanac' : '🌙 Know your Farm • Moonlit Orbit Almanac'}
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-5xl text-almanac-ink leading-[1.12] tracking-tight">
            {isSun ? (
              <>
                Good day, Farmer.
                <br />
                Here is your farm &amp; crop plan.
              </>
            ) : (
              <>
                Good evening, Farmer.
                <br />
                Here is your farm &amp; crop plan.
              </>
            )}
          </h1>
          <p className="text-sm text-almanac-muted leading-relaxed">
            Pick your field or location, check water &amp; survival odds, and plan or test your 4-season rotation in one place.
          </p>
        </div>

        {fields.length > 0 && (
          <div className="flex flex-wrap gap-2.5 lg:max-w-xl lg:justify-end">
          {fields.map((field) => {
            const active = field.id === activeFieldId;
            const confirming = confirmDeleteId === field.id;
            const isDeleting = deletingId === field.id;
            return (
              <div
                key={field.id}
                className={`inline-flex items-center rounded-full text-xs transition shadow-sm border ${
                  active
                    ? 'bg-almanac-forest btn-forest text-white border-almanac-forest'
                    : 'bg-almanac-card border-almanac-border text-almanac-ink'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectField(field)}
                  className={`pl-3.5 pr-2 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap rounded-l-full ${
                    active ? 'font-bold' : 'font-semibold hover:text-almanac-forest'
                  }`}
                >
                  <span>{field.emoji}</span>
                  <span>
                    {field.name} ({field.areaHa} ha)
                  </span>
                </button>

                <div
                  className={`flex items-center gap-0.5 pr-1.5 border-l ${
                    active ? 'border-white/25' : 'border-almanac-border'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openEditPlotForm(field)}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      active
                        ? 'text-white/85 hover:text-white hover:bg-white/15'
                        : 'text-almanac-muted hover:text-almanac-ink hover:bg-almanac-pill'
                    }`}
                    title={`Edit ${field.name}`}
                    aria-label={`Edit ${field.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {confirming ? (
                    <div className="flex items-center gap-0.5 pl-0.5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleConfirmDeleteField(field.id)}
                        className="px-2 py-1 rounded-full bg-almanac-terracotta text-white text-[10px] font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                        title={`Confirm delete ${field.name}`}
                        aria-label={`Confirm delete ${field.name}`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isDeleting ? '...' : 'Delete'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className={`p-1 rounded-full transition cursor-pointer ${
                          active
                            ? 'text-white/85 hover:text-white hover:bg-white/15'
                            : 'text-almanac-muted hover:text-almanac-ink hover:bg-almanac-pill'
                        }`}
                        title="Cancel delete"
                        aria-label="Cancel delete"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(field.id)}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        active
                          ? 'text-white/85 hover:text-white hover:bg-white/15'
                          : 'text-almanac-muted hover:text-almanac-terracotta hover:bg-almanac-pill'
                      }`}
                      title={`Delete ${field.name}`}
                      aria-label={`Delete ${field.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Empty Farm Invitation Banner */}
      {fields.length === 0 && !showPlotForm && (
        <div className="bg-almanac-card border border-dashed border-almanac-forest/50 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
              Your Farm Almanac Is Empty
            </div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-almanac-ink">
              No farm plots saved yet
            </h2>
            <p className="text-xs text-almanac-muted leading-relaxed">
              Add plots and manage planting dates on My Farm. You can still build and test a 4-season rotation here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenFarmPage}
              className="px-4 py-2.5 rounded-2xl bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white text-xs font-bold transition cursor-pointer"
            >
              Open My Farm
            </button>
            <a
              href="#virtual-planting-sandbox"
              className="px-4 py-2.5 rounded-2xl bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-xs font-semibold text-almanac-ink transition flex items-center gap-1.5"
            >
              <Sprout className="w-4 h-4 text-almanac-forest" />
              <span>Try Virtual Planting</span>
            </a>
          </div>
        </div>
      )}

      {/* Add / Edit Farm Plot Drawer */}
      {showPlotForm && (
        <form
          onSubmit={handleSubmitPlotForm}
          className="bg-almanac-card border border-almanac-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                {editingFieldId ? 'Edit Farm Details' : 'New Farm Plot'}
              </span>
              <h2 className="font-serif font-bold text-lg text-almanac-ink">
                {editingFieldId ? `Editing "${plotName || 'Farm Plot'}"` : 'Add a New Farm Plot'}
              </h2>
            </div>

            {editingFieldId && (
              <div>
                {confirmDeleteId === editingFieldId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-almanac-terracotta">Delete this farm?</span>
                    <button
                      type="button"
                      disabled={deletingId === editingFieldId}
                      onClick={() => handleConfirmDeleteField(editingFieldId)}
                      className="px-3 py-1.5 rounded-xl bg-almanac-terracotta text-white text-xs font-bold cursor-pointer hover:opacity-90"
                    >
                      {deletingId === editingFieldId ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-almanac-pill text-almanac-ink text-xs font-semibold cursor-pointer"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(editingFieldId)}
                    className="px-3 py-1.5 rounded-xl border border-almanac-terracotta/40 text-almanac-terracotta hover:bg-orange-100/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Farm</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Farm / Plot Name
              </label>
              <input
                type="text"
                required
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                placeholder="e.g. South Drip Plot"
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Location / Coords
              </label>
              <input
                type="text"
                value={plotLocation}
                onChange={(e) => setPlotLocation(e.target.value)}
                placeholder="Valley or lat, lon"
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Area (ha)
              </label>
              <input
                type="number"
                min="1"
                value={plotArea}
                onChange={(e) => setPlotArea(e.target.value)}
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Main Crop
              </label>
              <select
                value={plotCrop}
                onChange={(e) => setPlotCrop(e.target.value as AnchorCrop)}
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink"
              >
                <option value="tomatoes">Tomatoes</option>
                <option value="peppers">Peppers</option>
                <option value="potatoes">Potatoes</option>
                <option value="wheat">Wheat</option>
                <option value="corn">Sweet Corn</option>
                <option value="melons">Melons</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Main Goal
              </label>
              <select
                value={plotGoal}
                onChange={(e) => setPlotGoal(e.target.value as RotationGoal)}
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink"
              >
                <option value="water">Save Water</option>
                <option value="nitrogen">Feed Soil</option>
                <option value="pest">Stop Pests</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Planted Date
              </label>
              <input
                type="date"
                value={plotPlantedDate}
                onChange={(e) => setPlotPlantedDate(e.target.value)}
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink tabular-nums"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingPlot}
                className="flex-1 bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer"
              >
                {savingPlot ? '...' : editingFieldId ? 'Save' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closePlotForm}
                className="bg-almanac-pill text-almanac-ink font-semibold text-xs py-2.5 px-2 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </form>
      )}

      {/* COMPACT LOCATION, CROP & GOAL STRIP */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <form onSubmit={handleSubmitLocation} className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-almanac-muted" />
              <input
                id="location-search-input"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="City, valley, or lat, lon..."
                autoComplete="off"
                className="w-full bg-white surface-soft border border-almanac-borderDark focus:border-almanac-forest rounded-2xl pl-10 pr-3 py-2 text-xs sm:text-sm text-almanac-ink focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={scanning}
              className="bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>{scanning ? 'Scanning...' : 'Check Location'}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setSearchText(r.query);
                  onScanLocation(r.query);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  location.name.toLowerCase().includes(r.label.toLowerCase())
                    ? 'bg-almanac-forest btn-forest text-white'
                    : 'bg-almanac-pill hover:bg-almanac-border text-almanac-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
            <span className="px-2.5 py-1 rounded-full bg-almanac-pill border border-almanac-border font-mono text-[11px] text-almanac-muted flex items-center gap-1 tabular-nums">
              <LocateFixed className="w-3 h-3 text-almanac-terracotta shrink-0" />
              <span>
                {soil.type} &middot; pH {soil.ph.toFixed(1)} &middot; {location.climateZone}
              </span>
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-almanac-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="anchor-crop-select" className="text-[11px] font-mono uppercase text-almanac-muted font-bold">
              Main Crop:
            </label>
            <select
              id="anchor-crop-select"
              value={data.anchorCrop}
              onChange={(e) => onChangeAnchorCrop(e.target.value as AnchorCrop)}
              className="bg-white surface-soft border border-almanac-borderDark rounded-xl px-2.5 py-1 text-xs font-bold text-almanac-terracotta cursor-pointer"
            >
              <option value="tomatoes">Tomatoes</option>
              <option value="peppers">Peppers</option>
              <option value="potatoes">Potatoes</option>
              <option value="wheat">Winter Wheat</option>
              <option value="corn">Sweet Corn</option>
              <option value="melons">Melons</option>
            </select>

            <span className="text-almanac-borderDark hidden sm:inline">|</span>
            <span className="text-[11px] font-mono uppercase text-almanac-muted font-bold">Goal:</span>
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onChangeGoal(g.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  data.goal === g.id
                    ? 'bg-almanac-forest btn-forest text-white'
                    : 'bg-almanac-pill hover:bg-almanac-border text-almanac-ink'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-almanac-muted font-bold">Water Setup:</span>
            {WATER_SETUPS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWaterSetup(w.id)}
                title={w.tip}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  waterSetup === w.id
                    ? 'bg-almanac-forest btn-forest text-white'
                    : 'bg-almanac-pill hover:bg-almanac-border text-almanac-ink'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK FARMER SUMMARY & 3 ACTION STEPS */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
              Quick Summary &bull; {location.name}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${verdictColor}`}>
              {quickTip.verdictBadge}
            </span>
            <span className="text-xs font-mono text-almanac-muted tabular-nums">
              Saves about <strong className="text-almanac-forest">{quickTip.estimatedWaterSavingsPct}% water</strong>
            </span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink leading-snug">
            {quickTip.headline}
          </h2>
          <p className="text-sm text-almanac-muted leading-relaxed">
            {quickTip.summary}{' '}
            <span className="text-almanac-ink font-medium">
              {WATER_SETUPS.find((w) => w.id === waterSetup)?.tip}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickTip.doNowSteps.map((step) => (
            <div
              key={step.title}
              className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-almanac-ink">
                {step.category === 'water' && <Droplets className="w-4 h-4 text-sky-500 shrink-0" />}
                {step.category === 'soil' && <Leaf className="w-4 h-4 text-almanac-amber shrink-0" />}
                {step.category === 'canopy' && <Sprout className="w-4 h-4 text-almanac-forest shrink-0" />}
                <span>{step.title}</span>
              </div>
              <p className="text-xs text-almanac-muted leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RECOMMENDED 4-SEASON PLANTING ORDER */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif font-bold text-2xl text-almanac-ink">
              Recommended 4-Season Planting Order
            </h2>
            <p className="text-xs sm:text-sm text-almanac-muted mt-0.5">{rotationPlan.description}</p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-xs font-bold tabular-nums">
            {rotationPlan.fitScore}% Climate Fit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rotationPlan.seasons.map((step) => (
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
                <h3 className="font-serif font-bold text-lg text-almanac-ink leading-snug">{step.crop}</h3>
                <div className="text-[11px] font-mono text-almanac-muted mt-1">{step.plantingWindow}</div>
                <p className="text-xs text-almanac-muted mt-2 leading-relaxed">{step.note}</p>
                <div className="mt-2.5 bg-almanac-pill/55 border border-almanac-border/80 rounded-xl p-2.5 text-[11px] text-almanac-ink leading-snug">
                  {getSoilRoleExplanation(step.tag, step.family)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-almanac-border flex items-center justify-between text-[11px] font-semibold">
                <span className="text-almanac-muted">Water:</span>
                <span className="text-almanac-forest tabular-nums">
                  {waterSetup === 'rainfed' && step.waterNeed.toLowerCase().includes('drip')
                    ? 'Rain-Fed + Mulch'
                    : step.waterNeed}{' '}
                  ({step.waterSavedPct}% saved)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CROP PLAYBOOK & PRESERVATION GUIDE */}
      {data.cropPlaybook && (
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                Active Crop Playbook &bull; {data.cropPlaybook.emoji} {data.cropPlaybook.cropName}
              </span>
              <h3 className="font-serif font-bold text-2xl text-almanac-ink mt-0.5">
                How to Grow, Harvest &amp; Preserve Your {data.cropPlaybook.cropName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
                Maturity: <strong>{data.cropPlaybook.daysToMaturityMin}–{data.cropPlaybook.daysToMaturityMax} days</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest font-bold">
                Water every {data.cropPlaybook.waterFrequencyDaysDry} days dry
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-almanac-ink flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-almanac-forest" />
                <span>Ideal Climate &amp; Soil</span>
              </div>
              <p className="text-xs text-almanac-muted leading-relaxed">
                <strong>Temperature:</strong> {data.cropPlaybook.idealTempRangeC}<br />
                <strong>Soil pH:</strong> {data.cropPlaybook.idealPhRange}
              </p>
              <p className="text-xs text-almanac-ink leading-relaxed font-medium pt-1">
                {data.cropPlaybook.waterGuide}
              </p>
            </div>

            <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-almanac-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Harvest Sign &amp; Cues</span>
              </div>
              <p className="text-xs text-almanac-muted leading-relaxed">
                {data.cropPlaybook.harvestSigns}
              </p>
              <div className="space-y-1 pt-1">
                {data.cropPlaybook.careTips.map((tip) => (
                  <div key={tip} className="text-[11px] text-almanac-ink flex items-start gap-1.5">
                    <span className="text-almanac-forest font-bold">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-almanac-ink flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-almanac-amber" />
                <span>Preservation Methods</span>
              </div>
              <div className="space-y-2.5">
                {data.cropPlaybook.preservationMethods.map((pm) => (
                  <div key={pm.method} className="space-y-0.5">
                    <div className="text-xs font-bold text-almanac-ink">{pm.method}</div>
                    <p className="text-[11px] text-almanac-muted leading-snug">{pm.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST YOUR OWN 4-SEASON VIRTUAL PLANTING PLAN */}
      <div
        id="virtual-planting-sandbox"
        className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-24"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-almanac-border pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Virtual Planting Sandbox</span>
            </span>
            <h2 className="font-serif font-bold text-2xl text-almanac-ink mt-0.5">
              Virtually Plant &amp; See What Happens
            </h2>
            <p className="text-xs text-almanac-muted mt-0.5">
              Pick any 4 crops in seasonal order to simulate survival odds, water saved, disease risk, and soil impact for {location.name}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                const smartTest: [CustomCropId, CustomCropId, CustomCropId, CustomCropId] = [
                  'tomatoes',
                  'clover',
                  'chickpeas',
                  'sunflower',
                ];
                setCustomCrops(smartTest);
                runEvaluation(smartTest);
              }}
              className="px-3.5 py-2 rounded-full bg-emerald-100 badge-emerald hover:opacity-90 text-xs font-bold text-almanac-forest transition cursor-pointer whitespace-nowrap"
            >
              Try Soil-Saving Mix
            </button>
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
              className="px-3.5 py-2 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-xs font-semibold text-almanac-ink transition cursor-pointer whitespace-nowrap"
            >
              Try Risky Example
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            'Season 1 · Spring/Summer',
            'Season 2 · Autumn/Winter',
            'Season 3 · Next Spring',
            'Season 4 · Late Summer',
          ].map((label, idx) => (
            <div key={label} className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5 space-y-1.5">
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
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-almanac-ink cursor-pointer"
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

        {evaluating && !evaluation && (
          <div className="text-xs text-almanac-muted font-mono py-2">Checking your plan against NASA weather...</div>
        )}

        {evaluation && (
          <div className="space-y-4">
            <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${evalVerdictStyle}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-serif font-bold text-lg sm:text-xl">
                  {evaluation.verdict === 'good' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  {evaluation.verdict === 'okay' && <AlertTriangle className="w-5 h-5 shrink-0" />}
                  {evaluation.verdict === 'bad' && <XCircle className="w-5 h-5 shrink-0" />}
                  <span>{evaluation.verdictTitle}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">{evaluation.willDieVerdict}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                <div className="bg-white/75 surface-soft px-3 py-1.5 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Survival</div>
                  <div className="font-bold text-sm">{evaluation.survivalPct}%</div>
                </div>
                <div className="bg-white/75 surface-soft px-3 py-1.5 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Die-Out</div>
                  <div className="font-bold text-sm">{evaluation.dieOutRiskPct}%</div>
                </div>
                <div className="bg-white/75 surface-soft px-3 py-1.5 rounded-xl border border-current/15 text-center">
                  <div className="text-[10px] uppercase opacity-75">Water</div>
                  <div className="font-bold text-sm">
                    {evaluation.waterImpactPct >= 0
                      ? `Saves ${evaluation.waterImpactPct}%`
                      : `+${Math.abs(evaluation.waterImpactPct)}%`}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-almanac-forest flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>What’s Good About Your Plan</span>
                </div>
                <ul className="space-y-1 text-xs text-almanac-muted list-disc pl-4">
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
                    No major weather, frost, or plant-disease risks spotted for {location.name}!
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs text-almanac-muted list-disc pl-4">
                    {evaluation.badPoints.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {evaluation.economics && (
              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-almanac-border pb-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                      Economic &amp; Market Simulation &bull; {evaluation.economics.countryName}
                    </span>
                    <h4 className="font-serif font-bold text-lg text-almanac-ink">
                      Estimated Investment, Revenue &amp; Net Profit
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
                      Area: <strong>{evaluation.economics.areaHa} ha</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest font-bold">
                      ROI: {evaluation.economics.roiPct}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-almanac-pill/60 border border-almanac-border rounded-xl p-3">
                    <div className="text-[10px] uppercase font-mono text-almanac-muted">Total Investment</div>
                    <div className="font-serif font-bold text-lg text-almanac-ink tabular-nums mt-0.5">
                      ${evaluation.economics.totalInvestmentUsd.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-almanac-muted">
                      ({evaluation.economics.currencySymbol}{evaluation.economics.totalInvestmentLocal.toLocaleString()})
                    </div>
                  </div>
                  <div className="bg-almanac-pill/60 border border-almanac-border rounded-xl p-3">
                    <div className="text-[10px] uppercase font-mono text-almanac-muted">Total Revenue</div>
                    <div className="font-serif font-bold text-lg text-almanac-forest tabular-nums mt-0.5">
                      ${evaluation.economics.totalRevenueUsd.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-almanac-muted">
                      ({evaluation.economics.currencySymbol}{evaluation.economics.totalRevenueLocal.toLocaleString()})
                    </div>
                  </div>
                  <div className="bg-almanac-pill/60 border border-almanac-border rounded-xl p-3">
                    <div className="text-[10px] uppercase font-mono text-almanac-muted">Net Profit</div>
                    <div className={`font-serif font-bold text-lg tabular-nums mt-0.5 ${evaluation.economics.netProfitUsd >= 0 ? 'text-almanac-forest' : 'text-almanac-terracotta'}`}>
                      ${evaluation.economics.netProfitUsd.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-almanac-muted">
                      ({evaluation.economics.currencySymbol}{evaluation.economics.netProfitLocal.toLocaleString()})
                    </div>
                  </div>
                  <div className="bg-almanac-pill/60 border border-almanac-border rounded-xl p-3">
                    <div className="text-[10px] uppercase font-mono text-almanac-muted">Return on Investment</div>
                    <div className="font-serif font-bold text-lg text-amber-700 tabular-nums mt-0.5">
                      {evaluation.economics.roiPct}% ROI
                    </div>
                    <div className="text-[10px] font-mono text-almanac-muted">Live FX + World Bank Index</div>
                  </div>
                </div>

                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-almanac-border text-[10px] font-mono uppercase text-almanac-muted">
                        <th className="py-2 pr-3">Season / Crop</th>
                        <th className="py-2 pr-3">Yield (Tons)</th>
                        <th className="py-2 pr-3">Farmgate Price</th>
                        <th className="py-2 pr-3">Investment</th>
                        <th className="py-2 pr-3">Revenue</th>
                        <th className="py-2">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-almanac-border/60 font-mono tabular-nums text-[11px]">
                      {evaluation.economics.seasonBreakdown.map((s) => (
                        <tr key={s.seasonLabel} className="hover:bg-almanac-pill/40">
                          <td className="py-2 pr-3 font-semibold text-almanac-ink">
                            {s.seasonLabel}: <span className="text-almanac-forest">{s.cropName}</span>
                          </td>
                          <td className="py-2 pr-3 text-almanac-ink">{s.expectedYieldTons} t</td>
                          <td className="py-2 pr-3 text-almanac-muted">
                            {evaluation.economics?.currencySymbol}{s.pricePerKgLocal} /kg (${s.pricePerKgUsd}/kg)
                          </td>
                          <td className="py-2 pr-3 text-almanac-terracotta">${s.investmentUsd.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-almanac-forest">${s.revenueUsd.toLocaleString()}</td>
                          <td className={`py-2 font-bold ${s.profitUsd >= 0 ? 'text-almanac-forest' : 'text-almanac-terracotta'}`}>
                            ${s.profitUsd.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RAINFALL PREDICTOR */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
                  Rainfall Predictor &middot; {rainfallPredictor.source}
                </span>
                <h3 className="font-serif font-bold text-xl text-almanac-ink mt-0.5">
                  Will There Be Rainfall?
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-100 badge-sky text-sky-800 text-xs font-bold flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5" />
                <span>{rainfallPredictor.verdictLabel}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3">
                <div className="text-[11px] text-almanac-muted">Next 7 Days</div>
                <div className="font-serif font-bold text-2xl text-almanac-ink tabular-nums mt-0.5">
                  ~{rainfallPredictor.next7DaysMm} mm
                </div>
              </div>
              <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3">
                <div className="text-[11px] text-almanac-muted">Next 14 Days</div>
                <div className="font-serif font-bold text-2xl text-almanac-ink tabular-nums mt-0.5">
                  ~{rainfallPredictor.next14DaysMm} mm
                </div>
              </div>
              <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3">
                <div className="text-[11px] text-almanac-muted">Rain Chance</div>
                <div className="font-serif font-bold text-2xl text-almanac-forest tabular-nums mt-0.5">
                  {rainfallPredictor.rainChancePct}%
                </div>
              </div>
            </div>

            <p className="text-xs text-almanac-ink leading-relaxed bg-almanac-pill/60 border border-almanac-border rounded-2xl p-3.5">
              {rainfallPredictor.plainSummary}
            </p>
          </div>

          {rainfallPredictor.dailyForecast.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
                7-Day Rain &amp; Night Temp Outlook
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {rainfallPredictor.dailyForecast.slice(0, 7).map((day) => (
                  <div
                    key={day.date}
                    className="bg-white surface-soft border border-almanac-border rounded-xl py-2 px-1 text-[10px] font-mono tabular-nums"
                  >
                    <div className="text-almanac-muted">{day.date.slice(5)}</div>
                    <div className="font-bold text-sky-500 mt-0.5">{day.rainMm}mm</div>
                    <div className="text-almanac-ink">{Math.round(day.tempMinC)}°/{Math.round(day.tempMaxC)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
              Plant Greenness
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-xs font-bold">
              {plantHealthLabel}
            </span>
          </div>
          <div className="font-serif font-bold text-4xl text-almanac-ink tabular-nums">
            {Math.round(snap.currentNdvi * 100)} / 100
          </div>
          <p className="text-xs text-almanac-muted leading-relaxed">
            {feeds.modisNdvi === 'NASA MODIS observation'
              ? `Latest available MODIS NDVI is ${Math.round(snap.currentNdvi * 100)}%.`
              : feeds.modisNdvi === 'Estimated from Open-Meteo reanalysis'
                ? `Historical-weather estimate of vegetation greenness is ${Math.round(snap.currentNdvi * 100)}%; this is not a satellite measurement.`
                : `Climate-based vegetation greenness estimate is ${Math.round(snap.currentNdvi * 100)}%; this is not a satellite measurement.`}
          </p>
          <div className="w-full h-2.5 bg-almanac-pill rounded-full overflow-hidden">
            <div
              className="h-full bg-almanac-forest rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, Math.round(snap.currentNdvi * 100)))}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
              Soil Moisture
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 badge-amber text-amber-800 text-xs font-bold">
              {moistureWord}
            </span>
          </div>
          <div className="font-serif font-bold text-4xl text-almanac-ink tabular-nums">
            {currentMoisturePct}% Damp
          </div>
          <p className="text-xs text-almanac-muted leading-relaxed">
            {snap.recent14dRainMm} mm of rain in the last 2 weeks &bull; Ground temp is {snap.currentSkinTempC}°C.
          </p>
          <div className="w-full h-2.5 bg-almanac-pill rounded-full overflow-hidden">
            <div
              className="h-full bg-almanac-amber rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(currentMoisturePct * 2.2))}%` }}
            />
          </div>
        </div>

        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
              Farm Plot Status
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 badge-orange text-almanac-terracotta text-xs font-bold">
              {activeField?.spotsBadge || 'No Farm Added'}
            </span>
          </div>
          <div className="font-serif font-bold text-3xl sm:text-4xl text-almanac-ink">
            {activeField?.reminderTitle || 'No Farm Plot Yet'}
          </div>
          <p className="text-xs text-almanac-muted leading-relaxed">
            {activeField?.reminderNote ||
              'Open My Farm to create a plot, set its size and location, and choose your main crop.'}
          </p>
          <div className="text-xs font-semibold text-almanac-terracotta pt-1">
            {activeField?.reminderFoot || 'Virtual crop testing is ready anytime above'}
          </div>
        </div>
      </div>

      {/* Field Reality Check */}
      <div className="bg-almanac-pill/55 border border-almanac-border rounded-2xl px-5 py-3.5 text-xs text-almanac-ink leading-relaxed">
        <strong className="font-serif text-almanac-forest">Your eyes come first:</strong>{' '}
        Gridded climate and satellite data describe broad areas, not your exact field, and support—not replace—local experience. Always squeeze soil 10 cm deep by hand and check low frost pockets or local water gates before irrigating or transplanting.
      </div>

      {/* SUMMARY GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="font-serif font-bold text-xl text-almanac-ink">Soil Health Over 5 Seasons</h2>
            <p className="text-xs text-almanac-muted">
              Rotating plants vs. planting the same crop every season
            </p>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`traj-${location.coordsLabel}-${data.goal}-${data.anchorCrop}`}
            buildConfig={(P) => ({
              type: 'line',
              data: {
                labels: trajectory.labels,
                datasets: [
                  {
                    label: 'TARS Crop Rotation',
                    data: trajectory.adaptiveRotation,
                    borderColor: P.forest,
                    backgroundColor: hexRgba(P.forest, 0.16),
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                  },
                  {
                    label: 'Same Crop Every Year',
                    data: trajectory.monoculture,
                    borderColor: P.terracotta,
                    borderDash: [5, 5],
                    tension: 0.35,
                    borderWidth: 2,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: P.text } },
                },
                scales: {
                  y: { min: 40, max: 100, grid: { color: P.grid }, ticks: { color: P.text } },
                  x: { grid: { display: false }, ticks: { color: P.text } },
                },
              },
            })}
          />
        </div>

        <div className="lg:col-span-5 bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="font-serif font-bold text-xl text-almanac-ink">Farm Balance Check</h2>
            <p className="text-xs text-almanac-muted">How well this rotation protects water, soil, and yield</p>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`radar-${location.coordsLabel}-${data.goal}-${data.anchorCrop}`}
            buildConfig={(P) => ({
              type: 'radar',
              data: {
                labels: radar.labels,
                datasets: [
                  {
                    label: 'TARS Plan',
                    data: radar.tarsPlan,
                    borderColor: P.forest,
                    backgroundColor: hexRgba(P.forest, 0.22),
                    pointBackgroundColor: P.forest,
                    borderWidth: 2,
                  },
                  {
                    label: 'Typical Farm',
                    data: radar.regionalAvg,
                    borderColor: P.amber,
                    backgroundColor: hexRgba(P.amber, 0.14),
                    pointBackgroundColor: P.amber,
                    borderWidth: 1.5,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: P.text } },
                },
                scales: {
                  r: {
                    min: 0,
                    max: 100,
                    ticks: { display: false },
                    grid: { color: P.grid },
                    angleLines: { color: P.grid },
                    pointLabels: { color: P.text, font: { size: 11 } },
                  },
                },
              },
            })}
          />
        </div>
      </div>

      {/* LIVE PLANTING WINDOW & SAVED FARM PLANS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                Seasonal Timing &bull; {location.name}
              </span>
              <h2 className="font-serif font-bold text-xl text-almanac-ink mt-0.5">
                When to Plant &amp; Water This Year
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-[11px] font-mono font-bold">
              {feeds.climateSource === 'NASA POWER climatology'
                ? 'NASA POWER climate'
                : feeds.climateSource === 'Open-Meteo historical reanalysis'
                  ? 'Open-Meteo archive'
                  : 'Regional estimate'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-almanac-ink">🌱 Best Time to Plant Outdoors</div>
              <div className="font-serif font-bold text-sm text-almanac-forest tabular-nums">
                {snap.bestPlantingMonth} (Nights ~{snap.bestPlantingNightTempC}°C)
              </div>
              <p className="text-[11px] text-almanac-muted leading-relaxed">
                Frost risk ends by {snap.bestPlantingMonth}, so young seedlings won’t freeze.
              </p>
            </div>

            <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-almanac-ink">💧 Watering Right Now</div>
              <div className="font-serif font-bold text-sm text-almanac-forest tabular-nums">
                {snap.currentMonthDeficitMm > 25 ? `Add ~${snap.currentMonthDeficitMm} mm water/mo` : 'Rain Enough / Light Drip'}
              </div>
              <p className="text-[11px] text-almanac-muted leading-relaxed">
                Usual rain this month is {snap.currentMonthRainMm} mm and crops drink about {snap.currentMonthDemandMm} mm.
              </p>
            </div>

            <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-almanac-ink">☀️ Hottest Summer Month</div>
              <div className="font-serif font-bold text-sm text-almanac-forest tabular-nums">
                {snap.peakSummerTempC}°C in {snap.peakSummerMonth}
              </div>
              <p className="text-[11px] text-almanac-muted leading-relaxed">
                {snap.peakSummerTempC >= 33
                  ? 'Hot summers ahead — put straw on the soil and water early in the morning.'
                  : 'Mild summer warmth — great weather for healthy tomatoes and beans.'}
              </p>
            </div>

            <div className="bg-almanac-pill/65 border border-almanac-border rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-bold text-almanac-ink">🌧️ Yearly Rainfall</div>
              <div className="font-serif font-bold text-sm text-almanac-forest tabular-nums">
                {snap.annualRainMm} mm per year
              </div>
              <p className="text-[11px] text-almanac-muted leading-relaxed">
                {snap.annualRainMm < 450
                  ? 'Dry climate — drip hoses and winter cover crops save the most water.'
                  : 'Good yearly rain — plant cover crops so winter water stays in your dirt.'}
              </p>
            </div>
          </div>
        </div>

        {/* Saved Farm Plans */}
        <div className="lg:col-span-5 bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif font-bold text-xl text-almanac-ink">Saved Farm Plans</h2>
              <button
                onClick={onSaveCurrentPlan}
                disabled={savingPlan}
                className="px-3 py-1.5 rounded-full bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savingPlan ? 'Saving...' : 'Save Plan'}</span>
              </button>
            </div>
            <p className="text-xs text-almanac-muted mt-1">
              Save your location’s planting order or download a copy to keep.
            </p>

            <div className="mt-3 space-y-2 max-h-52 overflow-y-auto pr-1">
              {savedPlans.length === 0 ? (
                <div className="text-xs text-almanac-muted bg-almanac-pill/45 border border-dashed border-almanac-border rounded-2xl p-4 text-center">
                  No saved farm plans yet. Click <strong>Save Plan</strong> to store this farm’s plan.
                </div>
              ) : (
                savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-2 bg-almanac-pill/65 border border-almanac-border rounded-xl px-3 py-2.5 text-xs"
                  >
                    <button
                      onClick={() => onLoadSavedPlan(plan)}
                      className="min-w-0 text-left flex-1 cursor-pointer group"
                      title="Click to load this saved farm plan"
                    >
                      <div className="font-bold text-almanac-ink truncate group-hover:text-almanac-forest transition">
                        {plan.locationName}
                      </div>
                      <div className="text-[10px] font-mono text-almanac-muted truncate">
                        {plan.coordsLabel} &bull; ~{plan.waterSavingsPct}% water saved
                      </div>
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="text-almanac-muted hover:text-almanac-terracotta p-1.5 cursor-pointer shrink-0"
                      title="Remove saved plan"
                      aria-label={`Delete saved plan for ${plan.locationName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-almanac-border flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-almanac-muted tabular-nums">
              {savedPlans.length} saved plot{savedPlans.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={onExportJson}
              className="px-3 py-1.5 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-xs font-semibold text-almanac-ink transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-almanac-forest" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
