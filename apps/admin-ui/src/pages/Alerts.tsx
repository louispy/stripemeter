
import { AlertTriangle, Plus, Bell } from 'lucide-react';

export default function Alerts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Alerts</h2>
            <p className="text-sm text-gray-500">Monitor usage thresholds and budgets</p>
          </div>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 text-center text-gray-500">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts configured</h3>
          <p className="mt-1 text-sm text-gray-500">Create alerts to monitor usage and prevent bill shock.</p>
        </div>
      </div>
    </div>
  );
}
