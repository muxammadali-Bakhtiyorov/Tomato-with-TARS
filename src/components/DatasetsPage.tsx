import { ExternalLink } from 'lucide-react';
import type { NasaFarmResponse } from '../types/farm';

interface DatasetsPageProps {
  data: NasaFarmResponse;
}

export function DatasetsPage({ data }: DatasetsPageProps) {
  const { feeds, location } = data;
  const statusStyles = {
    'Current forecast': 'bg-emerald-100 badge-emerald text-almanac-forest',
    'Historical data': 'bg-sky-100 text-sky-800',
    Climatology: 'bg-sky-100 text-sky-800',
    Modeled: 'bg-amber-100 text-amber-900',
    Estimated: 'bg-amber-100 text-amber-900',
    Fallback: 'bg-rose-100 text-rose-800',
    Unavailable: 'bg-rose-100 text-rose-800',
  } satisfies Record<(typeof data.feeds.proofs)[number]['status'], string>;

  return (
    <section className="space-y-8">
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
          Data Provenance &bull; {location.name} ({location.coordsLabel})
        </span>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink">
          Data sources, freshness &amp; fallbacks
        </h2>
        <p className="text-sm text-almanac-muted max-w-3xl leading-relaxed">
          NASA POWER and NASA MODIS are the primary sources for climate and vegetation data. POWER climatology is a long-term gridded estimate, not a live farm sensor; forecasts and modeled soil maps come from other providers. Each row says what data was actually returned.
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
          <strong className="text-almanac-ink">Data notes:</strong> NASA POWER supplies gridded climate values and modeled soil wetness when available; Open-Meteo historical reanalysis is used only if POWER fails. NASA MODIS pixel values replace the seasonal NDVI/EVI estimate when available. Open-Meteo also supplies the 14-day forecast because POWER is not a forecast feed. ISRIC SoilGrids is a modeled regional soil map, not a lab test. Catalog entries alone are not treated as measurements.
        </div>
      </div>
    </section>
  );
}
