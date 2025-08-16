import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Database,
  Clock,
  DollarSign
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { healthApi } from '../lib/api';
import { formatNumber, formatCurrency } from '../lib/utils';

const mockMetrics = {
  totalEvents: 1234567,
  activeCustomers: 89,
  monthlyRevenue: 45678.90,
  systemHealth: 99.9,
  eventsToday: 12456,
  reconciliationDiff: 0.02,
};

const mockChartData = [
  { time: '00:00', events: 1200, revenue: 340 },
  { time: '04:00', events: 800, revenue: 220 },
  { time: '08:00', events: 2400, revenue: 680 },
  { time: '12:00', events: 3200, revenue: 890 },
  { time: '16:00', events: 2800, revenue: 760 },
  { time: '20:00', events: 1900, revenue: 520 },
];

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">
              <TrendingUp className="inline h-4 w-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.getStatus().then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={formatNumber(mockMetrics.totalEvents)}
          icon={Database}
          trend="+12.5% from last month"
          color="blue"
        />
        <StatCard
          title="Active Customers"
          value={formatNumber(mockMetrics.activeCustomers)}
          icon={Users}
          trend="+5.2% from last month"
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(mockMetrics.monthlyRevenue)}
          icon={DollarSign}
          trend="+18.3% from last month"
          color="green"
        />
        <StatCard
          title="System Health"
          value={`${mockMetrics.systemHealth}%`}
          icon={Activity}
          color={mockMetrics.systemHealth > 99 ? 'green' : 'yellow'}
        />
      </div>

      {/* System Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        {healthLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                health.checks.database ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                health.checks.redis ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">Redis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                health.checks.stripe ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">Stripe</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                health.checks.workers ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">Workers</span>
            </div>
          </div>
        ) : (
          <div className="text-red-600 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to load system status
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="events" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { type: 'event', message: 'New events ingested for customer cus_ABC123', time: '2 minutes ago' },
            { type: 'reconciliation', message: 'Reconciliation completed for January 2025', time: '15 minutes ago' },
            { type: 'alert', message: 'Usage threshold alert triggered for customer cus_XYZ789', time: '1 hour ago' },
            { type: 'mapping', message: 'New price mapping created for api_calls metric', time: '2 hours ago' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 py-2">
              <div className="flex-shrink-0">
                {activity.type === 'event' && <Database className="h-5 w-5 text-blue-500" />}
                {activity.type === 'reconciliation' && <Activity className="h-5 w-5 text-green-500" />}
                {activity.type === 'alert' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                {activity.type === 'mapping' && <TrendingUp className="h-5 w-5 text-purple-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
