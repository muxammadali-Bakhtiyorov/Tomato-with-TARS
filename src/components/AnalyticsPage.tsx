import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { readStorage, STORAGE_KEYS, writeStorage } from '../lib/persistence';
import type { NasaFarmResponse, ThemeMode } from '../types/farm';
import { NasaChart, hexRgba } from './NasaChart';

interface AnalyticsPageProps {
  theme: ThemeMode;
  data: NasaFarmResponse;
  scanning: boolean;
  onRefresh: () => void;
}

export function AnalyticsPage({ theme, data, scanning, onRefresh }: AnalyticsPageProps) {
  const { telemetry, recentDaily, location, feeds, survivalPredictor } = data;
  const savedSliders = readStorage<{ rainShiftPct?: number; tempShiftC?: number }>(
    STORAGE_KEYS.ANALYTICS_SLIDERS,
    {}
  );
  const [rainShiftPct, setRainShiftPct] = useState(savedSliders.rainShiftPct ?? 0); // -40 to +40 %
  const [tempShiftC, setTempShiftC] = useState(savedSliders.tempShiftC ?? 0); // -3 to +4 °C

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ANALYTICS_SLIDERS, { rainShiftPct, tempShiftC });
  }, [rainShiftPct, tempShiftC]);

  const simTelemetry = useMemo(() => {
    if (rainShiftPct === 0 && tempShiftC === 0) return telemetry;

    const rainFactor = 1 + rainShiftPct / 100;
    const tempEvapFactor = 1 + Math.max(-0.2, tempShiftC * 0.045);

    const rainfall = telemetry.rainfall.map((r) => Math.max(0, Math.round(r * rainFactor)));
    const tempMax = telemetry.tempMax.map((t) => Math.round((t + tempShiftC) * 10) / 10);
    const tempMin = telemetry.tempMin.map((t) => Math.round((t + tempShiftC) * 10) / 10);
    const landSkinTemp = telemetry.landSkinTemp.map((t) => Math.round((t + tempShiftC * 1.15) * 10) / 10);
    const waterDemand = telemetry.waterDemand.map((w) => Math.max(12, Math.round(w * tempEvapFactor)));
    const moistureDelta = Math.round(rainShiftPct * 0.14 - tempShiftC * 1.4);
    const rootMoisture = telemetry.rootMoisture.map((m) => Math.max(6, Math.min(62, m + moistureDelta)));
    const topMoisture = telemetry.topMoisture.map((m) => Math.max(4, Math.min(58, m + moistureDelta)));
    const ndviShift = Math.max(-0.18, Math.min(0.12, rainShiftPct * 0.0015 - Math.max(0, tempShiftC - 1) * 0.02));
    const ndvi = telemetry.ndvi.map((v) => Math.max(0.08, Math.min(0.95, Math.round((v + ndviShift) * 100) / 100)));
    const evi = ndvi.map((v) => Math.round(v * 0.84 * 100) / 100);

    return {
      ...telemetry,
      rainfall,
      tempMax,
      tempMin,
      landSkinTemp,
      waterDemand,
      rootMoisture,
      topMoisture,
      ndvi,
      evi,
    };
  }, [telemetry, rainShiftPct, tempShiftC]);

  const curMonthIdx = new Date().getUTCMonth();
  const simSurvivalPct = Math.max(
    18,
    Math.min(
      98,
      Math.round(
        survivalPredictor.survivalPct +
          (rainShiftPct < 0 ? rainShiftPct * 0.25 : rainShiftPct * 0.08) -
          (tempShiftC > 1 ? (tempShiftC - 1) * 5 : tempShiftC < -1 ? Math.abs(tempShiftC + 1) * 7 : 0)
      )
    )
  );
  const scenarioChanged = rainShiftPct !== 0 || tempShiftC !== 0;
  const depsKey = `${location.coordsLabel}-${feeds.lastUpdatedIso}-${rainShiftPct}-${tempShiftC}`;

  const sharedOpts = (
    P: ReturnType<typeof import('./NasaChart').getChartPalette>,
    yExtra: Record<string, unknown> = {}
  ) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8, color: P.text } },
    },
    scales: {
      y: { grid: { color: P.grid }, ticks: { color: P.text }, ...yExtra },
      x: { grid: { display: false }, ticks: { color: P.text } },
    },
  });

  return (
    <section className="space-y-8">
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
            NASA Satellite Observations &middot; {location.name}
          </span>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink mt-1">
            Moisture, Temperature, Vegetation &amp; Rainfall
          </h2>
          <p className="text-xs sm:text-sm text-almanac-muted mt-1">
            Seasonal &amp; recent daily NASA earth observation curves for {location.coordsLabel} so you can time planting and irrigation with confidence.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={scanning}
          className="bg-almanac-forest btn-forest hover:bg-almanac-forestHover text-white font-bold text-xs px-5 py-3 rounded-full transition shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Syncing NASA...' : 'Refresh Satellite Pass'}</span>
        </button>
      </div>

      {/* Compact "What-If" Weather Scenario Sliders */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-almanac-forest shrink-0" />
            <div>
              <h3 className="font-serif font-bold text-base text-almanac-ink">
                &ldquo;What-If&rdquo; Weather &amp; Drought Tester
              </h3>
              <p className="text-[11px] text-almanac-muted">
                Slide rainfall or temperature to see how drought, wet years, or heatwaves change your charts and crop survival.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="px-3 py-1 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
              Est. Survival: <strong className="text-almanac-forest">{simSurvivalPct}%</strong>
            </span>
            <span className="px-3 py-1 rounded-full bg-almanac-pill border border-almanac-border text-almanac-ink">
              Root Damp: <strong>{simTelemetry.rootMoisture[curMonthIdx]}%</strong>
            </span>
            {scenarioChanged && (
              <button
                type="button"
                onClick={() => {
                  setRainShiftPct(0);
                  setTempShiftC(0);
                }}
                className="px-3 py-1 rounded-full bg-almanac-card hover:bg-almanac-pill border border-almanac-borderDark text-almanac-ink font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Live</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-almanac-pill/50 border border-almanac-border rounded-2xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-almanac-ink">
              <span>Rainfall Change</span>
              <span className="font-mono text-sky-500 tabular-nums">
                {rainShiftPct > 0 ? `+${rainShiftPct}%` : `${rainShiftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-40}
              max={40}
              step={5}
              value={rainShiftPct}
              onChange={(e) => setRainShiftPct(Number(e.target.value))}
              aria-label="Rainfall shift percentage"
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-almanac-muted">
              <span>-40% Drought</span>
              <span>Live NASA</span>
              <span>+40% Wet Year</span>
            </div>
          </div>

          <div className="bg-almanac-pill/50 border border-almanac-border rounded-2xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-almanac-ink">
              <span>Temperature Shift</span>
              <span className="font-mono text-almanac-terracotta tabular-nums">
                {tempShiftC > 0 ? `+${tempShiftC}°C` : `${tempShiftC}°C`}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={4}
              step={0.5}
              value={tempShiftC}
              onChange={(e) => setTempShiftC(Number(e.target.value))}
              aria-label="Temperature shift degrees Celsius"
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-almanac-muted">
              <span>-3°C Cold / Frost</span>
              <span>Live NASA</span>
              <span>+4°C Heatwave</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core NASA Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-almanac-ink">
                1. Soil Moisture &amp; Drought Stress
              </h3>
              <p className="text-xs text-almanac-muted">Soil Moisture Active Passive (SMAP) Root-Zone &amp; Surface (%)</p>
            </div>
            <span className="shrink-0 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-sky-100 badge-sky text-sky-800">
              SMAP L4
            </span>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`moist-${depsKey}`}
            className="h-64 relative"
            buildConfig={(P) => ({
              type: 'line',
              data: {
                labels: simTelemetry.months,
                datasets: [
                  {
                    label: 'Root-Zone Moisture (%)',
                    data: simTelemetry.rootMoisture,
                    borderColor: P.sky,
                    backgroundColor: hexRgba(P.sky, 0.14),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'Topsoil 0–5cm (%)',
                    data: simTelemetry.topMoisture,
                    borderColor: P.sky2,
                    borderDash: [4, 4],
                    tension: 0.35,
                  },
                ],
              },
              options: sharedOpts(P),
            })}
          />
        </div>

        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-almanac-ink">
                2. Land Surface &amp; Canopy Temperature
              </h3>
              <p className="text-xs text-almanac-muted">NASA MODIS Skin Temp &amp; Canopy Min/Max (°C)</p>
            </div>
            <span className="shrink-0 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-orange-100 badge-orange text-almanac-terracotta">
              MODIS / TS
            </span>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`temp-${depsKey}`}
            className="h-64 relative"
            buildConfig={(P) => ({
              type: 'line',
              data: {
                labels: simTelemetry.months,
                datasets: [
                  {
                    label: 'Daytime Max Temp (°C)',
                    data: simTelemetry.tempMax,
                    borderColor: P.terracotta,
                    backgroundColor: hexRgba(P.terracotta, 0.14),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'Land Skin Temp (°C)',
                    data: simTelemetry.landSkinTemp,
                    borderColor: P.indigo,
                    borderDash: [3, 3],
                    tension: 0.35,
                  },
                  {
                    label: 'Nighttime Minimum (°C)',
                    data: simTelemetry.tempMin,
                    borderColor: P.amber,
                    tension: 0.35,
                  },
                ],
              },
              options: sharedOpts(P),
            })}
          />
        </div>

        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-almanac-ink">
                3. Vegetation Greenness (NDVI &amp; EVI)
              </h3>
              <p className="text-xs text-almanac-muted">Harmonized Landsat &amp; Sentinel-2 (HLS) 10m–30m Canopy Index (0.0–1.0)</p>
            </div>
            <span className="shrink-0 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 badge-emerald text-almanac-forest">
              {feeds.modisNdvi === 'Live (HLS 10–30m)' ? 'HLS 10–30m' : feeds.modisNdvi === 'Live (ORNL MOD13Q1)' ? 'MODIS + HLS' : 'HLS / Agro'}
            </span>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`veg-${depsKey}`}
            className="h-64 relative"
            buildConfig={(P) => ({
              type: 'line',
              data: {
                labels: simTelemetry.months,
                datasets: [
                  {
                    label: 'NDVI Canopy Greenness',
                    data: simTelemetry.ndvi,
                    borderColor: P.forest,
                    backgroundColor: hexRgba(P.forest, 0.18),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'EVI Enhanced Index',
                    data: simTelemetry.evi,
                    borderColor: P.lime,
                    borderDash: [4, 4],
                    tension: 0.35,
                  },
                ],
              },
              options: sharedOpts(P, { min: 0, max: 1 }),
            })}
          />
        </div>

        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-almanac-ink">
                4. Rainfall vs. Crop Water Demand
              </h3>
              <p className="text-xs text-almanac-muted">Global Precipitation Measurement (GPM) &amp; IMERG vs. Irrigation Need (mm/mo)</p>
            </div>
            <span className="shrink-0 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-100 badge-indigo text-indigo-800">
              GPM &amp; IMERG
            </span>
          </div>
          <NasaChart
            theme={theme}
            depsKey={`rain-${depsKey}`}
            className="h-64 relative"
            buildConfig={(P) => ({
              type: 'bar',
              data: {
                labels: simTelemetry.months,
                datasets: [
                  {
                    label: 'NASA Precipitation (mm)',
                    data: simTelemetry.rainfall,
                    backgroundColor: P.indigo,
                    borderRadius: 6,
                  },
                  {
                    label: 'Crop Water Demand (mm)',
                    data: simTelemetry.waterDemand,
                    backgroundColor: P.amber,
                    borderRadius: 6,
                  },
                ],
              },
              options: sharedOpts(P),
            })}
          />
        </div>
      </div>

      {/* Recent Daily NASA Satellite Observations Table */}
      {recentDaily.length > 0 && (
        <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif font-bold text-lg text-almanac-ink">
                Recent Daily NASA POWER Observations
              </h3>
              <p className="text-xs text-almanac-muted">
                Latest satellite-derived daily rainfall, root-zone moisture, and surface temperature used for your current irrigation tip
              </p>
            </div>
            <span className="text-[11px] font-mono text-almanac-forest font-bold">
              {recentDaily.length} recent daily granules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-almanac-border text-[11px] font-mono uppercase text-almanac-muted">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 pr-4">Rainfall (mm)</th>
                  <th className="py-2.5 pr-4">Root Moisture</th>
                  <th className="py-2.5 pr-4">Topsoil 0–5cm</th>
                  <th className="py-2.5 pr-4">Max / Min Air (°C)</th>
                  <th className="py-2.5">Skin Temp (°C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-almanac-border/60 font-mono tabular-nums">
                {recentDaily.slice(-8).reverse().map((row) => (
                  <tr key={row.date} className="hover:bg-almanac-pill/40 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-almanac-ink">{row.date}</td>
                    <td className="py-2.5 pr-4 text-sky-500 font-semibold">{row.rainMm.toFixed(1)} mm</td>
                    <td className="py-2.5 pr-4 text-almanac-forest font-semibold">{row.rootMoisturePct}%</td>
                    <td className="py-2.5 pr-4 text-almanac-muted">{row.topMoisturePct}%</td>
                    <td className="py-2.5 pr-4 text-almanac-ink">
                      {row.tempMaxC}° / {row.tempMinC}°
                    </td>
                    <td className="py-2.5 text-almanac-terracotta">{row.skinTempC}°C</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plain-English Farm Terms, Uncertainty & Satellite vs. Ground Guide */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-almanac-forest font-bold">
            Plain-English Guide
          </span>
          <h3 className="font-serif font-bold text-lg text-almanac-ink mt-0.5">
            What These Terms Mean &amp; Why Field Checks Matter
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1">
            <div className="font-bold text-almanac-ink">🌿 NDVI (Leaf Greenness Score)</div>
            <p className="text-almanac-muted leading-relaxed">
              Measured by HLS (10m–30m) and MODIS satellites from 0.0 to 1.0. Healthy leafy crops score 0.65–0.85; drops often show water stress before leaves visibly yellow.
            </p>
          </div>
          <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1">
            <div className="font-bold text-almanac-ink">💧 Evapotranspiration &amp; Water Balance</div>
            <p className="text-almanac-muted leading-relaxed">
              &ldquo;Crop Water Demand&rdquo; is how fast sun and wind pull moisture out of leaves and dirt. Comparing it to GPM/IMERG rainfall tells you the exact irrigation gap.
            </p>
          </div>
          <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1">
            <div className="font-bold text-almanac-ink">🛰️ Satellites vs. Ground Soil Checks</div>
            <p className="text-almanac-muted leading-relaxed">
              SMAP soil moisture (~9 km) and GPM rainfall (~10 km) show regional trends, while HLS (10–30m) tracks field canopy. Squeezing dirt 10 cm deep by hand confirms your exact plot.
            </p>
          </div>
          <div className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 space-y-1">
            <div className="font-bold text-almanac-ink">☁️ Model Uncertainty &amp; Local Judgment</div>
            <p className="text-almanac-muted leading-relaxed">
              Cloud cover, plastic mulch, drip lines, or shady valleys can create local differences. Use TARS as an early-warning guide alongside your own field walk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
