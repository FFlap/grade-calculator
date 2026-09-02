import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { SignInPrompt } from '@/components/SignInPrompt'
import {
  formatGradeInputForDisplay,
  type Grade,
} from '@/components/calculator/types'
import {
  buildCalendarGrid,
  type CalendarMonthCursor,
  buildUpcomingAssessments,
  countAssessmentsInMonth,
  countDueBetween,
  formatDayLabel,
  formatMonthLabel,
  formatRangeLabel,
  getDatePlusDaysISO,
  groupAssessmentsByDate,
  isCompletedAssessment,
  isSameISODate,
  parseISODate,
  toISODate,
} from '@/lib/calendar-helpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/calendar')({
  component: CalendarPage,
})

type CalendarAssessment = Grade & { dueDate: string; courseName: string }
type CalendarClock = { todayISO: string; currentMonth: CalendarMonthCursor }

const fallbackMonthCursor = { year: 2000, month: 0 }
const fallbackTodayISO = '2000-01-01'
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarPage() {
  const { isLoaded, isSignedIn } = useUser()

  const datedGradesData = useQuery(api.grades.listDated) as
    | CalendarAssessment[]
    | undefined
  const isInitialLoading = !isLoaded || (isSignedIn && datedGradesData === undefined)
  const dated = datedGradesData ?? []

  const [calendarClock, setCalendarClock] = useState<CalendarClock | null>(null)
  const [monthCursor, setMonthCursor] = useState<CalendarMonthCursor | null>(null)
  const [openDayISO, setOpenDayISO] = useState<string | null>(null)
  const filtered = dated

  useEffect(() => {
    const now = new Date()
    const currentMonth = { year: now.getFullYear(), month: now.getMonth() }
    setCalendarClock({ todayISO: toISODate(now), currentMonth })
    setMonthCursor(currentMonth)
  }, [])

  const activeMonthCursor =
    monthCursor ?? calendarClock?.currentMonth ?? fallbackMonthCursor
  const todayISO = calendarClock?.todayISO ?? fallbackTodayISO

  const byDate = useMemo(() => {
    return groupAssessmentsByDate(filtered)
  }, [filtered])

  const upcomingEndISO = useMemo(() => {
    return getDatePlusDaysISO(todayISO, 30)
  }, [todayISO])

  const upcoming = useMemo(() => {
    return buildUpcomingAssessments(filtered, todayISO, upcomingEndISO)
  }, [filtered, todayISO, upcomingEndISO])

  const thisWeekEndISO = useMemo(() => {
    return getDatePlusDaysISO(todayISO, 7)
  }, [todayISO])

  const thisWeekCount = useMemo(() => {
    return countDueBetween(upcoming, todayISO, thisWeekEndISO)
  }, [thisWeekEndISO, todayISO, upcoming])

  const currentMonthCount = useMemo(() => {
    return countAssessmentsInMonth(filtered, activeMonthCursor)
  }, [filtered, activeMonthCursor])

  const grid = useMemo(() => {
    return buildCalendarGrid(activeMonthCursor)
  }, [activeMonthCursor])

  const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
    value: String(monthIndex),
    label: formatMonthLabel({
      year: activeMonthCursor.year,
      month: monthIndex,
    }),
  }))

  const handleSelectMonth = (value: string) => {
    const nextMonth = Number(value)
    if (!Number.isFinite(nextMonth)) return
    setMonthCursor((d) => ({
      year: (d ?? activeMonthCursor).year,
      month: nextMonth,
    }))
  }

  const handlePreviousMonth = () => {
    setMonthCursor((d) => {
      const current = d ?? activeMonthCursor
      return current.month === 0
        ? { year: current.year - 1, month: 11 }
        : { year: current.year, month: current.month - 1 }
    })
  }

  const handleNextMonth = () => {
    setMonthCursor((d) => {
      const current = d ?? activeMonthCursor
      return current.month === 11
        ? { year: current.year + 1, month: 0 }
        : { year: current.year, month: current.month + 1 }
    })
  }

  const handleToday = () => {
    if (calendarClock) setMonthCursor(calendarClock.currentMonth)
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-page-header-inner">
          <div className="app-page-title-row">
            <div>
              <h1 className="app-page-title">Calendar</h1>
              <p className="app-page-subtitle">
                Plan deadlines, exams, and course milestones.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className={isInitialLoading || !isSignedIn ? 'app-page-body' : 'p-4 sm:p-6'}>
        {isInitialLoading ? (
          null
        ) : !isSignedIn ? (
          <div className="app-page-body-narrow">
            <CalendarSignInPrompt />
          </div>
        ) : (
          <div className="grid w-full items-start gap-5 lg:grid-cols-[20.5rem_minmax(0,1fr)] lg:gap-6">
            <UpcomingSidebar
              upcoming={upcoming}
              todayISO={todayISO}
              thisWeekEndISO={thisWeekEndISO}
              thisWeekCount={thisWeekCount}
              onOpenDay={setOpenDayISO}
            />
            <MonthBoard
              monthCursor={activeMonthCursor}
              monthOptions={monthOptions}
              currentMonthCount={currentMonthCount}
              grid={grid}
              byDate={byDate}
              todayISO={todayISO}
              onSelectMonth={handleSelectMonth}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              onOpenDay={setOpenDayISO}
            />
          </div>
        )}
      </main>

      <DayDrawer
        openDayISO={openDayISO}
        byDate={byDate}
        onClose={() => setOpenDayISO(null)}
      />
    </div>
  )
}

