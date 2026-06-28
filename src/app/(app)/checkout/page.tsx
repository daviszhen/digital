export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { CheckoutPage } from './client'

export const metadata: Metadata = {
  title: 'Checkout',
}

export default function CheckoutPageWrapper() {
  return (
    <div className="container py-8 min-h-[60vh]">
      <CheckoutPage />
    </div>
  )
}
