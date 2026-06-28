import type { Product, Variant } from '@/payload-types'
import Link from 'next/link'
import React from 'react'
import { Media } from '@/components/Media'
import { Price } from '@/components/Price'

type Props = { product: Partial<Product>; averageRating?: number }

export const ProductGridItem: React.FC<Props> = ({ product, averageRating }) => {
  const { gallery, priceInUSD, title, isDigital } = product

  let price = priceInUSD
  const variants = product.variants?.docs
  if (variants && variants.length > 0) {
    const variant = variants[0]
    if (variant && typeof variant === 'object' && variant?.priceInUSD && typeof variant.priceInUSD === 'number') {
      price = variant.priceInUSD
    }
  }

  const image = gallery?.[0]?.image && typeof gallery[0]?.image !== 'string' ? gallery[0]?.image : null

  return (
    <Link
      className="group relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
      href={`/products/${product.slug}`}
    >
      <div className="relative aspect-square bg-muted/20 overflow-hidden">
        {image ? (
          <Media
            className="absolute inset-0"
            fill
            imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            resource={image}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {isDigital && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded shadow-sm">
            DIGITAL
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {title}
        </h3>
        {averageRating && averageRating > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-xs">{'★'.repeat(Math.round(averageRating))}</span>
            <span className="text-[10px] text-muted-foreground">{averageRating.toFixed(1)}</span>
          </div>
        ) : null}
        <div className="mt-auto pt-1">
          {typeof price === 'number' && (
            <span className="text-base font-bold">${(price / 100).toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
