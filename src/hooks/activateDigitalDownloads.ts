import type { CollectionAfterChangeHook } from 'payload'
import type { Order } from '@/payload-types'
import { addDays } from 'date-fns'

export const activateDigitalDownloads: CollectionAfterChangeHook<Order> = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const isCompleted =
    doc.status === 'completed' &&
    (operation === 'create' || previousDoc?.status !== 'completed')

  if (!isCompleted) return

  const { payload } = req

  const productIds = (doc.items || [])
    .map((item: any) => {
      if (typeof item.product === 'object') return item.product.id
      return item.product
    })
    .filter(Boolean)

  if (!productIds.length) return

  // Fetch all digital assets and filter in memory
  const { docs: allAssets } = await payload.find({
    collection: 'digital-assets',
    limit: 500,
  })

  const assets = allAssets.filter((a: any) => {
    const pid = typeof a.product === 'object' ? a.product.id : a.product
    return productIds.includes(pid)
  })

  for (const asset of assets) {
    await payload.update({
      collection: 'digital-assets',
      id: asset.id,
      data: {
        expiresAt: addDays(new Date(), 7).toISOString(),
      },
    })
  }

  if (assets.length > 0) {
    payload.logger.info(`Activated ${assets.length} digital downloads for order ${doc.id}`)
  }
}
