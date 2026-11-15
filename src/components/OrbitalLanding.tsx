import { useMemo, useRef, useState } from 'react';
import { Sprout } from 'lucide-react';
import type { DashboardPage } from '../types/farm';

interface OrbitalLandingProps {
  visible: boolean;
  currentNdvi: number;
  onEnterDashboard: (page: DashboardPage, mode: 'moon' | 'sun', origin?: { x: number; y: number }) => void;
}

export function OrbitalLanding({ visible, currentNdvi, onEnterDashboard }: OrbitalLandingProps) {
  const [sunriseActive, setSunriseActive] = useState(false);
  const moonBtnRef = useRef<HTMLButtonElement | null>(null);

  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        size: (Math.random() * 2.2 + 0.8).toFixed(1),
        top: `${(Math.random() * 100).toFixed(2)}%`,
        left: `${(Math.random() * 100).toFixed(2)}%`,
        delay: `${(Math.random() * 4).toFixed(2)}s`,
      })),
    []
  );

  if (!visible) return null;

  const handleMoonClick = () => {
    if (sunriseActive) return;
    setSunriseActive(true);
    let origin = { x: 75, y: 22 };
    if (moonBtnRef.current) {
      const r = moonBtnRef.current.getBoundingClientRect();
      origin = {
        x: Number((((r.left + r.width / 2) / window.innerWidth) * 100).toFixed(1)),
        y: Number((((r.top + r.height / 2) / window.innerHeight) * 100).toFixed(1)),
      };
    }
    setTimeout(() => {
      onEnterDashboard('summary', 'sun', origin);
      setTimeout(() => setSunriseActive(false), 600);
    }, 680);
  };

  return (
    <section
      id="orbital-landing"
      className="fixed inset-0 z-50 bg-orbital-bg text-slate-100 flex flex-col justify-between overflow-y-auto overflow-x-hidden"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-36 w-[540px] h-[540px] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute top-1/3 right-8 w-[500px] h-[500px] rounded-full bg-teal-900/25 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[440px] h-[320px] rounded-full bg-amber-900/15 blur-[110px]" />
        <div className="absolute inset-0">
          {stars.map((s) => (
            <div
              key={s.id}
              className="star-dot"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                top: s.top,
                left: s.left,
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Orbital Header */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="13" r="8" stroke="#34d399" />
              <path
                d="M12 5c-1.5-2.5-4-3-6-2 1.5 1.5 3.5 2 6 2zm0 0c1.5-2.5 4-3 6-2-1.5 1.5-3.5 2-6 2z"
                stroke="#fbbf24"
                strokeLinecap="round"
              />
              <path d="M12 5v16" strokeOpacity="0.35" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-serif font-bold text-lg sm:text-xl tracking-tight text-white leading-none truncate">
              Tomatoes with <span className="text-emerald-400">TARS</span>
            </div>
            <div className="text-[11px] font-mono tracking-[0.18em] text-amber-300/90 uppercase mt-1">
              Know your Farm
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NASA Open Feeds Live</span>
          </div>
        </div>
      </header>

      {/* Center Split Hero */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center my-auto">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-5 text-left">
          <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-emerald-300/80">
            Tomatoes with TARS &middot; NASA Farm Almanac
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-5xl sm:text-7xl xl:text-[84px] leading-[1.05] tracking-tight text-white">
              <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Know your Farm
              </span>
            </h1>
          </div>

          <p className="text-slate-300/90 text-sm sm:text-base leading-relaxed max-w-xl">
            Multigenerational farming wisdom meets NASA POWER climate data, historical weather, and MODIS vegetation observations when available.
            Plan crop rotations with clear labels when a value is estimated rather than measured.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onEnterDashboard('summary', 'moon')}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm px-7 py-4 rounded-xl transition flex items-center gap-2.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <Sprout className="w-4 h-4" />
              <span>Open Farm Almanac</span>
            </button>
          </div>

          <div className="pt-5 border-t border-white/10 grid grid-cols-3 gap-6 max-w-md">
            <div>
              <div className="font-serif font-bold text-2xl sm:text-3xl text-white tabular-nums">
                250m<span className="text-emerald-400 text-sm font-mono">/px</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">MODIS pixel size, when available</div>
            </div>
            <div>
              <div className="font-serif font-bold text-2xl sm:text-3xl text-white tabular-nums">
                24<span className="text-slate-300 text-sm font-mono">hr</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Daily gridded weather data</div>
            </div>
            <div>
              <div className="font-serif font-bold text-2xl sm:text-3xl text-white tabular-nums">
                25<span className="text-amber-300 text-sm font-mono">yr</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">NASA Climate Archive</div>
            </div>
          </div>
        </div>

        {/* Right Column: Orbital Globe + Moon->Sun Orb + Telemetry HUD */}
        <div className="lg:col-span-6 relative flex flex-col items-center gap-6">
          <div className="relative w-full flex items-center justify-center min-h-[390px] sm:min-h-[450px]">
            <div className="absolute w-[340px] h-[340px] sm:w-[430px] sm:h-[430px] rounded-full border border-dashed border-emerald-500/20 orbit-ring-cw pointer-events-none" />
            <div className="absolute w-[420px] h-[420px] sm:w-[515px] sm:h-[515px] rounded-full border border-dashed border-slate-500/15 orbit-ring-ccw pointer-events-none" />

            {/* Moon -> Sun Orb Trigger */}
            <button
              ref={moonBtnRef}
              onClick={handleMoonClick}
              className="group absolute -top-2 right-3 sm:right-8 z-40 flex flex-col items-center focus:outline-none cursor-pointer"
              title="Click the Moon: watch it shrink and ignite into a bright Sun!"
            >
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
                    sunriseActive ? 'opacity-100 scale-[1.85]' : 'opacity-0 scale-0'
                  }`}
                >
                  <svg className="w-full h-full sun-rays-spin text-amber-300" viewBox="0 0 100 100">
                    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="50" y1="2" x2="50" y2="14" />
                      <line x1="50" y1="86" x2="50" y2="98" />
                      <line x1="2" y1="50" x2="14" y2="50" />
                      <line x1="86" y1="50" x2="98" y2="50" />
                      <line x1="16" y1="16" x2="25" y2="25" />
                      <line x1="75" y1="75" x2="84" y2="84" />
                      <line x1="84" y1="16" x2="75" y2="25" />
                      <line x1="25" y1="75" x2="16" y2="84" />
                    </g>
                  </svg>
                </div>

                <div
                  className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 relative flex items-center justify-center transition-all duration-500 ease-in-out ${
                    sunriseActive ? 'scale-[0.18] opacity-0' : 'moon-idle-glow group-hover:scale-105 opacity-100'
                  }`}
                >
                  <svg className="w-full h-full rounded-full opacity-60" viewBox="0 0 80 80">
                    <circle cx="25" cy="24" r="7" fill="#94a3b8" />
                    <circle cx="52" cy="30" r="5.5" fill="#94a3b8" />
                    <circle cx="38" cy="52" r="9" fill="#94a3b8" />
                    <circle cx="20" cy="48" r="4" fill="#cbd5e1" />
                    <circle cx="56" cy="55" r="3.5" fill="#94a3b8" />
                  </svg>
                </div>

                <div
                  className={`absolute w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-gradient-to-br from-white via-amber-200 to-amber-500 transition-all duration-700 ease-out flex items-center justify-center shadow-[0_0_50px_#fef08a,0_0_95px_#f59e0b] ${
                    sunriseActive ? 'opacity-100 scale-[1.65]' : 'opacity-0 scale-0'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/90 blur-[2px]" />
                </div>
              </div>

              <span className="mt-1 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-400/40 text-amber-200 font-mono text-[10px] tracking-wide shadow-md group-hover:bg-amber-400 group-hover:text-slate-950 transition whitespace-nowrap">
                {sunriseActive ? 'Dawn Rising...' : 'Click Moon → Sunrise'}
              </span>
            </button>

            {/* Satellite 1 */}
            <div className="absolute top-6 left-0 sm:left-3 z-20 sat-float-1 flex flex-col items-center">
              <svg className="w-16 h-12 drop-shadow-[0_0_12px_rgba(52,211,153,0.45)]" viewBox="0 0 80 56" fill="none">
                <rect x="2" y="18" width="24" height="14" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.2" />
                <line x1="10" y1="18" x2="10" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
                <line x1="18" y1="18" x2="18" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
                <line x1="26" y1="25" x2="32" y2="25" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="48" y1="25" x2="54" y2="25" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="54" y="18" width="24" height="14" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.2" />
                <line x1="62" y1="18" x2="62" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
                <line x1="70" y1="18" x2="70" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
                <rect x="32" y="14" width="16" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
                <circle cx="40" cy="24" r="4" fill="#10b981" />
                <line x1="40" y1="36" x2="40" y2="43" stroke="#34d399" strokeWidth="1.5" />
              </svg>
              <div className="mt-1 px-2.5 py-1 rounded-md bg-orbital-card/90 border border-emerald-500/30 backdrop-blur-md font-mono text-[10px] text-slate-200 flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>
                  TARS-SAT 01 &middot; <span className="text-emerald-300">NDVI</span>
                </span>
              </div>
            </div>

            {/* Satellite 2 */}
            <div className="absolute top-40 right-0 z-20 sat-float-2 flex flex-col items-center">
              <svg className="w-16 h-12 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" viewBox="0 0 80 56" fill="none">
                <rect x="2" y="18" width="24" height="14" rx="2" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
                <line x1="10" y1="18" x2="10" y2="32" stroke="#fcd34d" strokeWidth="0.8" />
                <line x1="18" y1="18" x2="18" y2="32" stroke="#fcd34d" strokeWidth="0.8" />
                <line x1="26" y1="25" x2="32" y2="25" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="48" y1="25" x2="54" y2="25" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="54" y="18" width="24" height="14" rx="2" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
                <line x1="62" y1="18" x2="62" y2="32" stroke="#fcd34d" strokeWidth="0.8" />
                <line x1="70" y1="18" x2="70" y2="32" stroke="#fcd34d" strokeWidth="0.8" />
                <rect x="32" y="14" width="16" height="22" rx="3" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" />
                <circle cx="40" cy="24" r="4" fill="#f59e0b" />
                <line x1="40" y1="36" x2="40" y2="43" stroke="#fbbf24" strokeWidth="1.5" />
              </svg>
              <div className="mt-1 px-2.5 py-1 rounded-md bg-orbital-card/90 border border-amber-500/30 backdrop-blur-md font-mono text-[10px] text-slate-200 flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>
                  TARS DATA 02 &middot; <span className="text-amber-300">HISTORY</span>
                </span>
              </div>
            </div>

            {/* Orbital Earth Globe */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full flex items-center justify-center">
              <div className="absolute -inset-4 rounded-full border border-emerald-400/20 bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent blur-sm" />
              <div className="absolute -inset-1.5 rounded-full border border-teal-300/25" />

              <svg
                className="w-full h-full rounded-full shadow-[inset_-24px_-24px_48px_rgba(2,6,23,0.9),0_0_45px_rgba(16,185,129,0.2)]"
                viewBox="0 0 300 300"
              >
                <defs>
                  <radialGradient id="earthOcean" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#19454b" />
                    <stop offset="55%" stopColor="#0e2a30" />
                    <stop offset="100%" stopColor="#061317" />
                  </radialGradient>
                  <linearGradient id="earthLand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9cb380" />
                    <stop offset="100%" stopColor="#6b8e6b" />
                  </linearGradient>
                </defs>
                <circle cx="150" cy="150" r="146" fill="url(#earthOcean)" stroke="#2dd4bf" strokeOpacity="0.3" strokeWidth="1.5" />
                <g stroke="#34d399" strokeOpacity="0.16" strokeWidth="1" fill="none">
                  <ellipse cx="150" cy="150" rx="146" ry="42" />
                  <ellipse cx="150" cy="150" rx="146" ry="92" />
                  <ellipse cx="150" cy="150" rx="146" ry="126" />
                  <ellipse cx="150" cy="150" rx="45" ry="146" />
                  <ellipse cx="150" cy="150" rx="95" ry="146" />
                  <ellipse cx="150" cy="150" rx="128" ry="146" />
                  <line x1="4" y1="150" x2="296" y2="150" />
                  <line x1="150" y1="4" x2="150" y2="296" />
                </g>
                <path
                  d="M128,48 C148,40 185,44 212,62 C234,76 254,104 246,128 C238,148 214,144 198,154 C184,162 188,184 174,196 C160,208 148,244 134,248 C120,252 112,224 108,202 C104,180 86,174 84,154 C82,134 104,122 114,106 C122,92 112,56 128,48 Z"
                  fill="url(#earthLand)"
                  opacity="0.82"
                />
                <path
                  d="M52,86 C68,78 86,88 88,104 C90,118 72,130 58,124 C44,118 40,94 52,86 Z"
                  fill="url(#earthLand)"
                  opacity="0.72"
                />
                <path
                  d="M214,174 C232,170 252,184 248,204 C244,220 220,224 208,210 C198,198 202,178 214,174 Z"
                  fill="url(#earthLand)"
                  opacity="0.75"
                />
                <circle cx="132" cy="112" r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="132" cy="112" r="10" stroke="#38bdf8" strokeWidth="1.2" fill="none" opacity="0.7" />
                <circle cx="182" cy="126" r="4.5" fill="#34d399" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="182" cy="126" r="11" stroke="#34d399" strokeWidth="1.2" fill="none" opacity="0.8" />
                <circle cx="148" cy="176" r="4.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="148" cy="176" r="10" stroke="#fbbf24" strokeWidth="1.2" fill="none" opacity="0.75" />
              </svg>
            </div>
          </div>

          {/* Telemetry HUD Card */}
          <div className="w-full max-w-[360px] bg-orbital-card/90 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-black/70">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-emerald-400 font-semibold tracking-wider">TARS DATA LINK</span>
              <span className="text-slate-400">KEYLESS OPEN TELEMETRY</span>
            </div>
            <div className="font-serif font-bold text-sm text-white mb-1">Climate &amp; Vegetation Context</div>
            <p className="text-[11px] text-slate-300/85 leading-relaxed mb-2.5">
              Translating gridded climate and historical weather into farmer-friendly crop guidance; MODIS is used only when a pixel is returned.
            </p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Seasonal vegetation estimate:</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {currentNdvi.toFixed(2)} NDVI ({currentNdvi >= 0.55 ? 'Optimal' : 'Seasonal'})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 border-t border-white/5 gap-2">
        <span>NASA-POWERED FARM INSIGHTS &middot; ZERO API KEYS REQUIRED</span>
        <span className="text-center">NASA POWER &bull; HISTORICAL WEATHER &bull; MODIS WHEN AVAILABLE</span>
      </div>
    </section>
  );
}
