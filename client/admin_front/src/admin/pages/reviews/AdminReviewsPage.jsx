import { useState, useEffect } from 'react';
import { Star, Check, X, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import api, { getUploadUrl } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import FilterPanel from '../../components/ui/FilterPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function getStarElement(star, rating, size = "w-4 h-4", filledClass = "fill-amber-400 text-amber-400", emptyClass = "fill-slate-200 text-slate-200") {
  const isFull = star <= rating
  const isHalf = star === Math.ceil(rating) && rating % 1 === 0.5

  if (isFull) {
    return <Star key={star} className={`${size} ${filledClass}`} />
  }
  if (isHalf) {
    return (
      <div key={star} className={`relative ${size}`}>
        <Star className={`${size} ${emptyClass}`} />
        <Star
          className={`absolute inset-0 ${size} ${filledClass}`}
          style={{ clipPath: 'inset(0 50% 0 0)' }}
        />
      </div>
    )
  }
  return <Star key={star} className={`${size} ${emptyClass}`} />
}

const noImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"%3E%3Crect width="160" height="120" fill="%23e2e8f0"/%3E%3Cpath d="M35 87l25-28 18 18 14-15 33 25H35z" fill="%2394a3b8"/%3E%3Ccircle cx="57" cy="39" r="10" fill="%2394a3b8"/%3E%3C/svg%3E';

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedImages, setExpandedImages] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchReviews = async (page = 1, status = statusFilter) => {
    setLoading(true);
    try {
      let res;
      if (status === 'pending') {
        res = await api.getPendingReviews({ page, limit: pagination.limit });
      } else {
        res = await api.getAllReviews({ page, limit: pagination.limit, status });
      }
      setReviews(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showToast('Failed to fetch reviews', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getReviewStats();
      setStats({
        pending: res.data.pending,
        approved: res.data.approved,
        rejected: res.data.rejected,
        total: res.data.total,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReviews(1, statusFilter);
    fetchStats();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.approveReview(id);
      showToast('Review approved successfully', 'success');
      fetchReviews(pagination.page, statusFilter);
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to approve review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await api.rejectReview(id);
      showToast('Review rejected', 'success');
      fetchReviews(pagination.page, statusFilter);
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to reject review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }
    setActionLoading(id);
    try {
      await api.deleteReview(id);
      showToast('Review deleted successfully', 'success');
      fetchReviews(pagination.page, statusFilter);
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const columns = [
    {
      key: 'productId',
      header: 'Product',
      render: (val) => val?.title || '-',
    },
    {
      key: 'userId',
      header: 'Customer',
      render: (val) => (
        <div>
          <div className="font-medium">{val?.name || '-'}</div>
          <div className="text-xs text-slate-500">{val?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (val) => (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => getStarElement(star, val))}
        </div>
      ),
    },
    {
      key: 'comment',
      header: 'Review',
      render: (val) => (
        <div className="max-w-xs truncate" title={val}>
          {val || <span className="text-slate-400">No comment</span>}
        </div>
      ),
    },
    {
      key: 'images',
      header: 'Images',
      render: (val) =>
        val && val.length > 0 ? (
          <button
            onClick={() => setExpandedImages(val)}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ImageIcon className="w-4 h-4" />
            {val.length}
          </button>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row._id)}
                disabled={actionLoading === row._id}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(row._id)}
                disabled={actionLoading === row._id}
                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleDelete(row._id)}
            disabled={actionLoading === row._id}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
        <p className="text-slate-500 mt-1">Manage customer reviews</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {['pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setStatusFilter(tab);
              }}
              className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab !== 'pending' && (
        <FilterPanel>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setActiveTab(e.target.value);
            }}
            className="input w-auto"
          >
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
          <button onClick={() => fetchReviews(1, statusFilter)} className="btn-primary">
            Apply Filters
          </button>
        </FilterPanel>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={reviews}
          pagination={pagination}
          onPageChange={(page) => fetchReviews(page, statusFilter)}
          loading={loading}
          emptyMessage={`No ${statusFilter} reviews found`}
        />
      )}

      {expandedImages && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImages(null)}
        >
          <div className="flex gap-4 flex-wrap justify-center max-w-4xl">
            {expandedImages.map((image, idx) => (
              <img
                key={idx}
                src={getUploadUrl(image)}
                alt={`Review image ${idx + 1}`}
                className="max-w-xs max-h-80 object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = noImage;
                }}
              />
            ))}
          </div>
          <button
            onClick={() => setExpandedImages(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
