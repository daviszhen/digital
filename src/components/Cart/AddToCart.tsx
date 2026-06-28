'use client'

import { Button } from '@/components/ui/button'
import type { Product, Variant } from '@/payload-types'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useMemo, useState } from 'react'

type Props = {
  product: Product
}

const CART_KEY = 'cart'

export function AddToCart({ product }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const variants = useMemo(() => {
    const raw = product.variants
    if (!raw) return []
    if (Array.isArray(raw)) return raw as Variant[]
    if (typeof raw === 'object' && 'docs' in raw) return (raw as any).docs || []
    return []
  }, [product.variants])

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')
      if (variantId) {
        const match = variants.find((v: any) => typeof v === 'object' && String(v.id) === variantId)
        if (match && typeof match === 'object') return match
      }
      const first = variants[0]
      if (first && typeof first === 'object') return first
    }
    return undefined
  }, [product.enableVariants, searchParams, variants])

  const handleClick = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (isAdding || added) return
    setIsAdding(true)

    try {
      const currentCartId = typeof window !== 'undefined' ? localStorage.getItem(CART_KEY) : null
      let cartId = currentCartId

      if (cartId) {
        const res = await fetch(`/api/carts/${cartId}/add-item`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item: { product: product.id, variant: selectedVariant?.id, quantity: 1 },
            quantity: 1,
          }),
        })
        if (!res.ok) cartId = null
      }

      if (!cartId) {
        const res = await fetch('/api/carts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ product: product.id, variant: selectedVariant?.id, quantity: 1 }],
          }),
        })
        if (!res.ok) throw new Error('Failed to create cart')
        const data = await res.json()
        cartId = data.doc?.id
        if (cartId && typeof window !== 'undefined') {
          localStorage.setItem(CART_KEY, cartId)
          if (data.doc?.secret) {
            localStorage.setItem(`${CART_KEY}_secret`, data.doc.secret)
          }
        }
      }

      setAdded(true)
      router.refresh()
      setTimeout(() => setAdded(false), 3000)
    } catch (err) {
      console.error('Add to cart:', err)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Button
      aria-label="Add to cart"
      variant="outline"
      disabled={isAdding}
      onClick={handleClick}
      type="submit"
    >
      {isAdding ? 'Adding...' : added ? 'Added!' : 'Add To Cart'}
    </Button>
  )
}
