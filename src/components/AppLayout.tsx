import { useUser } from '@clerk/clerk-react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)

  // Redirect signed-in users from / to /grade-calculator
  useEffect(() => {
    if (isLoaded && isSignedIn && location.pathname === '/') {
      navigate({ to: '/grade-calculator' })
    }
  }, [isLoaded, isSignedIn, location.pathname, navigate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSidebarCollapsed(window.localStorage.getItem('sidebarCollapsed') === '1')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsNarrowViewport(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  // Don't render content during redirect
  if (isLoaded && isSignedIn && location.pathname === '/') {
    return null
  }

  const effectiveSidebarCollapsed = sidebarCollapsed || isNarrowViewport

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={effectiveSidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <main
        className={cn(
          'flex-1 transition-[margin] duration-300 ease-out',
          effectiveSidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {children}
      </main>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return <ShellLayout>{children}</ShellLayout>
}
