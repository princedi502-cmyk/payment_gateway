import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const { addToast } = useToast();

  const categories = ['general', 'email', 'payment', 'notification', 'return', 'security'];

  useEffect(() => {
    api.getSettings(activeCategory)
      .then((res) => setSettings(res.data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleValueChange = (key, value, type) => {
    setSettings((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        let parsedValue = value;
        if (type === 'number') parsedValue = parseFloat(value) || 0;
        if (type === 'boolean') parsedValue = value === 'true';
        if (type === 'json') {
          try { parsedValue = JSON.parse(value); } catch { return s; }
        }
        return { ...s, value: parsedValue };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings.map((s) => ({ key: s.key, value: s.value }));
      await api.updateSettings(updates);
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your store settings</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary-100 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {settings.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No settings found for this category</p>
        ) : (
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting._id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{setting.key}</label>
                  <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
                </div>
                <div className="md:col-span-2">
                  {setting.type === 'boolean' ? (
                    <select
                      value={String(setting.value)}
                      onChange={(e) => handleValueChange(setting.key, e.target.value, setting.type)}
                      className="input w-auto"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : setting.type === 'json' ? (
                    <textarea
                      value={typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : setting.value}
                      onChange={(e) => handleValueChange(setting.key, e.target.value, setting.type)}
                      className="input font-mono text-sm"
                      rows={4}
                    />
                  ) : (
                    <input
                      type={setting.type === 'number' ? 'number' : 'text'}
                      value={setting.value}
                      onChange={(e) => handleValueChange(setting.key, e.target.value, setting.type)}
                      className="input"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
