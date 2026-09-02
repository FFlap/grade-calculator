import { createFileRoute, Link } from '@tanstack/react-router'
import {
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SignInPrompt } from '@/components/SignInPrompt'
import { SortableHeader } from '@/components/SortableHeader'
import {
  sanitizeNumberInput,
  type Course,
  type Grade,
  type Semester,
} from '@/components/calculator/types'
import {
  calculateCoursePercent,
  calculateCumulativeSemesterStats,
  calculateTermGpa,
  getCourseCredits,
  getCourseLetter,
  getCurrentSemester,
  groupCoursesBySemesterId,
  groupGradesByCourseId,
  sortSemesterCourses,
  sortSemestersForDisplay,
  updateSemesterCourseSorts,
  type SemesterCourseSort,
  type SemesterCourseSortColumn,
  type SemesterCourseSorts,
} from '@/lib/semester-helpers'
import type { SortDirection } from '@/lib/table-sorting'
import {
  CalendarPlus,
  CalendarCheck2,
  ChevronDown,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'

export const Route = createFileRoute('/semesters')({
  component: SemestersPage,
})

type SemesterStatus = 'in_progress' | 'completed'
type GradesByCourseId = ReturnType<typeof groupGradesByCourseId>
type CoursesBySemesterId = ReturnType<typeof groupCoursesBySemesterId>
type CumulativeSemesterStats = ReturnType<
  typeof calculateCumulativeSemesterStats
>

type SemesterBoardState = {
  openSemesterIds: Set<string> | null
  settingsSemesterId: string | null
  semesterSettingsName: string
  isSemesterSettingsWorking: boolean
  newSemesterName: string
  newSemesterStatus: SemesterStatus
  isAddSemesterOpen: boolean
  isAddCourseOpen: boolean
  addCourseSemesterId: string | null
  newCourseName: string
  newCourseCredits: string
  settingsCourseId: string | null
  courseSettingsName: string
  courseSettingsCredits: string
  isCourseSettingsWorking: boolean
  draggingCourseId: string | null
  dragOverSemesterId: string | null
}

type SemesterBoardAction<K extends keyof SemesterBoardState = keyof SemesterBoardState> = {
  type: 'set'
  key: K
  value: SetStateAction<SemesterBoardState[K]>
}

const initialSemesterBoardState: SemesterBoardState = {
  openSemesterIds: null,
  settingsSemesterId: null,
  semesterSettingsName: '',
  isSemesterSettingsWorking: false,
  newSemesterName: '',
  newSemesterStatus: 'in_progress',
  isAddSemesterOpen: false,
  isAddCourseOpen: false,
  addCourseSemesterId: null,
  newCourseName: '',
  newCourseCredits: '3',
  settingsCourseId: null,
  courseSettingsName: '',
  courseSettingsCredits: '3',
  isCourseSettingsWorking: false,
  draggingCourseId: null,
  dragOverSemesterId: null,
}

function semesterBoardReducer(
  state: SemesterBoardState,
  action: SemesterBoardAction
): SemesterBoardState {
  const currentValue = state[action.key]
  const nextValue =
    typeof action.value === 'function'
      ? (action.value as (previous: typeof currentValue) => typeof currentValue)(
          currentValue
        )
      : action.value

  return {
    ...state,
    [action.key]: nextValue,
  }
}

function makeSemesterBoardSetter<K extends keyof SemesterBoardState>(
  dispatch: Dispatch<SemesterBoardAction>,
  key: K
): Dispatch<SetStateAction<SemesterBoardState[K]>> {
  return (value) => dispatch({ type: 'set', key, value } as SemesterBoardAction)
}

function useSemestersPageModel() {
  const { isLoaded, isSignedIn } = useUser()
  const overview = useQuery(
    api.semesters.overview,
    isLoaded && isSignedIn ? {} : 'skip'
  ) as
    | { semesters: Semester[]; courses: Course[]; grades: Grade[] }
    | undefined
  const isLoading = !isLoaded || (isSignedIn && overview === undefined)

  const addSemester = useMutation(api.semesters.add)
  const updateSemesterStatus = useMutation(api.semesters.updateStatus)
  const removeSemester = useMutation(api.semesters.remove)
  const updateSemesterName = useMutation(api.semesters.updateName)
  const addCourse = useMutation(api.courses.add)
  const updateCourseSemester = useMutation(api.courses.updateSemester)
  const updateCourseCredits = useMutation(api.courses.updateCredits)
  const updateCourseName = useMutation(api.courses.updateName)
  const removeCourse = useMutation(api.courses.remove)

  const semesters = useMemo(() => overview?.semesters ?? [], [overview?.semesters])
  const courses = useMemo(() => overview?.courses ?? [], [overview?.courses])
  const grades = useMemo(() => overview?.grades ?? [], [overview?.grades])

  const gradesByCourseId = useMemo(() => {
    return groupGradesByCourseId(grades)
  }, [grades])

  const sortedSemesters = useMemo(() => {
    return sortSemestersForDisplay(semesters)
  }, [semesters])

  const currentSemester = useMemo(() => {
    return getCurrentSemester(semesters)
  }, [semesters])

  const defaultOpenSemesterIds = useMemo(() => {
    const defaultSemester = currentSemester ?? sortedSemesters[0]
    return defaultSemester ? new Set([String(defaultSemester._id)]) : new Set<string>()
  }, [currentSemester, sortedSemesters])
  const [boardState, dispatchBoardState] = useReducer(
    semesterBoardReducer,
    initialSemesterBoardState
  )
  const {
    openSemesterIds,
    settingsSemesterId,
    semesterSettingsName,
    isSemesterSettingsWorking,
    newSemesterName,
    newSemesterStatus,
    isAddSemesterOpen,
    isAddCourseOpen,
    addCourseSemesterId,
    newCourseName,
    newCourseCredits,
    settingsCourseId,
    courseSettingsName,
    courseSettingsCredits,
    isCourseSettingsWorking,
    draggingCourseId,
    dragOverSemesterId,
  } = boardState
  const setOpenSemesterIds = makeSemesterBoardSetter(
    dispatchBoardState,
    'openSemesterIds'
  )
  const setSettingsSemesterId = makeSemesterBoardSetter(
    dispatchBoardState,
    'settingsSemesterId'
  )
  const setSemesterSettingsName = makeSemesterBoardSetter(
    dispatchBoardState,
    'semesterSettingsName'
  )
  const setIsSemesterSettingsWorking = makeSemesterBoardSetter(
    dispatchBoardState,
    'isSemesterSettingsWorking'
  )
  const setNewSemesterName = makeSemesterBoardSetter(
    dispatchBoardState,
    'newSemesterName'
  )
  const setNewSemesterStatus = makeSemesterBoardSetter(
    dispatchBoardState,
    'newSemesterStatus'
  )
  const setIsAddSemesterOpen = makeSemesterBoardSetter(
    dispatchBoardState,
    'isAddSemesterOpen'
  )
  const setIsAddCourseOpen = makeSemesterBoardSetter(
    dispatchBoardState,
    'isAddCourseOpen'
  )
  const setAddCourseSemesterId = makeSemesterBoardSetter(
    dispatchBoardState,
    'addCourseSemesterId'
  )
  const setNewCourseName = makeSemesterBoardSetter(
    dispatchBoardState,
    'newCourseName'
  )
  const setNewCourseCredits = makeSemesterBoardSetter(
    dispatchBoardState,
    'newCourseCredits'
  )
  const setSettingsCourseId = makeSemesterBoardSetter(
    dispatchBoardState,
    'settingsCourseId'
  )
  const setCourseSettingsName = makeSemesterBoardSetter(
    dispatchBoardState,
    'courseSettingsName'
  )
  const setCourseSettingsCredits = makeSemesterBoardSetter(
    dispatchBoardState,
    'courseSettingsCredits'
  )
  const setIsCourseSettingsWorking = makeSemesterBoardSetter(
    dispatchBoardState,
    'isCourseSettingsWorking'
  )
  const setDraggingCourseId = makeSemesterBoardSetter(
    dispatchBoardState,
    'draggingCourseId'
  )
  const setDragOverSemesterId = makeSemesterBoardSetter(
    dispatchBoardState,
    'dragOverSemesterId'
  )
  const effectiveOpenSemesterIds = openSemesterIds ?? defaultOpenSemesterIds

  const courseById = useMemo(() => {
    const map = new Map<string, Course>()
    for (const c of courses) map.set(String(c._id), c)
    return map
  }, [courses])

  const coursesBySemesterId = useMemo(() => {
    return groupCoursesBySemesterId(courses)
  }, [courses])

  const getTermGpa = (semesterId: string) => {
    return calculateTermGpa(semesterId, coursesBySemesterId, gradesByCourseId)
  }

  const cumulative = useMemo(() => {
    return calculateCumulativeSemesterStats(courses, semesters, gradesByCourseId)
  }, [courses, semesters, gradesByCourseId])
  const draggingCourseIdRef = useRef<string | null>(null)

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

  const unassignedCourses = coursesBySemesterId.get('unassigned') ?? []
  const selectedSettingsCourse = settingsCourseId
    ? (courseById.get(settingsCourseId) ?? null)
    : null
  const selectedSettingsSemester = settingsSemesterId
    ? (semesters.find((s) => String(s._id) === settingsSemesterId) ?? null)
    : null

  const handleToggleSemester = (semesterId: string) => {
    if (draggingCourseIdRef.current) return
    setSettingsCourseId(null)
    setOpenSemesterIds((prev) => {
      const next = new Set(prev ?? defaultOpenSemesterIds)
      if (next.has(semesterId)) next.delete(semesterId)
      else next.add(semesterId)
      if (!next.has(semesterId)) setSettingsSemesterId(null)
      return next
    })
  }

  const handleOpenSemesterSettings = (semester: Semester) => {
    const semesterId = String(semester._id)
    setOpenSemesterIds(
      (prev) => new Set([...(prev ?? defaultOpenSemesterIds), semesterId])
    )
    setSettingsSemesterId(semesterId)
    setSemesterSettingsName(semester.name ?? '')
    setIsAddSemesterOpen(false)
    setIsAddCourseOpen(false)
    setSettingsCourseId(null)
  }

  const handleOpenAddCourse = (semesterId: string) => {
    setIsAddCourseOpen(true)
    setAddCourseSemesterId(semesterId)
    setNewCourseName('')
    setNewCourseCredits('3')
    setIsAddSemesterOpen(false)
    setSettingsSemesterId(null)
    setSettingsCourseId(null)
  }

  const handleOpenAddSemester = () => {
    setIsAddSemesterOpen(true)
    setSettingsSemesterId(null)
    setIsAddCourseOpen(false)
    setSettingsCourseId(null)
  }

  const handleCourseDragLeave = (event: DragEvent, semesterId: string) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }
    setDragOverSemesterId((prev) => (prev === semesterId ? null : prev))
  }

  const handleAssignCourseToCurrent = async (course: Course) => {
    if (!currentSemester) return
    await updateCourseSemester({
      id: course._id,
      semesterId: currentSemester._id,
    })
  }

  const handleUpdateSemesterStatus = async (
    semester: Semester,
    status: SemesterStatus
  ) => {
    await updateSemesterStatus({
      id: semester._id,
      status,
    })
  }

  const handleDeleteSemester = async (semester: Semester) => {
    try {
      setIsSemesterSettingsWorking(true)
      await removeSemester({ id: semester._id })
      setSettingsSemesterId(null)
      setOpenSemesterIds((prev) => {
        const next = new Set(prev ?? defaultOpenSemesterIds)
        next.delete(String(semester._id))
        return next
      })
    } finally {
      setIsSemesterSettingsWorking(false)
    }
  }

  return {
    isLoading,
    isSignedIn,
    isAddSemesterOpen,
    newSemesterName,
    newSemesterStatus,
    setIsAddSemesterOpen,
    setNewSemesterName,
    setNewSemesterStatus,
    handleCreateSemester,
    isAddCourseOpen,
    addCourseSemesterId,
    newCourseName,
    newCourseCredits,
    setIsAddCourseOpen,
    setNewCourseName,
    setNewCourseCredits,
    handleCreateCourse,
    settingsCourseId,
    selectedSettingsCourse,
    courseSettingsName,
    courseSettingsCredits,
    isCourseSettingsWorking,
    setSettingsCourseId,
    setCourseSettingsName,
    setCourseSettingsCredits,
    handleDeleteCourseFromSettings,
    handleSaveCourseSettings,
    settingsSemesterId,
    selectedSettingsSemester,
    semesterSettingsName,
    isSemesterSettingsWorking,
    setSettingsSemesterId,
    setSemesterSettingsName,
    handleUpdateSemesterStatus,
    handleDeleteSemester,
    handleSaveSemesterSettings,
    cumulative,
    courses,
    sortedSemesters,
    coursesBySemesterId,
    gradesByCourseId,
    currentSemester,
    effectiveOpenSemesterIds,
    unassignedCourses,
    dragOverSemesterId,
    draggingCourseId,
    getTermGpa,
    handleCourseDragStart,
    handleCourseDragEnd,
    handleCourseDragOver,
    handleCourseDragLeave,
    handleCourseDrop,
    openCourseSettings,
    handleAssignCourseToCurrent,
    handleToggleSemester,
    handleOpenSemesterSettings,
    handleOpenAddCourse,
    handleOpenAddSemester,
  }
}

