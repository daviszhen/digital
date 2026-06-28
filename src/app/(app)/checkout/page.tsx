export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-4">Checkout</h1>
      <p className="text-muted-foreground mb-6">Complete your purchase below.</p>
      <div className="border rounded-lg p-8 bg-card">
        <p className="text-center text-muted-foreground py-12">
          Checkout is not available at the moment. Please contact support.
        </p>
      </div>
    </div>
  )
}
