export const STORAGE_KEYS = {
  APP_PREFS: 'tars_almanac_prefs_v1',
  FIELDS: 'tars_almanac_fields_v1',
  PLANS: 'tars_almanac_plans_v1',
  NOTES: 'tars_almanac_notes_v1',
  CHAT_MESSAGES: 'tars_almanac_chat_v1',
  ROTATION_INPUTS: 'tars_almanac_rotations_v1',
  ANALYTICS_SLIDERS: 'tars_almanac_sliders_v1',
} as const;

let storageUserId: string | null = null;

export function setStorageUserId(userId: string | null): void {
  storageUserId = userId;
}

function scopedKey(key: string): string {
  return storageUserId ? `${key}:${storageUserId}` : key;
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(scopedKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}
