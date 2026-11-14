import { useEffect, useRef } from 'react';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import type { ThemeMode } from '../types/farm';

export interface ChartPalette {
  text: string;
  grid: string;
  forest: string;
  terracotta: string;
  amber: string;
  sky: string;
  sky2: string;
  lime: string;
  indigo: string;
}

export function getChartPalette(theme: ThemeMode): ChartPalette {
  return theme === 'sun'
    ? {
        text: '#2b241c',
        grid: 'rgba(213, 200, 173, 0.45)',
        forest: '#3b6346',
        terracotta: '#c45d3e',
        amber: '#d4892a',
        sky: '#0284c7',
        sky2: '#38bdf8',
        lime: '#65a30d',
        indigo: '#4f46e5',
      }
    : {
        text: '#cbd5e1',
        grid: 'rgba(148, 163, 184, 0.16)',
        forest: '#34d399',
        terracotta: '#fb9270',
        amber: '#fbbf24',
        sky: '#38bdf8',
        sky2: '#7dd3fc',
        lime: '#a3e635',
        indigo: '#818cf8',
      };
}

export function hexRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface NasaChartProps {
  buildConfig: (palette: ChartPalette) => ChartConfiguration;
  theme: ThemeMode;
  depsKey: string;
  className?: string;
}

export function NasaChart({ buildConfig, theme, depsKey, className = 'h-72 relative' }: NasaChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const palette = getChartPalette(theme);
    Chart.defaults.color = palette.text;
    Chart.defaults.borderColor = palette.grid;
    Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
    Chart.defaults.font.size = 11;

    const config = buildConfig(palette);
    chartRef.current = new Chart(canvas, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, depsKey]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} />
    </div>
  );
}
