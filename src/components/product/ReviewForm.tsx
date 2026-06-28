'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/Auth'
import Link from 'next/link'

export function ReviewForm({ productId }: { productId: string | number }) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${user?.name || 'User'} - ${'★'.repeat(Number(form.get('rating')))}`,
          content: form.get('content'),
          rating: Number(form.get('rating')),
          product: Number(productId),
          author: user?.name || user?.email || 'Anonymous',
          isApproved: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.errors?.[0]?.message || 'Failed to submit review')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="mb-8 p-4 border rounded-lg bg-muted/20 text-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Login
          </Link>
          {' '}to leave a review.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-muted/20">
      {submitted ? (
        <div className="text-center py-4">
          <p className="text-green-600 font-medium">Thank you for your review!</p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-sm text-primary hover:underline mt-2"
          >
            Write another review
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <textarea
            name="content"
            placeholder="Share your experience..."
            required
            rows={3}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-4">
            <select name="rating" defaultValue="5" className="rounded-lg border bg-background px-3 py-2 text-sm">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}
    </form>
  )
}
