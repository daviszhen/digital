import { ProductGridItem } from '@/components/ProductGridItem'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Browse premium digital products.',
  title: 'DigitalStore',
}

type SearchParams = { [key: string]: string | string[] | undefined }

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q: searchValue, sort, category } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // Resolve category filter to ID
  let categoryId: string | null = null
  if (category) {
    const catResult = await payload.find({
      collection: 'categories',
      where: { title: { equals: category as string } },
      limit: 1,
    })
    if (catResult.docs.length > 0) {
      categoryId = catResult.docs[0].id as string
    }
  }

  const [productsResult, categoriesResult] = await Promise.all([
    payload.find({
      collection: 'products',
      draft: false,
      overrideAccess: false,
      select: { title: true, slug: true, gallery: true, categories: true, priceInUSD: true, isDigital: true },
      ...(sort ? { sort: sort as string } : { sort: '-createdAt' }),
      where: searchValue || categoryId
        ? {
            and: [
              { _status: { equals: 'published' } },
              ...(searchValue ? [{ title: { like: searchValue } }] : []),
              ...(categoryId ? [{ categories: { equals: categoryId } }] : []),
            ],
          }
        : { _status: { equals: 'published' } },
    }),
    payload.find({
      collection: 'categories',
      sort: 'title',
      limit: 20,
    }),
  ])

  const products = productsResult.docs
  const categories = categoriesResult.docs

  return (
    <div className="container py-8">
      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          <a
            href="/"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              !category ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All
          </a>
          {categories.map((cat: any) => (
            <a
              key={cat.id}
              href={`/?category=${encodeURIComponent(cat.title)}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                category === cat.title ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat.title}
            </a>
          ))}
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {searchValue && (
            <p className="text-sm text-muted-foreground">
              {products.length} result{products.length !== 1 ? 's' : ''} for &quot;{searchValue}&quot;
            </p>
          )}
          {!searchValue && (
            <p className="text-sm text-muted-foreground">
              {productsResult.totalDocs} product{productsResult.totalDocs !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
          <a href={`/?sort=-createdAt${category ? `&category=${encodeURIComponent(String(category))}` : ''}`}
             className={`text-xs px-2 py-1 rounded ${!sort || sort === '-createdAt' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Newest</a>
          <a href={`/?sort=priceInUSD${category ? `&category=${encodeURIComponent(String(category))}` : ''}`}
             className={`text-xs px-2 py-1 rounded ${sort === 'priceInUSD' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Price ↓</a>
          <a href={`/?sort=-priceInUSD${category ? `&category=${encodeURIComponent(String(category))}` : ''}`}
             className={`text-xs px-2 py-1 rounded ${sort === '-priceInUSD' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Price ↑</a>
        </div>
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <ProductGridItem key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No products found.</p>
          {(searchValue || category) && (
            <a href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
              Clear filters →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
