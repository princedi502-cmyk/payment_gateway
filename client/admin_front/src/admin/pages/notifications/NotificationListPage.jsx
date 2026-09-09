import { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Send } from 'lucide-react';

export default function NotificationListPage() {
  const [formData, setFormData] = useState({
    userIds: '',
    templateId: '',
    customMessage: '',
  });
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.sendNotification({
        userIds: formData.userIds.split(',').map((id) => id.trim()),
        templateId: formData.templateId,
        customMessage: formData.customMessage,
      });
      addToast('Notification sent', 'success');
      setFormData({ userIds: '', templateId: '', customMessage: '' });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Send Notification</h1>
        <p className="text-slate-500 mt-1">Send manual notifications to users</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">User IDs (comma-separated)</label>
            <input
              value={formData.userIds}
              onChange={(e) => setFormData({ ...formData, userIds: e.target.value })}
              className="input"
              placeholder="user1, user2, user3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template ID (optional)</label>
            <input
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className="input"
              placeholder="template_id"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Message</label>
            <textarea
              value={formData.customMessage}
              onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
              className="input"
              rows={4}
              placeholder="Enter your message..."
            />
          </div>
          <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>
    </div>
  );
}