type SemestersPageModel = ReturnType<typeof useSemestersPageModel>

function SemestersPage() {
  const model = useSemestersPageModel()

  return <SemestersPageView model={model} />
}

function SemestersPageView({ model }: { model: SemestersPageModel }) {
  return (
    <div className="app-page semesters-page">
      <AddSemesterDialog
        open={model.isAddSemesterOpen}
        name={model.newSemesterName}
        status={model.newSemesterStatus}
        onClose={() => model.setIsAddSemesterOpen(false)}
        onNameChange={model.setNewSemesterName}
        onStatusChange={model.setNewSemesterStatus}
        onCreate={model.handleCreateSemester}
      />
      <AddCourseDialog
        open={model.isAddCourseOpen && model.addCourseSemesterId !== null}
        name={model.newCourseName}
        credits={model.newCourseCredits}
        onClose={() => model.setIsAddCourseOpen(false)}
        onNameChange={model.setNewCourseName}
        onCreditsChange={model.setNewCourseCredits}
        onCreate={model.handleCreateCourse}
      />
      <CourseSettingsDialog
        open={model.settingsCourseId !== null}
        course={model.selectedSettingsCourse}
        name={model.courseSettingsName}
        credits={model.courseSettingsCredits}
        isWorking={model.isCourseSettingsWorking}
        onClose={() => model.setSettingsCourseId(null)}
        onNameChange={model.setCourseSettingsName}
        onCreditsChange={model.setCourseSettingsCredits}
        onDelete={model.handleDeleteCourseFromSettings}
        onSave={model.handleSaveCourseSettings}
      />
      <SemesterSettingsDialog
        open={model.settingsSemesterId !== null}
        semester={model.selectedSettingsSemester}
        name={model.semesterSettingsName}
        isWorking={model.isSemesterSettingsWorking}
        onClose={() => model.setSettingsSemesterId(null)}
        onNameChange={model.setSemesterSettingsName}
        onStatusChange={model.handleUpdateSemesterStatus}
        onDelete={model.handleDeleteSemester}
        onSave={model.handleSaveSemesterSettings}
      />

      <SemestersPageHeader />

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          {model.isLoading ? (
            null
          ) : !model.isSignedIn ? (
            <SemestersSignInPrompt />
          ) : (
            <div className="grid items-start gap-4 sm:gap-7 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
              <OverallSummaryCard
                cumulative={model.cumulative}
                courseCount={model.courses.length}
              />
              <SemesterListCard
                semesters={model.sortedSemesters}
                coursesBySemesterId={model.coursesBySemesterId}
                gradesByCourseId={model.gradesByCourseId}
                currentSemester={model.currentSemester}
                openSemesterIds={model.effectiveOpenSemesterIds}
                unassignedCourses={model.unassignedCourses}
                dragOverSemesterId={model.dragOverSemesterId}
                draggingCourseId={model.draggingCourseId}
                completedCount={model.cumulative.semestersCompleted}
                getTermGpa={model.getTermGpa}
                onCourseDragStart={model.handleCourseDragStart}
                onCourseDragEnd={model.handleCourseDragEnd}
                onCourseDragOver={model.handleCourseDragOver}
                onCourseDragLeave={model.handleCourseDragLeave}
                onCourseDrop={model.handleCourseDrop}
                onOpenCourseSettings={model.openCourseSettings}
                onAssignCourseToCurrent={model.handleAssignCourseToCurrent}
                onToggleSemester={model.handleToggleSemester}
                onOpenSemesterSettings={model.handleOpenSemesterSettings}
                onOpenAddCourse={model.handleOpenAddCourse}
                onOpenAddSemester={model.handleOpenAddSemester}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function SemestersSignInPrompt() {
  return (
    <SignInPrompt
      icon={CalendarPlus}
      title="Sign in to use semesters"
      description="Semesters, courses, credits, and GPA progress are saved to your account."
    />
  )
}

function DialogShell({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        role="presentation"
        className="w-full max-w-md"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Card className="border-border">
          <CardContent className="space-y-4 p-5">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

function DialogHeader({
  title,
  description,
  isCloseDisabled = false,
  onClose,
}: {
  title: string
  description: string
  isCloseDisabled?: boolean
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-lg font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={isCloseDisabled}
      >
        Close
      </Button>
    </div>
  )
}

function AddSemesterDialog({
  open,
  name,
  status,
  onClose,
  onNameChange,
  onStatusChange,
  onCreate,
}: {
  open: boolean
  name: string
  status: SemesterStatus
  onClose: () => void
  onNameChange: (value: string) => void
  onStatusChange: (value: SemesterStatus) => void
  onCreate: () => void
}) {
  if (!open) return null

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Add semester"
        description="Create a new term to organize courses."
        onClose={onClose}
      />

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Semester name</div>
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Spring 2024"
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Status</div>
        <select
          value={status}
          onChange={(event) =>
            onStatusChange(
              event.target.value === 'completed' ? 'completed' : 'in_progress'
            )
          }
          className="h-9 w-full rounded-sm border border-border bg-input px-3 text-sm text-foreground"
        >
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onCreate}>
          <CalendarPlus className="mr-2 size-4" />
          Create
        </Button>
      </div>
    </DialogShell>
  )
}

function AddCourseDialog({
  open,
  name,
  credits,
  onClose,
  onNameChange,
  onCreditsChange,
  onCreate,
}: {
  open: boolean
  name: string
  credits: string
  onClose: () => void
  onNameChange: (value: string) => void
  onCreditsChange: (value: string) => void
  onCreate: () => void
}) {
  if (!open) return null

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Add course"
        description="Add a class to this semester."
        onClose={onClose}
      />

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Course name</div>
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Econ 101"
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Credits</div>
        <Input
          type="text"
          inputMode="decimal"
          value={credits}
          onChange={(event) =>
            onCreditsChange(sanitizeNumberInput(event.target.value))
          }
          placeholder="3"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Add
        </Button>
      </div>
    </DialogShell>
  )
}

function CourseSettingsDialog({
  open,
  course,
  name,
  credits,
  isWorking,
  onClose,
  onNameChange,
  onCreditsChange,
  onDelete,
  onSave,
}: {
  open: boolean
  course: Course | null
  name: string
  credits: string
  isWorking: boolean
  onClose: () => void
  onNameChange: (value: string) => void
  onCreditsChange: (value: string) => void
  onDelete: () => void
  onSave: () => void
}) {
  if (!open) return null

  return (
    <DialogShell onClose={onClose}>
      <DialogHeader
        title="Course settings"
        description="Rename, edit credits, or delete this course."
        isCloseDisabled={isWorking}
        onClose={onClose}
      />

      {!course ? (
        <div className="text-sm text-muted-foreground">Course not found.</div>
      ) : (
        <>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Course name</div>
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. Algebra II"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Credits</div>
            <Input
              type="text"
              inputMode="decimal"
              value={credits}
              onChange={(event) =>
                onCreditsChange(sanitizeNumberInput(event.target.value))
              }
              placeholder="3"
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isWorking}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={isWorking}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!name.trim() || isWorking}
              >
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogShell>
  )
}

function SemesterSettingsDialog({
  open,
  semester,
  name,
  isWorking,
  onClose,
  onNameChange,
  onStatusChange,
  onDelete,
  onSave,
}: {
  open: boolean
  semester: Semester | null
  name: string
  isWorking: boolean
  onClose: () => void
  onNameChange: (value: string) => void
  onStatusChange: (semester: Semester, status: SemesterStatus) => void
  onDelete: (semester: Semester) => void | Promise<void>
  onSave: () => void
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  if (!open) return null

  return (
    <DialogShell onClose={isWorking ? () => {} : onClose}>
      <DialogHeader
        title="Semester settings"
        description="Rename, update status, or delete this semester."
        isCloseDisabled={isWorking}
        onClose={onClose}
      />

      {!semester ? (
        <div className="text-sm text-muted-foreground">Semester not found.</div>
      ) : (
        <>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Semester name</div>
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-44">
              <div className="mb-1 text-xs text-muted-foreground">Status</div>
              <select
                value={semester.status}
                onChange={(event) =>
                  onStatusChange(
                    semester,
                    event.target.value === 'completed'
                      ? 'completed'
                      : 'in_progress'
                  )
                }
                disabled={isWorking}
                className="h-9 w-full rounded-sm border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {isConfirmingDelete && (
            <div className="space-y-3 rounded-sm border border-destructive/25 bg-destructive/5 p-4">
              <div>
                <div className="text-sm font-semibold text-destructive">
                  Delete “{semester.name}”?
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This will permanently delete the semester and all courses and grades inside it.
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isWorking}
                >
                  Keep semester
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(semester)}
                  disabled={isWorking}
                >
                  <Trash2 className="mr-2 size-4" />
                  {isWorking ? 'Deleting...' : 'Delete permanently'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            {!isConfirmingDelete ? (
              <Button
                variant="destructive"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isWorking}
              >
                <Trash2 className="mr-2 size-4" />
                Delete semester
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={isWorking}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={!name.trim() || isWorking}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogShell>
  )
}

function SemestersPageHeader() {
  return (
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
  )
}

function OverallSummaryCard({
  cumulative,
  courseCount,
}: {
  cumulative: CumulativeSemesterStats
  courseCount: number
}) {
  return (
    <div className="space-y-5 xl:sticky xl:top-6">
      <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 sm:rounded-2xl">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Overall Summary
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Track cumulative progress across every semester.
            </p>
          </div>

          <div className="border-t border-border/70 pt-4 sm:pt-6">
            <SummaryMetric
              value={cumulative.gpa === null ? 'N/A' : cumulative.gpa.toFixed(2)}
              label="Overall GPA"
              primary
            />
            <SummaryMetric value={cumulative.credits} label="Credits taken" />
            <SummaryMetric value={courseCount} label="Total courses" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryMetric({
  value,
  label,
  primary = false,
}: {
  value: number | string
  label: string
  primary?: boolean
}) {
  return (
    <div className={cn(!primary && 'mt-4 border-t border-border/70 pt-4 sm:mt-5 sm:pt-5')}>
      <div className={primary ? 'flex items-baseline gap-2' : undefined}>
        <span
          className={cn(
            'font-semibold leading-none',
            primary ? 'font-display text-4xl text-accent-strong sm:text-5xl' : 'text-2xl text-foreground sm:text-3xl'
          )}
        >
          {value}
        </span>
      </div>
      <div className="mt-2 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.72rem] sm:tracking-[0.14em]">
        {label}
      </div>
    </div>
  )
}

function SemesterListCard({
  semesters,
  coursesBySemesterId,
  gradesByCourseId,
  currentSemester,
  openSemesterIds,
  unassignedCourses,
  dragOverSemesterId,
  draggingCourseId,
  completedCount,
  getTermGpa,
  onCourseDragStart,
  onCourseDragEnd,
  onCourseDragOver,
  onCourseDragLeave,
  onCourseDrop,
  onOpenCourseSettings,
  onAssignCourseToCurrent,
  onToggleSemester,
  onOpenSemesterSettings,
  onOpenAddCourse,
  onOpenAddSemester,
}: {
  semesters: Semester[]
  coursesBySemesterId: CoursesBySemesterId
  gradesByCourseId: GradesByCourseId
  currentSemester: Semester | null
  openSemesterIds: Set<string>
  unassignedCourses: Course[]
  dragOverSemesterId: string | null
  draggingCourseId: string | null
  completedCount: number
  getTermGpa: (semesterId: string) => number | null
  onCourseDragStart: (event: DragEvent<HTMLDivElement>, courseId: string) => void
  onCourseDragEnd: () => void
  onCourseDragOver: (event: DragEvent, semesterId: string) => void
  onCourseDragLeave: (event: DragEvent, semesterId: string) => void
  onCourseDrop: (event: DragEvent, semesterId: string) => void
  onOpenCourseSettings: (course: Course) => void
  onAssignCourseToCurrent: (course: Course) => void
  onToggleSemester: (semesterId: string) => void
  onOpenSemesterSettings: (semester: Semester) => void
  onOpenAddCourse: (semesterId: string) => void
  onOpenAddSemester: () => void
}) {
  const [courseSorts, setCourseSorts] = useState<SemesterCourseSorts>({})
  const handleCourseSort = (
    tableId: string,
    column: SemesterCourseSortColumn
  ) => {
    setCourseSorts((current) =>
      updateSemesterCourseSorts(current, tableId, column)
    )
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 sm:rounded-2xl">
      <CardContent className="p-0">
        <div className="border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                All Semesters
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                View your courses grouped by semester.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <CalendarCheck2 className="size-4" />
              {completedCount} completed
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          <UnassignedCoursesCard
            courses={unassignedCourses}
            gradesByCourseId={gradesByCourseId}
            currentSemester={currentSemester}
            dragOverSemesterId={dragOverSemesterId}
            draggingCourseId={draggingCourseId}
            onCourseDragStart={onCourseDragStart}
            onCourseDragEnd={onCourseDragEnd}
            onCourseDragOver={onCourseDragOver}
            onCourseDragLeave={onCourseDragLeave}
            onCourseDrop={onCourseDrop}
            onOpenCourseSettings={onOpenCourseSettings}
            onAssignCourseToCurrent={onAssignCourseToCurrent}
            sort={courseSorts.unassigned ?? null}
            onSort={(column) => handleCourseSort('unassigned', column)}
          />
          {semesters.length > 0 ? (
            semesters.map((semester) => {
              const semesterId = String(semester._id)
              return (
                <SemesterCard
                  key={semesterId}
                  semester={semester}
                  courses={coursesBySemesterId.get(semesterId) ?? []}
                  termGpa={getTermGpa(semesterId)}
                  gradesByCourseId={gradesByCourseId}
                  currentSemester={currentSemester}
                  isOpen={openSemesterIds.has(semesterId)}
                  dragOverSemesterId={dragOverSemesterId}
                  draggingCourseId={draggingCourseId}
                  onCourseDragStart={onCourseDragStart}
                  onCourseDragEnd={onCourseDragEnd}
                  onCourseDragOver={onCourseDragOver}
                  onCourseDragLeave={onCourseDragLeave}
                  onCourseDrop={onCourseDrop}
                  onOpenCourseSettings={onOpenCourseSettings}
                  onAssignCourseToCurrent={onAssignCourseToCurrent}
                  onToggleSemester={onToggleSemester}
                  onOpenSemesterSettings={onOpenSemesterSettings}
                  onOpenAddCourse={onOpenAddCourse}
                  sort={courseSorts[semesterId] ?? null}
                  onSort={(column) => handleCourseSort(semesterId, column)}
                />
              )
            })
          ) : (
            <div className="rounded-sm border border-border/70 px-4 py-6 text-center text-xs text-muted-foreground sm:rounded-sm sm:px-6 sm:py-8 sm:text-sm">
              Create your first semester to start organizing courses.
            </div>
          )}
          <Button
            variant="outline"
            onClick={onOpenAddSemester}
            className="h-10 w-full border-dashed border-accent-strong/25 bg-card text-sm text-accent-strong hover:border-accent-strong/45 hover:bg-accent-strong/5"
          >
            <Plus className="mr-2 size-4" />
            Add semester
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SemesterCard({
  semester,
  courses,
  termGpa,
  gradesByCourseId,
  currentSemester,
  isOpen,
  dragOverSemesterId,
  draggingCourseId,
  onCourseDragStart,
  onCourseDragEnd,
  onCourseDragOver,
  onCourseDragLeave,
  onCourseDrop,
  onOpenCourseSettings,
  onAssignCourseToCurrent,
  onToggleSemester,
  onOpenSemesterSettings,
  onOpenAddCourse,
  sort,
  onSort,
}: {
  semester: Semester
  courses: Course[]
  termGpa: number | null
  gradesByCourseId: GradesByCourseId
  currentSemester: Semester | null
  isOpen: boolean
  dragOverSemesterId: string | null
  draggingCourseId: string | null
  onCourseDragStart: (event: DragEvent<HTMLDivElement>, courseId: string) => void
  onCourseDragEnd: () => void
  onCourseDragOver: (event: DragEvent, semesterId: string) => void
  onCourseDragLeave: (event: DragEvent, semesterId: string) => void
  onCourseDrop: (event: DragEvent, semesterId: string) => void
  onOpenCourseSettings: (course: Course) => void
  onAssignCourseToCurrent: (course: Course) => void
  onToggleSemester: (semesterId: string) => void
  onOpenSemesterSettings: (semester: Semester) => void
  onOpenAddCourse: (semesterId: string) => void
  sort: SemesterCourseSort
  onSort: (column: SemesterCourseSortColumn) => void
}) {
  const semesterId = String(semester._id)
  const statusLabel =
    semester.isCurrent || semester.status === 'in_progress'
      ? 'IN PROGRESS'
      : 'COMPLETED'

  return (
    <section
      onDragOver={(event) => onCourseDragOver(event, semesterId)}
      onDragLeave={(event) => onCourseDragLeave(event, semesterId)}
      onDrop={(event) => onCourseDrop(event, semesterId)}
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card transition-colors',
        dragOverSemesterId === semesterId && 'border-accent-strong/30 bg-muted/45'
      )}
    >
      <button
        type="button"
        onDragOver={(event) => onCourseDragOver(event, semesterId)}
        onDrop={(event) => onCourseDrop(event, semesterId)}
        onClick={() => onToggleSemester(semesterId)}
        className="flex w-full items-center gap-3 bg-muted/45 p-3 text-left transition-colors hover:bg-muted/75 sm:gap-4 sm:p-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="truncate text-base font-semibold tracking-tight text-foreground">
              {semester.name}
            </div>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide',
                semester.status === 'completed'
                  ? 'border-border bg-muted text-muted-foreground'
                  : 'border-accent-strong/20 bg-accent-strong/10 text-accent-strong'
              )}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {courses.length} courses
          </div>
        </div>

        {termGpa !== null && (
          <div className="hidden items-center gap-6 sm:flex">
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
          className="size-8"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onOpenSemesterSettings(semester)
          }}
          title="Semester settings"
        >
          <Settings className="size-4" />
        </Button>

        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <CourseTable
          courses={courses}
          gradesByCourseId={gradesByCourseId}
          currentSemester={currentSemester}
          draggingCourseId={draggingCourseId}
          onCourseDragStart={onCourseDragStart}
          onCourseDragEnd={onCourseDragEnd}
          onOpenCourseSettings={onOpenCourseSettings}
          onAssignCourseToCurrent={onAssignCourseToCurrent}
          onOpenAddCourse={() => onOpenAddCourse(semesterId)}
          sort={sort}
          onSort={onSort}
        />
      )}
    </section>
  )
}

function UnassignedCoursesCard({
  courses,
  gradesByCourseId,
  currentSemester,
  dragOverSemesterId,
  draggingCourseId,
  onCourseDragStart,
  onCourseDragEnd,
  onCourseDragOver,
  onCourseDragLeave,
  onCourseDrop,
  onOpenCourseSettings,
  onAssignCourseToCurrent,
  sort,
  onSort,
}: {
  courses: Course[]
  gradesByCourseId: GradesByCourseId
  currentSemester: Semester | null
  dragOverSemesterId: string | null
  draggingCourseId: string | null
  onCourseDragStart: (event: DragEvent<HTMLDivElement>, courseId: string) => void
  onCourseDragEnd: () => void
  onCourseDragOver: (event: DragEvent, semesterId: string) => void
  onCourseDragLeave: (event: DragEvent, semesterId: string) => void
  onCourseDrop: (event: DragEvent, semesterId: string) => void
  onOpenCourseSettings: (course: Course) => void
  onAssignCourseToCurrent: (course: Course) => void
  sort: SemesterCourseSort
  onSort: (column: SemesterCourseSortColumn) => void
}) {
  if (courses.length === 0) return null

  return (
    <section
      onDragOver={(event) => onCourseDragOver(event, 'unassigned')}
      onDragLeave={(event) => onCourseDragLeave(event, 'unassigned')}
      onDrop={(event) => onCourseDrop(event, 'unassigned')}
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card transition-colors',
        dragOverSemesterId === 'unassigned' && 'border-accent-strong/30 bg-muted/45'
      )}
    >
      <div className="bg-muted/45 p-4">
        <div className="flex items-center gap-3">
          <div className="text-base font-semibold tracking-tight text-foreground">
            Unassigned
          </div>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
            NEEDS SEMESTER
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Courses created outside a semester.
        </div>
      </div>
      <CourseTable
        courses={courses}
        gradesByCourseId={gradesByCourseId}
        currentSemester={currentSemester}
        draggingCourseId={draggingCourseId}
        showAssignToCurrent
        onCourseDragStart={onCourseDragStart}
        onCourseDragEnd={onCourseDragEnd}
        onOpenCourseSettings={onOpenCourseSettings}
        onAssignCourseToCurrent={onAssignCourseToCurrent}
        sort={sort}
        onSort={onSort}
      />
    </section>
  )
}

function CourseTable({
  courses,
  gradesByCourseId,
  currentSemester,
  draggingCourseId,
  showAssignToCurrent = false,
  onCourseDragStart,
  onCourseDragEnd,
  onOpenCourseSettings,
  onAssignCourseToCurrent,
  onOpenAddCourse,
  sort,
  onSort,
}: {
  courses: Course[]
  gradesByCourseId: GradesByCourseId
  currentSemester: Semester | null
  draggingCourseId: string | null
  showAssignToCurrent?: boolean
  onCourseDragStart: (event: DragEvent<HTMLDivElement>, courseId: string) => void
  onCourseDragEnd: () => void
  onOpenCourseSettings: (course: Course) => void
  onAssignCourseToCurrent: (course: Course) => void
  onOpenAddCourse?: () => void
  sort: SemesterCourseSort
  onSort: (column: SemesterCourseSortColumn) => void
}) {
  const displayedCourses = useMemo(
    () => sortSemesterCourses(courses, gradesByCourseId, sort),
    [courses, gradesByCourseId, sort]
  )

  return (
    <div className="pb-5">
      <div>
        <MobileCourseSortControls sort={sort} onSort={onSort} />
        <div role="table" aria-label="Semester courses">
          <CourseTableHeader sort={sort} onSort={onSort} />

          <div role="rowgroup" className="divide-y divide-border/60">
            {courses.length === 0 ? (
              <div role="row">
                <div
                  role="cell"
                  className="px-4 py-5 text-sm text-muted-foreground"
                >
                  No courses in this semester yet.
                </div>
              </div>
            ) : (
              displayedCourses.map((course) => (
                <CourseRow
                  key={String(course._id)}
                  course={course}
                  gradesByCourseId={gradesByCourseId}
                  currentSemester={currentSemester}
                  draggingCourseId={draggingCourseId}
                  showAssignToCurrent={showAssignToCurrent}
                  onCourseDragStart={onCourseDragStart}
                  onCourseDragEnd={onCourseDragEnd}
                  onOpenCourseSettings={onOpenCourseSettings}
                  onAssignCourseToCurrent={onAssignCourseToCurrent}
                />
              ))
            )}
          </div>
        </div>

        {onOpenAddCourse && (
          <div className="px-4 pt-3">
            <Button
              onClick={onOpenAddCourse}
              className="h-10 w-full"
            >
              <Plus className="mr-2 size-4" />
              Add course
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function getCourseSortActionLabel(
  label: string,
  direction: SortDirection | null
) {
  if (direction === 'asc') {
    return `${label}, sorted ascending. Sort descending`
  }
  if (direction === 'desc') {
    return `${label}, sorted descending. Clear sorting`
  }
  return `${label}, not sorted. Sort ascending`
}

function MobileCourseSortControls({
  sort,
  onSort,
}: {
  sort: SemesterCourseSort
  onSort: (column: SemesterCourseSortColumn) => void
}) {
  const columns: Array<{
    column: SemesterCourseSortColumn
    label: string
  }> = [
    { column: 'course', label: 'Course' },
    { column: 'credits', label: 'Credits' },
    { column: 'grade', label: 'Grade' },
  ]

  return (
    <div
      className="flex items-center gap-1 border-y border-border/70 bg-muted/35 px-3 py-2 sm:hidden"
      aria-label="Sort courses"
    >
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        Sort:
      </span>
      {columns.map(({ column, label }) => {
        const direction = sort?.column === column ? sort.direction : null
        return (
          <button
            key={column}
            type="button"
            onClick={() => onSort(column)}
            aria-label={getCourseSortActionLabel(label, direction)}
            aria-pressed={direction !== null}
            className={cn(
              'min-w-0 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              direction !== null && 'bg-background text-foreground shadow-sm'
            )}
          >
            {label}
            {direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : ''}
          </button>
        )
      })}
    </div>
  )
}

function CourseTableHeader({
  sort,
  onSort,
}: {
  sort: SemesterCourseSort
  onSort: (column: SemesterCourseSortColumn) => void
}) {
  return (
    <div
      role="row"
      className="hidden grid-cols-[minmax(12rem,1fr)_5.5rem_7rem_8rem_2.5rem] gap-3 border-y border-border/70 bg-muted/35 px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:grid"
    >
      <SortableHeader
        label="Course"
        direction={sort?.column === 'course' ? sort.direction : null}
        onClick={() => onSort('course')}
      />
      <SortableHeader
        label="Credits"
        direction={sort?.column === 'credits' ? sort.direction : null}
        align="center"
        onClick={() => onSort('credits')}
      />
      <SortableHeader
        label="Grade"
        direction={sort?.column === 'grade' ? sort.direction : null}
        align="center"
        onClick={() => onSort('grade')}
      />
      <div role="columnheader" className="text-center">
        Action
      </div>
      <div role="columnheader" aria-label="Course settings" />
    </div>
  )
}

function CourseRow({
  course,
  gradesByCourseId,
  currentSemester,
  draggingCourseId,
  showAssignToCurrent = false,
  onCourseDragStart,
  onCourseDragEnd,
  onOpenCourseSettings,
  onAssignCourseToCurrent,
}: {
  course: Course
  gradesByCourseId: GradesByCourseId
  currentSemester: Semester | null
  draggingCourseId: string | null
  showAssignToCurrent?: boolean
  onCourseDragStart: (event: DragEvent<HTMLDivElement>, courseId: string) => void
  onCourseDragEnd: () => void
  onOpenCourseSettings: (course: Course) => void
  onAssignCourseToCurrent: (course: Course) => void
}) {
  const percent = calculateCoursePercent(course, gradesByCourseId)
  const letter = percent === null ? null : getCourseLetter(course, percent)
  const courseId = String(course._id)

  return (
    <div
      role="row"
      draggable
      onDragStart={(event) => onCourseDragStart(event, courseId)}
      onDragEnd={onCourseDragEnd}
      className={cn(
        'grid cursor-grab grid-cols-1 items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45 active:cursor-grabbing sm:grid-cols-[minmax(12rem,1fr)_5.5rem_7rem_8rem_2.5rem] sm:items-center',
        draggingCourseId === courseId && 'opacity-50'
      )}
    >
      <div role="cell" aria-label="Course" className="min-w-0 flex-1">
        <Link
          to="/grade-calculator"
          search={{ courseId: course._id }}
          className="truncate font-medium text-foreground underline-offset-4 hover:underline"
        >
          {course.name}
        </Link>
      </div>

      <div role="cell" aria-label="Credits" className="flex items-center justify-between gap-3 text-sm text-foreground sm:block sm:text-center">
        <span className="text-xs font-medium text-muted-foreground sm:hidden">
          Credits
        </span>
        <span>{getCourseCredits(course)}</span>
      </div>

      <div role="cell" aria-label="Grade" className="flex items-center justify-between gap-3 sm:block sm:text-center">
        <span className="text-xs font-medium text-muted-foreground sm:hidden">
          Grade
        </span>
        <span className="inline-flex rounded-full bg-accent-strong/10 px-2.5 py-1 text-xs font-semibold text-accent-strong">
          {percent === null || letter === null
            ? '—'
            : `${letter} (${Math.round(percent)}%)`}
        </span>
      </div>

      <div role="cell" aria-label="Action" className="flex justify-stretch sm:justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full px-3 sm:w-auto"
          asChild
        >
          <Link
            to="/grade-calculator"
            search={{ courseId: course._id }}
          >
            Open course
          </Link>
        </Button>
      </div>

      <div role="cell" aria-label="Course settings" className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onOpenCourseSettings(course)}
          title="Course settings"
        >
          <Settings className="size-4" />
        </Button>

        {showAssignToCurrent && currentSemester && (
          <Button
            size="icon-sm"
            onClick={() => onAssignCourseToCurrent(course)}
            title={`Assign to ${currentSemester.name}`}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
