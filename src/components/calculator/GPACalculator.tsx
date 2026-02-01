import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, RotateCcw, Plus, X } from 'lucide-react'

interface CourseEntry {
  id: string
  name: string
  grade: string
  credits: string
}

interface GPAResult {
  gpa: number
  totalCredits: number
  totalPoints: number
}

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

const GRADE_OPTIONS = Object.keys(LETTER_TO_GPA)

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyCourse(): CourseEntry {
  return {
    id: generateId(),
    name: '',
    grade: '',
    credits: '',
  }
}

export function GPACalculator() {
  const [courses, setCourses] = useState<CourseEntry[]>([
    createEmptyCourse(),
    createEmptyCourse(),
    createEmptyCourse(),
  ])
  const [result, setResult] = useState<GPAResult | null>(null)

  const handleUpdateCourse = useCallback(
    (id: string, field: keyof CourseEntry, value: string) => {
      setCourses((prev) =>
        prev.map((course) =>
          course.id === id ? { ...course, [field]: value } : course
        )
      )
      setResult(null)
    },
    []
  )

  const handleDeleteCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id))
    setResult(null)
  }, [])

  const handleAddCourse = useCallback(() => {
    setCourses((prev) => [...prev, createEmptyCourse()])
  }, [])

  const handleCalculate = () => {
    let totalPoints = 0
    let totalCredits = 0

    for (const course of courses) {
      const credits = parseFloat(course.credits)
      const gradePoints = LETTER_TO_GPA[course.grade]

      if (isNaN(credits) || credits <= 0 || gradePoints === undefined) continue

      totalPoints += gradePoints * credits
      totalCredits += credits
    }

    if (totalCredits === 0) {
      setResult(null)
      return
    }

    setResult({
      gpa: totalPoints / totalCredits,
      totalCredits,
      totalPoints,
    })
  }

  const handleReset = () => {
    setCourses([createEmptyCourse(), createEmptyCourse(), createEmptyCourse()])
    setResult(null)
  }

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.7) return 'text-primary'
    if (gpa >= 3.0) return 'text-foreground'
    if (gpa >= 2.0) return 'text-muted-foreground'
    if (gpa >= 1.0) return 'text-muted-foreground'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            Calculate your cumulative GPA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_80px_40px] gap-2 text-sm font-medium text-muted-foreground px-1">
            <span>Course (optional)</span>
            <span className="text-center">Grade</span>
            <span className="text-center">Credits</span>
            <span></span>
          </div>

          {/* Course Rows */}
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="grid grid-cols-[1fr_120px_80px_40px] gap-2 items-center group"
              >
                <Input
                  type="text"
                  placeholder="e.g. Math 101"
                  value={course.name}
                  onChange={(e) =>
                    handleUpdateCourse(course.id, 'name', e.target.value)
                  }
                  className="bg-input border-border"
                />
                <Select
                  value={course.grade}
                  onValueChange={(value) =>
                    handleUpdateCourse(course.id, 'grade', value)
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="3"
                  value={course.credits}
                  onChange={(e) =>
                    handleUpdateCourse(course.id, 'credits', e.target.value)
                  }
                  className="bg-input border-border text-center"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteCourse(course.id)}
                  className={`h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity ${
                    courses.length > 1
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  disabled={courses.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Course Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCourse}
            className="w-full border-dashed border-border hover:border-primary hover:text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add course
          </Button>

          <div className="border-t border-border" />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleCalculate} className="flex-1 sm:flex-none">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
              <div className="text-sm text-muted-foreground mb-1">Your GPA</div>
              <div className={`text-4xl font-bold ${getGPAColor(result.gpa)}`}>
                {result.gpa.toFixed(2)}
              </div>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total credits</span>
                <span className="font-medium">{result.totalCredits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total grade points</span>
                <span className="font-medium">{result.totalPoints.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-6 text-center text-muted-foreground">
            Enter your courses with grades and credit hours to calculate your GPA.
          </CardContent>
        </Card>
      )}

      {/* GPA Scale Reference */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            GPA Scale Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-xs">
            {GRADE_OPTIONS.map((grade) => (
              <div
                key={grade}
                className="flex justify-between bg-muted/50 rounded px-2 py-1"
              >
                <span className="font-medium">{grade}</span>
                <span className="text-muted-foreground">
                  {LETTER_TO_GPA[grade].toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
