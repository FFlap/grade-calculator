import { Link, useLocation } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import {
  Calendar,
  CalendarDays,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
  GraduationCap,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
  const isFinalExamActive = location.pathname === '/final-exam'
  const isGpaCalculatorActive = location.pathname === '/gpa-calculator'
  const isSemestersActive = location.pathname === '/semesters'
  const isCalendarActive = location.pathname === '/calendar'

  const displayName =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    'Account'

  const navLinkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
      active
        ? 'bg-sidebar-accent text-primary shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground'
    )

  const sectionLabelClass = cn(
    'px-3 pt-5 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55',
    collapsed && 'sr-only'
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 bg-sidebar border-r border-sidebar-border z-40 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'absolute top-1/2 right-0 z-50 -translate-y-1/2 translate-x-1/2',
          'h-8 w-8 rounded-md border border-sidebar-border/70 bg-sidebar-accent shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
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
                title="Grade Tracker"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded bg-foreground text-[0.68rem] font-bold text-background',
                    collapsed && 'sr-only'
                  )}
                >
                  G
                </span>
                <span className={cn('text-sm truncate', collapsed && 'sr-only')}>
                  Grade Tracker
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="px-3">
          <div className={sectionLabelClass}>Calculators</div>
          <Link
            to="/grade-calculator"
            className={navLinkClass(isGradeCalculatorActive)}
            title="Grade Calculator"
          >
            <Calculator className="h-4 w-4" />
            <span className={cn(collapsed && 'sr-only')}>Grade Calculator</span>
          </Link>

          <Link
            to="/gpa-calculator"
            className={navLinkClass(isGpaCalculatorActive)}
            title="GPA Calculator"
          >
            <GraduationCap className="h-4 w-4" />
            <span className={cn(collapsed && 'sr-only')}>GPA Calculator</span>
          </Link>

          <Link
            to="/final-exam"
            className={navLinkClass(isFinalExamActive)}
            title="Final Exam"
          >
            <ClipboardPenLine className="h-4 w-4" />
            <span className={cn(collapsed && 'sr-only')}>Final Exam</span>
          </Link>

          <SignedIn>
            <div className={sectionLabelClass}>Planning</div>
            <Link
              to="/calendar"
              className={navLinkClass(isCalendarActive)}
              title="Calendar"
            >
              <Calendar className="h-4 w-4" />
              <span className={cn(collapsed && 'sr-only')}>Calendar</span>
            </Link>

            <Link
              to="/semesters"
              className={navLinkClass(isSemestersActive)}
              title="Semesters"
            >
              <CalendarDays className="h-4 w-4" />
              <span className={cn(collapsed && 'sr-only')}>Semesters</span>
            </Link>
          </SignedIn>
        </div>

        <div className="mt-auto p-3 space-y-2">
          <SignedIn>
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-sidebar-border/70 bg-sidebar-accent',
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
          </SignedIn>

          <SignedOut>
            <div
              className={cn(
                'rounded-md border border-sidebar-border/70 bg-sidebar-accent',
                collapsed ? 'p-2' : 'p-3'
              )}
            >
              <div className={cn('text-xs text-sidebar-foreground/80', collapsed && 'sr-only')}>
                Sign in to save courses, semesters, and grades.
              </div>
              <SignInButton mode="modal">
                <Button
                  size="sm"
                  variant="default"
                  className={cn('mt-2 w-full', collapsed && 'mt-0 w-10 h-10 p-0')}
                >
                  <LogIn className={cn('h-4 w-4', !collapsed && 'mr-2')} />
                  <span className={cn(collapsed && 'sr-only')}>Sign In</span>
                </Button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </nav>
    </aside>
  )
}
