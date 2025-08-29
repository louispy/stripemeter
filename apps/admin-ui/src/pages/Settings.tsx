
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Configure your Stripemeter instance</p>
        </div>
      </div>

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
              defaultValue="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reconciliation Epsilon (%)
            </label>
            <input
              type="number"
              defaultValue="0.5"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lateness Window (hours)
            </label>
            <input
              type="number"
              defaultValue="48"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Writer Interval (ms)
            </label>
            <input
              type="number"
              defaultValue="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
