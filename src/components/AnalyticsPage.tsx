import { RefreshCw } from 'lucide-react';
import type { NasaFarmResponse, ThemeMode } from '../types/farm';
import { NasaChart, hexRgba } from './NasaChart';

interface AnalyticsPageProps {
  theme: ThemeMode;
  data: NasaFarmResponse;
  scanning: boolean;
  onRefresh: () => void;
}

export function AnalyticsPage({ theme, data, scanning, onRefresh }: AnalyticsPageProps) {
  const { telemetry, recentDaily, location, feeds } = data;
  const depsKey = `${location.coordsLabel}-${feeds.lastUpdatedIso}`;

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
                labels: telemetry.months,
                datasets: [
                  {
                    label: 'Root-Zone Moisture (%)',
                    data: telemetry.rootMoisture,
                    borderColor: P.sky,
                    backgroundColor: hexRgba(P.sky, 0.14),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'Topsoil 0–5cm (%)',
                    data: telemetry.topMoisture,
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
                labels: telemetry.months,
                datasets: [
                  {
                    label: 'Daytime Max Temp (°C)',
                    data: telemetry.tempMax,
                    borderColor: P.terracotta,
                    backgroundColor: hexRgba(P.terracotta, 0.14),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'Land Skin Temp (°C)',
                    data: telemetry.landSkinTemp,
                    borderColor: P.indigo,
                    borderDash: [3, 3],
                    tension: 0.35,
                  },
                  {
                    label: 'Nighttime Minimum (°C)',
                    data: telemetry.tempMin,
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
                labels: telemetry.months,
                datasets: [
                  {
                    label: 'NDVI Canopy Greenness',
                    data: telemetry.ndvi,
                    borderColor: P.forest,
                    backgroundColor: hexRgba(P.forest, 0.18),
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'EVI Enhanced Index',
                    data: telemetry.evi,
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
                labels: telemetry.months,
                datasets: [
                  {
                    label: 'NASA Precipitation (mm)',
                    data: telemetry.rainfall,
                    backgroundColor: P.indigo,
                    borderRadius: 6,
                  },
                  {
                    label: 'Crop Water Demand (mm)',
                    data: telemetry.waterDemand,
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
    </section>
  );
}
