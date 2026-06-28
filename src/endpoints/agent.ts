import type { Endpoint } from 'payload'

const SYSTEM_PROMPT = `You are a helpful shopping assistant for DigitalStore, a digital products marketplace.

Your available actions:
1. search_products(query, limit?) — Search the product catalog
2. get_product(id_or_handle) — Get details of a specific product  
3. add_to_cart(productId, variantId?, quantity?) — Add a product to cart
4. create_order(email) — Place an order for the current cart
5. list_orders() — List customer's orders
6. get_downloads() — Get customer's downloadable products

When a user asks to find products, use search_products.
When they want to buy, add to cart first, then create order.
Always confirm before creating an order.
Keep responses friendly and concise. Mention prices when showing products.`

async function handleAction(action: string, args: any, payload: any, user: any) {
  switch (action) {
    case 'search_products': {
      const { docs } = await payload.find({
        collection: 'products',
        where: {
          and: [
            { _status: { equals: 'published' } },
            ...(args.query
              ? [{ title: { like: args.query } }]
              : []),
          ],
        },
        limit: args.limit || 5,
        sort: '-createdAt',
        select: { title: true, slug: true, priceInUSD: true, isDigital: true, description: true },
      })
      if (!docs.length) return `No products found matching "${args.query}". Try different keywords.`
      return docs
        .map((p: any, i: number) =>
          `${i + 1}. **${p.title}** — $${(p.priceInUSD / 100).toFixed(2)}\n   ${(p.description || '').substring(0, 100)}\n   Link: /products/${p.slug}`
        )
        .join('\n\n')
    }

    case 'get_product': {
      const id = args.id_or_handle
      const { docs } = await payload.find({
        collection: 'products',
        where: { or: [{ id: { equals: id } }, { slug: { equals: id } }] },
        limit: 1,
        select: { title: true, slug: true, priceInUSD: true, isDigital: true, description: true },
      })
      if (!docs.length) return `Product "${id}" not found.`
      const p = docs[0]
      return `**${p.title}** — $${(p.priceInUSD / 100).toFixed(2)}\n${(p.description || '').substring(0, 200)}\nAdd to cart? Just say "add ${p.title} to cart".`
    }

    case 'add_to_cart': {
      const productId = args.productId
      try {
        let cartId = args.cartId
        if (!cartId) {
          const cart = await payload.create({
            collection: 'carts',
            data: { items: [{ product: productId, variant: args.variantId, quantity: args.quantity || 1 }] },
            overrideAccess: true,
          })
          cartId = cart.id
        } else {
          // Add to existing cart
          await payload.update({
            collection: 'carts',
            id: cartId,
            data: {
              items: (await payload.findByID({ collection: 'carts', id: cartId })).items
                ? [
                    ...(await payload.findByID({ collection: 'carts', id: cartId })).items,
                    { product: productId, variant: args.variantId, quantity: args.quantity || 1 },
                  ]
                : [{ product: productId, quantity: args.quantity || 1 }],
            },
            overrideAccess: true,
          })
        }
        return `✅ Added to cart! [cartId: ${cartId}] Ready to order? Say "place order".`
      } catch (err: any) {
        return `Failed to add to cart: ${err.message}`
      }
    }

    case 'create_order': {
      const email = args.email || user?.email
      if (!email) return "I need your email address to create an order. What's your email?"
      const cartId = args.cartId
      if (!cartId) return "Your cart is empty. Add some products first!"

      const cart = await payload.findByID({ collection: 'carts', id: cartId, overrideAccess: true })
      if (!cart?.items?.length) return "Your cart is empty."

      try {
        const order = await payload.create({
          collection: 'orders',
          data: {
            items: cart.items.map((item: any) => ({
              product: typeof item.product === 'object' ? item.product.id : item.product,
              quantity: item.quantity || 1,
              variant: item.variant
                ? typeof item.variant === 'object'
                  ? item.variant.id
                  : item.variant
                : undefined,
            })),
            status: 'completed',
            customerEmail: email,
            customer: user?.id || undefined,
          },
          overrideAccess: true,
          disableVerificationEmail: true,
        } as any)
        return `🎉 Order placed! Order ID: ${order.id}. You can view your downloads at /orders/${order.id}`
      } catch (err: any) {
        return `Failed to create order: ${err.message}`
      }
    }

    default:
      return `Unknown action: ${action}`
  }
}

