import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatGradeInputForDisplay,
  type Grade,
} from '@/components/calculator/types'
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

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isSameISODate(a: string, b: string) {
  return a === b
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map((v) => Number(v))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function normalizeToISODate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const strict = parseISODate(trimmed)
  if (strict) return toISODate(strict)

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return toISODate(
    new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  )
}

function formatMonthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatDayLabel(iso: string) {
  const dt = parseISODate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRangeLabel(startISO: string, endISO: string) {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  if (!start || !end) return `${startISO}–${endISO}`

  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
  const endFmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startFmt.format(start)} – ${endFmt.format(end)}`
}

function isCompletedAssessment(a: CalendarAssessment) {
  const weight = typeof a.weight === 'number' ? a.weight : 0
  const hasGrade = (a.gradeInput ?? '').trim().length > 0
  return weight > 0 && hasGrade
}

function CalendarPage() {
  const { isLoaded, isSignedIn } = useUser()

  const datedGradesData = useQuery(api.grades.listDated) as
    | CalendarAssessment[]
    | undefined
  const dated = datedGradesData ?? []

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [openDayISO, setOpenDayISO] = useState<string | null>(null)
  const filtered = dated

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarAssessment[]>()
    for (const g of filtered) {
      const key = normalizeToISODate(g.dueDate)
      if (!key) continue
      const list = map.get(key)
      if (list) list.push(g)
      else map.set(key, [g])
    }
    for (const [k, list] of map) {
      list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      map.set(k, list)
    }
    return map
  }, [filtered])

  const todayISO = useMemo(() => toISODate(new Date()), [])

  const upcomingEndISO = useMemo(() => {
    const start = parseISODate(todayISO)
    if (!start) {
      const fallback = new Date()
      fallback.setDate(fallback.getDate() + 30)
      return toISODate(fallback)
    }
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    end.setDate(end.getDate() + 30)
    return toISODate(end)
  }, [todayISO])

  const upcoming = useMemo(() => {
    return filtered
      .map((a) => {
        const iso = normalizeToISODate(a.dueDate)
        if (!iso) return null
        return { ...a, dueDate: iso }
      })
      .filter((a): a is CalendarAssessment => a !== null)
      .filter((a) => {
        if (a.dueDate < todayISO) return false // overdue
        if (a.dueDate > upcomingEndISO) return false
        return !isCompletedAssessment(a)
      })
      .sort((a, b) => {
        const byDue = String(a.dueDate).localeCompare(String(b.dueDate))
        if (byDue !== 0) return byDue
        return (a.createdAt ?? 0) - (b.createdAt ?? 0)
      })
  }, [filtered, todayISO, upcomingEndISO])

  const thisWeekEndISO = useMemo(() => {
    const start = parseISODate(todayISO)
    if (!start) return upcomingEndISO
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    end.setDate(end.getDate() + 7)
    return toISODate(end)
  }, [todayISO, upcomingEndISO])

  const thisWeekCount = useMemo(() => {
    return upcoming.filter(
      (item) => item.dueDate >= todayISO && item.dueDate <= thisWeekEndISO,
    ).length
  }, [thisWeekEndISO, todayISO, upcoming])

  const currentMonthCount = useMemo(() => {
    const monthPrefix = `${monthCursor.getFullYear()}-${pad2(monthCursor.getMonth() + 1)}`
    return filtered.reduce((count, item) => {
      const iso = normalizeToISODate(item.dueDate)
      return iso?.startsWith(monthPrefix) ? count + 1 : count
    }, 0)
  }, [filtered, monthCursor])

  const grid = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()

    const first = new Date(year, month, 1)
    const startOffset = first.getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ iso: null, day: null })
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, month, day)
      cells.push({ iso: toISODate(dt), day })
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: null })
    return cells
  }, [monthCursor])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
    value: String(monthIndex),
    label: new Date(
      monthCursor.getFullYear(),
      monthIndex,
      1,
    ).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
  }))

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

      <main className="px-6 py-6">
        {!isLoaded ? null : !isSignedIn ? (
          <Card className="mx-auto max-w-2xl rounded-2xl border-border/70 py-0">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Calendar className="h-6 w-6 text-foreground/70" />
              </div>
              <div className="mb-1 text-lg font-semibold text-foreground">
                Sign in to use the calendar
              </div>
              <div className="text-sm text-muted-foreground">
                Assessment dates are saved to your account, so you’ll need to
                sign in to see them here.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid w-full items-start gap-6 lg:grid-cols-[20.5rem_minmax(0,1fr)]">
            <aside className="space-y-5">
              <Card className="overflow-hidden rounded-2xl border-[#dfe4ea] bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <CardContent className="space-y-6 p-6">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Upcoming
                    </h2>
                  </div>

                  <div>
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Next deadline
                    </div>
                    {upcoming[0] ? (
                      <button
                        type="button"
                        onClick={() => setOpenDayISO(upcoming[0].dueDate)}
                        className="mt-4 flex w-full items-center gap-3 text-left"
                      >
                        <div className="overflow-hidden rounded-lg border border-[#dfe4ea] bg-white shadow-sm">
                          <div className="bg-primary px-3 py-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                            {parseISODate(
                              upcoming[0].dueDate,
                            )?.toLocaleDateString(undefined, {
                              month: 'short',
                            }) ?? 'Date'}
                          </div>
                          <div className="px-3 py-2 text-center text-2xl font-semibold leading-none text-foreground">
                            {parseISODate(upcoming[0].dueDate)?.getDate() ??
                              '—'}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {upcoming[0].assignmentName?.trim() || 'Assessment'}
                          </div>
                          <div className="mt-1 truncate text-sm text-muted-foreground">
                            {upcoming[0].courseName}
                          </div>
                          <div className="mt-1 text-sm font-medium text-primary">
                            {formatDayLabel(upcoming[0].dueDate).replace(
                              /, \d{4}$/,
                              '',
                            )}
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="mt-4 rounded-xl border border-[#dfe4ea] bg-[#f7f9fb] p-4 text-sm text-muted-foreground">
                        No upcoming assessments.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#e5e9ee] pt-5">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      This week
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="text-5xl font-semibold leading-none text-primary">
                        {thisWeekCount}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Upcoming items
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatRangeLabel(todayISO, thisWeekEndISO).replace(
                            /, \d{4}/g,
                            '',
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#e5e9ee] pt-5">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Open tasks
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="text-5xl font-semibold leading-none text-foreground">
                        {upcoming.length}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Pending tasks
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          All courses
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#e5e9ee] pt-5">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Upcoming events
                    </div>
                    <div className="mt-4 space-y-3">
                      {upcoming.length === 0 ? (
                        <div className="rounded-xl border border-[#dfe4ea] bg-[#f7f9fb] p-4 text-sm text-muted-foreground">
                          No upcoming assessments in the next 30 days.
                        </div>
                      ) : (
                        upcoming.slice(0, 4).map((item) => (
                          <button
                            key={String(item._id)}
                            type="button"
                            onClick={() => setOpenDayISO(item.dueDate)}
                            className="flex w-full items-start gap-3 text-left"
                          >
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {item.assignmentName?.trim() || 'Assessment'}
                              </span>
                              <span className="mt-1 block truncate text-sm text-muted-foreground">
                                {item.courseName}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {parseISODate(item.dueDate)?.toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                },
                              ) ?? item.dueDate}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            <Card className="overflow-hidden rounded-2xl border-[#dfe4ea] bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <CardContent className="p-0">
                <div className="px-6 py-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        Semester Calendar
                      </h2>
                      <span className="hidden text-sm text-muted-foreground sm:inline">
                        {currentMonthCount} item
                        {currentMonthCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Select
                        value={String(monthCursor.getMonth())}
                        onValueChange={(value) => {
                          const nextMonth = Number(value)
                          if (Number.isFinite(nextMonth)) {
                            setMonthCursor(
                              (d) => new Date(d.getFullYear(), nextMonth, 1),
                            )
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 w-48 rounded-xl border-[#dfe4ea] bg-white text-base">
                          <SelectValue
                            placeholder={formatMonthLabel(monthCursor)}
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                        className="h-11 w-11 rounded-xl border-[#dfe4ea]"
                        onClick={() =>
                          setMonthCursor(
                            (d) =>
                              new Date(d.getFullYear(), d.getMonth() - 1, 1),
                          )
                        }
                        aria-label="Previous month"
                        title="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl border-[#dfe4ea]"
                        onClick={() =>
                          setMonthCursor(
                            (d) =>
                              new Date(d.getFullYear(), d.getMonth() + 1, 1),
                          )
                        }
                        aria-label="Next month"
                        title="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl border-[#dfe4ea] px-6 text-base"
                        onClick={() => {
                          const now = new Date()
                          setMonthCursor(
                            new Date(now.getFullYear(), now.getMonth(), 1),
                          )
                        }}
                        aria-label="Jump to current month"
                        title="Today"
                      >
                        Today
                      </Button>
                    </div>
                  </div>

                  <div className="mt-7 overflow-x-auto">
                    <div className="min-w-[46rem] overflow-hidden rounded-xl border border-[#dfe4ea] bg-white">
                      <div className="grid grid-cols-7 border-b border-[#e5e9ee] bg-white">
                        {weekDays.map((day) => (
                          <div
                            key={day}
                            className="px-4 py-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 bg-white">
                        {grid.map((cell, idx) => {
                          const iso = cell.iso
                          const events = iso ? (byDate.get(iso) ?? []) : []
                          const isToday = iso
                            ? isSameISODate(iso, todayISO)
                            : false
                          const isMuted =
                            iso !== null &&
                            parseISODate(iso)?.getMonth() !==
                              monthCursor.getMonth()

                          return (
                            <button
                              key={`${idx}-${iso ?? 'blank'}`}
                              type="button"
                              disabled={!iso}
                              onClick={() => iso && setOpenDayISO(iso)}
                              className={cn(
                                'min-h-[clamp(6.6rem,9.6vh,7.8rem)] border-b border-r border-[#e5e9ee] px-4 py-3 text-left transition-colors',
                                'hover:bg-[#f7f9fb] disabled:cursor-default disabled:hover:bg-white',
                                idx % 7 === 6 && 'border-r-0',
                                'bg-white',
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
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
                                      className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs leading-tight"
                                    >
                                      <div className="truncate font-semibold text-primary">
                                        {event.assignmentName?.trim() ||
                                          'Assessment'}
                                      </div>
                                      <div className="mt-0.5 truncate text-muted-foreground">
                                        {event.courseName}
                                      </div>
                                    </div>
                                  ))}
                                  {events.length > 2 && (
                                    <div className="text-[0.68rem] font-medium text-muted-foreground">
                                      +{events.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    All times shown in your local time.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {openDayISO && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setOpenDayISO(null)}
        >
          <div
            className="w-full max-w-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {formatDayLabel(openDayISO)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const count = (byDate.get(openDayISO) ?? []).length
                        return count === 0
                          ? 'No assessments.'
                          : `${count} assessment${count === 1 ? '' : 's'}`
                      })()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenDayISO(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-2">
                  {(byDate.get(openDayISO) ?? []).length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Add a date to an assessment in the Grade Calculator to see
                      it here.
                    </div>
                  ) : (
                    (byDate.get(openDayISO) ?? []).map((e) => {
                      const done = isCompletedAssessment(e)
                      return (
                        <div
                          key={String(e._id)}
                          className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {e.assignmentName?.trim() || 'Assessment'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {e.courseName}
                              {done
                                ? ` · ${formatGradeInputForDisplay(e.gradeInput ?? '')} · ${e.weightInput ?? ''}%`
                                : ' · Not graded yet'}
                            </div>
                          </div>
                          {e.courseId && (
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                to="/grade-calculator/$courseId"
                                params={{ courseId: e.courseId }}
                              >
                                Open
                              </Link>
                            </Button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
