import { useEffect, useState } from 'react'
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
import { Plus, Check, Pencil, Trash2, X } from 'lucide-react'
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

  useEffect(() => {
    if (isSignedIn) return
    setIsCreating(false)
    setIsEditing(false)
    setNewCourseName('')
    setEditedCourseName('')
    setIsWorking(false)
  }, [isSignedIn])

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
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreating(true)}
          disabled={isWorking}
        >
          <span className="sr-only">Add course</span>
          <Plus className="h-4 w-4" />
        </Button>
      ) : (
        <SignInButton mode="modal">
          <Button variant="outline" size="icon" disabled={isWorking}>
            <span className="sr-only">Sign in to add a course</span>
            <Plus className="h-4 w-4" />
          </Button>
        </SignInButton>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (!selectedCourseId) return
          setEditedCourseName(selectedCourse?.name ?? '')
          setIsEditing(true)
        }}
        disabled={!isSignedIn || !selectedCourseId || !onRenameCourse || isWorking}
      >
        <span className="sr-only">Edit course name</span>
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={handleDeleteCourse}
        disabled={!isSignedIn || !selectedCourseId || !onDeleteCourse || isWorking}
        className="text-destructive hover:text-destructive"
      >
        <span className="sr-only">Delete course</span>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
