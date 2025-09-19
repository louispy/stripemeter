
import { FileText, Play, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { reconciliationApi } from '../lib/api';

export default function Reconciliation() {
  const [tenantId, setTenantId] = useState('');
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<{ perMetric: Array<{ metric: string; local: number; stripe: number; drift_abs: number; drift_pct: number; items: number }>; overall: { local: number; stripe: number; drift_abs: number; drift_pct: number; items: number } } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const s = await api.get('/v1/reconciliation/summary', { params: { tenantId, periodStart: period, periodEnd: period } });
      setSummary(s.data);
      const r = await reconciliationApi.getReport(period, tenantId);
      setReports(r.data.reports || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, period]);

  async function runRecon() {
    if (!tenantId) return;
    await reconciliationApi.runReconciliation(tenantId);
    setTimeout(fetchData, 1500);
  }

  async function downloadCsvSummary() {
    if (!tenantId) return;
    const res = await api.get('/v1/reconciliation/summary', { params: { tenantId, periodStart: period, periodEnd: period, format: 'csv' }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_summary_${tenantId}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  async function downloadCsvDetailed() {
    if (!tenantId) return;
    const res = await api.get(`/v1/reconciliation/${period}`, { params: { tenantId, format: 'csv' }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_${tenantId}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reconciliation</h2>
            <p className="text-sm text-gray-500">Compare local usage with Stripe reports</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={runRecon} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-2" />
            Run Reconciliation
          </button>
          <button onClick={downloadCsvSummary} className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" /> CSV Summary
          </button>
          <button onClick={downloadCsvDetailed} className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" /> CSV Detailed
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
            <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Period (YYYY-MM)</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-gray-900">{summary ? ((1 - (summary.overall.drift_pct || 0)) * 100).toFixed(1) + '%' : '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Investigating</p>
              <p className="text-2xl font-bold text-gray-900">{summary ? summary.perMetric.filter(m => m.drift_abs > 0).length : '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Max Diff</p>
              <p className="text-2xl font-bold text-gray-900">{summary ? (summary.overall.drift_pct * 100).toFixed(2) + '%' : '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reconciliation Reports</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports available</h3>
            <p className="mt-1 text-sm text-gray-500">Run reconciliation to generate reports.</p>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drift Abs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drift %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((r) => {
                  const driftAbs = Math.abs(r.localTotal - r.stripeTotal);
                  const driftPct = r.stripeTotal > 0 ? driftAbs / r.stripeTotal : driftAbs > 0 ? 1 : 0;
                  return (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.subscriptionItemId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.localTotal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.stripeTotal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driftAbs}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(driftPct * 100).toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
