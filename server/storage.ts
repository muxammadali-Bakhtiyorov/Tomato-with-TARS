import fs from 'fs';
import path from 'path';
import type { FarmFieldPlot, FarmNote, SavedFarmPlan } from '../src/types/farm.ts';

interface AlmanacStore {
  fields: FarmFieldPlot[];
  plans: SavedFarmPlan[];
  notes: FarmNote[];
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.join('/tmp', 'tars-data')
    : path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'farm-almanac.json');

function ensureStore(): AlmanacStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: AlmanacStore = { fields: [], plans: [], notes: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Partial<AlmanacStore>;
    return {
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    const fallback: AlmanacStore = { fields: [], plans: [], notes: [] };
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
  input: Pick<
    FarmFieldPlot,
    'name' | 'areaHa' | 'locationQuery' | 'lat' | 'lon' | 'anchorCrop' | 'goal' | 'plantedDate'
  >
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
    plantedDate: input.plantedDate || undefined,
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
  input: Partial<
    Pick<
      FarmFieldPlot,
      'name' | 'areaHa' | 'locationQuery' | 'lat' | 'lon' | 'anchorCrop' | 'goal' | 'plantedDate'
    >
  >
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
    plantedDate:
      input.plantedDate !== undefined ? input.plantedDate || undefined : existing.plantedDate,
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

export function listFarmNotes(): FarmNote[] {
  return ensureStore().notes;
}

export function addFarmNote(text: string): FarmNote {
  const store = ensureStore();
  const clean = text.trim().slice(0, 240);
  const note: FarmNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store.notes = [note, ...store.notes].slice(0, 30);
  writeStore(store);
  return note;
}

export function deleteFarmNote(id: string): FarmNote[] {
  const store = ensureStore();
  store.notes = store.notes.filter((n) => n.id !== id);
  writeStore(store);
  return store.notes;
}
