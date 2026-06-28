'use client'

import { useEffect, useState } from 'react'

type Stats = {
  products: number
  orders: number
  downloads: number
  revenue: number
  reviews: number
  customers: number
}

export const BeforeDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products?depth=0&limit=1', { credentials: 'include' }),
      fetch('/api/orders?depth=0&limit=1', { credentials: 'include' }),
      fetch('/api/digital-assets?depth=0&limit=100', { credentials: 'include' }),
      fetch('/api/users?depth=0&limit=1', { credentials: 'include' }),
      fetch('/api/reviews?depth=0&limit=1', { credentials: 'include' }),
    ])
      .then((resps) => Promise.all(resps.map((r) => r.json())))
      .then(([products, orders, assets, users, reviews]) => {
        // Calculate total downloads from assets
        const totalDownloads = (assets.docs || []).reduce(
          (sum: number, a: any) => sum + (a.downloadCount || 0),
          0,
        )
        // Estimate revenue from orders
        const revenue = (orders.docs || []).reduce(
          (sum: number, o: any) => sum + (o.total || o.amount || 0),
          0,
        )

        setStats({
          products: products?.totalDocs || 0,
          orders: orders?.totalDocs || 0,
          downloads: totalDownloads,
          revenue,
          reviews: reviews?.totalDocs || 0,
          customers: users?.totalDocs || 0,
        })
      })
      .catch(console.error)
  }, [])

  const cards = [
    { label: 'Products', value: stats?.products ?? '-', color: 'blue' },
    { label: 'Orders', value: stats?.orders ?? '-', color: 'green' },
    { label: 'Downloads', value: stats?.downloads ?? '-', color: 'purple' },
    { label: 'Revenue', value: stats?.revenue ? `$${(stats.revenue / 100).toFixed(0)}` : '-', color: 'orange' },
    { label: 'Reviews', value: stats?.reviews ?? '-', color: 'pink' },
    { label: 'Customers', value: stats?.customers ?? '-', color: 'teal' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    pink: 'border-pink-200 bg-pink-50 text-pink-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
        Store Overview
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: '1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid',
            }}
            className={colorMap[card.color]}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.5rem' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
