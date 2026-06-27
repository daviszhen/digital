'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Price } from '@/components/Price'
import { Media } from '@/components/Media'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function StripeForm({ clientSecret, email, onSuccess, onError }: {
  clientSecret: string
  email: string
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          receipt_email: email,
        },
      })

      if (error) {
        onError(error.message || 'Payment failed')
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id)
      }
    } catch (err: any) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? 'Processing...' : 'Pay now'}
      </Button>
    </form>
  )
}

export function SimpleCheckoutPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [cart, setCart] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  React.useEffect(() => {
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

  if (loading) return <div className="text-center py-20">Loading cart...</div>

  if (!cart || !cart.items?.length) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className="text-primary hover:underline mt-2 inline-block">Continue shopping →</Link>
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

  const handleInitPayment = async () => {
    if (!email) return
    setSubmitting(true)
    try {
      const items = cart.items.map((item: any) => ({
        product: typeof item.product === 'object' ? item.product.id : item.product,
        quantity: item.quantity || 1,
        variant: item.variant ? (typeof item.variant === 'object' ? item.variant.id : item.variant) : undefined,
      }))

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        credentials: 'include',
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
      const body: any = {
        items: cart.items.map((item: any) => ({
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

      const res = await fetch('/api/orders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      const orderId = data.doc?.id

      if (orderId) {
        localStorage.removeItem('cart')
        toast.success('Payment successful!')
        router.push(`/orders/${orderId}?email=${encodeURIComponent(email)}&accessToken=${data.doc.accessToken || ''}`)
      }
    } catch (err: any) {
      toast.error('Order creation failed: ' + err.message)
    }
  }

  const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

  return (
    <div className="flex flex-col md:flex-row gap-10 my-8">
      <div className="basis-full lg:basis-2/3">
        <h1 className="text-3xl font-medium mb-6">Checkout</h1>

        {!clientSecret ? (
          <form onSubmit={(e) => { e.preventDefault(); handleInitPayment() }} className="space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>

            {hasStripe && stripePromise ? (
              <Button type="submit" disabled={submitting || !email} className="w-full sm:w-auto">
                {submitting ? 'Processing...' : `Pay $${totalDollars.toFixed(2)} with Card`}
              </Button>
            ) : (
              <Button type="submit" disabled={submitting || !email} onClick={async (e) => {
                e.preventDefault()
                setSubmitting(true)
                try {
                  const body: any = {
                    items: cart.items.map((item: any) => ({
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
                  const orderId = data.doc?.id
                  if (orderId) {
                    localStorage.removeItem('cart')
                    toast.success('Order placed!')
                    router.push(`/orders/${orderId}?email=${encodeURIComponent(email)}&accessToken=${data.doc.accessToken || ''}`)
                  }
                } catch (err: any) { toast.error(err.message) } finally { setSubmitting(false) }
              }} className="w-full sm:w-auto">
                {submitting ? 'Placing order...' : 'Place Order'}
              </Button>
            )}
          </form>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeForm
              clientSecret={clientSecret}
              email={email}
              onSuccess={handlePaymentSuccess}
              onError={(msg) => setPaymentError(msg)}
            />
          </Elements>
        )}

        {paymentError && <p className="text-red-500 mt-4">{paymentError}</p>}
      </div>

      <div className="basis-full lg:basis-1/3 p-8 bg-muted/30 rounded-lg">
        <h2 className="text-xl font-medium mb-4">Your Cart</h2>
        <div className="space-y-4">
          {cart.items?.map((item: any, i: number) => {
            const product = typeof item.product === 'object' ? item.product : null
            if (!product) return null
            const image = product.gallery?.[0]?.image || product.meta?.image
            let price = product.priceInUSD
            const variant = item.variant && typeof item.variant === 'object' ? item.variant : null
            if (variant?.priceInUSD) price = variant.priceInUSD
            return (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded border bg-background p-1">
                  {image && typeof image === 'object' && <Media className="w-full h-full" fill imgClassName="rounded object-cover" resource={image} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.title}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                {typeof price === 'number' && <Price amount={price * (item.quantity || 1)} />}
              </div>
            )
          })}
          <hr />
          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <Price className="text-xl font-medium" amount={total} />
          </div>
        </div>
      </div>
    </div>
  )
}
