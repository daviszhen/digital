export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { CheckoutPage } from '@/components/checkout/CheckoutPage'

export const metadata: Metadata = {
  title: 'Checkout',
}

export default function CheckoutRoute() {
  return (
    <div className="container py-8">
      <CheckoutPage />
    </div>
  )
}
