'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BackLink() {
  const router = useRouter()

  const goBack = () => {
    const from = sessionStorage.getItem('account_entered_from')
    if (from) {
      sessionStorage.removeItem('account_entered_from')
      router.push(from)
    } else {
      router.push('/')
    }
  }

  return (
    <button
      onClick={goBack}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  )
}
