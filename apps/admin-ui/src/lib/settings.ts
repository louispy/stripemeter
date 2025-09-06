const STORAGE_KEY = 'stripemeter.settings';

export interface SettingsStorage {
  version: 1;
  defaultTenantId: string;
  reconciliationEpsilonPercent: number;
  latenessWindowHours: number;
  defaultStripeAccount: string;
  writerIntervalMs: number;
}

export const DEFAULT_SETTINGS: SettingsStorage = {
  version: 1,
  defaultTenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  reconciliationEpsilonPercent: 0.5,
  latenessWindowHours: 48,
  defaultStripeAccount: '',
  writerIntervalMs: 10000,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function coerceToSettings(obj: any): SettingsStorage | null {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.version !== 1) return null;

  const settings: SettingsStorage = {
    version: 1,
    defaultTenantId: typeof obj.defaultTenantId === 'string' ? obj.defaultTenantId : DEFAULT_SETTINGS.defaultTenantId,
    reconciliationEpsilonPercent: isFiniteNumber(obj.reconciliationEpsilonPercent)
      ? obj.reconciliationEpsilonPercent
      : DEFAULT_SETTINGS.reconciliationEpsilonPercent,
    latenessWindowHours: isFiniteNumber(obj.latenessWindowHours)
      ? obj.latenessWindowHours
      : DEFAULT_SETTINGS.latenessWindowHours,
    defaultStripeAccount: typeof obj.defaultStripeAccount === 'string' ? obj.defaultStripeAccount : DEFAULT_SETTINGS.defaultStripeAccount,
    writerIntervalMs: isFiniteNumber(obj.writerIntervalMs) ? obj.writerIntervalMs : DEFAULT_SETTINGS.writerIntervalMs,
  };

  return settings;
}

export function loadSettings(): SettingsStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const coerced = coerceToSettings(parsed);
    return coerced ?? DEFAULT_SETTINGS;
  } catch {
    // Reset to defaults silently on parse/load error per owner guidance
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SettingsStorage): void {
  const payload: SettingsStorage = { ...settings, version: 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export type { SettingsStorage as AdminSettings };


