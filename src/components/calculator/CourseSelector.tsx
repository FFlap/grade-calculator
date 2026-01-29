import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Check } from 'lucide-react'
import type { Course } from './types'

interface CourseSelectorProps {
  courses: Course[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string | null) => void
  onCreateCourse: (name: string) => void
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateCourse,
}: CourseSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')

  const handleCreateCourse = () => {
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim())
      setNewCourseName('')
      setIsCreating(false)
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
          disabled={!newCourseName.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreating(false)}
        >
          <span className="sr-only">Cancel</span>
          ×
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Select
        value={selectedCourseId ?? 'none'}
        onValueChange={(value) => onSelectCourse(value === 'none' ? null : value)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select a course to save grades" />
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
      <Button variant="outline" size="icon" onClick={() => setIsCreating(true)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
