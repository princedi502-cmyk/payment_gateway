import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import OrdersChart from '../../components/charts/OrdersChart';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [revenue, orders] = await Promise.all([
        api.getAnalytics('revenue', { days: dateRange }),
        api.getAnalytics('orders', { days: dateRange }),
      ]);
      setRevenueData(revenue.data);
      setOrderData(orders.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading && !revenueData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Track your store performance</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input w-auto"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {revenueData?.totalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={`$${revenueData.totalStats.totalRevenue?.toFixed(2) || '0.00'}`}
            icon={DollarSign}
          />
          <StatCard
            title="Total Orders"
            value={revenueData.totalStats.totalOrders || 0}
            icon={ShoppingCart}
          />
          <StatCard
            title="Avg Order Value"
            value={`$${revenueData.totalStats.avgOrderValue?.toFixed(2) || '0.00'}`}
            icon={TrendingUp}
          />
          <StatCard
            title="Daily Orders"
            value={orderData?.dailyOrders?.length || 0}
            icon={Users}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={revenueData?.dailyRevenue || []}
          dateRange={`Last ${dateRange} days`}
        />
        <OrdersChart data={orderData?.dailyOrders || []} />
      </div>

      {revenueData?.topProducts && revenueData.topProducts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {revenueData.topProducts.map((product, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{product.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{product.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">${product.revenue?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
