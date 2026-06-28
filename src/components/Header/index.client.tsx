'use client'
import { CMSLink } from '@/components/Link'
import { Cart } from '@/components/Cart'
import { OpenCartButton } from '@/components/Cart/OpenCart'
import Link from 'next/link'
import React, { Suspense, useState, useRef, useEffect } from 'react'
import { MobileMenu } from './MobileMenu'
import type { Header } from 'src/payload-types'
import { LogoIcon } from '@/components/icons/logo'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/Auth'
import { cn } from '@/utilities/cn'
import { SearchIcon, User, Package, Download, Settings, LogOut, LayoutDashboard } from 'lucide-react'

type Props = { header: Header }

function AccountDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const isAdmin = user?.roles?.includes('admin')

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const items = [
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/downloads', icon: Download, label: 'Downloads' },
    { href: '/account', icon: Settings, label: 'Settings' },
    { href: '/logout', icon: LogOut, label: 'Sign out' },
  ]

  const handleAccountNav = (href: string) => {
    sessionStorage.setItem('account_entered_from', window.location.href)
    setOpen(false)
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-muted transition-colors',
          pathname.startsWith('/account') || pathname.startsWith('/orders') || pathname.startsWith('/downloads')
            ? 'text-primary font-medium'
            : '',
        )}
      >
        <User className="h-4 w-4" />
        <span className="hidden lg:inline">Account</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-background shadow-lg py-1 z-50">
          {user && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">
              {user.email}
            </div>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Dashboard
            </Link>
          )}
          {isAdmin && <div className="border-t my-1" />}
          {items.map((item) =>
            item.href === '/logout' ? (
              <button
                key={item.href}
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleAccountNav(item.href)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export function HeaderClient({ header }: Props) {
  const menu = header.navItems || []
  const pathname = usePathname()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/?q=${encodeURIComponent(searchValue.trim())}`)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="flex items-center justify-between container h-14 gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="block md:hidden">
            <Suspense fallback={null}>
              <MobileMenu menu={menu} />
            </Suspense>
          </div>
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <LogoIcon className="w-6 h-auto" />
            <span className="hidden sm:inline">DigitalStore</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 rounded-lg border bg-muted/30 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </form>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Suspense fallback={<OpenCartButton />}>
            <Cart />
          </Suspense>
          <AccountDropdown />
        </div>
      </nav>
    </div>
  )
}
