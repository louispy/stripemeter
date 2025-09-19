
import { useEffect, useState } from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { loadSettings } from '../lib/settings';

type Mapping = {
  id: string;
  tenantId: string;
  metric: string;
  aggregation: 'sum' | 'max' | 'last';
  stripeAccount: string;
  priceId: string;
  subscriptionItemId?: string;
  currency?: string;
  active: boolean;
  shadow?: boolean;
};

export default function Mappings() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'shadow'>('all');

  useEffect(() => {
    const fetchMappings = async () => {
      const settings = loadSettings();
      const qs = new URLSearchParams({ tenantId: settings.defaultTenantId });
      const res = await fetch(`/v1/mappings?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('apiKey') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMappings(data);
      }
    };
    fetchMappings();
  }, []);

  const filtered = mappings.filter(m => {
    if (filter === 'active') return m.active && !m.shadow;
    if (filter === 'shadow') return !!m.shadow;
    return true;
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <GitBranch className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Price Mappings</h2>
            <p className="text-sm text-gray-500">Configure how metrics map to Stripe prices</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded-md text-sm px-2 py-1">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="shadow">Shadow</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 text-center text-gray-500">
            <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No price mappings</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new price mapping.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          <ul role="list" className="divide-y divide-gray-200">
            {filtered.map((m) => (
              <li key={m.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{m.metric}</span>
                    {m.shadow ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Shadow</span>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-500">{m.aggregation} • {m.priceId} • {m.subscriptionItemId || 'no si'}</div>
                </div>
                <div className="text-sm text-gray-500">{m.active ? 'Active' : 'Inactive'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
