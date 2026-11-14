import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  Droplets,
  Leaf,
  LocateFixed,
  Pencil,
  Plus,
  Satellite,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AnchorCrop,
  FarmAiAdvice,
  FarmFieldPlot,
  NasaFarmResponse,
  RotationGoal,
  SavedFarmPlan,
  ThemeMode,
} from '../types/farm';

interface FarmPageProps {
  theme: ThemeMode;
  data: NasaFarmResponse;
  fields: FarmFieldPlot[];
  activeFieldId: string;
  savedPlans: SavedFarmPlan[];
  scanning: boolean;
  savingPlan: boolean;
  aiAdvice: FarmAiAdvice | null;
  loadingAiAdvice: boolean;
  onSelectField: (field: FarmFieldPlot) => void;
  onCreateField: (payload: {
    name: string;
    areaHa: number;
    locationQuery: string;
    anchorCrop: AnchorCrop;
    goal: RotationGoal;
    plantedDate?: string;
  }) => Promise<void>;
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
  onLocateMe: (lat: number, lon: number) => Promise<void>;
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

export function FarmPage({
  theme,
  data,
  fields,
  activeFieldId,
  savedPlans,
  scanning,
  savingPlan,
  aiAdvice,
  loadingAiAdvice,
  onSelectField,
  onCreateField,
  onUpdateField,
  onDeleteField,
  onScanLocation,
  onLocateMe,
  onSaveCurrentPlan,
  onDeletePlan,
  onLoadSavedPlan,
  onExportJson,
}: FarmPageProps) {
  const activeField = fields.find((f) => f.id === activeFieldId) || fields[0];
  const { soil, location, quickTip, cropPlaybook, survivalPredictor } = data;
  const snap = quickTip.metricsSnapshot;

  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('50');
  const [plotLocation, setPlotLocation] = useState(location.name);
  const [plotCrop, setPlotCrop] = useState<AnchorCrop>(data.anchorCrop);
  const [plotGoal, setPlotGoal] = useState<RotationGoal>(data.goal);
  const [plotPlantedDate, setPlotPlantedDate] = useState('');
  const [savingPlot, setSavingPlot] = useState(false);
  const [plotSaveError, setPlotSaveError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState(location.name);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    setSearchText(location.name);
  }, [location.name]);

  const openAddPlotForm = () => {
    setEditingFieldId(null);
    setConfirmDeleteId(null);
    setPlotSaveError(null);
    setPlotName('');
    setPlotArea('50');
    setPlotLocation(location.name);
    setPlotCrop(data.anchorCrop);
    setPlotGoal(data.goal);
    setPlotPlantedDate('');
    setShowPlotForm(true);
  };

  const openEditPlotForm = (field: FarmFieldPlot) => {
    setConfirmDeleteId(null);
    setPlotSaveError(null);
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
    setPlotSaveError(null);
  };

