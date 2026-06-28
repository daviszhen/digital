import type { Order } from '@/payload-types'
import type { Metadata } from 'next'

import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/utilities/formatDateTime'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, DownloadIcon } from 'lucide-react'
import { ProductItem } from '@/components/ProductItem'
import { headers as getHeaders } from 'next/headers.js'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { OrderStatus } from '@/components/OrderStatus'
import { AddressItem } from '@/components/addresses/AddressItem'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ email?: string; accessToken?: string }>
}

export default async function Order({ params, searchParams }: PageProps) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const { id } = await params
  const { email = '', accessToken = '' } = await searchParams

  let order: Order | null = null

  try {
    const {
      docs: [orderResult],
    } = await payload.find({
      collection: 'orders',
      user,
      overrideAccess: !Boolean(user),
      depth: 2,
      where: {
        and: [
          {
            id: {
              equals: id,
            },
          },
          ...(user
            ? [
                {
                  customer: {
                    equals: user.id,
                  },
                },
              ]
            : [
                {
                  accessToken: {
                    equals: accessToken,
                  },
                },
                ...(email
                  ? [
                      {
                        customerEmail: {
                          equals: email,
                        },
                      },
                    ]
                  : []),
              ]),
        ],
      },
      select: {
        amount: true,
        currency: true,
        items: true,
        customerEmail: true,
        customer: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        shippingAddress: true,
      },
    })

    const canAccessAsGuest =
      !user &&
      email &&
      accessToken &&
      orderResult &&
      orderResult.customerEmail &&
      orderResult.customerEmail === email
    const canAccessAsUser =
      user &&
      orderResult &&
      orderResult.customer &&
      (typeof orderResult.customer === 'object'
        ? orderResult.customer.id
        : orderResult.customer) === user.id
    // fallback: logged-in user can access their own order via accessToken+email
    const canAccessAsUserByToken =
      user &&
      email &&
      accessToken &&
      orderResult &&
      orderResult.customerEmail &&
      orderResult.customerEmail === email

    if (orderResult && (canAccessAsGuest || canAccessAsUser || canAccessAsUserByToken)) {
      order = orderResult
    }
  } catch (error) {
    console.error(error)
  }

  if (!order) {
    notFound()
  }

  return (
    <div className="">
      <div className="flex gap-8 justify-between items-center mb-6">
        {user ? (
          <div className="flex gap-4">
            <Button asChild variant="ghost">
              <Link href="/orders">
                <ChevronLeftIcon />
                All orders
              </Link>
            </Button>
          </div>
        ) : (
          <div></div>
        )}

        <h1 className="text-sm uppercase font-mono px-2 bg-primary/10 rounded tracking-[0.07em]">
          <span className="">{`Order #${order.id}`}</span>
        </h1>
      </div>

      <div className="bg-card border rounded-lg px-6 py-4 flex flex-col gap-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="">
            <p className="font-mono uppercase text-primary/50 mb-1 text-sm">Order Date</p>
            <p className="text-lg">
              <time dateTime={order.createdAt}>
                {formatDateTime({ date: order.createdAt, format: 'MMMM dd, yyyy' })}
              </time>
            </p>
          </div>

          <div className="">
            <p className="font-mono uppercase text-primary/50 mb-1 text-sm">Total</p>
            {order.amount && <Price className="text-lg" amount={order.amount} />}
          </div>

          {order.status && (
            <div className="grow max-w-1/3">
              <p className="font-mono uppercase text-primary/50 mb-1 text-sm">Status</p>
              <OrderStatus className="text-sm" status={order.status} />
            </div>
          )}
        </div>

        {order.items && (
          <div>
            <h2 className="font-mono text-primary/50 mb-4 uppercase text-sm">Items</h2>
            <ul className="flex flex-col gap-6">
              {order.items?.map((item, index) => {
                if (typeof item.product === 'string') {
                  return null
                }

                if (!item.product || typeof item.product !== 'object') {
                  return <div key={index}>This item is no longer available.</div>
                }

                const variant =
                  item.variant && typeof item.variant === 'object' ? item.variant : undefined

                return (
                  <li key={item.id}>
                    <ProductItem
                      product={item.product}
                      quantity={item.quantity}
                      variant={variant}
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {order.shippingAddress && (
          <div>
            <h2 className="font-mono text-primary/50 mb-4 uppercase text-sm">Shipping Address</h2>
            {/* @ts-expect-error - some kind of type hell */}
            <AddressItem address={order.shippingAddress} hideActions />
          </div>
        )}

        {order.status === 'completed' && <DigitalDownloads order={order} user={user} />}
      </div>
    </div>
  )
}

async function DigitalDownloads({
  order,
  user,
}: {
  order: Order
  user: any
}) {
  const payload = await getPayload({ config: configPromise })
  const productIds = (order.items || [])
    .map((item: any) => {
      if (typeof item.product === 'object') return item.product.id
      return item.product
    })
    .filter(Boolean) as (string | number)[]

  if (!productIds.length) return null

  let assets
  try {
    // Fetch all digital assets and filter in memory
    const result = await payload.find({
      collection: 'digital-assets',
      overrideAccess: Boolean(user),
      limit: 100,
    })
    assets = result.docs.filter((a: any) => {
      const pid = typeof a.product === 'object' ? a.product.id : a.product
      return productIds.includes(pid)
    })
  } catch {
    return null
  }

  if (!assets?.length) return null

  return (
    <div>
      <h2 className="font-mono text-primary/50 mb-4 uppercase text-sm">Digital Downloads</h2>
      <ul className="flex flex-col gap-3">
        {assets.map((asset: any) => {
          const expired = asset.expiresAt && new Date(asset.expiresAt) < new Date()
          const exhausted = asset.downloadCount >= asset.maxDownloads

          return (
            <li
              key={asset.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{asset.filename}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.round(asset.fileSize / 1024)} KB · {asset.mimeType}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {asset.downloadCount}/{asset.maxDownloads} downloads
                  {asset.expiresAt
                    ? ` · Expires ${new Date(asset.expiresAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              {expired || exhausted ? (
                <span className="text-xs text-muted-foreground ml-4">
                  {expired ? 'Expired' : 'Limit reached'}
                </span>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/downloads/${asset.id}`} download>
                    <DownloadIcon className="w-4 h-4 mr-1" />
                    Download
                  </a>
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  return {
    description: `Order details for order ${id}.`,
    openGraph: mergeOpenGraph({
      title: `Order ${id}`,
      url: `/orders/${id}`,
    }),
    title: `Order ${id}`,
  }
}
