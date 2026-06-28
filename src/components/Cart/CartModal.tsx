'use client'

import { Price } from '@/components/Price'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { ShoppingCart, Minus, Plus, X, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { OpenCartButton } from './OpenCart'

type CartItem = { id: string; product: any; variant?: any; quantity: number }
type CartData = { id: string; items?: CartItem[]; subtotal?: number }

const STORAGE_KEY = 'cart'

export function CartModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [cart, setCart] = useState<CartData | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const fetchCart = () => {
    const cartId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!cartId) { setCart(null); return }
    const secret = typeof window !== 'undefined' ? localStorage.getItem(`${STORAGE_KEY}_secret`) : null
    const secretParam = secret ? `?secret=${encodeURIComponent(secret)}` : ''
    fetch(`/api/carts/${cartId}${secretParam}&depth=2`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) setCart(data)
        else { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(`${STORAGE_KEY}_secret`); setCart(null) }
      })
      .catch(() => setCart(null))
  }

  useEffect(() => { setIsOpen(false) }, [pathname])
  useEffect(() => { if (isOpen) fetchCart() }, [isOpen])
  useEffect(() => { fetchCart() }, [])

  const totalQuantity = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0)

  const updateQuantity = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty < 1) return
    const cartId = localStorage.getItem(STORAGE_KEY)
    if (!cartId) return
    setUpdating(item.id)
    try {
      await fetch(`/api/carts/${cartId}/update-item`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemID: item.id, quantity: newQty }),
      })
      fetchCart()
    } catch (e) { /* ignore */ }
    finally { setUpdating(null) }
  }

  const removeItem = async (item: CartItem) => {
    const cartId = localStorage.getItem(STORAGE_KEY)
    if (!cartId) return
    setUpdating(item.id)
    try {
      await fetch(`/api/carts/${cartId}/remove-item`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemID: item.id }),
      })
      fetchCart()
      router.refresh()
    } catch (e) { /* ignore */ }
    finally { setUpdating(null) }
  }

  const clearCart = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCart(null)
    router.refresh()
  }

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <OpenCartButton quantity={totalQuantity} />
      </SheetTrigger>

      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>My Cart</SheetTitle>
          <SheetDescription>{totalQuantity || 0} item{totalQuantity !== 1 ? 's' : ''}</SheetDescription>
        </SheetHeader>

        {!cart || !cart.items?.length ? (
          <div className="text-center flex flex-col items-center gap-2 py-12">
            <ShoppingCart className="h-16" />
            <p className="text-xl font-bold">Your cart is empty.</p>
          </div>
        ) : (
          <div className="grow flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">
                {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
              </span>
              <button onClick={clearCart} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
            <ul className="grow overflow-auto py-2 space-y-3">
              {cart.items.map((item) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null
                const image = (product.gallery?.[0]?.image || product.meta?.image) ?? null
                let price = product.priceInUSD
                const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
                if (variant?.priceInUSD) price = variant.priceInUSD

                return (
                  <li key={item.id} className="flex gap-3 items-start">
                    <Link href={`/products/${product.slug}`} className="w-14 h-14 rounded border bg-background p-1 flex-shrink-0">
                      {image && typeof image === 'object' && image.url ? (
                        <Image alt={product.title || ''} className="w-full h-full object-cover rounded" height={56} src={image.url} width={56} />
                      ) : (
                        <div className="w-full h-full bg-muted rounded flex items-center justify-center text-muted-foreground/40">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">{typeof price === 'number' && <Price amount={price * (item.quantity || 1)} />}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => updateQuantity(item, -1)}
                          disabled={updating === item.id || item.quantity <= 1}
                          className="w-6 h-6 rounded border flex items-center justify-center text-xs hover:bg-muted disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, 1)}
                          disabled={updating === item.id}
                          className="w-6 h-6 rounded border flex items-center justify-center text-xs hover:bg-muted disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item)}
                          disabled={updating === item.id}
                          className="ml-auto text-red-500 hover:text-red-700 disabled:opacity-30"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <Price amount={cart.subtotal || 0} className="text-lg" />
              </div>
              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
