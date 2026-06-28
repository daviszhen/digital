/* eslint-disable no-restricted-exports */
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'

export default function robots() {
  const baseUrl = getServerSideURL()
  return {
    host: baseUrl,
    rules: [
      {
        userAgent: '*',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
