'use client'

import { useAuth } from '@/providers/Auth'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { useEffect, useRef } from 'react'

export function AuthCartSync() {
  const { user, status } = useAuth()
  const { onLogin, onLogout } = useEcommerce()
  const prevUserRef = useRef(user)

  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    if (!prevUser && user) {
      onLogin(user)
    } else if (prevUser && !user) {
      onLogout()
    }
  }, [user, onLogin, onLogout])

  return null
}