type OpenDayHandler = (iso: string) => void

function CalendarSignInPrompt() {
  return (
    <SignInPrompt
      icon={Calendar}
      title="Sign in to use the calendar"
      description="Assessment dates are saved to your account, so you'll need to sign in to see them here."
    />
  )
}

function UpcomingSidebar({
  upcoming,
  todayISO,
  thisWeekEndISO,
  thisWeekCount,
  onOpenDay,
}: {
  upcoming: CalendarAssessment[]
  todayISO: string
  thisWeekEndISO: string
  thisWeekCount: number
  onOpenDay: OpenDayHandler
}) {
  const nextDeadline = upcoming[0]

  return (
    <aside className="space-y-4 sm:space-y-5">
      <Card className="overflow-hidden rounded-xl border-border/70 bg-card py-0 shadow-[0_1px_2px_var(--shadow-tint)] sm:rounded-2xl">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Upcoming
            </h2>
          </div>

          <div>
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Next deadline
            </div>
            {nextDeadline ? (
              <NextDeadlineButton item={nextDeadline} onOpenDay={onOpenDay} />
            ) : (
              <div className="mt-4 rounded-md border border-border/70 bg-muted/45 p-4 text-sm text-muted-foreground">
                No upcoming assessments.
              </div>
            )}
          </div>

          <UpcomingStat
            label="This week"
            value={thisWeekCount}
            valueClassName="text-accent-strong"
            title="Upcoming items"
            detail={formatRangeLabel(todayISO, thisWeekEndISO).replace(
              /, \d{4}/g,
              '',
            )}
          />

          <UpcomingStat
            label="Open tasks"
            value={upcoming.length}
            title="Pending tasks"
            detail="All courses"
          />

          <UpcomingEventList upcoming={upcoming} onOpenDay={onOpenDay} />
        </CardContent>
      </Card>
    </aside>
  )
}

function NextDeadlineButton({
  item,
  onOpenDay,
}: {
  item: CalendarAssessment
  onOpenDay: OpenDayHandler
}) {
  const deadlineDate = parseISODate(item.dueDate)

  return (
    <button
      type="button"
      onClick={() => onOpenDay(item.dueDate)}
      className="mt-4 flex w-full items-center gap-3 text-left"
    >
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="bg-primary px-3 py-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground">
          {deadlineDate?.toLocaleDateString(undefined, { month: 'short' }) ??
            'Date'}
        </div>
        <div className="font-display px-3 py-2 text-center text-2xl font-semibold leading-none text-foreground">
          {deadlineDate?.getDate() ?? '—'}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {item.assignmentName?.trim() || 'Assessment'}
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {item.courseName}
        </div>
        <div className="mt-1 text-sm font-medium text-accent-strong">
          {formatDayLabel(item.dueDate).replace(/, \d{4}$/, '')}
        </div>
      </div>
    </button>
  )
}

