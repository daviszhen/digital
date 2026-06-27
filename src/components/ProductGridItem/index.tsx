import type { Product, Variant } from '@/payload-types'

import Link from 'next/link'
import React from 'react'
import clsx from 'clsx'
import { Media } from '@/components/Media'
import { Price } from '@/components/Price'

type Props = {
  product: Partial<Product>
}

export const ProductGridItem: React.FC<Props> = ({ product }) => {
  const { gallery, priceInUSD, title, isDigital } = product

  let price = priceInUSD

  const variants = product.variants?.docs
  if (variants && variants.length > 0) {
    const variant = variants[0]
    if (variant && typeof variant === 'object' && variant?.priceInUSD && typeof variant.priceInUSD === 'number') {
      price = variant.priceInUSD
    }
  }

  const image =
    gallery?.[0]?.image && typeof gallery[0]?.image !== 'string' ? gallery[0]?.image : null

  return (
    <Link className="group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5" href={`/products/${product.slug}`}>
      <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
        {image ? (
          <Media
            className="absolute inset-0"
            fill
            imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            resource={image}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {isDigital && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-md shadow-sm">
            Digital
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          {typeof price === 'number' && <Price amount={price} className="text-sm font-medium" />}
        </div>
      </div>
    </Link>
  )
}
