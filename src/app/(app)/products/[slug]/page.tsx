export const dynamic = 'force-dynamic'
import type { Media, Product } from '@/payload-types'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { GridTileImage } from '@/components/Grid/tile'
import { Gallery } from '@/components/product/Gallery'
import { ProductDescription } from '@/components/product/ProductDescription'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon } from 'lucide-react'
import { ReviewForm } from '@/components/product/ReviewForm'
import { Metadata } from 'next'

type Args = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const product = await queryProductBySlug({ slug })

  if (!product) return notFound()

  const gallery = product.gallery?.filter((item) => typeof item.image === 'object') || []

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const canIndex = product._status === 'published'

  const seoImage = metaImage || (gallery.length ? (gallery[0]?.image as Media) : undefined)

  return {
    description: product.meta?.description || '',
    openGraph: seoImage?.url
      ? {
          images: [
            {
              alt: seoImage?.alt,
              height: seoImage.height!,
              url: seoImage?.url,
              width: seoImage.width!,
            },
          ],
        }
      : null,
    robots: {
      follow: canIndex,
      googleBot: {
        follow: canIndex,
        index: canIndex,
      },
      index: canIndex,
    },
    title: product.meta?.title || product.title,
  }
}

export default async function ProductPage({ params }: Args) {
  const { slug } = await params
  const product = await queryProductBySlug({ slug })

  if (!product) return notFound()

  const gallery =
    product.gallery
      ?.filter((item) => typeof item.image === 'object')
      .map((item) => ({
        ...item,
        image: item.image as Media,
      })) || []

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const hasStock = product.enableVariants
    ? product?.variants?.docs?.some((variant) => {
        if (typeof variant !== 'object') return false
        return variant.inventory && variant?.inventory > 0
      })
    : product.inventory! > 0

  let price = product.priceInUSD

  if (product.enableVariants && product?.variants?.docs?.length) {
    price = product?.variants?.docs?.reduce((acc, variant) => {
      if (typeof variant === 'object' && variant?.priceInUSD && acc && variant?.priceInUSD > acc) {
        return variant.priceInUSD
      }
      return acc
    }, price)
  }

  const productJsonLd = {
    name: product.title,
    '@context': 'https://schema.org',
    '@type': 'Product',
    description: product.description,
    image: metaImage?.url,
    offers: {
      '@type': 'AggregateOffer',
      availability: hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      price: price,
      priceCurrency: 'usd',
    },
  }

  const relatedProducts =
    product.relatedProducts?.filter((relatedProduct) => typeof relatedProduct === 'object') ?? []

  return (
    <React.Fragment>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
        type="application/ld+json"
      />
      <div className="container pt-8 pb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/">
            <ChevronLeftIcon />
            All products
          </Link>
        </Button>
        <div className="flex flex-col gap-12 rounded-lg border p-8 md:py-12 lg:flex-row lg:gap-8 bg-primary-foreground">
          <div className="h-full w-full basis-full lg:basis-1/2">
            <Suspense
              fallback={
                <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden" />
              }
            >
              {Boolean(gallery?.length) && <Gallery gallery={gallery} />}
            </Suspense>
          </div>

          <div className="basis-full lg:basis-1/2">
            <ProductDescription product={product} />
          </div>
        </div>

        {product.isDigital && <DigitalProductAssets productId={product.id} />}
        <ProductReviews productId={product.id} />
      </div>

      {product.layout?.length ? <RenderBlocks blocks={product.layout} /> : <></>}

      {relatedProducts.length ? (
        <div className="container">
          <RelatedProducts products={relatedProducts as Product[]} />
        </div>
      ) : (
        <></>
      )}
    </React.Fragment>
  )
}

async function DigitalProductAssets({ productId }: { productId: string | number }) {
  const payload = await getPayload({ config: configPromise })

  try {
    const result = await payload.find({
      collection: 'digital-assets',
      overrideAccess: false,
      limit: 100,
    })

    const assets = result.docs.filter((a: any) => {
      const pid = typeof a.product === 'object' ? a.product.id : a.product
      return String(pid) === String(productId)
    })

    if (!assets.length) return null

    return (
      <div className="mt-8 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Included Files</h2>
        <div className="space-y-2">
          {assets.map((asset: any) => (
            <div key={asset.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                  (asset.mimeType || '').startsWith('image/') ? 'bg-green-100 text-green-600' :
                  (asset.mimeType || '').includes('pdf') ? 'bg-red-100 text-red-600' :
                  (asset.mimeType || '').includes('zip') || (asset.mimeType || '').includes('rar') ? 'bg-yellow-100 text-yellow-600' :
                  (asset.mimeType || '').includes('video') ? 'bg-purple-100 text-purple-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {(asset.mimeType || '').startsWith('image/') ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : (asset.mimeType || '').includes('pdf') ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  ) : (asset.mimeType || '').includes('zip') || (asset.mimeType || '').includes('rar') ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{asset.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {(asset.fileSize / 1024).toFixed(0)} KB · {asset.mimeType || 'unknown'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                {Math.round(asset.fileSize / 1024)} KB
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  } catch {
    return null
  }
}

function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null

  return (
    <div className="py-8">
      <h2 className="mb-4 text-2xl font-bold">Related Products</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {products.map((product) => (
          <li
            className="aspect-square w-full flex-none min-[475px]:w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
            key={product.id}
          >
            <Link className="relative h-full w-full" href={`/products/${product.slug}`}>
              <GridTileImage
                label={{
                  amount: product.priceInUSD!,
                  title: product.title,
                }}
                media={product.meta?.image as Media}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

async function ProductReviews({ productId }: { productId: string | number }) {
  const payload = await getPayload({ config: configPromise })

  try {
    const result = await payload.find({
      collection: 'reviews',
      where: {
        and: [
          { product: { equals: String(productId) } },
          { isApproved: { equals: true } },
        ],
      },
      sort: '-createdAt',
      limit: 20,
      overrideAccess: false,
    })

    const reviews = result.docs || []
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating as number || 0), 0) / reviews.length).toFixed(1)
      : null

    return (
      <div className="mt-12 border-t pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Reviews</h2>
            {avgRating && (
              <p className="text-sm text-muted-foreground mt-1">
                {avgRating} ★ ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </p>
            )}
          </div>
        </div>

        {/* Quick Review Form */}
        <ReviewForm productId={productId} />

        {/* Review List */}
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border-b pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500">{'★'.repeat(review.rating || 5)}</span>
                  <span className="font-medium text-sm">{review.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{review.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {review.author} · {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  } catch {
    return null
  }
}

const queryProductBySlug = async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    depth: 3,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
    populate: {
      variants: {
        title: true,
        priceInUSD: true,
        inventory: true,
        options: true,
      },
    },
  })

  return result.docs?.[0] || null
}
