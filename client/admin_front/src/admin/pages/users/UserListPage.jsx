import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FilterPanel from '../../components/ui/FilterPanel';
import SearchInput from '../../components/ui/SearchInput';
import { Download } from 'lucide-react';

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.getUsers(params);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.exportUsers({ role: roleFilter });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'isVerified',
      header: 'Verified',
      render: (val) => (val ? 'Yes' : 'No'),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Manage your platform users</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <FilterPanel>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={() => fetchUsers(1)} className="btn-primary">
          Apply Filters
        </button>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        onPageChange={fetchUsers}
        onRowClick={(row) => navigate(`/admin/users/${row._id}`)}
        loading={loading}
      />
    </div>
  );
}
