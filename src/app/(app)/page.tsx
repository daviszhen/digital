import { ProductGridItem } from '@/components/ProductGridItem'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Categories } from '@/components/layout/search/Categories'
import { FilterList } from '@/components/layout/search/filter'
import { sorting } from '@/lib/constants'
import { Search } from '@/components/Search'
import React, { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Browse premium digital products.',
  title: 'DigitalStore',
}

type SearchParams = { [key: string]: string | string[] | undefined }

type Props = {
  searchParams: Promise<SearchParams>
}

export default async function HomePage({ searchParams }: Props) {
  const { q: searchValue, sort, category } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const products = await payload.find({
    collection: 'products',
    draft: false,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      gallery: true,
      categories: true,
      priceInUSD: true,
      isDigital: true,
    },
    ...(sort ? { sort } : { sort: '-createdAt' }),
    where: searchValue || category
      ? {
          and: [
            { _status: { equals: 'published' } },
            ...(searchValue
              ? [
                  {
                    or: [
                      { title: { like: searchValue } },
                      { description: { like: searchValue } },
                    ],
                  },
                ]
              : []),
            ...(category
              ? [{ categories: { contains: category } }]
              : []),
          ],
        }
      : { _status: { equals: 'published' } },
  })

  return (
    <div className="container flex flex-col gap-8 my-12">
      <Search className="" />

      <div className="flex flex-col md:flex-row items-start gap-16 md:gap-8">
        <div className="w-full flex-none flex flex-col gap-4 md:gap-8 md:w-1/5">
          <Categories />
          <FilterList list={sorting} title="Sort by" />
        </div>

        <div className="w-full min-h-screen">
          {searchValue && (
            <p className="mb-4 text-sm text-muted-foreground">
              {products.docs.length === 0
                ? 'No products match '
                : `Showing ${products.docs.length} result${products.docs.length !== 1 ? 's' : ''} for `}
              <span className="font-semibold">&quot;{searchValue}&quot;</span>
            </p>
          )}
          {category && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing products in category
            </p>
          )}

          {products?.docs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.docs.map((product) => (
                <ProductGridItem key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">No products found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
