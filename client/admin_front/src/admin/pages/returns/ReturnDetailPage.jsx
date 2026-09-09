import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ArrowLeft, CheckCircle, XCircle, Truck, Package, DollarSign } from 'lucide-react';

export default function ReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [returnDoc, setReturnDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  const fetchReturn = async () => {
    try {
      const res = await api.getReturn(id);
      setReturnDoc(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [id]);

  const handleApprove = async () => {
    try {
      await api.approveReturn(id);
      addToast('Return approved', 'success');
      fetchReturn();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReject = async () => {
    try {
      await api.rejectReturn(id, rejectNote);
      addToast('Return rejected', 'success');
      setShowReject(false);
      setRejectNote('');
      fetchReturn();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMarkInitiated = async () => {
    try {
      await api.markReturnInitiated(id);
      addToast('Return marked as initiated', 'success');
      fetchReturn();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMarkReceived = async () => {
    try {
      await api.markReturnReceived(id);
      addToast('Item marked as received', 'success');
      fetchReturn();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRefund = async () => {
    try {
      await api.processReturnRefund(id, refundAmount ? parseFloat(refundAmount) : undefined);
      addToast('Refund processed', 'success');
      setShowRefund(false);
      setRefundAmount('');
      fetchReturn();
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

  if (!returnDoc) {
    return <div className="text-center py-12 text-slate-500">Return not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/returns')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Return Request</h1>
            <p className="text-sm text-slate-500">
              Order: {returnDoc.orderId?.orderNumber}
            </p>
          </div>
        </div>
        <StatusBadge status={returnDoc.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Return Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Customer</dt>
                <dd className="mt-1 text-slate-700">{returnDoc.userId?.name}</dd>
                <dd className="text-sm text-slate-500">{returnDoc.userId?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Reason</dt>
                <dd className="mt-1 text-slate-700">{returnDoc.reason}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-slate-500">Description</dt>
                <dd className="mt-1 text-slate-700">{returnDoc.description || '-'}</dd>
              </div>
            </dl>
          </div>

          {returnDoc.image && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Evidence</h3>
              <img
                src={`/uploads/${returnDoc.image}`}
                alt="Return evidence"
                className="max-w-sm rounded-lg border border-slate-200"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              {returnDoc.status === 'requested' && (
                <>
                  <button onClick={handleApprove} className="btn-primary w-full flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button onClick={() => setShowReject(true)} className="btn-danger w-full flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
              {returnDoc.status === 'approved' && (
                <button onClick={handleMarkInitiated} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Truck className="w-4 h-4" />
                  Mark Initiated
                </button>
              )}
              {returnDoc.status === 'return_initiated' && (
                <button onClick={handleMarkReceived} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Package className="w-4 h-4" />
                  Mark Received
                </button>
              )}
              {returnDoc.status === 'returned' && (
                <button onClick={() => setShowRefund(true)} className="btn-primary w-full flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Process Refund
                </button>
              )}
            </div>
          </div>

          {returnDoc.adminNotes && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Admin Notes</h3>
              <p className="text-sm text-slate-600">{returnDoc.adminNotes}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showReject}
        title="Reject Return"
        message={
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            className="input w-full mt-2"
            rows={3}
            placeholder="Reason for rejection..."
          />
        }
        confirmText="Reject"
        danger
        onConfirm={handleReject}
        onCancel={() => setShowReject(false)}
      />

      <ConfirmDialog
        isOpen={showRefund}
        title="Process Refund"
        message={
          <div className="mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (leave empty for full refund)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="input"
              placeholder={`Full: $${returnDoc.orderId?.total?.toFixed(2)}`}
            />
          </div>
        }
        confirmText="Process Refund"
        onConfirm={handleRefund}
        onCancel={() => setShowRefund(false)}
      />
    </div>
  );
}
