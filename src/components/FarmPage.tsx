import { useState } from 'react';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState(location.name);

  const openAddPlotForm = () => {
    setEditingFieldId(null);
    setConfirmDeleteId(null);
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
    if (!plotName.trim() || savingPlot) return;
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
      if (editingFieldId) {
        await onUpdateField(editingFieldId, payload);
      } else {
        await onCreateField(payload);
      }
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

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || scanning) return;
    onScanLocation(searchText.trim());
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
