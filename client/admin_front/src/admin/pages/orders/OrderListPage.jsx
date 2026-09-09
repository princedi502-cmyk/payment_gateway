import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FilterPanel from '../../components/ui/FilterPanel';
import SearchInput from '../../components/ui/SearchInput';
import { Download } from 'lucide-react';

export default function OrderListPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.getOrders(params);
      setOrders(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.exportOrders({ status: statusFilter });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { key: 'orderNumber', header: 'Order', sortable: true },
    {
      key: 'userId',
      header: 'Customer',
      render: (val) => val?.name || val?.email || 'Guest',
    },
    { key: 'total', header: 'Total', render: (val) => `$${val?.toFixed(2)}` },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Manage and track all orders</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <FilterPanel>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="canceled">Canceled</option>
        </select>
        <button onClick={() => fetchOrders(1)} className="btn-primary">
          Apply Filters
        </button>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={orders}
        pagination={pagination}
        onPageChange={fetchOrders}
        onRowClick={(row) => navigate(`/admin/orders/${row._id}`)}
        loading={loading}
      />
    </div>
  );
}
