import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { ArrowLeft, Edit } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProduct(id)
      .then((res) => setProduct(res.data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-12 text-slate-500">Product not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/products')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{product.title}</h1>
        </div>
        <button
          onClick={() => navigate(`/admin/products/${id}/edit`)}
          className="btn-primary flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Product Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Description</dt>
                <dd className="mt-1 text-slate-700">{product.description}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Price</dt>
                  <dd className="mt-1 text-slate-700">${product.price?.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Stock</dt>
                  <dd className="mt-1 text-slate-700">{product.stock}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">SKU</dt>
                  <dd className="mt-1 text-slate-700">{product.sku || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Status</dt>
                  <dd className="mt-1"><StatusBadge status={product.isActive ? 'active' : 'inactive'} /></dd>
                </div>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <div className="card p-4">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
