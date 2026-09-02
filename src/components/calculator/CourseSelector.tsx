import { useEffect, useReducer, useRef } from 'react'
import { SignInButton } from '@clerk/clerk-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Check, Pencil, Trash2, X, MoreHorizontal } from 'lucide-react'
import type { Course } from './types'

interface CourseSelectorProps {
  isSignedIn: boolean
  courses: Course[]
  selectedCourseId: Course['_id'] | null
  onSelectCourse: (courseId: Course['_id'] | null) => void
  onCreateCourse: (name: string) => void | Promise<void>
  onRenameCourse?: (courseId: Course['_id'], name: string) => void | Promise<void>
  onDeleteCourse?: (courseId: Course['_id']) => void | Promise<void>
}

type CourseSelectorMode = 'select' | 'creating' | 'editing'

interface CourseSelectorState {
  mode: CourseSelectorMode
  newCourseName: string
  editedCourseName: string
  isWorking: boolean
  isManageOpen: boolean
}

type CourseSelectorAction =
  | { type: 'set-mode'; mode: CourseSelectorMode }
  | { type: 'set-new-course-name'; value: string }
  | { type: 'set-edited-course-name'; value: string }
  | { type: 'set-working'; value: boolean }
  | { type: 'set-manage-open'; value: boolean }
  | { type: 'create-success' }
  | { type: 'rename-success' }
  | { type: 'delete-success' }

const initialCourseSelectorState: CourseSelectorState = {
  mode: 'select',
  newCourseName: '',
  editedCourseName: '',
  isWorking: false,
  isManageOpen: false,
}

function courseSelectorReducer(
  state: CourseSelectorState,
  action: CourseSelectorAction
): CourseSelectorState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode }
    case 'set-new-course-name':
      return { ...state, newCourseName: action.value }
    case 'set-edited-course-name':
      return { ...state, editedCourseName: action.value }
    case 'set-working':
      return { ...state, isWorking: action.value }
    case 'set-manage-open':
      return { ...state, isManageOpen: action.value }
    case 'create-success':
      return {
        ...state,
        mode: 'select',
        newCourseName: '',
        isManageOpen: false,
      }
    case 'rename-success':
      return { ...state, mode: 'select', isManageOpen: false }
    case 'delete-success':
      return { ...state, isManageOpen: false }
  }
}

export function CourseSelector({
  isSignedIn,
  ...props
}: CourseSelectorProps) {
  return (
    <CourseSelectorInner
      key={isSignedIn ? 'signed-in' : 'signed-out'}
      isSignedIn={isSignedIn}
      {...props}
    />
  )
}

