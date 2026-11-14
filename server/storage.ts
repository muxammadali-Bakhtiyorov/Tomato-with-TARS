import fs from 'fs';
import path from 'path';
import type { FarmFieldPlot, SavedFarmPlan } from '../src/types/farm.ts';

interface AlmanacStore {
  fields: FarmFieldPlot[];
  plans: SavedFarmPlan[];
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.join('/tmp', 'tars-data')
    : path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'farm-almanac.json');

const DEFAULT_FIELDS: FarmFieldPlot[] = [
  {
    id: 'north',
    name: 'North Tomatoes',
    emoji: '🍅',
    areaHa: 120,
    locationQuery: 'Tashkent Valley, Uzbekistan',
    lat: 41.2995,
    lon: 69.2401,
    anchorCrop: 'tomatoes',
    goal: 'water',
    cropStrength: 92,
    soilMoisturePct: 34,
    healthBadge: 'Healthy',
    moistureBadge: 'Just Right',
    spotsBadge: '1 Spot',
    reminderTitle: 'East Corner Dry',
    reminderNote:
      'The slope on the east side is slightly drier than the rest. Worth a quick look on your morning walk.',
    reminderFoot: 'Light evening breeze • 21°C tonight',
  },
  {
    id: 'clover',
    name: 'Clover Cover',
    emoji: '🌿',
    areaHa: 65,
    locationQuery: 'Fergana Basin, Uzbekistan',
    lat: 40.3842,
    lon: 71.7843,
    anchorCrop: 'peppers',
    goal: 'nitrogen',
    cropStrength: 88,
    soilMoisturePct: 31,
    healthBadge: 'Healthy',
    moistureBadge: 'Comfortable',
    spotsBadge: '0 Spots',
    reminderTitle: 'All Clear',
    reminderNote:
      'Moisture is even across the plot and the clover cover is thick. Nothing needs attention today.',
    reminderFoot: 'Calm evening • 19°C tonight',
  },
  {
    id: 'river',
    name: 'Riverbank Rotation',
    emoji: '🌾',
    areaHa: 80,
    locationQuery: 'Central Valley, California',
    lat: 36.7783,
    lon: -119.4179,
    anchorCrop: 'wheat',
    goal: 'pest',
    cropStrength: 95,
    soilMoisturePct: 38,
    healthBadge: 'Thriving',
    moistureBadge: 'Well Watered',
    spotsBadge: '1 Note',
    reminderTitle: 'Nitrogen Rich',
    reminderNote:
      'Soil nitrogen is high after last season’s legumes. You can likely skip extra fertilizer this round.',
    reminderFoot: 'Mild river breeze • 18°C tonight',
  },
];

function ensureStore(): AlmanacStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: AlmanacStore = { fields: DEFAULT_FIELDS, plans: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Partial<AlmanacStore>;
    return {
      fields: Array.isArray(parsed.fields) && parsed.fields.length > 0 ? parsed.fields : DEFAULT_FIELDS,
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
    };
  } catch {
    const fallback: AlmanacStore = { fields: DEFAULT_FIELDS, plans: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function writeStore(store: AlmanacStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export function listFields(): FarmFieldPlot[] {
  return ensureStore().fields;
}

export function addFieldPlot(
  input: Pick<FarmFieldPlot, 'name' | 'areaHa' | 'locationQuery' | 'lat' | 'lon' | 'anchorCrop' | 'goal'>
): FarmFieldPlot {
  const store = ensureStore();
  const emojiMap: Record<string, string> = {
    tomatoes: '🍅',
    peppers: '🫑',
    potatoes: '🥔',
    wheat: '🌾',
    corn: '🌽',
    melons: '🍉',
  };
  const plot: FarmFieldPlot = {
    id: `plot_${Date.now()}`,
    name: input.name.trim().slice(0, 48),
    emoji: emojiMap[input.anchorCrop] || '🌱',
    areaHa: Math.max(1, Math.round(input.areaHa)),
    locationQuery: input.locationQuery,
    lat: input.lat,
    lon: input.lon,
    anchorCrop: input.anchorCrop,
    goal: input.goal,
    cropStrength: 90,
    soilMoisturePct: 32,
    healthBadge: 'Monitored',
    moistureBadge: 'NASA Synced',
    spotsBadge: '0 Spots',
    reminderTitle: 'Ready for Rotation',
    reminderNote: `Plot synced to NASA POWER & SoilGrids for ${input.locationQuery}.`,
    reminderFoot: 'Live satellite schedule active',
  };
  store.fields.push(plot);
  writeStore(store);
  return plot;
}

export function updateFieldPlot(
  id: string,
  input: Partial<Pick<FarmFieldPlot, 'name' | 'areaHa' | 'locationQuery' | 'lat' | 'lon' | 'anchorCrop' | 'goal'>>
): FarmFieldPlot | null {
  const store = ensureStore();
  const idx = store.fields.findIndex((f) => f.id === id);
  if (idx === -1) return null;

  const emojiMap: Record<string, string> = {
    tomatoes: '🍅',
    peppers: '🫑',
    potatoes: '🥔',
    wheat: '🌾',
    corn: '🌽',
    melons: '🍉',
  };

  const existing = store.fields[idx];
  const nextCrop = input.anchorCrop ?? existing.anchorCrop;
  const nextLoc = input.locationQuery ?? existing.locationQuery;

  const updated: FarmFieldPlot = {
    ...existing,
    name: input.name ? input.name.trim().slice(0, 48) : existing.name,
    areaHa: typeof input.areaHa === 'number' && input.areaHa > 0 ? Math.round(input.areaHa) : existing.areaHa,
    locationQuery: nextLoc,
    lat: typeof input.lat === 'number' ? input.lat : existing.lat,
    lon: typeof input.lon === 'number' ? input.lon : existing.lon,
    anchorCrop: nextCrop,
    goal: input.goal ?? existing.goal,
    emoji: emojiMap[nextCrop] || existing.emoji,
    reminderNote:
      input.locationQuery && input.locationQuery !== existing.locationQuery
        ? `Plot synced to NASA weather & soil data for ${nextLoc}.`
        : existing.reminderNote,
  };

  store.fields[idx] = updated;
  writeStore(store);
  return updated;
}

export function removeFieldPlot(id: string): FarmFieldPlot[] {
  const store = ensureStore();
  // Keep at least 1 field
  if (store.fields.length <= 1) return store.fields;
  store.fields = store.fields.filter((f) => f.id !== id);
  writeStore(store);
  return store.fields;
}

export function listSavedPlans(): SavedFarmPlan[] {
  return ensureStore().plans;
}

export function saveFarmPlan(plan: Omit<SavedFarmPlan, 'id' | 'savedAt'>): SavedFarmPlan {
  const store = ensureStore();
  const entry: SavedFarmPlan = {
    ...plan,
    id: `plan_${Date.now()}`,
    savedAt: new Date().toISOString().slice(0, 10),
  };
  store.plans = [entry, ...store.plans].slice(0, 20);
  writeStore(store);
  return entry;
}

export function deleteSavedPlan(id: string): SavedFarmPlan[] {
  const store = ensureStore();
  store.plans = store.plans.filter((p) => p.id !== id);
  writeStore(store);
  return store.plans;
}
