export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { SimpleCheckoutPage } from '@/components/checkout/SimpleCheckout'

export const metadata: Metadata = {
  title: 'Checkout',
}

export default function CheckoutPageWrapper() {
  return (
    <div className="container py-8">
      <SimpleCheckoutPage />
    </div>
  )
}