function CourseSelectorInner({
  isSignedIn,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateCourse,
  onRenameCourse,
  onDeleteCourse,
}: CourseSelectorProps) {
  const [state, dispatch] = useReducer(
    courseSelectorReducer,
    initialCourseSelectorState
  )
  const manageMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!state.isManageOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!manageMenuRef.current?.contains(event.target as Node)) {
        dispatch({ type: 'set-manage-open', value: false })
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'set-manage-open', value: false })
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [state.isManageOpen])

  const selectedCourse =
    selectedCourseId ? courses.find((c) => c._id === selectedCourseId) : null

  const handleCreateCourse = async () => {
    if (!isSignedIn) return
    const name = state.newCourseName.trim()
    if (!name) return

    try {
      dispatch({ type: 'set-working', value: true })
      await onCreateCourse(name)
      dispatch({ type: 'create-success' })
    } finally {
      dispatch({ type: 'set-working', value: false })
    }
  }

  const handleRenameCourse = async () => {
    if (!isSignedIn) return
    const name = state.editedCourseName.trim()
    if (!selectedCourseId || !name || !onRenameCourse) return

    try {
      dispatch({ type: 'set-working', value: true })
      await onRenameCourse(selectedCourseId, name)
      dispatch({ type: 'rename-success' })
    } finally {
      dispatch({ type: 'set-working', value: false })
    }
  }

  const handleDeleteCourse = async () => {
    if (!isSignedIn) return
    if (!selectedCourseId || !onDeleteCourse) return
    if (
      !window.confirm(
        `Delete “${selectedCourse?.name ?? 'this course'}”? This cannot be undone.`
      )
    ) {
      return
    }

    try {
      dispatch({ type: 'set-working', value: true })
      await onDeleteCourse(selectedCourseId)
      onSelectCourse(null)
      dispatch({ type: 'delete-success' })
    } finally {
      dispatch({ type: 'set-working', value: false })
    }
  }

  if (state.mode === 'creating') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Course name (e.g. Math 101)"
          value={state.newCourseName}
          onChange={(e) =>
            dispatch({ type: 'set-new-course-name', value: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateCourse()
            if (e.key === 'Escape') dispatch({ type: 'set-mode', mode: 'select' })
          }}
          className="h-9 min-w-0 flex-1"
        />
        <Button
          size="icon"
          onClick={handleCreateCourse}
          disabled={!state.newCourseName.trim() || state.isWorking}
          className="size-9"
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => dispatch({ type: 'set-mode', mode: 'select' })}
          disabled={state.isWorking}
          className="size-9"
        >
          <span className="sr-only">Cancel</span>
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  if (state.mode === 'editing') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Course name (e.g. Math 101)"
          value={state.editedCourseName}
          onChange={(e) =>
            dispatch({ type: 'set-edited-course-name', value: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameCourse()
            if (e.key === 'Escape') dispatch({ type: 'set-mode', mode: 'select' })
          }}
          className="h-9 min-w-0 flex-1"
        />
        <Button
          size="icon"
          onClick={handleRenameCourse}
          disabled={!state.editedCourseName.trim() || state.isWorking}
          className="size-9"
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => dispatch({ type: 'set-mode', mode: 'select' })}
          disabled={state.isWorking}
          className="size-9"
        >
          <span className="sr-only">Cancel</span>
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        value={selectedCourseId ?? ('none' as const)}
        onValueChange={(value) =>
          onSelectCourse(value === 'none' ? null : (value as Course['_id']))
        }
        disabled={!isSignedIn || state.isWorking}
      >
        <SelectTrigger className="h-9 min-w-0 flex-1 text-sm">
          <SelectValue
            placeholder={
              isSignedIn ? 'Select a course to save grades' : 'Sign in to save grades to a course'
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No course selected</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course._id} value={course._id}>
              {course.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isSignedIn ? (
        <div ref={manageMenuRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              dispatch({
                type: 'set-manage-open',
                value: !state.isManageOpen,
              })
            }
            disabled={state.isWorking}
            aria-expanded={state.isManageOpen}
            aria-haspopup="menu"
            className="h-9 min-w-[6.75rem] justify-center gap-1.5 text-sm text-accent-strong"
          >
            <MoreHorizontal className="size-4" />
            Manage
          </Button>

          {state.isManageOpen && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[12.75rem] rounded-sm border border-border/80 bg-card p-1.5 shadow-[0_14px_30px_var(--shadow-tint-lift)]">
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'set-manage-open', value: false })
                  dispatch({ type: 'set-mode', mode: 'creating' })
                }}
                className="flex w-full items-center gap-2.5 rounded-sm p-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent/35"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong">
                  <Plus className="size-4" />
                </span>
                <span className="font-medium">Add course</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedCourseId || !onRenameCourse) return
                  dispatch({
                    type: 'set-edited-course-name',
                    value: selectedCourse?.name ?? '',
                  })
                  dispatch({ type: 'set-mode', mode: 'editing' })
                  dispatch({ type: 'set-manage-open', value: false })
                }}
                disabled={!selectedCourseId || !onRenameCourse || state.isWorking}
                className="flex w-full items-center gap-2.5 rounded-sm p-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent/35 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong">
                  <Pencil className="size-4" />
                </span>
                <span className="font-medium">Rename course</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={!selectedCourseId || !onDeleteCourse || state.isWorking}
                className="flex w-full items-center gap-2.5 rounded-sm p-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/6 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 className="size-4" />
                </span>
                <span className="font-medium">Delete course</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <SignInButton mode="modal">
          <Button
            variant="outline"
            size="sm"
            disabled={state.isWorking}
            className="h-9 min-w-[6.75rem] justify-center gap-1.5 text-sm text-accent-strong"
          >
            <MoreHorizontal className="size-4" />
            Manage
          </Button>
        </SignInButton>
      )}
    </div>
  )
}
