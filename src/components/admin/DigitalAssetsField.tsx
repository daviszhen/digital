'use client'

import React, { useEffect, useState } from 'react'

type Asset = {
  id: string
  filename: string
  fileSize: number
  mimeType: string
  downloadCount: number
  maxDownloads: number
  expiresAt: string | null
}

const DigitalAssetsField = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState<string | null>(null)

  useEffect(() => {
    const id = window.location.pathname.split('/').pop()
    if (id && id !== 'create') {
      setProductId(id)
      fetch(`/api/digital-assets?limit=200`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          const docs = data.docs || []
          setAssets(
            docs.filter((a: any) => {
              const pid = typeof a.product === 'object' ? a.product.id : a.product
              return String(pid) === String(id)
            }),
          )
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleDelete = async (assetId: string) => {
    if (!confirm('Delete this file?')) return
    try {
      await fetch(`/api/digital-assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setAssets((prev) => prev.filter((a) => a.id !== assetId))
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || 'Unknown error'))
    }
  }

  if (!productId) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium">Digital Files</h3>
        <p className="text-sm text-muted-foreground">Save the product first to manage digital files.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Digital Files
          {!loading && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({assets.length} file{assets.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <a
          href="/admin/collections/digital-assets/create"
          className="text-sm text-primary hover:underline"
          target="_blank"
        >
          + Add File
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files linked.{' '}
          <a
            href="/admin/collections/digital-assets/create"
            className="text-primary underline"
            target="_blank"
          >
            Create a digital asset
          </a>{' '}
          and link it to this product.
        </p>
      ) : (
        <div className="border rounded-md divide-y">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{asset.filename}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {(asset.fileSize / 1024).toFixed(0)} KB · {asset.mimeType} ·{' '}
                  {asset.downloadCount}/{asset.maxDownloads} downloads
                  {asset.expiresAt
                    ? ` · Expires ${new Date(asset.expiresAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(asset.id)}
                className="text-red-600 hover:text-red-800 text-xs ml-4 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DigitalAssetsField
