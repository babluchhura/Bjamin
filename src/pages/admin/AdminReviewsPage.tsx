import { useEffect, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { AdminHeader, IconButton, TableShell } from './parts';
import { PageLoader, Stars, StatusBadge } from '../../components/ui';
import { api, type AdminReview } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useToast } from '../../lib/toast';

export default function AdminReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      setReviews(await api.admin.reviews());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load reviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (review: AdminReview, status: string) => {
    try {
      await api.admin.setReviewStatus(review.id, status);
      toast.push(`Review ${status}.`, 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not update review.', 'error');
    }
  };

  const remove = async (review: AdminReview) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.admin.deleteReview(review.id);
      toast.push('Review deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete review.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading reviews…" />;

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <div>
      <AdminHeader title="Reviews" subtitle="Only approved reviews appear on the website." />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['all', 'pending', 'approved', 'rejected'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
              filter === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-mist-200 bg-white text-ink-500'
            }`}
          >
            {key} ({key === 'all' ? reviews.length : reviews.filter((r) => r.status === key).length})
          </button>
        ))}
      </div>

      <TableShell head={['Author', 'Rating', 'Review', 'Route', 'Status', 'Actions']}>
        {filtered.map((review) => (
          <tr key={review.id}>
            <td className="px-4 py-2.5">
              <p className="font-semibold">{review.authorName}</p>
              <p className="text-[11px] text-ink-300">{formatDate(review.createdAt)}</p>
            </td>
            <td className="px-4 py-2.5"><Stars rating={review.rating} /></td>
            <td className="max-w-sm px-4 py-2.5 text-ink-600">{review.comment}</td>
            <td className="px-4 py-2.5 text-[11px] text-ink-500">{review.routeLabel || '—'}</td>
            <td className="px-4 py-2.5"><StatusBadge status={review.status} /></td>
            <td className="px-4 py-2.5">
              <div className="flex gap-1.5">
                {review.status !== 'approved' ? (
                  <IconButton label="Approve" tone="success" onClick={() => setStatus(review, 'approved')}>
                    <Check className="size-3.5" />
                  </IconButton>
                ) : null}
                {review.status !== 'rejected' ? (
                  <IconButton label="Reject" onClick={() => setStatus(review, 'rejected')}>
                    <X className="size-3.5" />
                  </IconButton>
                ) : null}
                <IconButton label="Delete" tone="danger" onClick={() => remove(review)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </td>
          </tr>
        ))}
        {filtered.length === 0 ? (
          <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-ink-500">No reviews in this view.</td></tr>
        ) : null}
      </TableShell>
    </div>
  );
}
