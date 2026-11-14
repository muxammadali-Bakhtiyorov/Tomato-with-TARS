import { ExternalLink } from 'lucide-react';
import type { NasaFarmResponse } from '../types/farm';

interface DatasetsPageProps {
  data: NasaFarmResponse;
}

export function DatasetsPage({ data }: DatasetsPageProps) {
  const { feeds, location } = data;
  const liveProofs = feeds.proofs.filter((proof) => proof.status === 'Live');

  return (
    <section className="space-y-8">
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-almanac-forest font-bold">
          Live Data Verification &bull; {location.name} ({location.coordsLabel})
        </span>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-almanac-ink">
          Live NASA &amp; Weather Feeds Used Right Now
        </h2>
        <p className="text-sm text-almanac-muted max-w-3xl leading-relaxed">
          Showing only the live datasets currently streaming for your farm location. Click any link below to inspect the raw JSON directly from NASA and public weather servers—zero API keys required.
        </p>
      </div>

      {/* Live Endpoint Proof Table */}
      <div className="bg-almanac-card border border-almanac-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif font-bold text-lg text-almanac-ink">
              Active Dataset Verification Log
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-[11px] font-mono font-bold">
              {liveProofs.length} Live
            </span>
          </div>
          <span className="text-[11px] font-mono text-almanac-muted">
            Last synced: {new Date(feeds.lastUpdatedIso).toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-3">
          {liveProofs.length === 0 ? (
            <div className="bg-white surface-soft border border-dashed border-almanac-border rounded-2xl p-6 text-center text-xs text-almanac-muted">
              Waiting for live NASA &amp; weather feeds to respond for {location.name}...
            </div>
          ) : (
            liveProofs.map((proof) => (
              <div
                key={proof.id}
                className="bg-white surface-soft border border-almanac-border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 badge-emerald text-almanac-forest">
                      ● LIVE
                    </span>
                    <span className="font-serif font-bold text-sm text-almanac-ink">{proof.name}</span>
                    <span className="text-[11px] text-almanac-muted">&middot; {proof.provider}</span>
                  </div>
                  <div className="text-xs text-almanac-ink font-medium">{proof.sampleReading}</div>
                </div>

                <a
                  href={proof.endpointUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-[11px] font-mono text-almanac-ink transition whitespace-nowrap self-start lg:self-auto"
                >
                  <span>Inspect Raw JSON</span>
                  <ExternalLink className="w-3 h-3 text-almanac-forest" />
                </a>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-almanac-border text-xs text-almanac-muted leading-relaxed">
          <strong className="text-almanac-ink">Data Fusion Note:</strong> TARS harmonizes coarse-grid{' '}
          <strong className="text-almanac-ink">SMAP</strong> soil moisture and{' '}
          <strong className="text-almanac-ink">GPM/IMERG</strong> rainfall with 10m–30m{' '}
          <strong className="text-almanac-ink">HLS</strong> vegetation passes and{' '}
          <strong className="text-almanac-ink">NASA POWER</strong> temperatures onto one monthly and daily farm timeline, while keeping local farmer judgment central for micro-climate checks.
        </div>
      </div>
    </section>
  );
}
