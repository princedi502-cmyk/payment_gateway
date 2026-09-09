import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function CategoryListPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', slug: '' });
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.getCategories();
      setCategories(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.updateCategory(editId, formData);
        addToast('Category updated', 'success');
      } else {
        await api.createCategory(formData);
        addToast('Category created', 'success');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', description: '', slug: '' });
      fetchCategories();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleEdit = (category) => {
    setEditId(category._id);
    setFormData({ name: category.name, description: category.description || '', slug: category.slug || '' });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteCategory(deleteId);
      addToast('Category deleted', 'success');
      fetchCategories();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'slug', header: 'Slug' },
    { key: 'description', header: 'Description' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(row)} className="p-1.5 rounded hover:bg-slate-100">
            <Edit className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => setDeleteId(row._id)} className="p-1.5 rounded hover:bg-red-50">
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
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 mt-1">Organize your products into categories</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setFormData({ name: '', description: '', slug: '' }); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">{editId ? 'Edit Category' : 'New Category'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
                <input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable columns={columns} data={categories} loading={loading} />

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
