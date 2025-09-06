import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, clearSettings } from './settings';

describe('settings storage', () => {
  const STORAGE_KEY = 'stripemeter.settings';

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as any);
  });

  it('returns defaults when storage is empty', () => {
    (localStorage.getItem as any).mockReturnValue(null);
    const s = loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults on parse error', () => {
    (localStorage.getItem as any).mockReturnValue('not-json');
    const s = loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('coerces and validates types and version', () => {
    const bad = JSON.stringify({
      version: 1,
      defaultTenantId: 123,
      reconciliationEpsilonPercent: '1.2',
      latenessWindowHours: '48',
      defaultStripeAccount: 42,
      writerIntervalMs: '2000',
      unknownField: true,
    });
    (localStorage.getItem as any).mockReturnValue(bad);
    const s = loadSettings();
    // invalid types fallback to defaults
    expect(s.defaultTenantId).toBe(DEFAULT_SETTINGS.defaultTenantId);
    expect(s.reconciliationEpsilonPercent).toBe(DEFAULT_SETTINGS.reconciliationEpsilonPercent);
    expect(s.latenessWindowHours).toBe(DEFAULT_SETTINGS.latenessWindowHours);
    expect(s.defaultStripeAccount).toBe(DEFAULT_SETTINGS.defaultStripeAccount);
    expect(s.writerIntervalMs).toBe(DEFAULT_SETTINGS.writerIntervalMs);
  });

  it('saves with version 1 under correct key', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      defaultTenantId: 'tenant-1',
      reconciliationEpsilonPercent: 1.1,
      latenessWindowHours: 24,
      defaultStripeAccount: 'acct_123',
      writerIntervalMs: 5000,
    });
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    const [key, value] = (localStorage.setItem as any).mock.calls[0];
    expect(key).toBe(STORAGE_KEY);
    const parsed = JSON.parse(value);
    expect(parsed.version).toBe(1);
    expect(parsed.defaultTenantId).toBe('tenant-1');
    expect(parsed.defaultStripeAccount).toBe('acct_123');
  });

  it('clear removes the key', () => {
    clearSettings();
    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});


