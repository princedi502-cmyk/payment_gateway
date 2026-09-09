import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ArrowLeft, Shield, UserX, UserCheck } from 'lucide-react';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [newRole, setNewRole] = useState('');

  const fetchUser = async () => {
    try {
      const res = await api.getUser(id);
      setUser(res.data);
      setNewRole(res.data.role);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.getUserOrders(id);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchOrders();
  }, [id]);

  const handleRoleChange = async () => {
    try {
      await api.updateUserRole(id, newRole);
      addToast('User role updated', 'success');
      setShowRoleChange(false);
      fetchUser();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleStatusToggle = async () => {
    try {
      const isActive = !user.lockUntil || user.lockUntil < new Date();
      await api.updateUserStatus(id, !isActive);
      addToast(`User ${isActive ? 'suspended' : 'activated'}`, 'success');
      fetchUser();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12 text-slate-500">User not found</div>;
  }

  const isActive = !user.lockUntil || user.lockUntil < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <StatusBadge status={user.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">User Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-700">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Provider</dt>
                <dd className="mt-1 text-slate-700">{user.provider}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Verified</dt>
                <dd className="mt-1 text-slate-700">{user.isVerified ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Joined</dt>
                <dd className="mt-1 text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Order History</h3>
            {orders.length === 0 ? (
              <p className="text-slate-500 text-sm">No orders found</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${order.total?.toFixed(2)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowRoleChange(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Change Role
              </button>
              <button
                onClick={handleStatusToggle}
                className={`w-full flex items-center justify-center gap-2 ${isActive ? 'btn-danger' : 'btn-primary'}`}
              >
                {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                {isActive ? 'Suspend User' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showRoleChange}
        title="Change User Role"
        message={
          <div className="mt-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        }
        confirmText="Update Role"
        onConfirm={handleRoleChange}
        onCancel={() => setShowRoleChange(false)}
      />
    </div>
  );
}
