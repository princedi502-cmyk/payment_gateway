import { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';
import RevenueChart from '../components/charts/RevenueChart';
import StatusBadge from '../components/ui/StatusBadge';
import { DollarSign, ShoppingCart, Users, AlertCircle, Package, TrendingUp, TrendingDown, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesChart, setSalesChart] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, chartRes, alertsRes] = await Promise.all([
          api.getStats(),
          api.getRecentOrders(),
          api.getSalesChart({ days: 30 }),
          api.getAlerts(),
        ]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data);
        setSalesChart(chartRes.data);
        setAlerts(alertsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold mb-1">Welcome back, Admin!</h1>
          <p className="text-white/80">Here's what's happening with your store today.</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+12%</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">${stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-success" />
            </div>
            <div className="flex items-center gap-1 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+8%</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex items-center gap-1 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+24%</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex items-center gap-1 text-danger text-sm font-medium">
              <TrendingDown className="w-4 h-4" />
              <span>-2%</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Active Products</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalProducts || 0}</p>
        </div>
      </div>

      {/* Charts & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <RevenueChart data={salesChart} dateRange="Last 30 days" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Recent Orders</h3>
              <p className="text-sm text-slate-500">Latest customer purchases</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-6">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500">
                          {order.userId?.name || order.shippingAddress?.fullName || 'Guest'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        ${order.total?.toFixed(2)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
