import { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function TemplateListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    subject: '',
    content: '',
    variables: '',
  });
  const { addToast } = useToast();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificationTemplates();
      setTemplates(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        variables: formData.variables ? formData.variables.split(',').map((v) => v.trim()) : [],
      };
      if (editId) {
        await api.updateNotificationTemplate(editId, payload);
        addToast('Template updated', 'success');
      } else {
        await api.createNotificationTemplate(payload);
        addToast('Template created', 'success');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', type: 'email', subject: '', content: '', variables: '' });
      fetchTemplates();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleEdit = (template) => {
    setEditId(template._id);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables?.join(', ') || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotificationTemplate(id);
      addToast('Template deleted', 'success');
      fetchTemplates();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type' },
    { key: 'subject', header: 'Subject' },
    {
      key: 'isActive',
      header: 'Status',
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(row)} className="p-1.5 rounded hover:bg-slate-100">
            <Edit className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => handleDelete(row._id)} className="p-1.5 rounded hover:bg-red-50">
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
          <h1 className="text-2xl font-bold text-slate-900">Notification Templates</h1>
          <p className="text-slate-500 mt-1">Manage email and push notification templates</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setFormData({ name: '', type: 'email', subject: '', content: '', variables: '' }); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">{editId ? 'Edit Template' : 'New Template'}</h3>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                >
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                </select>
              </div>
            </div>
            {formData.type === 'email' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="input"
                rows={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Variables (comma-separated)</label>
              <input
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                className="input"
                placeholder="orderNumber, customerName, total"
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

      <DataTable columns={columns} data={templates} loading={loading} />
    </div>
  );
}
