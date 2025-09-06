import { useEffect, useMemo, useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../lib/settings';

export default function Settings() {
  const [defaultTenantId, setDefaultTenantId] = useState<string>(DEFAULT_SETTINGS.defaultTenantId);
  const [reconciliationEpsilonPercent, setReconciliationEpsilonPercent] = useState<string>(
    String(DEFAULT_SETTINGS.reconciliationEpsilonPercent)
  );
  const [latenessWindowHours, setLatenessWindowHours] = useState<string>(String(DEFAULT_SETTINGS.latenessWindowHours));
  const [defaultStripeAccount, setDefaultStripeAccount] = useState<string>(DEFAULT_SETTINGS.defaultStripeAccount);
  const [writerIntervalMs, setWriterIntervalMs] = useState<string>(String(DEFAULT_SETTINGS.writerIntervalMs));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSaved, setShowSaved] = useState<boolean>(false);

  useEffect(() => {
    const s = loadSettings();
    setDefaultTenantId(s.defaultTenantId);
    setReconciliationEpsilonPercent(String(s.reconciliationEpsilonPercent));
    setLatenessWindowHours(String(s.latenessWindowHours));
    setDefaultStripeAccount(s.defaultStripeAccount);
    setWriterIntervalMs(String(s.writerIntervalMs));
  }, []);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  function validateAndSave() {
    const newErrors: Record<string, string> = {};

    const epsilon = parseFloat(reconciliationEpsilonPercent);
    const lateness = Number.isNaN(parseInt(latenessWindowHours, 10)) ? NaN : parseInt(latenessWindowHours, 10);
    const writerMs = Number.isNaN(parseInt(writerIntervalMs, 10)) ? NaN : parseInt(writerIntervalMs, 10);

    if (!defaultTenantId || !defaultTenantId.trim()) {
      newErrors.defaultTenantId = 'Required';
    }
    if (!Number.isFinite(epsilon) || epsilon < 0) {
      newErrors.reconciliationEpsilonPercent = 'Must be a non-negative number';
    }
    if (!Number.isFinite(lateness) || lateness < 0) {
      newErrors.latenessWindowHours = 'Must be a non-negative integer';
    }
    if (defaultStripeAccount && !/^acct_/.test(defaultStripeAccount)) {
      newErrors.defaultStripeAccount = 'Should start with acct_ or be empty';
    }
    if (!Number.isFinite(writerMs) || writerMs <= 0) {
      newErrors.writerIntervalMs = 'Must be a positive integer';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    saveSettings({
      version: 1,
      defaultTenantId: defaultTenantId.trim(),
      reconciliationEpsilonPercent: epsilon,
      latenessWindowHours: lateness,
      defaultStripeAccount: defaultStripeAccount.trim(),
      writerIntervalMs: writerMs,
    });

    setShowSaved(true);
    window.setTimeout(() => setShowSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Configure your Stripemeter instance</p>
        </div>
      </div>

      {showSaved && (
        <div className="fixed top-4 right-4 z-50 rounded-md bg-green-600 text-white px-4 py-2 shadow">
          Settings saved
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Tenant ID
            </label>
            <input
              type="text"
              value={defaultTenantId}
              onChange={(e) => setDefaultTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.defaultTenantId && (
              <p className="mt-1 text-sm text-red-600">{errors.defaultTenantId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reconciliation Epsilon (%)
            </label>
            <input
              type="number"
              value={reconciliationEpsilonPercent}
              step="0.1"
              onChange={(e) => setReconciliationEpsilonPercent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.reconciliationEpsilonPercent && (
              <p className="mt-1 text-sm text-red-600">{errors.reconciliationEpsilonPercent}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lateness Window (hours)
            </label>
            <input
              type="number"
              value={latenessWindowHours}
              onChange={(e) => setLatenessWindowHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.latenessWindowHours && (
              <p className="mt-1 text-sm text-red-600">{errors.latenessWindowHours}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Stripe Configuration</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Stripe Account
            </label>
            <input
              type="text"
              placeholder="acct_..."
              value={defaultStripeAccount}
              onChange={(e) => setDefaultStripeAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.defaultStripeAccount && (
              <p className="mt-1 text-sm text-red-600">{errors.defaultStripeAccount}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Writer Interval (ms)
            </label>
            <input
              type="number"
              value={writerIntervalMs}
              onChange={(e) => setWriterIntervalMs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.writerIntervalMs && (
              <p className="mt-1 text-sm text-red-600">{errors.writerIntervalMs}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={validateAndSave} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60" disabled={hasErrors}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
