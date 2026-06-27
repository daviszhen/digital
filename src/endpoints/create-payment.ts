import type { Endpoint } from 'payload'

export const createPaymentEndpoint: Endpoint = {
  path: '/create-payment',
  method: 'post',
  handler: async (req) => {
    try {
      const body = req.json ? await req.json() : (req as any).body || {}
      const amount = body.amount
      const email = body.email
      const items = body.items || []

      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to cents
        currency: 'usd',
        receipt_email: email,
        metadata: {
          items: JSON.stringify(items),
        },
      })

      return new Response(
        JSON.stringify({ clientSecret: paymentIntent.client_secret }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  },
}
