import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState, useEffect, useRef } from 'react'
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
  type Course,
  type Grade,
  type GradeRow,
  type GradeType,
  type Semester,
} from '@/components/calculator/types'
import {
  CalendarPlus,
  CalendarCheck2,
  ChevronDown,
  Coins,
  GraduationCap,
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

  const [openSemesterId, setOpenSemesterId] = useState<string | null>(null)
  const didInitOpenRef = useRef(false)
  useEffect(() => {
    if (didInitOpenRef.current) return
    if (openSemesterId !== null) return
    if (currentSemester) {
      setOpenSemesterId(String(currentSemester._id))
      didInitOpenRef.current = true
      return
    }
    if (sortedSemesters[0]) {
      setOpenSemesterId(String(sortedSemesters[0]._id))
      didInitOpenRef.current = true
    }
  }, [currentSemester, openSemesterId, sortedSemesters])

  const [settingsSemesterId, setSettingsSemesterId] = useState<string | null>(null)

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

  const getCourseRowsForCalc = (
    course: Course,
    courseGrades: Grade[]
  ): { rows: GradeRow[]; gradeType: GradeType } => {
    const rawType = (course.gradeType ?? 'percentage') as GradeType
    const hasLetterInputs =
      rawType === 'letters' &&
      courseGrades.some((g) => (g.gradeInput ?? '').trim().length > 0)
    const gradeType: GradeType =
      rawType === 'letters' && !hasLetterInputs ? 'percentage' : rawType

    const rows = courseGrades.map((g) => ({
      id: String(g.clientRowId ?? g._id),
      assignment: g.assignmentName ?? '',
      date: g.dueDate ?? '',
      grade: g.gradeInput ?? String(g.grade ?? ''),
      weight: g.weightInput ?? String(g.weight ?? ''),
    }))
    return { rows, gradeType }
  }

  const getCoursePercent = (course: Course) => {
    const courseGrades = gradesByCourseId.get(String(course._id)) ?? []
    const { rows, gradeType } = getCourseRowsForCalc(course, courseGrades)
    const calc = calculateWeightedAverage(rows, gradeType)
    return calc?.average ?? null
  }

  const getCourseLetter = (course: Course, percent: number) => {
    const thresholds = course.letterGradeThresholds ?? LETTER_GRADE_THRESHOLDS
    return percentageToLetter(percent, thresholds)
  }

  const getTermCredits = (semesterId: string) => {
    const termCourses = coursesBySemesterId.get(semesterId) ?? []
    return termCourses.reduce((sum, c) => sum + getCourseCredits(c), 0)
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

  useEffect(() => {
    if (!settingsCourseId) return
    if (courseById.get(settingsCourseId)) return
    setSettingsCourseId(null)
  }, [courseById, settingsCourseId])

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

  const semesterCards = sortedSemesters.map((semester) => {
    const semId = String(semester._id)
    const isOpen = openSemesterId === semId
    const termCredits = getTermCredits(semId)
    const termGpa = getTermGpa(semId)

    const termCourses = coursesBySemesterId.get(semId) ?? []

    const statusLabel =
      semester.isCurrent || semester.status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED'

    return (
      <Card
        key={semId}
        className={cn(
          'border-border overflow-hidden py-0 gap-0',
          semester.isCurrent && 'ring-1 ring-ring/35'
        )}
      >
        <button
          type="button"
          onClick={() => {
            setSettingsCourseId(null)
            setOpenSemesterId((prev) => {
              const next = prev === semId ? null : semId
              if (next === null) setSettingsSemesterId(null)
              return next
            })
          }}
          className={cn(
            'w-full text-left px-5 py-4 flex items-center gap-4 border-b border-border/60',
            semester.isCurrent ? 'bg-accent/10' : 'bg-card'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-foreground truncate">
                {semester.name}
              </div>
              <span
                className={cn(
                  'text-xs font-semibold tracking-wide px-2 py-1 rounded-full border',
                  semester.status === 'completed'
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-primary/10 text-primary border-primary/20'
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {semester.isCurrent ? 'Current term' : semester.status === 'completed' ? 'Previous term' : 'In progress'}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Term GPA
              </div>
              <div className="text-sm font-semibold text-foreground">
                {termGpa === null ? '—' : termGpa.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Credits
              </div>
              <div className="text-sm font-semibold text-foreground">
                {termCredits}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpenSemesterId(semId)
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
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                COURSE BREAKDOWN
              </div>

              <div className="space-y-2">
                {termCourses.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                    No courses in this semester yet.
                  </div>
                ) : (
                  termCourses.map((course) => {
                    const percent = getCoursePercent(course)
                    const letter =
                      percent === null ? null : getCourseLetter(course, percent)
                    const courseId = String(course._id)

                    return (
                      <div
                        key={courseId}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <div className="h-9 w-9 rounded-md bg-accent/15 border border-border flex items-center justify-center text-foreground/80 text-xs font-semibold">
                          {course.name.trim().slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {course.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="mr-2">{getCourseCredits(course)} credits</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Grade
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {percent === null || letter === null
                              ? '—'
                              : `${letter} (${Math.round(percent)}%)`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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

                          <Button variant="outline" size="sm" asChild>
                            <Link
                              to="/grade-calculator/$courseId"
                              params={{ courseId: course._id }}
                            >
                              Go to Course
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="pt-3 border-t border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Add courses to this semester.
                  </div>
                  <Button
                    onClick={() => {
                      setIsAddCourseOpen(true)
                      setAddCourseSemesterId(semId)
                      setNewCourseName('')
                      setNewCourseCredits('3')
                      setIsAddSemesterOpen(false)
                      setSettingsSemesterId(null)
                      setSettingsCourseId(null)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    )
  })

  const unassignedCourses = coursesBySemesterId.get('unassigned') ?? []
  const unassignedCard =
    unassignedCourses.length > 0 ? (
      <Card className="border-border overflow-hidden py-0 gap-0">
        <div className="px-5 py-4 border-b border-border/60 bg-card">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold text-foreground">Unassigned</div>
            <span className="text-xs font-semibold tracking-wide px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border">
              NEEDS SEMESTER
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Courses created outside the Semesters page.
          </div>
        </div>
        <CardContent className="p-5">
          <div className="space-y-2">
            {unassignedCourses.map((course) => {
              const percent = getCoursePercent(course)
              const letter = percent === null ? null : getCourseLetter(course, percent)
              return (
                <div
                  key={String(course._id)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="h-9 w-9 rounded-md bg-accent/15 border border-border flex items-center justify-center text-foreground/80 text-xs font-semibold">
                    {course.name.trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{course.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getCourseCredits(course)} credits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Grade
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {percent === null || letter === null ? '—' : `${letter} (${Math.round(percent)}%)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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

                    <Button variant="outline" size="sm" asChild>
                      <Link to="/grade-calculator/$courseId" params={{ courseId: course._id }}>
                        Go to Course
                      </Link>
                    </Button>
                  </div>

                  {currentSemester && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateCourseSemester({
                          id: course._id,
                          semesterId: currentSemester._id,
                        })
                      }
                    >
                      Assign to {currentSemester.name}
                    </Button>
                  )}
                </div>
            )
          })}
          </div>
        </CardContent>
      </Card>
    ) : null

  return (
    <div className="min-h-screen bg-background">
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
                    type="number"
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(e.target.value)}
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
                          type="number"
                          value={courseSettingsCredits}
                          onChange={(e) => setCourseSettingsCredits(e.target.value)}
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
                      Update status or delete this semester.
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSettingsSemesterId(null)}>
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
                        <div className="text-xs text-muted-foreground">Semester</div>
                        <div className="text-sm font-medium text-foreground">{sem.name}</div>
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
                            className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
                          >
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex justify-end">
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
                            setOpenSemesterId(null)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete semester
                        </Button>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Academic Semesters
            </h1>
            <p className="text-muted-foreground">
              Manage and review your academic journey history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsAddSemesterOpen(true)
                setSettingsSemesterId(null)
                setIsAddCourseOpen(false)
                setSettingsCourseId(null)
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Add Semester
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Cumulative GPA
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {cumulative.gpa === null ? '—' : cumulative.gpa.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 border border-border flex items-center justify-center">
                <Coins className="h-5 w-5 text-foreground/70" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total Credits
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {cumulative.credits}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                <CalendarCheck2 className="h-5 w-5 text-foreground/70" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Semesters Completed
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {cumulative.semestersCompleted}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {unassignedCard}
          {semesterCards.length > 0 ? (
            semesterCards
          ) : (
            <Card className="border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                Create your first semester to start organizing courses.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
