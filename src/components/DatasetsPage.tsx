import { ExternalLink } from 'lucide-react';
import type { NasaFarmResponse } from '../types/farm';

interface DatasetsPageProps {
  data: NasaFarmResponse;
}

export function DatasetsPage({ data }: DatasetsPageProps) {
  const { feeds, location } = data;
  const statusStyles = {
    'Current forecast': 'bg-emerald-100 badge-emerald text-almanac-forest',
    'Current model conditions': 'bg-emerald-100 badge-emerald text-almanac-forest',
    'Historical data': 'bg-emerald-100 badge-emerald text-almanac-forest',
    Climatology: 'bg-emerald-100 badge-emerald text-almanac-forest',
    Modeled: 'bg-emerald-100 badge-emerald text-almanac-forest',
    'Historical estimate': 'bg-sky-100 text-sky-800',
    Estimated: 'bg-sky-100 text-sky-800',
    Fallback: 'bg-sky-100 text-sky-800',
    Unavailable: 'bg-stone-100 text-stone-700',
  } satisfies Record<(typeof data.feeds.proofs)[number]['status'], string>;

  return (
    <section className="space-y-8">
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
          Data Provenance &bull; {location.name} ({location.coordsLabel})
        </span>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink">
          Data sources, freshness &amp; estimates
        </h2>
        <p className="text-sm text-almanac-muted max-w-3xl leading-relaxed">
          Refresh checks the latest NASA POWER daily data, Open-Meteo current conditions and forecast, NASA MODIS vegetation, and ISRIC SoilGrids. Products update at different rates: climatology and soil maps are not real-time. Green means a provider returned data; blue means an estimate or fallback; unavailable sources are neutral.
        </p>
      </div>

      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif font-bold text-lg text-almanac-ink">
              Provider status
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-almanac-pill border border-almanac-border text-almanac-muted text-[11px] font-mono font-bold">
              {feeds.proofs.length} checks
            </span>
          </div>
          <span className="text-[11px] font-mono text-almanac-muted">
            Last synced: {new Date(feeds.lastUpdatedIso).toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-3">
          {feeds.proofs.length === 0 ? (
            <div className="bg-white surface-soft border border-dashed border-almanac-border rounded-2xl p-6 text-center text-xs text-almanac-muted">
              No provider checks were returned. The dashboard may be showing its built-in fallback data for {location.name}.
            </div>
          ) : (
            feeds.proofs.map((proof) => (
              <div
                key={proof.id}
                className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${statusStyles[proof.status]}`}>
                      {proof.status}
                    </span>
                    <span className="font-serif font-bold text-sm text-almanac-ink">{proof.name}</span>
                    <span className="text-[11px] text-almanac-muted">&middot; {proof.provider}</span>
                  </div>
                  <div className="text-xs text-almanac-ink font-medium">{proof.sampleReading}</div>
                </div>

                {proof.endpointUrl && (
                  <a
                    href={proof.endpointUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-[11px] font-mono text-almanac-ink transition whitespace-nowrap self-start lg:self-auto"
                  >
                    <span>Inspect source</span>
                    <ExternalLink className="w-3 h-3 text-almanac-forest" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-almanac-border text-xs text-almanac-muted leading-relaxed">
          <strong className="text-almanac-ink">Data notes:</strong> Green does not always mean real-time: NASA POWER climatology is a long-term average, NASA POWER daily data has a publication delay, and SoilGrids is a static modeled map. Open-Meteo current conditions are model analysis, not a farm sensor; its 14-day forecast is a forecast. NASA MODIS is a 16-day satellite composite when available. If a provider has no usable values, the blue estimate is labeled and is not presented as a measurement.
        </div>
      </div>
    </section>
  );
}
