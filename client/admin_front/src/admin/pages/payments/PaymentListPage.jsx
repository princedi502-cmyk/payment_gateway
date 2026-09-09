import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FilterPanel from '../../components/ui/FilterPanel';

export default function PaymentListPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      const res = await api.getPayments(params);
      setPayments(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const columns = [
    { key: 'orderNumber', header: 'Order', sortable: true },
    {
      key: 'userId',
      header: 'Customer',
      render: (val) => val?.name || val?.email || 'Guest',
    },
    { key: 'total', header: 'Amount', render: (val) => `$${val?.toFixed(2)}` },
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500 mt-1">View all payment transactions</p>
      </div>

      <FilterPanel>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button onClick={() => fetchPayments(1)} className="btn-primary">
          Apply Filters
        </button>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={payments}
        pagination={pagination}
        onPageChange={fetchPayments}
        onRowClick={(row) => navigate(`/admin/payments/${row._id}`)}
        loading={loading}
      />
    </div>
  );
}
