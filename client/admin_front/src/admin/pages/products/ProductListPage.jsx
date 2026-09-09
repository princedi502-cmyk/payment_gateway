import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FilterPanel from '../../components/ui/FilterPanel';
import SearchInput from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getProducts({ page, limit: pagination.limit, search });
      setProducts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    fetchProducts(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteProduct(deleteId);
      addToast('Product deleted successfully', 'success');
      fetchProducts(pagination.page);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const columns = [
    { key: 'title', header: 'Product', sortable: true },
    { key: 'sku', header: 'SKU' },
    { key: 'price', header: 'Price', render: (val) => `$${val?.toFixed(2)}` },
    { key: 'stock', header: 'Stock' },
    {
      key: 'isActive',
      header: 'Status',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/products/${row._id}/edit`); }}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <Edit className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row._id); }}
            className="p-1.5 rounded hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <FilterPanel>
        <SearchInput value={search} onChange={handleSearch} placeholder="Search products..." />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={products}
        pagination={pagination}
        onPageChange={fetchProducts}
        onRowClick={(row) => navigate(`/admin/products/${row._id}`)}
        loading={loading}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
