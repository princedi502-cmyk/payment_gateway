import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FilterPanel from '../../components/ui/FilterPanel';

export default function ReturnListPage() {
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchReturns = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      const res = await api.getReturns(params);
      setReturns(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const columns = [
    { key: 'orderId', header: 'Order', render: (val) => val?.orderNumber || '-' },
    {
      key: 'userId',
      header: 'Customer',
      render: (val) => val?.name || val?.email || '-',
    },
    { key: 'reason', header: 'Reason' },
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
        <h1 className="text-2xl font-bold text-slate-900">Returns</h1>
        <p className="text-slate-500 mt-1">Manage return requests</p>
      </div>

      <FilterPanel>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Status</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="return_initiated">Return Initiated</option>
          <option value="returned">Returned</option>
          <option value="refunded">Refunded</option>
        </select>
        <button onClick={() => fetchReturns(1)} className="btn-primary">
          Apply Filters
        </button>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={returns}
        pagination={pagination}
        onPageChange={fetchReturns}
        onRowClick={(row) => navigate(`/admin/returns/${row._id}`)}
        loading={loading}
      />
    </div>
  );
}
