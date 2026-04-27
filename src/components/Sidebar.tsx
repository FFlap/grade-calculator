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
      'flex items-center gap-2 rounded-md text-sm font-medium transition-[background-color,color,box-shadow,padding,gap] duration-300 ease-out',
      collapsed ? 'justify-center gap-0 px-0 py-2.5' : 'px-3 py-2',
      active
        ? 'bg-sidebar-accent text-primary shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground'
    )

  const collapsedTextClass = cn(
    'inline-block overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out',
    collapsed ? 'max-w-0 -translate-x-1 opacity-0' : 'max-w-40 translate-x-0 opacity-100'
  )

  const sectionLabelClass =
    'px-3 pt-5 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55'
  const collapsedAccountTileClass =
    'mx-auto flex h-11 w-10 items-center justify-center p-0'

  const renderSectionLabel = (label: string, collapsedLabel: string) => (
    <div className={cn(sectionLabelClass, collapsed && 'px-0 text-center')}>
      {collapsed ? collapsedLabel : label}
    </div>
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 bg-sidebar border-r border-sidebar-border z-40 transition-[width] duration-300 ease-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'absolute top-7 right-0 z-50 -translate-y-1/2 translate-x-1/2',
          'h-7 w-7 rounded-md border border-border/80 bg-card shadow-[0_10px_22px_rgba(15,23,42,0.08)]',
          'hover:bg-muted/70 text-sidebar-foreground/80 transition-colors'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 mx-auto" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 mx-auto" />
        )}
      </button>

      <nav className="flex h-full flex-col">
        <div className="p-3">
          <Link
            to="/grade-calculator"
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md font-semibold text-sidebar-foreground transition-[background-color,color,padding,gap] duration-300 ease-out',
              collapsed
                ? 'h-10 w-10 justify-center gap-0 px-0 py-0'
                : 'px-3 py-2 hover:bg-sidebar-accent/50'
            )}
            title="Grade Tracker"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-foreground text-[0.68rem] font-bold text-background">
              G
            </span>
            <span className={cn('text-sm truncate', collapsedTextClass)}>
              Grade Tracker
            </span>
          </Link>
        </div>

        <div className="px-3">
          {renderSectionLabel('Calculators', 'C')}
          <Link
            to="/grade-calculator"
            className={navLinkClass(isGradeCalculatorActive)}
            title="Grade Calculator"
          >
            <Calculator className="h-4 w-4" />
            <span className={collapsedTextClass}>Grade Calculator</span>
          </Link>

          <Link
            to="/gpa-calculator"
            className={navLinkClass(isGpaCalculatorActive)}
            title="GPA Calculator"
          >
            <GraduationCap className="h-4 w-4" />
            <span className={collapsedTextClass}>GPA Calculator</span>
          </Link>

          <Link
            to="/final-exam"
            className={navLinkClass(isFinalExamActive)}
            title="Final Exam"
          >
            <ClipboardPenLine className="h-4 w-4" />
            <span className={collapsedTextClass}>Final Exam</span>
          </Link>

          <SignedIn>
            {renderSectionLabel('Planning', 'P')}
            <Link
              to="/calendar"
              className={navLinkClass(isCalendarActive)}
              title="Calendar"
            >
              <Calendar className="h-4 w-4" />
              <span className={collapsedTextClass}>Calendar</span>
            </Link>

            <Link
              to="/semesters"
              className={navLinkClass(isSemestersActive)}
              title="Semesters"
            >
              <CalendarDays className="h-4 w-4" />
              <span className={collapsedTextClass}>Semesters</span>
            </Link>
          </SignedIn>
        </div>

        <div className="mt-auto p-3 space-y-2">
          <SignedIn>
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-sidebar-border/70 bg-sidebar-accent transition-[padding,gap] duration-300 ease-out',
                collapsed ? collapsedAccountTileClass : 'px-3 py-2'
              )}
            >
              {!collapsed && (
                <div
                  className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/80"
                  title={isLoaded ? displayName : undefined}
                >
                  {isLoaded ? displayName : '...'}
                </div>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonTrigger: collapsed
                      ? 'h-8 w-8 p-0 flex items-center justify-center'
                      : 'h-8 w-8 p-0',
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </div>
          </SignedIn>

          <SignedOut>
            <div
              className={cn(
                'rounded-md border border-sidebar-border/70 bg-sidebar-accent transition-[height,padding,width] duration-300 ease-out',
                collapsed ? collapsedAccountTileClass : 'p-3'
              )}
            >
              <div className={cn('text-xs text-sidebar-foreground/80', collapsedTextClass)}>
                Sign in to save courses, semesters, and grades.
              </div>
              <SignInButton mode="modal">
                <Button
                  size="sm"
                  variant="default"
                  className={cn('mt-2 w-full', collapsed && 'm-0 h-8 w-8 rounded-full p-0')}
                >
                  <LogIn className={cn('h-4 w-4', !collapsed && 'mr-2')} />
                  <span className={collapsedTextClass}>Sign In</span>
                </Button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </nav>
    </aside>
  )
}
