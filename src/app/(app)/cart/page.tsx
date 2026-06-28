'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Price } from '@/components/Price'
import { Media } from '@/components/Media'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const [cart, setCart] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cartId = localStorage.getItem('cart')
    if (!cartId) { setLoading(false); return }
    fetch(`/api/carts/${cartId}?depth=2`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) setCart(data)
        else localStorage.removeItem('cart')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (itemId: string) => {
    const cartId = localStorage.getItem('cart')
    if (!cartId) return
    await fetch(`/api/carts/${cartId}/remove-item`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { id: itemId } }),
    })
    // Refresh
    window.location.reload()
  }

  const handleClear = async () => {
    localStorage.removeItem('cart')
    window.location.reload()
  }

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading cart...</div>

  if (!cart || !cart.items?.length) {
    return (
      <div className="container py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some digital products to get started.</p>
        <Link href="/" className="text-primary hover:underline font-medium">Browse Products →</Link>
      </div>
    )
  }

  const total = cart.subtotal || cart.items.reduce((sum: number, item: any) => {
    const product = typeof item.product === 'object' ? item.product : null
    const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
    const price = variant?.priceInUSD || product?.priceInUSD || 0
    return sum + price * (item.quantity || 1)
  }, 0)

  return (
    <div className="container py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          Clear All
        </Button>
      </div>

      <div className="space-y-4 mb-8">
        {cart.items.map((item: any) => {
          const product = typeof item.product === 'object' ? item.product : null
          if (!product) return null
          const image = product.gallery?.[0]?.image || product.meta?.image
          let price = product.priceInUSD
          const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
          if (variant?.priceInUSD) price = variant.priceInUSD

          return (
            <div key={item.id} className="flex gap-4 p-4 border rounded-lg items-center">
              <Link href={`/products/${product.slug}`} className="w-20 h-20 rounded-lg border bg-muted/30 flex-shrink-0 overflow-hidden">
                {image && typeof image === 'object' && (
                  <Media className="w-full h-full" fill imgClassName="object-cover" resource={image} />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${product.slug}`} className="font-semibold hover:text-primary transition-colors">
                  {product.title}
                </Link>
                {variant && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {variant.options?.map((o: any) => o.label || o.value).join(', ')}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {typeof price === 'number' && <Price amount={price * (item.quantity || 1)} className="font-medium" />}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="block text-xs text-red-600 hover:text-red-800 mt-1 ml-auto"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-semibold">Total</span>
          <Price amount={total} className="text-2xl font-bold" />
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:bg-primary/90 transition-colors"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  )
}
