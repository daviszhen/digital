import { ShoppingCart } from 'lucide-react'
import React from 'react'

export function OpenCartButton({
  className,
  quantity,
  ...rest
}: {
  className?: string
  quantity?: number
}) {
  return (
    <button
      className="relative flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-muted transition-colors"
      {...rest}
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden lg:inline">Cart</span>
      {quantity ? (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
          {quantity}
        </span>
      ) : null}
    </button>
  )
}