function UpcomingStat({
  label,
  value,
  valueClassName,
  title,
  detail,
}: {
  label: string
  value: number
  valueClassName?: string
  title: string
  detail: string
}) {
  return (
    <div className="border-t border-border/70 pt-4 sm:pt-5">
      <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.72rem] sm:tracking-[0.16em]">
        {label}
      </div>
      <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4">
        <div
          className={cn(
            'font-display text-4xl font-semibold leading-none text-foreground sm:text-5xl',
            valueClassName,
          )}
        >
          {value}
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  )
}

function UpcomingEventList({
  upcoming,
  onOpenDay,
}: {
  upcoming: CalendarAssessment[]
  onOpenDay: OpenDayHandler
}) {
  return (
    <div className="border-t border-border/70 pt-5">
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Upcoming events
      </div>
      <div className="mt-4 space-y-3">
        {upcoming.length === 0 ? (
          <div className="rounded-md border border-border/70 bg-muted/45 p-4 text-sm text-muted-foreground">
            No upcoming assessments in the next 30 days.
          </div>
        ) : (
          upcoming.slice(0, 4).map((item) => (
            <UpcomingEventButton
              key={String(item._id)}
              item={item}
              onOpenDay={onOpenDay}
            />
          ))
        )}
      </div>
    </div>
  )
}

function UpcomingEventButton({
  item,
  onOpenDay,
}: {
  item: CalendarAssessment
  onOpenDay: OpenDayHandler
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenDay(item.dueDate)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {item.assignmentName?.trim() || 'Assessment'}
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {item.courseName}
        </span>
      </span>
      <span className="shrink-0 text-sm text-muted-foreground">
        {parseISODate(item.dueDate)?.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }) ?? item.dueDate}
      </span>
    </button>
  )
}

