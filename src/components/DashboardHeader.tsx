import { Bot, Globe, Moon, Sun } from 'lucide-react';
import type { DashboardPage, ThemeMode } from '../types/farm';

interface DashboardHeaderProps {
  activePage: DashboardPage;
  theme: ThemeMode;
  onSelectPage: (page: DashboardPage) => void;
  onSelectTheme: (theme: ThemeMode, originEl: HTMLButtonElement | null) => void;
  onToggleTarsChat: () => void;
  onReturnToOrbit: () => void;
}

const TABS: { key: DashboardPage; label: string }[] = [
  { key: 'summary', label: '1. Summary' },
  { key: 'rotations', label: '2. Location & Rotations' },
  { key: 'telemetry', label: '3. Analytics' },
  { key: 'datasets', label: '4. NASA Data Sources' },
];

export function DashboardHeader({
  activePage,
  theme,
  onSelectPage,
  onSelectTheme,
  onToggleTarsChat,
  onReturnToOrbit,
}: DashboardHeaderProps) {
  const isSun = theme === 'sun';

  return (
    <header className="sticky top-0 z-30 bg-almanac-card/95 backdrop-blur-md border-b border-almanac-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-almanac-forest btn-forest text-almanac-card flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="13" r="7.5" />
              <path
                d="M12 5.5c-1.5-2-3.5-2.5-5.5-1.5 1.5 1.2 3.2 1.5 5.5 1.5zm0 0c1.5-2 3.5-2.5 5.5-1.5-1.5 1.2-3.2 1.5-5.5 1.5z"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-serif font-bold text-lg sm:text-xl text-almanac-ink leading-tight truncate">
              Tomatoes with TARS
            </div>
            <div className="text-xs font-medium text-almanac-muted truncate">
              {isSun ? 'Know your Farm • Farmer’s Daily Almanac' : 'Know your Farm • Orbital Night Almanac'}
            </div>
          </div>
        </div>

        {/* Page tabs */}
        <nav
          className="order-last lg:order-none w-full lg:w-auto flex items-center gap-1 bg-almanac-pill p-1.5 rounded-full border border-almanac-border overflow-x-auto"
          aria-label="Dashboard pages"
        >
          {TABS.map((tab) => {
            const active = activePage === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectPage(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`px-4 py-1.5 rounded-full text-xs transition whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'font-bold bg-almanac-card text-almanac-ink shadow-sm'
                    : 'font-medium text-almanac-muted hover:text-almanac-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center p-1 rounded-full bg-almanac-pill border border-almanac-border"
            role="group"
            aria-label="Background theme"
          >
            <button
              onClick={(e) => onSelectTheme('moon', e.currentTarget)}
              aria-pressed={!isSun}
              title="Moon mode: space & stars"
              className={`px-3.5 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                !isSun
                  ? 'font-bold bg-almanac-card text-almanac-ink shadow-sm'
                  : 'font-medium text-almanac-muted hover:text-almanac-ink'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Moon</span>
            </button>
            <button
              onClick={(e) => onSelectTheme('sun', e.currentTarget)}
              aria-pressed={isSun}
              title="Sun mode: bright day & almanac"
              className={`px-3.5 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isSun
                  ? 'font-bold bg-almanac-card text-almanac-ink shadow-sm'
                  : 'font-medium text-almanac-muted hover:text-almanac-ink'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-almanac-amber" />
              <span>Sun</span>
            </button>
          </div>

          <button
            onClick={onToggleTarsChat}
            className="px-3.5 py-2 rounded-full bg-almanac-card hover:bg-almanac-pill border border-almanac-border text-xs font-semibold text-almanac-ink transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            title="Ask TARS AI questions about your farm"
          >
            <Bot className="w-3.5 h-3.5 text-almanac-forest" />
            <span className="hidden sm:inline">Ask TARS</span>
          </button>

          <button
            onClick={onReturnToOrbit}
            className="px-3.5 py-2 rounded-full bg-almanac-pill hover:bg-almanac-border border border-almanac-borderDark text-xs font-semibold text-almanac-ink transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Return to the orbital landing view"
          >
            <Globe className="w-3.5 h-3.5 text-almanac-forest" />
            <span>Orbit View</span>
          </button>
        </div>
      </div>
    </header>
  );
}
