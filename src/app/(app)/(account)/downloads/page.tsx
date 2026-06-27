import type { Metadata } from 'next'
import { headers as getHeaders } from 'next/headers.js'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Downloads',
}

export default async function MyDownloadsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) notFound()

  // Get all completed orders for user
  let orders: any[] = []
  try {
    const result = await payload.find({
      collection: 'orders',
      overrideAccess: true,
      depth: 0,
      limit: 100,
    })
    orders = result.docs.filter(
      (o: any) => {
        const custId = typeof o.customer === 'object' ? o.customer?.id : o.customer
        return custId === user.id && o.status === 'completed'
      }
    )
  } catch {
    // empty
  }

  const productIds = orders.flatMap((order) =>
    (order.items || [])
      .map((item: any) => (typeof item.product === 'object' ? item.product.id : item.product))
      .filter(Boolean),
  )

  let assets: any[] = []
  if (productIds.length > 0) {
    try {
      const result = await payload.find({
        collection: 'digital-assets',
        limit: 100,
      })
      assets = result.docs.filter((a: any) => {
        const pid = typeof a.product === 'object' ? a.product.id : a.product
        return productIds.includes(pid)
      })
    } catch {
      // empty
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Downloads</h1>
        <p className="text-muted-foreground mt-1">All your purchased digital assets</p>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No downloads yet.</p>
          <Link href="/" className="text-primary hover:underline mt-2 inline-block">
            Browse products →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset: any) => {
            const expired = asset.expiresAt && new Date(asset.expiresAt) < new Date()
            const exhausted = asset.downloadCount >= asset.maxDownloads
            const product = typeof asset.product === 'object' ? asset.product : null

            return (
              <div key={asset.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {product?.title || asset.filename}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {asset.filename} · {(asset.fileSize / 1024).toFixed(0)} KB
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (asset.downloadCount / asset.maxDownloads) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {asset.downloadCount}/{asset.maxDownloads}
                    </span>
                    {asset.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        · Expires {new Date(asset.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {expired || exhausted ? (
                  <span className="text-xs text-muted-foreground px-3 py-1.5 bg-muted rounded-lg ml-4">
                    {expired ? 'Expired' : 'Limit reached'}
                  </span>
                ) : (
                  <Button asChild size="sm" variant="outline" className="ml-4">
                    <a href={`/api/downloads/${asset.id}`} download>
                      <DownloadIcon className="w-4 h-4 mr-1" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