function MonthBoard({
  monthCursor,
  monthOptions,
  currentMonthCount,
  grid,
  byDate,
  todayISO,
  onSelectMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onOpenDay,
}: {
  monthCursor: CalendarMonthCursor
  monthOptions: Array<{ value: string; label: string }>
  currentMonthCount: number
  grid: ReturnType<typeof buildCalendarGrid>
  byDate: Map<string, CalendarAssessment[]>
  todayISO: string
  onSelectMonth: (value: string) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onOpenDay: OpenDayHandler
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/70 bg-card py-0 shadow-[0_1px_2px_var(--shadow-tint)] sm:rounded-2xl">
      <CardContent className="p-0">
        <div className="p-4 sm:p-6">
          <MonthBoardHeader
            monthCursor={monthCursor}
            monthOptions={monthOptions}
            currentMonthCount={currentMonthCount}
            onSelectMonth={onSelectMonth}
            onPreviousMonth={onPreviousMonth}
            onNextMonth={onNextMonth}
            onToday={onToday}
          />

          <div className="mt-5 sm:mt-7">
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="grid grid-cols-7 border-b border-border/70 bg-card">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="px-1 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-4 sm:py-3 sm:text-[0.7rem] sm:tracking-[0.16em]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 bg-card">
                {grid.map((cell, index) => (
                  <MonthDayButton
                    key={cell.key}
                    cell={cell}
                    index={index}
                    events={cell.iso ? (byDate.get(cell.iso) ?? []) : []}
                    monthCursor={monthCursor}
                    todayISO={todayISO}
                    onOpenDay={onOpenDay}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            All times shown in your local time.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MonthBoardHeader({
  monthCursor,
  monthOptions,
  currentMonthCount,
  onSelectMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: {
  monthCursor: CalendarMonthCursor
  monthOptions: Array<{ value: string; label: string }>
  currentMonthCount: number
  onSelectMonth: (value: string) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Semester Calendar
        </h2>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {currentMonthCount} item{currentMonthCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_2.25rem_2.25rem] gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <Select value={String(monthCursor.month)} onValueChange={onSelectMonth}>
          <SelectTrigger className="h-9 w-full border-border/70 bg-card text-sm sm:w-48">
            <SelectValue placeholder={formatMonthLabel(monthCursor)} />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="size-9 border-border/70"
          onClick={onPreviousMonth}
          aria-label="Previous month"
          title="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9 border-border/70"
          onClick={onNextMonth}
          aria-label="Next month"
          title="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          className="col-span-full h-9 border-border/70 px-5 text-sm sm:col-span-auto"
          onClick={onToday}
          aria-label="Jump to current month"
          title="Today"
        >
          Today
        </Button>
      </div>
    </div>
  )
}

function MonthDayButton({
  cell,
  index,
  events,
  monthCursor,
  todayISO,
  onOpenDay,
}: {
  cell: ReturnType<typeof buildCalendarGrid>[number]
  index: number
  events: CalendarAssessment[]
  monthCursor: CalendarMonthCursor
  todayISO: string
  onOpenDay: OpenDayHandler
}) {
  const iso = cell.iso
  const isToday = iso ? isSameISODate(iso, todayISO) : false
  const isMuted =
    iso !== null && parseISODate(iso)?.getMonth() !== monthCursor.month

  return (
    <button
      type="button"
      disabled={!iso}
      onClick={() => iso && onOpenDay(iso)}
      className={cn(
        'min-h-16 border-b border-r border-border/70 px-1.5 py-2 text-left transition-colors sm:min-h-[clamp(6.6rem,9.6vh,7.8rem)] sm:px-4 sm:py-3',
        'hover:bg-muted/45 disabled:cursor-default disabled:hover:bg-card',
        index % 7 === 6 && 'border-r-0',
        'bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-sm font-medium',
            isToday
              ? 'bg-primary text-primary-foreground'
              : isMuted
                ? 'text-muted-foreground/55'
                : 'text-foreground',
          )}
        >
          {cell.day ?? ''}
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-2 space-y-1">
          {events.slice(0, 2).map((event) => (
            <div
              key={String(event._id)}
              className="hidden rounded-md bg-accent px-2 py-1 text-xs leading-tight sm:block"
            >
              <div className="truncate font-semibold text-accent-strong">
                {event.assignmentName?.trim() || 'Assessment'}
              </div>
              <div className="mt-0.5 truncate text-muted-foreground">
                {event.courseName}
              </div>
            </div>
          ))}
          {events.length > 2 && (
            <div className="hidden text-[0.68rem] font-medium text-muted-foreground sm:block">
              +{events.length - 2} more
            </div>
          )}
          <div className="text-[0.65rem] font-semibold text-accent-strong sm:hidden">
            {events.length}
          </div>
        </div>
      )}
    </button>
  )
}

function DayDrawer({
  openDayISO,
  byDate,
  onClose,
}: {
  openDayISO: string | null
  byDate: Map<string, CalendarAssessment[]>
  onClose: () => void
}) {
  if (!openDayISO) return null

  const assessments = byDate.get(openDayISO) ?? []
  const assessmentCount = assessments.length

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        role="presentation"
        className="w-full max-w-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Card className="border-border">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-foreground">
                  {formatDayLabel(openDayISO)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {assessmentCount === 0
                    ? 'No assessments.'
                    : `${assessmentCount} assessment${
                        assessmentCount === 1 ? '' : 's'
                      }`}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>

            <div className="space-y-2">
              {assessments.length === 0 ? (
                <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Add a date to an assessment in the Grade Calculator to see it
                  here.
                </div>
              ) : (
                assessments.map((assessment) => (
                  <AssessmentDrawerItem
                    key={String(assessment._id)}
                    assessment={assessment}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AssessmentDrawerItem({
  assessment,
}: {
  assessment: CalendarAssessment
}) {
  const done = isCompletedAssessment(assessment)

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">
          {assessment.assignmentName?.trim() || 'Assessment'}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {assessment.courseName}
          {done
            ? ` · ${formatGradeInputForDisplay(
                assessment.gradeInput ?? '',
              )} · ${assessment.weightInput ?? ''}%`
            : ' · Not graded yet'}
        </div>
      </div>
      {assessment.courseId && (
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/grade-calculator"
            search={{ courseId: assessment.courseId }}
          >
            Open
          </Link>
        </Button>
      )}
    </div>
  )
}
