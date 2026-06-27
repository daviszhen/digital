'use client'

import { Price } from '@/components/Price'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { OpenCartButton } from './OpenCart'
import { Button } from '@/components/ui/button'

type CartItem = {
  id: string
  product: any
  variant?: any
  quantity: number
}

type CartData = {
  id: string
  items?: CartItem[]
  subtotal?: number
}

const STORAGE_KEY = 'cart'

export function CartModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [cart, setCart] = useState<CartData | null>(null)
  const pathname = usePathname()

  const fetchCart = () => {
    const cartId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!cartId) {
      setCart(null)
      return
    }
    fetch(`/api/carts/${cartId}?depth=2`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setCart(data)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setCart(null)
        }
      })
      .catch(() => setCart(null))
  }

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isOpen) fetchCart()
  }, [isOpen])

  // Initial fetch
  useEffect(() => {
    fetchCart()
  }, [])

  const totalQuantity = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <OpenCartButton quantity={totalQuantity} />
      </SheetTrigger>

      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>My Cart</SheetTitle>
          <SheetDescription>
            {totalQuantity || 0} item{totalQuantity !== 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>

        {!cart || !cart.items?.length ? (
          <div className="text-center flex flex-col items-center gap-2 py-12">
            <ShoppingCart className="h-16" />
            <p className="text-xl font-bold">Your cart is empty.</p>
          </div>
        ) : (
          <div className="grow flex flex-col justify-between">
            <ul className="grow overflow-auto py-4 space-y-4">
              {cart.items.map((item, i) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null

                let image = product.gallery?.[0]?.image || product.meta?.image
                if (image && typeof image === 'object') {
                  // keep it
                } else {
                  image = null
                }

                let price = product.priceInUSD
                const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
                if (variant?.priceInUSD) price = variant.priceInUSD

                return (
                  <li key={item.id || i} className="flex gap-3">
                    <Link href={`/products/${product.slug}`} className="w-16 h-16 rounded border bg-background p-1 flex-shrink-0">
                      {image?.url && (
                        <Image alt={product.title || ''} className="w-full h-full object-cover rounded" height={64} src={image.url} width={64} />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm">{typeof price === 'number' && <Price amount={price * (item.quantity || 1)} />}</div>
                  </li>
                )
              })}
            </ul>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <Price amount={cart.subtotal || 0} className="text-lg" />
              </div>
              <Button asChild className="w-full">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
