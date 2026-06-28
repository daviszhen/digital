'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Price } from '@/components/Price'
import { Media } from '@/components/Media'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShoppingCart, ArrowLeft } from 'lucide-react'

type CartData = { id: string; items?: any[]; subtotal?: number }

export function CheckoutPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [stripeView, setStripeView] = useState(false)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground text-sm">Loading cart...</div>
      </div>
    )
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground text-sm">Add some products before checking out.</p>
        <Button asChild>
          <Link href="/">Browse Products</Link>
        </Button>
      </div>
    )
  }

  const total = cart.subtotal || cart.items.reduce((sum: number, item: any) => {
    const product = typeof item.product === 'object' ? item.product : null
    const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
    const price = variant?.priceInUSD || product?.priceInUSD || 0
    return sum + price * (item.quantity || 1)
  }, 0)

  const totalDollars = total / 100

  const createOrder = async () => {
    const body: any = {
      items: cart.items!.map((item: any) => ({
        product: typeof item.product === 'object' ? item.product.id : item.product,
        quantity: item.quantity || 1,
        variant: item.variant ? (typeof item.variant === 'object' ? item.variant.id : item.variant) : undefined,
      })),
      status: 'completed',
      customerEmail: email,
    }
    const userRes = await fetch('/api/users/me?depth=0', { credentials: 'include' })
    const userData = await userRes.json().catch(() => ({}))
    if (userData?.user?.id) body.customer = userData.user.id
    const res = await fetch('/api/orders', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    return data.doc
  }

  const handleInitPayment = async () => {
    if (!email) { toast.error('Please enter your email'); return }
    setSubmitting(true)
    try {
      const items = cart.items!.map((item: any) => ({
        product: typeof item.product === 'object' ? item.product.id : item.product,
        quantity: item.quantity || 1,
        variant: item.variant ? (typeof item.variant === 'object' ? item.variant.id : item.variant) : undefined,
      }))
      const res = await fetch('/api/create-payment', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalDollars, email, items }),
      })
      if (!res.ok) throw new Error('Failed to create payment')
      const data = await res.json()
      if (data.clientSecret) setClientSecret(data.clientSecret)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const order = await createOrder()
      if (order?.id) {
        localStorage.removeItem('cart')
        toast.success('Payment successful!')
        router.push(`/orders/${order.id}?email=${encodeURIComponent(email)}&accessToken=${order.accessToken || ''}`)
      }
    } catch (err: any) {
      toast.error('Order creation failed: ' + err.message)
    }
  }

  const handleDirectOrder = async () => {
    if (!email) { toast.error('Please enter your email'); return }
    setSubmitting(true)
    try {
      const order = await createOrder()
      if (order?.id) {
        localStorage.removeItem('cart')
        toast.success('Order placed!')
        router.push(`/orders/${order.id}?email=${encodeURIComponent(email)}&accessToken=${order.accessToken || ''}`)
      }
    } catch (err: any) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  if (clientSecret) {
    return <div>Stripe payment form would render here (requires Stripe JS)</div>
  }

  return (
    <div>
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

          <form onSubmit={(e) => { e.preventDefault(); handleInitPayment() }} className="space-y-6 max-w-md">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="mt-1.5" />
            </div>

            <Button type="submit" disabled={submitting || !email} className="w-full">
              {submitting ? 'Processing...' : 'Place Order'}
            </Button>
          </form>

          {paymentError && <p className="text-red-500 text-sm mt-4">{paymentError}</p>}
        </div>

        <div className="lg:w-80">
          <div className="border rounded-lg p-6">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cart.items?.map((item: any, i: number) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null
                const image = product.gallery?.[0]?.image || product.meta?.image
                let price = product.priceInUSD
                const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
                if (variant?.priceInUSD) price = variant.priceInUSD
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded border bg-muted/30 flex-shrink-0 overflow-hidden">
                      {image && typeof image === 'object' && (
                        <Media fill imgClassName="object-cover" resource={image} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    {typeof price === 'number' && (
                      <span className="text-sm text-muted-foreground flex-shrink-0">${((price * item.quantity) / 100).toFixed(2)}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <Price amount={total} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