export const agentEndpoint: Endpoint = {
  path: '/agent',
  method: 'post',
  handler: async (req) => {
    try {
      const rawBody = await req.text!()
      const body = JSON.parse(rawBody || '{}')
      const { message, cartId: initialCartId } = body
      let cartId: string | null = initialCartId || null
      if (!message) return new Response(JSON.stringify({ error: 'Message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

      const apiKey = req.headers.get('x-api-key') || ''
      const { payload } = req

      // Basic mode: keyword matching without OpenAI
      // Full mode: uses OpenAI when API key is set
      const openaiKey = process.env.OPENAI_API_KEY

      if (openaiKey) {
        // Use OpenAI for intelligent responses
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: openaiKey, baseURL: process.env.OPENAI_BASE_URL })

        const functions = [
          {
            name: 'search_products',
            description: 'Search for products in the store',
            parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search keywords' }, limit: { type: 'number' } } },
          },
          {
            name: 'add_to_cart',
            description: 'Add a product to shopping cart',
            parameters: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'number' } } },
          },
          {
            name: 'create_order',
            description: 'Place an order for cart items',
            parameters: { type: 'object', properties: { email: { type: 'string' } } },
          },
        ]

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message },
          ],
          functions: functions as any,
          function_call: 'auto',
        })

        const msg = completion.choices[0]?.message
        if (msg?.function_call) {
          const fc = msg.function_call
          const result = await handleAction(fc.name!, JSON.parse(fc.arguments), payload, req.user)
          return new Response(JSON.stringify({ response: result, cartId }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ response: msg?.content, cartId }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }

      // Fallback: keyword-based matching
      const msg = message.toLowerCase()
      let response: string

      if (msg.includes('search') || msg.includes('find') || msg.includes('looking for') || msg.includes('show')) {
        const query = message.replace(/search|find|looking for|show me|i want|i need/gi, '').trim()
        response = await handleAction('search_products', { query: query || '' }, payload, req.user)
      } else if (msg.includes('add') && msg.includes('cart')) {
        // Extract product name: "add React Patterns to cart"
        let productName = message.replace(/add|\bto cart\b|\bto my cart\b/gi, '').trim()
        // Search for the product first
        const searchResult = await handleAction('search_products', { query: productName, limit: 1 }, payload, req.user)
        if (searchResult.includes('No products found')) {
          response = `Could not find "${productName}". Try 'search <keyword>' first.`
        } else if (searchResult.includes('1.')) {
          // Extract the first product and add to cart
          const { docs } = await payload.find({
            collection: 'products',
            where: { _status: { equals: 'published' }, title: { like: productName } },
            limit: 1,
          })
          if (docs.length > 0) {
            response = await handleAction('add_to_cart', { productId: docs[0].id, cartId }, payload, req.user)
            if (response.includes('cartId:')) {
              const match = response.match(/cartId: (\d+)/)
              if (match) cartId = match[1]
            }
          } else {
            response = `Couldn't find "${productName}". Try 'search'.`
          }
        } else {
          response = searchResult
        }
      } else if (msg.includes('order') || msg.includes('checkout') || msg.includes('place')) {
        if (!cartId) {
          response = "Your cart is empty. Search for a product and add it to cart first."
        } else {
          response = await handleAction('create_order', { cartId, email: body.email || req.user?.email }, payload, req.user)
        }
      } else {
        response = "I can help you shop! Try:\n• 'search <keyword>' to find products\n• 'add <product name> to cart'\n• 'place order' to checkout\n\n**Available products include:** React Advanced Patterns, Web Development eBook, UI Kit Pro, TypeScript Masterclass, Design Assets Bundle."
      }

      return new Response(JSON.stringify({ response, cartId }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
