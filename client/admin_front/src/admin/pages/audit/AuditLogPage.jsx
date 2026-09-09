import { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import FilterPanel from '../../components/ui/FilterPanel';
import { Download } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (entityFilter) params.entityType = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const res = await api.getAuditLogs(params);
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.exportAuditLogs({ entityType: entityFilter, action: actionFilter });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      key: 'adminId',
      header: 'Admin',
      render: (val) => val?.name || val?.email || '-',
    },
    { key: 'action', header: 'Action' },
    { key: 'entityType', header: 'Entity Type' },
    { key: 'entityId', header: 'Entity ID' },
    { key: 'ipAddress', header: 'IP Address' },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Track all admin actions</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <FilterPanel>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Entities</option>
          <option value="order">Order</option>
          <option value="product">Product</option>
          <option value="user">User</option>
          <option value="return">Return</option>
          <option value="payment">Payment</option>
          <option value="setting">Setting</option>
        </select>
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action..."
          className="input w-auto"
        />
        <button onClick={() => fetchLogs(1)} className="btn-primary">
          Apply Filters
        </button>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={logs}
        pagination={pagination}
        onPageChange={fetchLogs}
        loading={loading}
      />
    </div>
  );
}
