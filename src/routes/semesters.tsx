import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { DragEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  calculateWeightedAverage,
  LETTER_GRADE_THRESHOLDS,
  percentageToLetter,
  sanitizeNumberInput,
  type Course,
  type Grade,
  type GradeRow,
  type Semester,
} from '@/components/calculator/types'
import {
  CalendarPlus,
  CalendarCheck2,
  ChevronDown,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'

const LETTER_TO_GPA: Record<string, number> = {
  'A+': 4.0,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'D-': 0.7,
  'F': 0.0,
}

export const Route = createFileRoute('/semesters')({
  component: SemestersPage,
})

function SemestersPage() {
  const overview = useQuery(api.semesters.overview) as
    | { semesters: Semester[]; courses: Course[]; grades: Grade[] }
    | undefined

  const addSemester = useMutation(api.semesters.add)
  const updateSemesterStatus = useMutation(api.semesters.updateStatus)
  const removeSemester = useMutation(api.semesters.remove)
  const updateSemesterName = useMutation(api.semesters.updateName)
  const addCourse = useMutation(api.courses.add)
  const updateCourseSemester = useMutation(api.courses.updateSemester)
  const updateCourseCredits = useMutation(api.courses.updateCredits)
  const updateCourseName = useMutation(api.courses.updateName)
  const removeCourse = useMutation(api.courses.remove)

  const semesters = overview?.semesters ?? []
  const courses = overview?.courses ?? []
  const grades = overview?.grades ?? []

  const gradesByCourseId = useMemo(() => {
    const map = new Map<string, Grade[]>()
    for (const g of grades) {
      if (!g.courseId) continue
      const key = String(g.courseId)
      const list = map.get(key)
      if (list) list.push(g)
      else map.set(key, [g])
    }
    return map
  }, [grades])

  const sortedSemesters = useMemo(() => {
    const copy = [...semesters]
    copy.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    })
    return copy
  }, [semesters])

  const currentSemester = useMemo(() => {
    return semesters.find((s) => s.isCurrent) ?? null
  }, [semesters])

  const [openSemesterIds, setOpenSemesterIds] = useState<Set<string>>(new Set())
  const didInitOpenRef = useRef(false)
  useEffect(() => {
    if (didInitOpenRef.current) return
    if (currentSemester) {
      setOpenSemesterIds(new Set([String(currentSemester._id)]))
      didInitOpenRef.current = true
      return
    }
    if (sortedSemesters[0]) {
      setOpenSemesterIds(new Set([String(sortedSemesters[0]._id)]))
      didInitOpenRef.current = true
    }
  }, [currentSemester, sortedSemesters])

  const [settingsSemesterId, setSettingsSemesterId] = useState<string | null>(null)
  const [semesterSettingsName, setSemesterSettingsName] = useState('')
  const [isSemesterSettingsWorking, setIsSemesterSettingsWorking] = useState(false)

  const courseById = useMemo(() => {
    const map = new Map<string, Course>()
    for (const c of courses) map.set(String(c._id), c)
    return map
  }, [courses])

  const coursesBySemesterId = useMemo(() => {
    const map = new Map<string, Course[]>()
    for (const c of courses) {
      const key = c.semesterId ? String(c.semesterId) : 'unassigned'
      const list = map.get(key)
      if (list) list.push(c)
      else map.set(key, [c])
    }
    for (const [k, list] of map) {
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      map.set(k, list)
    }
    return map
  }, [courses])

  const getCourseCredits = (course: Course) => {
    const parsed = typeof course.credits === 'number' ? course.credits : 3
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3
  }

  const getCourseRowsForCalc = (courseGrades: Grade[]): GradeRow[] => {
    const rows = courseGrades.map((g) => ({
      id: String(g.clientRowId ?? g._id),
      assignment: g.assignmentName ?? '',
      date: g.dueDate ?? '',
      grade: g.gradeInput ?? String(g.grade ?? ''),
      weight: g.weightInput ?? String(g.weight ?? ''),
    }))
    return rows
  }

  const getCoursePercent = (course: Course) => {
    const courseGrades = gradesByCourseId.get(String(course._id)) ?? []
    const rows = getCourseRowsForCalc(courseGrades)
    const calc = calculateWeightedAverage(rows)
    return calc?.average ?? null
  }

  const getCourseLetter = (course: Course, percent: number) => {
    const thresholds = course.letterGradeThresholds ?? LETTER_GRADE_THRESHOLDS
    return percentageToLetter(percent, thresholds)
  }

  const getTermGpa = (semesterId: string) => {
    const termCourses = coursesBySemesterId.get(semesterId) ?? []
    let totalPoints = 0
    let totalCredits = 0

    for (const course of termCourses) {
      const percent = getCoursePercent(course)
      if (percent === null) continue
      const letter = getCourseLetter(course, percent)
      const points = LETTER_TO_GPA[letter]
      if (points === undefined) continue
      const credits = getCourseCredits(course)
      totalPoints += points * credits
      totalCredits += credits
    }
    if (totalCredits === 0) return null
    return totalPoints / totalCredits
  }

  const cumulative = useMemo(() => {
    let totalPoints = 0
    let totalCredits = 0
    let creditsSum = 0

    for (const course of courses) {
      const credits = getCourseCredits(course)
      creditsSum += credits
      const percent = getCoursePercent(course)
      if (percent === null) continue
      const letter = getCourseLetter(course, percent)
      const points = LETTER_TO_GPA[letter]
      if (points === undefined) continue
      totalPoints += points * credits
      totalCredits += credits
    }
    return {
      gpa: totalCredits > 0 ? totalPoints / totalCredits : null,
      credits: creditsSum,
      semestersCompleted: semesters.filter((s) => s.status === 'completed').length,
    }
  }, [courses, semesters, gradesByCourseId])

  const [newSemesterName, setNewSemesterName] = useState('')
  const [newSemesterStatus, setNewSemesterStatus] = useState<'in_progress' | 'completed'>(
    'in_progress'
  )

  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false)
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [addCourseSemesterId, setAddCourseSemesterId] = useState<string | null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCredits, setNewCourseCredits] = useState('3')

  const [settingsCourseId, setSettingsCourseId] = useState<string | null>(null)
  const [courseSettingsName, setCourseSettingsName] = useState('')
  const [courseSettingsCredits, setCourseSettingsCredits] = useState('3')
  const [isCourseSettingsWorking, setIsCourseSettingsWorking] = useState(false)
  const [draggingCourseId, setDraggingCourseId] = useState<string | null>(null)
  const [dragOverSemesterId, setDragOverSemesterId] = useState<string | null>(null)
  const draggingCourseIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!settingsCourseId) return
    if (courseById.get(settingsCourseId)) return
    setSettingsCourseId(null)
  }, [courseById, settingsCourseId])

  useEffect(() => {
    if (!settingsSemesterId) return
    const sem = semesters.find((s) => String(s._id) === settingsSemesterId) ?? null
    if (!sem) {
      setSettingsSemesterId(null)
      return
    }
    setSemesterSettingsName(sem.name ?? '')
  }, [semesters, settingsSemesterId])

  const openCourseSettings = (course: Course) => {
    setSettingsCourseId(String(course._id))
    setCourseSettingsName(course.name ?? '')
    setCourseSettingsCredits(String(course.credits ?? 3))
    setSettingsSemesterId(null)
    setIsAddSemesterOpen(false)
    setIsAddCourseOpen(false)
  }

  const handleCreateSemester = async () => {
    const name = newSemesterName.trim()
    if (!name) return
    const status = newSemesterStatus

    await addSemester({
      name,
      status,
      makeCurrent: status === 'in_progress',
    })

    setNewSemesterName('')
    setNewSemesterStatus('in_progress')
    setIsAddSemesterOpen(false)
  }

  const handleCreateCourse = async () => {
    const name = newCourseName.trim()
    if (!name || !addCourseSemesterId) return
    const creditsParsed = parseFloat(newCourseCredits)
    const credits = Number.isFinite(creditsParsed) && creditsParsed > 0 ? creditsParsed : 3

    await addCourse({
      name,
      semesterId: addCourseSemesterId as Semester['_id'],
      credits,
    })

    setNewCourseName('')
    setNewCourseCredits('3')
    setAddCourseSemesterId(null)
    setIsAddCourseOpen(false)
  }

  const handleSaveCourseSettings = async () => {
    if (!settingsCourseId) return
    const course = courseById.get(settingsCourseId) ?? null
    if (!course) return

    const name = courseSettingsName.trim()
    if (!name) return
    const creditsParsed = parseFloat(courseSettingsCredits)
    const credits = Number.isFinite(creditsParsed) && creditsParsed > 0 ? creditsParsed : 3

    try {
      setIsCourseSettingsWorking(true)
      await Promise.all([
        updateCourseName({ id: course._id, name }),
        updateCourseCredits({ id: course._id, credits }),
      ])
      setSettingsCourseId(null)
    } finally {
      setIsCourseSettingsWorking(false)
    }
  }

  const handleDeleteCourseFromSettings = async () => {
    if (!settingsCourseId) return
    const course = courseById.get(settingsCourseId) ?? null
    if (!course) return
    if (!window.confirm(`Delete “${course.name}”? This cannot be undone.`)) {
      return
    }

    try {
      setIsCourseSettingsWorking(true)
      await removeCourse({ id: course._id })
      setSettingsCourseId(null)
    } finally {
      setIsCourseSettingsWorking(false)
    }
  }

  const handleSaveSemesterSettings = async () => {
    if (!settingsSemesterId) return
    const sem = semesters.find((s) => String(s._id) === settingsSemesterId) ?? null
    if (!sem) return

    const name = semesterSettingsName.trim()
    if (!name) return

    try {
      setIsSemesterSettingsWorking(true)
      await updateSemesterName({ id: sem._id, name })
      setSettingsSemesterId(null)
    } finally {
      setIsSemesterSettingsWorking(false)
    }
  }

  const handleCourseDragStart = (
    event: DragEvent<HTMLDivElement>,
    courseId: string
  ) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', courseId)
    draggingCourseIdRef.current = courseId
    setDraggingCourseId(courseId)
  }

  const handleCourseDragEnd = () => {
    draggingCourseIdRef.current = null
    setDraggingCourseId(null)
    setDragOverSemesterId(null)
  }

  const handleCourseDragOver = (
    event: DragEvent,
    targetSemesterId: string
  ) => {
    const isDraggingCourse =
      draggingCourseIdRef.current !== null ||
      Array.from(event.dataTransfer.types).includes('text/plain')
    if (!isDraggingCourse) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverSemesterId(targetSemesterId)
  }

  const handleCourseDrop = async (
    event: DragEvent,
    targetSemesterId: string
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const courseId =
      event.dataTransfer.getData('text/plain') || draggingCourseIdRef.current
    draggingCourseIdRef.current = null
    setDraggingCourseId(null)
    setDragOverSemesterId(null)

    const course = courseId ? courseById.get(courseId) : null
    if (!course) return

    const nextSemesterId =
      targetSemesterId === 'unassigned'
        ? undefined
        : (targetSemesterId as Semester['_id'])
    const currentSemesterId = course.semesterId ? String(course.semesterId) : 'unassigned'
    if (currentSemesterId === targetSemesterId) return

    await updateCourseSemester({
      id: course._id,
      semesterId: nextSemesterId,
    })
  }

  const renderCourseRow = (
    course: Course,
    options: { showAssignToCurrent?: boolean } = {}
  ) => {
    const percent = getCoursePercent(course)
    const letter = percent === null ? null : getCourseLetter(course, percent)
    const courseId = String(course._id)

    return (
      <div
        key={courseId}
        draggable
        onDragStart={(event) => handleCourseDragStart(event, courseId)}
        onDragEnd={handleCourseDragEnd}
        className={cn(
          'grid cursor-grab grid-cols-[minmax(12rem,1fr)_4rem_7rem_8rem_2.5rem] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/12 active:cursor-grabbing',
          draggingCourseId === courseId && 'opacity-50'
        )}
      >
        <div className="min-w-0 flex-1">
          <Link
            to="/grade-calculator/$courseId"
            params={{ courseId: course._id }}
            className="truncate font-medium text-foreground underline-offset-4 hover:underline"
          >
            {course.name}
          </Link>
        </div>

        <div className="text-center text-sm text-foreground">
          {getCourseCredits(course)}
        </div>

        <div className="text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {percent === null || letter === null ? '—' : `${letter} (${Math.round(percent)}%)`}
          </span>
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl px-3"
            asChild
          >
            <Link to="/grade-calculator/$courseId" params={{ courseId: course._id }}>
              Open course
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openCourseSettings(course)}
            title="Course settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {options.showAssignToCurrent && currentSemester && (
            <Button
              size="icon-sm"
              onClick={() =>
                updateCourseSemester({
                  id: course._id,
                  semesterId: currentSemester._id,
                })
              }
              title={`Assign to ${currentSemester.name}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  const semesterCards = sortedSemesters.map((semester) => {
    const semId = String(semester._id)
    const isOpen = openSemesterIds.has(semId)
    const termGpa = getTermGpa(semId)

    const termCourses = coursesBySemesterId.get(semId) ?? []

    const statusLabel =
      semester.isCurrent || semester.status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED'

    return (
      <section
        key={semId}
        onDragOver={(event) => handleCourseDragOver(event, semId)}
        onDragLeave={(event) => {
          const nextTarget = event.relatedTarget
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
          setDragOverSemesterId((prev) => (prev === semId ? null : prev))
        }}
        onDrop={(event) => handleCourseDrop(event, semId)}
        className={cn(
          'overflow-hidden rounded-xl border border-[#e1e5ea] bg-white transition-colors',
          dragOverSemesterId === semId && 'border-primary/30 bg-[#f7f9fb]'
        )}
      >
        <button
          type="button"
          onDragOver={(event) => handleCourseDragOver(event, semId)}
          onDrop={(event) => handleCourseDrop(event, semId)}
          onClick={() => {
            if (draggingCourseIdRef.current) return
            setSettingsCourseId(null)
            setOpenSemesterIds((prev) => {
              const next = new Set(prev)
              if (next.has(semId)) next.delete(semId)
              else next.add(semId)
              if (!next.has(semId)) setSettingsSemesterId(null)
              return next
            })
          }}
          className="flex w-full items-center gap-4 bg-[#f7f9fb] px-4 py-4 text-left transition-colors hover:bg-[#f0f4f7]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="text-base font-semibold tracking-tight text-foreground truncate">
                {semester.name}
              </div>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide',
                  semester.status === 'completed'
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-primary/10 text-primary border-primary/20'
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {termCourses.length} courses
            </div>
          </div>

          {termGpa !== null && (
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">
                  {termGpa.toFixed(2)} GPA
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpenSemesterIds((prev) => new Set([...prev, semId]))
              setSettingsSemesterId(semId)
              setIsAddSemesterOpen(false)
              setIsAddCourseOpen(false)
              setSettingsCourseId(null)
            }}
            title="Semester settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="pb-5">
            <div className="min-w-[42rem]">
              <div className="grid grid-cols-[minmax(12rem,1fr)_4rem_7rem_8rem_2.5rem] gap-3 border-y border-[#e8ebef] bg-[#fbfcfd] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span>Course</span>
                <span className="text-center">Credits</span>
                <span className="text-center">Grade</span>
                <span className="text-center">Action</span>
                <span></span>
              </div>

              <div className="divide-y divide-[#edf0f3]">
                {termCourses.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-muted-foreground">
                    No courses in this semester yet.
                  </div>
                ) : (
                  termCourses.map((course) => renderCourseRow(course))
                )}
              </div>

              <div className="px-4 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddCourseOpen(true)
                      setAddCourseSemesterId(semId)
                      setNewCourseName('')
                      setNewCourseCredits('3')
                      setIsAddSemesterOpen(false)
                      setSettingsSemesterId(null)
                      setSettingsCourseId(null)
                    }}
                    className="h-11 w-full rounded-xl border-dashed border-border/80 bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add course
                  </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    )
  })

  const unassignedCourses = coursesBySemesterId.get('unassigned') ?? []
  const unassignedCard = unassignedCourses.length > 0 ? (
    <section
      onDragOver={(event) => handleCourseDragOver(event, 'unassigned')}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
        setDragOverSemesterId((prev) => (prev === 'unassigned' ? null : prev))
      }}
      onDrop={(event) => handleCourseDrop(event, 'unassigned')}
      className={cn(
          'overflow-hidden rounded-xl border border-[#e1e5ea] bg-white transition-colors',
        dragOverSemesterId === 'unassigned' && 'border-primary/30 bg-[#f7f9fb]'
      )}
    >
      <div className="bg-[#f7f9fb] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="text-base font-semibold tracking-tight text-foreground">Unassigned</div>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
            NEEDS SEMESTER
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Courses created outside a semester.
        </div>
      </div>
      <div className="pb-5">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[minmax(12rem,1fr)_4rem_7rem_8rem_2.5rem] gap-3 border-y border-[#e8ebef] bg-[#fbfcfd] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span>Course</span>
            <span className="text-center">Credits</span>
            <span className="text-center">Grade</span>
            <span className="text-center">Action</span>
            <span></span>
          </div>
          <div className="divide-y divide-[#edf0f3]">
            {unassignedCourses.map((course) =>
              renderCourseRow(course, { showAssignToCurrent: true })
            )}
          </div>
        </div>
      </div>
    </section>
  ) : null

  return (
    <div className="app-page semesters-page">
      {isAddSemesterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setIsAddSemesterOpen(false)}
        >
          <div className="w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      Add semester
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Create a new term to organize courses.
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsAddSemesterOpen(false)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Semester name</div>
                  <Input
                    value={newSemesterName}
                    onChange={(e) => setNewSemesterName(e.target.value)}
                    placeholder="e.g. Spring 2024"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <select
                    value={newSemesterStatus}
                    onChange={(e) =>
                      setNewSemesterStatus(
                        e.target.value === 'completed' ? 'completed' : 'in_progress'
                      )
                    }
                    className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
                  >
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button variant="outline" onClick={() => setIsAddSemesterOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSemester}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isAddCourseOpen && addCourseSemesterId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setIsAddCourseOpen(false)}
        >
          <div className="w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      Add course
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add a class to this semester.
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsAddCourseOpen(false)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Course name</div>
                  <Input
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="e.g. Econ 101"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Credits</div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={newCourseCredits}
                    onChange={(e) =>
                      setNewCourseCredits(sanitizeNumberInput(e.target.value))
                    }
                    placeholder="3"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCourse}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {settingsCourseId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setSettingsCourseId(null)}
        >
          <div className="w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      Course settings
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rename, edit credits, or delete this course.
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsCourseId(null)}
                    disabled={isCourseSettingsWorking}
                  >
                    Close
                  </Button>
                </div>

                {(() => {
                  const course = courseById.get(settingsCourseId) ?? null
                  if (!course) {
                    return (
                      <div className="text-sm text-muted-foreground">
                        Course not found.
                      </div>
                    )
                  }
                  return (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Course name</div>
                        <Input
                          value={courseSettingsName}
                          onChange={(e) => setCourseSettingsName(e.target.value)}
                          placeholder="e.g. Algebra II"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Credits</div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={courseSettingsCredits}
                          onChange={(e) =>
                            setCourseSettingsCredits(sanitizeNumberInput(e.target.value))
                          }
                          placeholder="3"
                        />
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleDeleteCourseFromSettings}
                          disabled={isCourseSettingsWorking}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSettingsCourseId(null)}
                            disabled={isCourseSettingsWorking}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveCourseSettings}
                            disabled={!courseSettingsName.trim() || isCourseSettingsWorking}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {settingsSemesterId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => setSettingsSemesterId(null)}
        >
          <div
            className="w-full max-w-md"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      Semester settings
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rename, update status, or delete this semester.
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsSemesterId(null)}
                    disabled={isSemesterSettingsWorking}
                  >
                    Close
                  </Button>
                </div>

                {(() => {
                  const sem = semesters.find((s) => String(s._id) === settingsSemesterId) ?? null
                  if (!sem) {
                    return (
                      <div className="text-sm text-muted-foreground">Semester not found.</div>
                    )
                  }
                  return (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Semester name</div>
                        <Input
                          value={semesterSettingsName}
                          onChange={(e) => setSemesterSettingsName(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="w-44">
                          <div className="text-xs text-muted-foreground mb-1">Status</div>
                          <select
                            value={sem.status}
                            onChange={(e) =>
                              updateSemesterStatus({
                                id: sem._id,
                                status: e.target.value,
                              })
                            }
                            disabled={isSemesterSettingsWorking}
                            className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
                          >
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete “${sem.name}” and all courses/grades inside it? This cannot be undone.`
                              )
                            ) {
                              return
                            }
                            await removeSemester({ id: sem._id })
                            setSettingsSemesterId(null)
                            setOpenSemesterIds((prev) => {
                              const next = new Set(prev)
                              next.delete(String(sem._id))
                              return next
                            })
                          }}
                          disabled={isSemesterSettingsWorking}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete semester
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSettingsSemesterId(null)}
                            disabled={isSemesterSettingsWorking}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveSemesterSettings}
                            disabled={
                              !semesterSettingsName.trim() || isSemesterSettingsWorking
                            }
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <section className="app-page-header">
        <div className="app-page-header-inner">
          <div className="app-page-title-row">
            <div>
              <h1 className="app-page-title">Semesters</h1>
              <p className="app-page-subtitle">
                Manage terms, credits, course placement, and academic progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <div className="grid items-start gap-7 lg:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
            <div className="space-y-5">
              <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
                <CardContent className="space-y-6 p-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Overall Summary
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Track cumulative progress across every semester.
                    </p>
                  </div>

                  <div className="border-t border-border/70 pt-6">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-semibold leading-none text-primary">
                          {cumulative.gpa === null ? '—' : cumulative.gpa.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Overall GPA
                      </div>
                    </div>

                    <div className="mt-5 border-t border-border/70 pt-5">
                      <div className="text-3xl font-semibold leading-none text-foreground">
                        {cumulative.credits}
                      </div>
                      <div className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Credits taken
                      </div>
                    </div>

                    <div className="mt-5 border-t border-border/70 pt-5">
                      <div className="text-3xl font-semibold leading-none text-foreground">
                        {courses.length}
                      </div>
                      <div className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Total courses
                      </div>
                    </div>

                  </div>

                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                <div className="border-b border-border/70 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        All Semesters
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        View your courses grouped by semester.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarCheck2 className="h-4 w-4" />
                      {cumulative.semestersCompleted} completed
                    </div>
                  </div>
                </div>

                <div className="space-y-3 overflow-x-auto p-4">
                  {unassignedCard}
                  {semesterCards.length > 0 ? (
                    semesterCards
                  ) : (
                    <div className="rounded-xl border border-border/70 px-6 py-8 text-center text-sm text-muted-foreground">
                      Create your first semester to start organizing courses.
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddSemesterOpen(true)
                      setSettingsSemesterId(null)
                      setIsAddCourseOpen(false)
                      setSettingsCourseId(null)
                    }}
                    className="h-11 w-full rounded-xl border-dashed border-border/80 bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add semester
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
