import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, Dot, Filter } from 'lucide-react'
import type { Course, Grade } from '@/components/calculator/types'
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
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
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
  return toISODate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
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

function formatSidebarDayLabel(iso: string) {
  const dt = parseISODate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
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

  const coursesData = useQuery(api.courses.list) as Course[] | undefined
  const courses = coursesData ?? []
  const datedGradesData = useQuery(api.grades.listDated) as CalendarAssessment[] | undefined
  const dated = datedGradesData ?? []

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [activeCourseId, setActiveCourseId] = useState<string>('all')
  const [openDayISO, setOpenDayISO] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (activeCourseId === 'all') return dated
    return dated.filter((d) => String(d.courseId ?? '') === activeCourseId)
  }, [activeCourseId, dated])

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

  const activeCourseLabel = useMemo(() => {
    if (activeCourseId === 'all') return 'All courses'
    const match = courses.find((c) => String(c._id) === activeCourseId)
    return match?.name ?? 'Selected course'
  }, [activeCourseId, courses])

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, CalendarAssessment[]>()
    for (const e of upcoming) {
      const key = e.dueDate
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    for (const [k, list] of map) {
      list.sort((a, b) => {
        const courseCmp = (a.courseName ?? '').localeCompare(b.courseName ?? '')
        if (courseCmp !== 0) return courseCmp
        const nameA = (a.assignmentName ?? '').trim() || 'Assessment'
        const nameB = (b.assignmentName ?? '').trim() || 'Assessment'
        return nameA.localeCompare(nameB)
      })
      map.set(k, list)
    }
    return map
  }, [upcoming])

  const upcomingDates = useMemo(() => {
    return [...upcomingByDate.keys()].sort((a, b) => a.localeCompare(b))
  }, [upcomingByDate])

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground">
              Track assessment dates across all your courses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
              }
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
              }
              aria-label="Next month"
              title="Next month"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              onClick={() => {
                const now = new Date()
                setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1))
              }}
              aria-label="Jump to current month"
              title="Today"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Month
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatMonthLabel(monthCursor)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeCourseId}
                onValueChange={(v) => setActiveCourseId(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={String(c._id)} value={String(c._id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!isLoaded ? null : !isSignedIn ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-accent/30 border border-border flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-foreground/70" />
              </div>
              <div className="text-lg font-semibold text-foreground mb-1">
                Sign in to use the calendar
              </div>
              <div className="text-sm text-muted-foreground">
                Assessment dates are saved to your account, so you’ll need to sign in to see them here.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="min-w-0">
              <Card className="border-border overflow-hidden py-0 gap-0">
                <div className="grid grid-cols-7 bg-card border-b border-border/60">
                  {weekDays.map((d) => (
                    <div
                      key={d}
                      className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 bg-card">
                  {grid.map((cell, idx) => {
                    const iso = cell.iso
                    const events = iso ? byDate.get(iso) ?? [] : []
                    const isToday = iso ? isSameISODate(iso, todayISO) : false

                    return (
                      <button
                        key={`${idx}-${iso ?? 'blank'}`}
                        type="button"
                        disabled={!iso}
                        onClick={() => iso && setOpenDayISO(iso)}
                        className={cn(
                          'min-h-[108px] border-b border-border/60 border-r border-border/60 text-left px-3 py-2 transition-colors',
                          'hover:bg-accent/25 disabled:hover:bg-transparent disabled:cursor-default',
                          idx % 7 === 6 && 'border-r-0',
                          iso ? 'bg-card' : 'bg-card/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={cn(
                              'text-xs font-semibold',
                              isToday
                                ? 'text-primary'
                                : iso
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {cell.day ?? ''}
                          </div>
                          {events.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              {events.length} item{events.length === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>

                        {events.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {events.slice(0, 2).map((e) => {
                              const done = isCompletedAssessment(e)
                              return (
                                <div
                                  key={String(e._id)}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-xs leading-tight',
                                    done
                                      ? 'bg-primary/10 border-primary/20 text-foreground'
                                      : 'bg-muted/40 border-border text-foreground'
                                  )}
                                >
                                  <div className="flex items-start gap-1">
                                    <Dot className="h-4 w-4 -ml-1 text-muted-foreground" />
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        {e.assignmentName?.trim() || 'Assessment'}
                                      </div>
                                      <div className="truncate text-muted-foreground">
                                        {e.courseName}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            {events.length > 2 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{events.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Card>
            </div>

            <aside className="self-start lg:sticky lg:top-6">
              <Card className="border-border">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Upcoming
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        Next 30 days
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeCourseLabel} · {formatRangeLabel(todayISO, upcomingEndISO)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {upcoming.length}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-140px)] overflow-auto pr-1">
                    {upcoming.length === 0 ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        No upcoming assessments in the next 30 days.
                      </div>
                    ) : (
                      upcomingDates.map((dateISO) => {
                        const items = upcomingByDate.get(dateISO) ?? []
                        return (
                          <div key={dateISO} className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setOpenDayISO(dateISO)}
                              className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent/25 transition-colors"
                            >
                              <div className="text-xs font-semibold text-foreground">
                                {dateISO === todayISO ? 'Today' : formatSidebarDayLabel(dateISO)}
                              </div>
                              <div className="text-xs text-muted-foreground tabular-nums">
                                {items.length}
                              </div>
                            </button>

                            <div className="space-y-2">
                              {items.map((e) => {
                                const assignment = e.assignmentName?.trim() || 'Assessment'
                                const weight =
                                  (e.weightInput ?? '').trim().length > 0
                                    ? (e.weightInput ?? '').trim()
                                    : null

                                return (
                                  <div
                                    key={String(e._id)}
                                    className="rounded-lg border border-border bg-card px-3 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="truncate font-medium text-foreground">
                                          {assignment}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                          {e.courseName}
                                          {weight && (
                                            <span className="ml-2 inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                                              {weight}%
                                            </span>
                                          )}
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
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>

      {openDayISO && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setOpenDayISO(null)}
        >
          <div className="w-full max-w-lg" onMouseDown={(e) => e.stopPropagation()}>
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
                  <Button variant="outline" size="sm" onClick={() => setOpenDayISO(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-2">
                  {(byDate.get(openDayISO) ?? []).length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Add a date to an assessment in the Grade Calculator to see it here.
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
                                ? ` · ${e.gradeInput ?? ''}${e.gradeType === 'letters' ? '' : '%'} · ${e.weightInput ?? ''}%`
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