  const handleSubmitPlotForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotName.trim() || savingPlot) return;
    setSavingPlot(true);
    setPlotSaveError(null);
    try {
      const payload = {
        name: plotName.trim(),
        areaHa: Math.max(1, Number(plotArea) || 50),
        locationQuery: plotLocation.trim() || location.name,
        anchorCrop: plotCrop,
        goal: plotGoal,
        plantedDate: plotPlantedDate.trim() || undefined,
      };
      if (editingFieldId) {
        await onUpdateField(editingFieldId, payload);
      } else {
        await onCreateField(payload);
      }
      setPlotName('');
      setPlotPlantedDate('');
      setEditingFieldId(null);
      setShowPlotForm(false);
    } catch (error) {
      setPlotSaveError(error instanceof Error ? error.message : 'Could not save the farm plot. Please try again.');
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

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || scanning) return;
    onScanLocation(searchText.trim());
  };

  const handleLocateMe = () => {
    setLocationError(null);
    if (!window.isSecureContext) {
      setLocationError('Device location requires a secure connection (HTTPS or localhost).');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Device location is not available in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await onLocateMe(coords.latitude, coords.longitude);
        } catch {
          setLocationError('Could not load farm data for your device location. Please try again.');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings, then try again.'
            : error.code === error.TIMEOUT
              ? 'Your device took too long to respond. Please try again.'
              : 'Your device location is currently unavailable. Check your location settings and try again.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const survivalBadgeColor =
    survivalPredictor.verdictTone === 'safe'
      ? 'bg-emerald-100 badge-emerald text-almanac-forest'
      : survivalPredictor.verdictTone === 'caution'
        ? 'bg-amber-100 badge-amber text-amber-800'
        : 'bg-orange-100 badge-orange text-almanac-terracotta';

  return (
    <section className="space-y-8">
      {/* Header + Farm Plots Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-almanac-forest/15 text-almanac-forest text-xs font-semibold">
            🌱 My Farm Management &amp; Crop Advisor
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-almanac-ink leading-tight">
            Your Farm Plots &amp; Planted Crops
          </h1>
          <p className="text-sm text-almanac-muted leading-relaxed">
            Manage your personal farm fields, set planting dates, inspect growth stages, and get AI-powered advice tailored directly to your soil and crops.
          </p>
        </div>

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
                    {field.name} ({field.areaHa} ha{field.plantedDate ? ` • Planted ${field.plantedDate}` : ''})
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
                      active ? 'text-white/85 hover:text-white' : 'text-almanac-muted hover:text-almanac-ink'
                    }`}
                    title={`Edit ${field.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {confirming ? (
                    <div className="flex items-center gap-0.5 pl-0.5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleConfirmDeleteField(field.id)}
                        className="px-2 py-1 rounded-full bg-almanac-terracotta text-white text-[10px] font-bold cursor-pointer"
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-full text-white/85"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(field.id)}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        active ? 'text-white/85 hover:text-white' : 'text-almanac-muted hover:text-almanac-terracotta'
                      }`}
                      title={`Delete ${field.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={openAddPlotForm}
            className="px-4 py-2 rounded-full bg-almanac-forest btn-forest text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Farm Plot</span>
          </button>
        </div>
      </div>

      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="p-2.5 rounded-2xl bg-almanac-forest/10 text-almanac-forest shrink-0">
              <LocateFixed className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-bold">
                Farm weather &amp; soil location
              </div>
              <h2 className="font-serif font-bold text-xl text-almanac-ink truncate">{location.name}</h2>
              <p className="text-xs text-almanac-muted font-mono mt-0.5">{location.coordsLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="px-3 py-1.5 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
              {soil.type} · pH {soil.ph.toFixed(1)}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest">
              {location.climateZone}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitLocation} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-almanac-muted" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setLocationError(null);
              }}
              placeholder="Search a city, valley, or coordinates"
              autoComplete="off"
              className="w-full bg-white surface-soft border border-almanac-borderDark focus:border-almanac-forest rounded-2xl pl-10 pr-3 py-3 text-sm text-almanac-ink focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={scanning || !searchText.trim()}
            className="bg-almanac-forest btn-forest text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Satellite className="w-4 h-4" />
            <span>{scanning ? 'Checking...' : 'Check location'}</span>
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating || scanning}
            className="bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-almanac-ink font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <LocateFixed className="w-4 h-4 text-almanac-forest" />
            <span>{locating ? 'Finding you...' : 'Use my location'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_REGIONS.map((region) => (
              <button
                key={region.key}
                type="button"
                disabled={scanning}
                onClick={() => {
                  setSearchText(region.query);
                  setLocationError(null);
                  onScanLocation(region.query);
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer disabled:opacity-60 ${
                  location.name.toLowerCase().includes(region.label.toLowerCase())
                    ? 'bg-almanac-forest btn-forest text-white'
                    : 'bg-almanac-pill hover:bg-almanac-border text-almanac-ink'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-almanac-muted">
            Your device location is requested only when you tap “Use my location.”
          </p>
        </div>
        {locationError && (
          <p role="alert" className="text-xs text-almanac-terracotta bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            {locationError}
          </p>
        )}
      </div>

      {/* Add / Edit Farm Plot Form Drawer */}
      {showPlotForm && (
        <form
          onSubmit={handleSubmitPlotForm}
          className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-almanac-ink">
              {editingFieldId ? `Editing "${plotName}"` : 'Add New Farm Plot & Planted Date'}
            </h2>
            <button
              type="button"
              onClick={closePlotForm}
              className="p-1.5 rounded-full bg-almanac-pill text-almanac-muted hover:text-almanac-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {plotSaveError && (
            <p role="alert" className="text-xs text-almanac-terracotta bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              {plotSaveError}
            </p>
          )}

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
                placeholder="e.g. North Tomato Plot"
                className="w-full bg-white surface-soft border border-almanac-borderDark rounded-xl px-3 py-2 text-xs text-almanac-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-almanac-muted">
                Location / Valley
              </label>
              <input
                type="text"
                value={plotLocation}
                onChange={(e) => setPlotLocation(e.target.value)}
                placeholder="City or valley"
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
                Goal
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
                className="flex-1 bg-almanac-forest btn-forest text-white font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer"
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

      {/* AI FARM ADVISOR CARD */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-almanac-forest/15 text-almanac-forest">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                TARS AI Farm Advisor &middot; Live Satellite Intelligence
              </span>
              <h3 className="font-serif font-bold text-xl text-almanac-ink">
                Personalized Recommendations for {activeField ? activeField.name : location.name}
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-xs font-bold font-mono">
            {aiAdvice?.source || 'Agronomy Engine'}
          </span>
        </div>

        {loadingAiAdvice && !aiAdvice ? (
          <div className="text-xs font-mono text-almanac-muted py-4 animate-pulse">
            TARS is analyzing your planted date, NASA weather, and SoilGrids profile...
          </div>
        ) : aiAdvice ? (
          <div className="space-y-4 text-xs">
            <p className="text-sm font-serif font-bold text-almanac-ink bg-almanac-pill/60 border border-almanac-border rounded-2xl p-4">
              {aiAdvice.headline}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-almanac-ink flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-almanac-forest" />
                  <span>Harvest Countdown &amp; Growth Stage</span>
                </div>
                <p className="text-almanac-muted leading-relaxed">{aiAdvice.harvestForecast}</p>
                {activeField?.plantedDate && (
                  <div className="text-[11px] font-mono text-almanac-forest pt-1">
                    Planted Date Logged: {activeField.plantedDate}
                  </div>
                )}
              </div>

              <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-almanac-ink flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-500" />
                  <span>Precise Watering Schedule</span>
                </div>
                <p className="text-almanac-muted leading-relaxed">{aiAdvice.wateringAdvice}</p>
              </div>
            </div>

            <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1.5">
              <div className="font-bold text-almanac-ink flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-almanac-amber" />
                <span>Post-Harvest Preservation Tip</span>
              </div>
              <p className="text-almanac-muted leading-relaxed">{aiAdvice.preservationTip}</p>
            </div>

            {aiAdvice.actionTips.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="font-mono text-[11px] uppercase text-almanac-muted font-bold">Action Steps for This Week</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {aiAdvice.actionTips.map((tip) => (
                    <div key={tip} className="bg-almanac-pill/50 border border-almanac-border rounded-xl p-3 text-almanac-ink leading-snug">
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
              Crop Survival Predictor · {survivalPredictor.cropName}
            </span>
            <h3 className="font-serif font-bold text-xl text-almanac-ink mt-0.5">
              Will Your {survivalPredictor.cropName} Survive?
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${survivalBadgeColor}`}>
            {survivalPredictor.verdictTone === 'safe' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span>{survivalPredictor.verdictLabel}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-5">
          <div className="space-y-4">
            <div className="flex items-baseline gap-6">
              <div>
                <div className="font-serif font-bold text-4xl text-almanac-forest tabular-nums">
                  {survivalPredictor.survivalPct}%
                </div>
                <div className="text-[11px] text-almanac-muted">Chance of thriving</div>
              </div>
              <div className="h-10 w-px bg-almanac-border" />
              <div>
                <div className="font-serif font-bold text-3xl text-almanac-terracotta tabular-nums">
                  {survivalPredictor.dieOutRiskPct}%
                </div>
                <div className="text-[11px] text-almanac-muted">Die-out risk</div>
              </div>
            </div>
            <p className="text-xs text-almanac-ink leading-relaxed bg-almanac-pill/60 border border-almanac-border rounded-2xl p-3.5">
              {survivalPredictor.willSurviveSummary}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {survivalPredictor.risks.map((risk) => (
              <div
                key={risk.label}
                className="bg-white surface-soft border border-almanac-border rounded-2xl p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="text-almanac-ink">{risk.label}</span>
                  <span
                    className={
                      risk.level === 'High'
                        ? 'text-almanac-terracotta'
                        : risk.level === 'Medium'
                          ? 'text-almanac-amber'
                          : 'text-almanac-forest'
                    }
                  >
                    {risk.level} Risk
                  </span>
                </div>
                <p className="text-[11px] text-almanac-muted leading-snug">{risk.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CROP PLAYBOOK & PRESERVATION GUIDE */}
      {cropPlaybook && (
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
                Active Crop Playbook &bull; {cropPlaybook.emoji} {cropPlaybook.cropName}
              </span>
              <h3 className="font-serif font-bold text-2xl text-almanac-ink mt-0.5">
                How to Grow, Harvest &amp; Preserve Your {cropPlaybook.cropName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
                Maturity: <strong>{cropPlaybook.daysToMaturityMin}–{cropPlaybook.daysToMaturityMax} days</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest font-bold">
                Water every {cropPlaybook.waterFrequencyDaysDry} days dry
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
                <strong>Temperature:</strong> {cropPlaybook.idealTempRangeC}<br />
                <strong>Soil pH:</strong> {cropPlaybook.idealPhRange}
              </p>
              <p className="text-xs text-almanac-ink leading-relaxed font-medium pt-1">
                {cropPlaybook.waterGuide}
              </p>
            </div>

            <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-almanac-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Harvest Sign &amp; Cues</span>
              </div>
              <p className="text-xs text-almanac-muted leading-relaxed">
                {cropPlaybook.harvestSigns}
              </p>
              <div className="space-y-1 pt-1">
                {cropPlaybook.careTips.map((tip) => (
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
                {cropPlaybook.preservationMethods.map((pm) => (
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

      {/* SAVED FARM PLANS & EXPORT */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-lg text-almanac-ink">Saved Farm Plans &amp; JSON Report</h3>
            <p className="text-xs text-almanac-muted">Export your full NASA farm telemetry and agronomy plan anytime</p>
          </div>
          <button
            type="button"
            onClick={onExportJson}
            className="px-4 py-2.5 rounded-full bg-almanac-forest btn-forest text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Farm Report (.json)</span>
          </button>
        </div>

        {savedPlans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {savedPlans.map((plan) => (
              <div key={plan.id} className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-serif font-bold text-sm text-almanac-ink">{plan.locationName}</div>
                  <button
                    type="button"
                    onClick={() => onDeletePlan(plan.id)}
                    className="p-1 text-almanac-muted hover:text-almanac-terracotta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] font-mono text-almanac-muted">
                  Saved: {plan.savedAt} &bull; pH {plan.soilPh}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onLoadSavedPlan(plan)}
                    className="text-xs font-bold text-almanac-forest hover:underline"
                  >
                    Load Plan →
                  </button>
                  <span className="text-[11px] font-mono text-almanac-forest font-bold">
                    {plan.waterSavingsPct}% water saved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
