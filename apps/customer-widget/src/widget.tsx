import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  AlertCircle, 
  DollarSign, 
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface WidgetProps {
  apiUrl: string;
  tenantId: string;
  customerId: string;
  apiKey?: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

interface UsageData {
  customerRef: string;
  period: {
    start: string;
    end: string;
  };
  metrics: Array<{
    name: string;
    current: number;
    limit?: number;
    unit: string;
  }>;
  projection: {
    subtotal: number;
    total: number;
    currency: string;
    freshness: {
      lastUpdate: string;
      staleness: number;
    };
  };
  alerts: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
}

const mockData: UsageData = {
  customerRef: 'cus_ABC123',
  period: {
    start: '2025-01-01',
    end: '2025-01-31',
  },
  metrics: [
    { name: 'API Calls', current: 12500, limit: 50000, unit: 'calls' },
    { name: 'Storage', current: 2.3, limit: 10, unit: 'GB' },
    { name: 'Bandwidth', current: 45.7, limit: 100, unit: 'GB' },
  ],
  projection: {
    subtotal: 234.50,
    total: 234.50,
    currency: 'USD',
    freshness: {
      lastUpdate: new Date().toISOString(),
      staleness: 45,
    },
  },
  alerts: [
    {
      type: 'threshold',
      message: 'API usage is approaching 75% of your monthly limit',
      severity: 'warning',
    },
  ],
};

function UsageWidget({ 
  tenantId, 
  customerId, 
  theme = 'light',
  compact = false 
}: WidgetProps) {
  const [data, setData] = useState<UsageData>(mockData);

  // In a real implementation, this would fetch from the API
  const { data: usage, isLoading, error } = useQuery({
    queryKey: ['usage', tenantId, customerId],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockData;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    if (usage) {
      setData(usage);
    }
  }, [usage]);

  const chartData = data.metrics.map(metric => ({
    name: metric.name,
    current: metric.current,
    limit: metric.limit || metric.current * 1.5,
    percentage: metric.limit ? (metric.current / metric.limit) * 100 : 0,
  }));

  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-gray-900 border-gray-200';

  if (isLoading) {
    return (
      <div className={`p-6 rounded-lg border ${themeClasses} animate-pulse`}>
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg border ${themeClasses}`}>
        <div className="flex items-center text-red-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Failed to load usage data</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg border ${themeClasses} max-w-md mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Usage & Billing</h3>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="h-3 w-3 mr-1" />
          <span>{data.projection.freshness.staleness}s ago</span>
        </div>
      </div>

      {/* Current Bill */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Current Period</span>
          <span className="text-xs text-gray-500">
            {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-6 w-6 text-green-500" />
          <span className="text-2xl font-bold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: data.projection.currency,
            }).format(data.projection.total)}
          </span>
          <span className="text-sm text-gray-500">projected</span>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-6">
          {data.alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-3 rounded-md border-l-4 ${
                alert.severity === 'critical' 
                  ? 'bg-red-50 border-red-400 text-red-700'
                  : alert.severity === 'warning'
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                  : 'bg-blue-50 border-blue-400 text-blue-700'
              }`}
            >
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage Metrics */}
      {!compact && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Breakdown</h4>
          <div className="space-y-3">
            {data.metrics.map((metric, index) => {
              const percentage = metric.limit ? (metric.current / metric.limit) * 100 : 0;
              const isNearLimit = percentage > 75;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{metric.name}</span>
                    <span className="text-gray-500">
                      {metric.current.toLocaleString()} {metric.unit}
                      {metric.limit && ` / ${metric.limit.toLocaleString()}`}
                    </span>
                  </div>
                  {metric.limit && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isNearLimit ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Usage Chart */}
      {!compact && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Overview</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()}`,
                    name === 'current' ? 'Current' : 'Limit'
                  ]}
                />
                <Bar dataKey="current" fill="#3b82f6" radius={2} />
                <Bar dataKey="limit" fill="#e5e7eb" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
        <div className="flex items-center">
          <Shield className="h-3 w-3 mr-1" />
          <span>Powered by Stripemeter</span>
        </div>
        <div className="flex items-center">
          <Zap className="h-3 w-3 mr-1" />
          <span>Real-time</span>
        </div>
      </div>
    </div>
  );
}

// Widget initialization function
export function initStripemeterWidget(containerId: string, props: WidgetProps) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
      },
    },
  });

  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <UsageWidget {...props} />
    </QueryClientProvider>
  );

  return root;
}

// For development
if (typeof window !== 'undefined') {
  (window as any).StripemeterWidget = { initStripemeterWidget };
}

export default UsageWidget;
