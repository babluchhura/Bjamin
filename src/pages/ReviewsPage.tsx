import React, { useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { useEstate } from '../context/EstateContext';
import { api } from '../lib/api';

export const ReviewsPage: React.FC = () => {
  const { reviews, refreshData } = useEstate();
  const [customerName, setCustomerName] = useState('');
  const [customerRole, setCustomerRole] = useState('');
  const [plotPurchased, setPlotPurchased] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (customerName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Please share at least 10 characters in your review.');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitReview({
        customerName: customerName.trim(),
        customerRole: customerRole.trim() || 'Plot Owner',
        plotPurchased: plotPurchased.trim() || undefined,
        rating,
        comment: comment.trim(),
      });
      await refreshData();
      setSuccess(true);
      setCustomerName('');
      setCustomerRole('');
      setPlotPurchased('');
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#9E7822] mb-1">Client Stories</p>
        <h1 className="font-display text-4xl font-semibold text-[#0B281F]">
          Customer Reviews
        </h1>
        <p className="text-sm text-[#4B635A] mt-2 max-w-2xl">
          Verified feedback from families, architects, and land investors who have purchased
          residential plots across our communities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-5">
          {reviews.map((rev) => (
            <article
              key={rev.id}
              className="bg-white border border-[#E2E8E5] rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1" aria-label={`${rev.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${
                        idx < rev.rating
                          ? 'fill-[#D1AA48] text-[#D1AA48]'
                          : 'text-[#D4DDD8]'
                      }`}
                    />
                  ))}
                </div>
                {rev.plotPurchased && (
                  <span className="text-xs font-mono text-[#5B7269]">
                    Parcel {rev.plotPurchased}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base text-[#10241D] leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>

              <div className="pt-3 border-t border-[#E2E8E5]">
                <div className="font-semibold text-sm text-[#0B281F]">{rev.customerName}</div>
                <div className="text-xs text-[#5B7269]">{rev.customerRole}</div>
              </div>
            </article>
          ))}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg p-6 space-y-4"
            noValidate
          >
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
                Share Your Experience
              </h2>
              <p className="text-xs text-[#4B635A] mt-1">
                Recently toured an enclave or completed your registration? Leave a review.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="px-3.5 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-[#0B281F] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Thank you! Your review has been published.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#3D524A] mb-1">
                  Role / Location
                </label>
                <input
                  type="text"
                  value={customerRole}
                  onChange={(e) => setCustomerRole(e.target.value)}
                  placeholder="Homeowner, North Valley"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D524A] mb-1">
                  Plot ID (Optional)
                </label>
                <input
                  type="text"
                  value={plotPurchased}
                  onChange={(e) => setPlotPurchased(e.target.value)}
                  placeholder="EC-101"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              >
                <option value={5}>5 Stars — Excellent</option>
                <option value={4}>4 Stars — Very Good</option>
                <option value={3}>3 Stars — Good</option>
                <option value={2}>2 Stars — Fair</option>
                <option value={1}>1 Star — Needs Improvement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1">
                Your Review *
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe your site tour, documentation process, or neighborhood impressions..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
