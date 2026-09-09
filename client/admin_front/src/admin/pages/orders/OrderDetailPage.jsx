import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ArrowLeft, XCircle, MessageSquare } from 'lucide-react';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await api.getOrder(id);
      setOrder(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusUpdate = async (status) => {
    try {
      await api.updateOrderStatus(id, status);
      addToast(`Order status updated to ${status}`, 'success');
      fetchOrder();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelOrder(id);
      addToast('Order canceled', 'success');
      setShowCancel(false);
      fetchOrder();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddNote = async () => {
    try {
      await api.addOrderNote(id, note);
      addToast('Note added', 'success');
      setShowNote(false);
      setNote('');
      fetchOrder();
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

  if (!order) {
    return <div className="text-center py-12 text-slate-500">Order not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/orders')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                  <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{item.title}</p>
                    <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Status History</h3>
            </div>
            <div className="space-y-3">
              {order.statusHistory?.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{entry.status}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.changedAt).toLocaleString()}
                      {entry.note && ` - ${entry.note}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Subtotal</dt>
                <dd className="text-sm font-medium">${order.subtotal?.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Tax</dt>
                <dd className="text-sm font-medium">${order.tax?.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200">
                <dt className="font-semibold text-slate-800">Total</dt>
                <dd className="font-bold text-slate-900">${order.total?.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Shipping Address</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.address}</p>
              <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
              <p>{order.shippingAddress?.email}</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              {order.status === 'pending' && (
                <button onClick={() => handleStatusUpdate('paid')} className="btn-primary w-full">
                  Mark as Paid
                </button>
              )}
              {order.status === 'paid' && (
                <button onClick={() => handleStatusUpdate('refunded')} className="btn-secondary w-full">
                  Process Refund
                </button>
              )}
              {!['canceled', 'refunded'].includes(order.status) && (
                <button onClick={() => setShowCancel(true)} className="btn-danger w-full flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Cancel Order
                </button>
              )}
              <button onClick={() => setShowNote(true)} className="btn-secondary w-full flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Add Note
              </button>
            </div>
          </div>

          {order.adminNotes && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Admin Notes</h3>
              <p className="text-sm text-slate-600">{order.adminNotes}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancel}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        danger
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
      />

      <ConfirmDialog
        isOpen={showNote}
        title="Add Note"
        message={
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input w-full mt-2"
            rows={4}
            placeholder="Enter note..."
          />
        }
        confirmText="Save Note"
        onConfirm={handleAddNote}
        onCancel={() => setShowNote(false)}
      />
    </div>
  );
}
