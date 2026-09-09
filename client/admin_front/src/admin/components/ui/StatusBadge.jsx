export default function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
    canceled: 'bg-slate-100 text-slate-800',
    requested: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    return_initiated: 'bg-orange-100 text-orange-800',
    returned: 'bg-teal-100 text-teal-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-slate-100 text-slate-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
