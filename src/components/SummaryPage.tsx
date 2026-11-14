import { useState } from 'react';
import {
  Bookmark,
  Check,
  CloudRain,
  Download,
  Droplets,
  Leaf,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AnchorCrop,
  DashboardPage,
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
  savingPlan: boolean;
  onSelectField: (field: FarmFieldPlot) => void;
  onCreateField: (payload: {
    name: string;
    areaHa: number;
    locationQuery: string;
    anchorCrop: AnchorCrop;
    goal: RotationGoal;
  }) => Promise<void>;
  onUpdateField: (
    id: string,
    payload: {
      name: string;
      areaHa: number;
      locationQuery: string;
      anchorCrop: AnchorCrop;
      goal: RotationGoal;
    }
  ) => Promise<void>;
  onDeleteField: (id: string) => Promise<void>;
  onNavigate: (page: DashboardPage) => void;
  onSaveCurrentPlan: () => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
  onLoadSavedPlan: (plan: SavedFarmPlan) => void;
  onExportJson: () => void;
}

export function SummaryPage({
  theme,
  data,
  fields,
  activeFieldId,
  savedPlans,
  savingPlan,
  onSelectField,
  onCreateField,
  onUpdateField,
  onDeleteField,
  onNavigate,
  onSaveCurrentPlan,
  onDeletePlan,
  onLoadSavedPlan,
  onExportJson,
}: SummaryPageProps) {
  const isSun = theme === 'sun';
  const activeField = fields.find((f) => f.id === activeFieldId) || fields[0];
  const { quickTip, soil, location, feeds, trajectory, radar, rainfallPredictor, survivalPredictor } = data;
  const snap = quickTip.metricsSnapshot;

  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('50');
  const [plotLocation, setPlotLocation] = useState(location.name);
  const [plotCrop, setPlotCrop] = useState<AnchorCrop>(data.anchorCrop);
  const [plotGoal, setPlotGoal] = useState<RotationGoal>(data.goal);
  const [savingPlot, setSavingPlot] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddPlotForm = () => {
    setEditingFieldId(null);
    setConfirmDeleteId(null);
    setPlotName('');
    setPlotArea('50');
    setPlotLocation(location.name);
    setPlotCrop(data.anchorCrop);
    setPlotGoal(data.goal);
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
      };
      if (editingFieldId) {
        await onUpdateField(editingFieldId, payload);
      } else {
        await onCreateField(payload);
      }
      setPlotName('');
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

  const survivalBadgeColor =
    survivalPredictor.verdictTone === 'safe'
      ? 'bg-emerald-100 badge-emerald text-almanac-forest'
      : survivalPredictor.verdictTone === 'caution'
        ? 'bg-amber-100 badge-amber text-amber-800'
        : 'bg-orange-100 badge-orange text-almanac-terracotta';

  const currentMoisturePct = snap.currentRootMoisturePct;
  const moistureWord =
    currentMoisturePct >= 30 ? 'Plenty of Water' : currentMoisturePct >= 22 ? 'Getting Dry' : 'Needs Water';
  const plantHealthLabel =
    snap.currentNdvi >= 0.65 ? 'Lush & Green' : snap.currentNdvi >= 0.42 ? 'Growing Steady' : 'Resting / Light Cover';

  return (
    <section className="space-y-8">
      {/* Greeting + Quick Field Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100/80 badge-amber border border-amber-300/60 text-amber-900 text-xs font-semibold">
            {isSun ? '☀️ Know your Farm • Warm Sunlit Almanac' : '🌙 Know your Farm • Moonlit Orbit Almanac'}
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-5xl text-almanac-ink leading-[1.12] tracking-tight">
            {isSun ? (
              <>
                Good day, Farmer.
                <br />
                Here is your simple farm plan.
              </>
            ) : (
              <>
                Good evening, Farmer.
                <br />
                Here is your simple farm plan.
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-almanac-muted leading-relaxed">
            Plain-language tips on when to water, whether rain is coming, if your crops are safe, and what order to plant to save water and keep your soil healthy.
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

                  {fields.length > 1 &&
                    (confirming ? (
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
                    ))}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (showPlotForm && !editingFieldId) {
                closePlotForm();
              } else {
                openAddPlotForm();
              }
            }}
            className="px-3.5 py-2 rounded-full text-xs bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-almanac-ink font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-almanac-forest" />
            <span>Add Plot</span>
          </button>
        </div>
      </div>

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

            {editingFieldId && fields.length > 1 && (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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
                <option value="nitrogen">Rebuild Soil</option>
                <option value="yield">Max Harvest</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingPlot}
                className="flex-1 bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                {savingPlot ? 'Saving...' : editingFieldId ? 'Save Changes' : 'Save Plot'}
              </button>
              <button
                type="button"
                onClick={closePlotForm}
                className="bg-almanac-pill text-almanac-ink font-semibold text-xs py-2.5 px-3 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* QUICK FARMER SUMMARY & TIP */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
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
            <p className="text-sm text-almanac-muted leading-relaxed">{quickTip.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('rotations')}
              className="bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs px-4 py-2.5 rounded-full transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Test Your Own Rotation</span>
            </button>
            <button
              onClick={() => onNavigate('telemetry')}
              className="bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-almanac-ink font-semibold text-xs px-4 py-2.5 rounded-full transition cursor-pointer whitespace-nowrap"
            >
              See Charts
            </button>
          </div>
        </div>

        {/* Planting Order Banner */}
        <div className="bg-almanac-pill/70 border border-almanac-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-bold">
              Best Planting Order (For Water &amp; Soil Health)
            </div>
            <div className="font-serif font-bold text-sm sm:text-base text-almanac-ink">
              {quickTip.plantingOrderSummary}
            </div>
          </div>
          <div className="text-xs font-mono text-almanac-muted shrink-0">
            {soil.type} &middot; pH {soil.ph.toFixed(1)}
          </div>
        </div>

        {/* 3 Plain-Language Action Steps */}
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

      {/* PREDICTORS ROW: PLANT SURVIVAL % + UPCOMING RAINFALL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plant Survival / Die-Out Predictor */}
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-muted font-semibold">
                Crop Survival Predictor
              </span>
              <h3 className="font-serif font-bold text-xl text-almanac-ink mt-0.5">
                Will Your Plants Survive or Die Out?
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

          <div className="flex items-baseline gap-6">
            <div>
              <div className="font-serif font-bold text-4xl text-almanac-forest tabular-nums">
                {survivalPredictor.survivalPct}%
              </div>
              <div className="text-[11px] text-almanac-muted">Chance of Thriving</div>
            </div>
            <div className="h-10 w-px bg-almanac-border" />
            <div>
              <div className="font-serif font-bold text-3xl text-almanac-terracotta tabular-nums">
                {survivalPredictor.dieOutRiskPct}%
              </div>
              <div className="text-[11px] text-almanac-muted">Die-Out Risk</div>
            </div>
          </div>

          <p className="text-xs text-almanac-ink leading-relaxed bg-almanac-pill/60 border border-almanac-border rounded-2xl p-3.5">
            {survivalPredictor.willSurviveSummary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {survivalPredictor.risks.map((r) => (
              <div
                key={r.label}
                className="bg-white surface-soft border border-almanac-border rounded-2xl p-3 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-almanac-ink">{r.label}</span>
                  <span
                    className={
                      r.level === 'High'
                        ? 'text-almanac-terracotta'
                        : r.level === 'Medium'
                          ? 'text-almanac-amber'
                          : 'text-almanac-forest'
                    }
                  >
                    {r.level} Risk
                  </span>
                </div>
                <p className="text-[11px] text-almanac-muted leading-snug">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rainfall Predictor */}
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

      {/* KPI Cards */}
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
            {Math.max(activeField?.cropStrength || 85, Math.round(snap.currentNdvi * 100))} / 100
          </div>
          <p className="text-xs text-almanac-muted leading-relaxed">
            Satellite NDVI leaf health score is {Math.round(snap.currentNdvi * 100)}% for this time of year (higher means thicker, healthier green leaves).
          </p>
          <div className="w-full h-2.5 bg-almanac-pill rounded-full overflow-hidden">
            <div
              className="h-full bg-almanac-forest rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(activeField?.cropStrength || 85, Math.round(snap.currentNdvi * 100)))}%`,
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
              Gentle Reminder
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 badge-orange text-almanac-terracotta text-xs font-bold">
              {activeField?.spotsBadge || '1 Spot'}
            </span>
          </div>
          <div className="font-serif font-bold text-3xl sm:text-4xl text-almanac-ink">
            {activeField?.reminderTitle || 'East Corner Dry'}
          </div>
          <p className="text-xs text-almanac-muted leading-relaxed">{activeField?.reminderNote}</p>
          <div className="text-xs font-semibold text-almanac-terracotta pt-1">{activeField?.reminderFoot}</div>
        </div>
      </div>

      {/* Farmer-Centered Field Reality Check */}
      <div className="bg-almanac-pill/55 border border-almanac-border rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="text-almanac-ink leading-relaxed">
          <strong className="font-serif text-almanac-forest">Your eyes come first:</strong>{' '}
          Satellites see broad 30m–9km patches and support—not replace—local experience. Always squeeze soil 10 cm deep by hand and check low frost pockets or local water gates before irrigating or transplanting.
        </div>
        <button
          type="button"
          onClick={() => onNavigate('telemetry')}
          className="text-xs font-bold text-almanac-forest hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
        >
          Test &ldquo;What-If&rdquo; Weather &rarr;
        </button>
      </div>

      {/* Summary Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-almanac-ink">Soil Health Over 5 Seasons</h2>
              <p className="text-xs text-almanac-muted">
                Rotating plants vs. planting the same crop every season
              </p>
            </div>
            <button
              onClick={() => onNavigate('rotations')}
              className="text-xs font-bold text-almanac-forest hover:underline cursor-pointer"
            >
              Build Your Own Plan &rarr;
            </button>
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

      {/* Live Planting Window & Saved Farm Plans */}
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
              {feeds.powerClimatology === 'Live' ? 'NASA Data Live' : 'NASA Archive'}
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
