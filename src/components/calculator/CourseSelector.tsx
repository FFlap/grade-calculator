import { useEffect, useRef, useState } from 'react'
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
import { cn } from '@/lib/utils'
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

export function CourseSelector({
  isSignedIn,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateCourse,
  onRenameCourse,
  onDeleteCourse,
}: CourseSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [editedCourseName, setEditedCourseName] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const manageMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isSignedIn) return
    setIsCreating(false)
    setIsEditing(false)
    setIsManageOpen(false)
    setNewCourseName('')
    setEditedCourseName('')
    setIsWorking(false)
  }, [isSignedIn])

  useEffect(() => {
    if (!isManageOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!manageMenuRef.current?.contains(event.target as Node)) {
        setIsManageOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsManageOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isManageOpen])

  const selectedCourse =
    selectedCourseId ? courses.find((c) => c._id === selectedCourseId) : null

  const handleCreateCourse = async () => {
    if (!isSignedIn) return
    const name = newCourseName.trim()
    if (!name) return

    try {
      setIsWorking(true)
      await onCreateCourse(name)
      setNewCourseName('')
      setIsCreating(false)
      setIsManageOpen(false)
    } finally {
      setIsWorking(false)
    }
  }

  const handleRenameCourse = async () => {
    if (!isSignedIn) return
    const name = editedCourseName.trim()
    if (!selectedCourseId || !name || !onRenameCourse) return

    try {
      setIsWorking(true)
      await onRenameCourse(selectedCourseId, name)
      setIsEditing(false)
      setIsManageOpen(false)
    } finally {
      setIsWorking(false)
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
      setIsWorking(true)
      await onDeleteCourse(selectedCourseId)
      onSelectCourse(null)
      setIsManageOpen(false)
    } finally {
      setIsWorking(false)
    }
  }

  if (isCreating) {
    return (
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Course name (e.g. Math 101)"
          value={newCourseName}
          onChange={(e) => setNewCourseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateCourse()
            if (e.key === 'Escape') setIsCreating(false)
          }}
          className="flex-1"
          autoFocus
        />
        <Button
          size="icon"
          onClick={handleCreateCourse}
          disabled={!newCourseName.trim() || isWorking}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreating(false)}
          disabled={isWorking}
        >
          <span className="sr-only">Cancel</span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Course name (e.g. Math 101)"
          value={editedCourseName}
          onChange={(e) => setEditedCourseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameCourse()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="flex-1"
          autoFocus
        />
        <Button
          size="icon"
          onClick={handleRenameCourse}
          disabled={!editedCourseName.trim() || isWorking}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsEditing(false)}
          disabled={isWorking}
        >
          <span className="sr-only">Cancel</span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Select
        value={selectedCourseId ?? ('none' as const)}
        onValueChange={(value) =>
          onSelectCourse(value === 'none' ? null : (value as Course['_id']))
        }
        disabled={!isSignedIn || isWorking}
      >
        <SelectTrigger
          className={cn(
            'flex-1',
            selectedCourseId
              ? 'ring-2 ring-ring/35'
              : 'ring-1 ring-border/60'
          )}
        >
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
        <div ref={manageMenuRef} className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManageOpen((open) => !open)}
            disabled={isWorking}
            aria-expanded={isManageOpen}
            aria-haspopup="menu"
            className="min-w-[7rem] justify-center gap-1.5 text-primary"
          >
            <MoreHorizontal className="h-4 w-4" />
            Manage
          </Button>

          {isManageOpen && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[12.75rem] rounded-xl border border-border/80 bg-card p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
              <button
                type="button"
                onClick={() => {
                  setIsManageOpen(false)
                  setIsCreating(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent/35"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="font-medium">Add course</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedCourseId || !onRenameCourse) return
                  setEditedCourseName(selectedCourse?.name ?? '')
                  setIsEditing(true)
                  setIsManageOpen(false)
                }}
                disabled={!selectedCourseId || !onRenameCourse || isWorking}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent/35 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Pencil className="h-4 w-4" />
                </span>
                <span className="font-medium">Rename course</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={!selectedCourseId || !onDeleteCourse || isWorking}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/6 disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
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
            disabled={isWorking}
            className="min-w-[7rem] justify-center gap-1.5 text-primary"
          >
            <MoreHorizontal className="h-4 w-4" />
            Manage
          </Button>
        </SignInButton>
      )}
    </div>
  )
}
