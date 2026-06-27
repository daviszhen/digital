import type { Endpoint } from 'payload'
import { readFile } from 'fs/promises'
import path from 'path'

async function getFileBuffer(mediaFile: any, payload: any): Promise<Buffer | null> {
  const filename = mediaFile.filename
  if (filename) {
    // Try exact filename
    const paths = [
      path.resolve(process.cwd(), 'public', 'media', filename),
      path.resolve(process.cwd(), '..', 'public', 'media', filename),
    ]
    for (const p of paths) {
      try { return await readFile(p) } catch { /* continue */ }
    }

    // Try removing -N suffix (Payload appends this on duplicate uploads)
    const noSuffix = filename.replace(/-(\d+)(\.\w+)$/, '$2')
    if (noSuffix !== filename) {
      const altPaths = [
        path.resolve(process.cwd(), 'public', 'media', noSuffix),
        path.resolve(process.cwd(), '..', 'public', 'media', noSuffix),
      ]
      for (const p of altPaths) {
        try { return await readFile(p) } catch { /* continue */ }
      }
    }
  }

  return null
}

export const downloadEndpoint: Endpoint = {
  path: '/downloads/:assetId',
  method: 'get',
  handler: async (req) => {
    try {
      const routeParams = (req as any).routeParams || {}
      const assetId = (routeParams.assetId || routeParams.asset_id || '') as string
      const user = req.user

      if (!user || !assetId) {
        return new Response('Unauthorized', { status: 401 })
      }

      const { payload } = req

      let asset
      try {
        asset = await payload.findByID({
          collection: 'digital-assets',
          id: assetId,
        })
      } catch {
        return new Response('Asset not found', { status: 404 })
      }

      if ((asset.downloadCount || 0) >= (asset.maxDownloads || 5)) {
        return new Response(
          JSON.stringify({ error: 'Download limit reached' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (asset.expiresAt && new Date(asset.expiresAt) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Download link expired' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const productId = typeof asset.product === 'object' ? asset.product.id : asset.product

      const { docs: orders } = await payload.find({
        collection: 'orders',
        depth: 0,
        where: {
          and: [
            { customer: { equals: user.id } },
            { status: { equals: 'completed' } },
          ],
        },
      })

      const owned = orders.some((order) =>
        order.items?.some((item: any) => {
          const pid = typeof item.product === 'object' ? item.product.id : item.product
          return String(pid) === String(productId)
        })
      )

      if (!owned) {
        return new Response(
          JSON.stringify({ error: 'Purchase required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      let mediaFile: any = null
      if (typeof asset.file === 'object' && asset.file !== null) {
        mediaFile = asset.file
      } else if (asset.file) {
        try {
          mediaFile = await payload.findByID({
            collection: 'media',
            id: asset.file,
          })
        } catch {
          return new Response('File not found', { status: 404 })
        }
      }

      if (!mediaFile?.filename) {
        return new Response('No file attached', { status: 404 })
      }

      // Increment download count
      await payload.update({
        collection: 'digital-assets',
        id: assetId,
        data: { downloadCount: (asset.downloadCount || 0) + 1 },
      })

      const fileBuffer = await getFileBuffer(mediaFile, payload)
      if (!fileBuffer) {
        return new Response('File content not available', { status: 404 })
      }

      const mimeType = mediaFile.mimeType || asset.mimeType || 'application/octet-stream'
      const downloadFilename = asset.filename || mediaFile.filename || 'download'
      const asciiFilename = downloadFilename.replace(/[^\x00-\x7F]/g, '_')
      const encodedFilename = encodeURIComponent(downloadFilename)

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
          'Content-Length': String(fileBuffer.length),
          'Cache-Control': 'no-cache',
        },
      })
    } catch (err: any) {
      req.payload.logger.error(`Download error: ${err.message}`)
      return new Response('Internal error', { status: 500 })
    }
  },
}
