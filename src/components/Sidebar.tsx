import { Link, useLocation } from '@tanstack/react-router'
import { UserButton, useUser } from '@clerk/clerk-react'
import { Calculator, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const location = useLocation()
  const { isLoaded, user } = useUser()

  const isGradeCalculatorActive =
    location.pathname === '/grade-calculator' ||
    location.pathname.startsWith('/grade-calculator/')
  const isGpaCalculatorActive = location.pathname === '/gpa-calculator'

  const displayName =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    'Account'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 bg-sidebar border-r border-sidebar-border z-40 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Collapse/expand handle (attached to the right edge) */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 z-50',
          'h-9 w-9 rounded-full border border-sidebar-border bg-sidebar shadow-sm',
          'hover:bg-sidebar-accent/60 text-sidebar-foreground/80 transition-colors'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 mx-auto" />
        ) : (
          <ChevronLeft className="h-4 w-4 mx-auto" />
        )}
      </button>

      <nav className="flex h-full flex-col">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/grade-calculator"
                className={cn(
                  'flex items-center gap-2 rounded-md font-semibold text-sidebar-foreground min-w-0 transition-colors',
                  collapsed ? 'justify-center w-full px-0 py-2.5' : 'px-3 py-2 hover:bg-sidebar-accent/50'
                )}
                title="Grade Calculator"
              >
                <Calculator className="h-4 w-4 text-primary shrink-0" />
                <span className={cn('text-sm truncate', collapsed && 'sr-only')}>
                  Grade Calculator
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="px-3 space-y-1">
          <Link
            to="/grade-calculator"
            className={cn(
              'flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
              isGradeCalculatorActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
            title="Grade Calculator"
          >
            <Calculator className="h-4 w-4" />
            <span className={cn(collapsed && 'sr-only')}>Grade Calculator</span>
          </Link>

          <Link
            to="/gpa-calculator"
            className={cn(
              'flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
              isGpaCalculatorActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
            title="GPA Calculator"
          >
            <GraduationCap className="h-4 w-4" />
            <span className={cn(collapsed && 'sr-only')}>GPA Calculator</span>
          </Link>
        </div>

        <div className="mt-auto p-3 space-y-2">
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
            )}
          >
            <div
              className={cn(
                'min-w-0 flex-1 text-xs text-sidebar-foreground/80 truncate',
                collapsed && 'sr-only'
              )}
              title={isLoaded ? displayName : undefined}
            >
              {isLoaded ? displayName : '...'}
            </div>
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'h-8 w-8' } }}
            />
          </div>
        </div>
      </nav>
    </aside>
  )
}
