import type { MetadataRoute } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getServerSideURL()

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/cart`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/checkout`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/create-account`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/account`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/orders`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/downloads`, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const payload = await getPayload({ config: configPromise })
  const { docs: products } = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    limit: 500,
    select: { slug: true, updatedAt: true },
  })

  for (const p of products) {
    entries.push({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt || new Date()),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  return entries
}
