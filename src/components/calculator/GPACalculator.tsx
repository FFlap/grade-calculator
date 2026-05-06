import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, RotateCcw, Plus, SlidersHorizontal, X } from 'lucide-react'
import { sanitizeNumberInput } from './types'

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

interface GPAScaleEntry {
  letter: string
  points: number
}

interface GPAScaleDraftEntry {
  letter: string
  points: string
}

const DEFAULT_GPA_SCALE: GPAScaleEntry[] = [
  { letter: 'A+', points: 4.0 },
  { letter: 'A', points: 4.0 },
  { letter: 'A-', points: 3.7 },
  { letter: 'B+', points: 3.3 },
  { letter: 'B', points: 3.0 },
  { letter: 'B-', points: 2.7 },
  { letter: 'C+', points: 2.3 },
  { letter: 'C', points: 2.0 },
  { letter: 'C-', points: 1.7 },
  { letter: 'D+', points: 1.3 },
  { letter: 'D', points: 1.0 },
  { letter: 'D-', points: 0.7 },
  { letter: 'F', points: 0.0 },
]

const GRADE_OPTIONS = DEFAULT_GPA_SCALE.map((entry) => entry.letter)

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

function createScaleDraft(scale: GPAScaleEntry[]): GPAScaleDraftEntry[] {
  return scale.map((entry) => ({
    letter: entry.letter,
    points: entry.points.toFixed(1),
  }))
}

export function GPACalculator() {
  const [courses, setCourses] = useState<CourseEntry[]>([
    createEmptyCourse(),
    createEmptyCourse(),
    createEmptyCourse(),
  ])
  const [gpaScale, setGpaScale] = useState<GPAScaleEntry[]>(DEFAULT_GPA_SCALE)
  const [scaleDraft, setScaleDraft] = useState<GPAScaleDraftEntry[]>(
    createScaleDraft(DEFAULT_GPA_SCALE)
  )
  const [isEditingScale, setIsEditingScale] = useState(false)
  const [result, setResult] = useState<GPAResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateCourse = useCallback(
    (id: string, field: keyof CourseEntry, value: string) => {
      setCourses((prev) =>
        prev.map((course) =>
          course.id === id ? { ...course, [field]: value } : course
        )
      )
      setResult(null)
      setError(null)
    },
    []
  )

  const handleDeleteCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id))
    setResult(null)
    setError(null)
  }, [])

  const handleAddCourse = useCallback(() => {
    setCourses((prev) => [...prev, createEmptyCourse()])
    setError(null)
  }, [])

  const handleCalculate = () => {
    let totalPoints = 0
    let totalCredits = 0

    for (const course of courses) {
      const creditsInput = course.credits.trim()
      const credits = creditsInput === '' ? 3 : parseFloat(creditsInput)
      const gradePoints = gpaScale.find(
        (entry) => entry.letter === course.grade
      )?.points

      if (isNaN(credits) || credits <= 0 || gradePoints === undefined) continue

      totalPoints += gradePoints * credits
      totalCredits += credits
    }

    if (totalCredits === 0) {
      setResult(null)
      setError('Select a letter grade for at least one course.')
      return
    }

    setError(null)
    setResult({
      gpa: totalPoints / totalCredits,
      totalCredits,
      totalPoints,
    })
  }

  const handleReset = () => {
    setCourses([createEmptyCourse(), createEmptyCourse(), createEmptyCourse()])
    setResult(null)
    setError(null)
  }

  const handleSaveScale = () => {
    setGpaScale(
      scaleDraft.map((entry) => {
        const points = Number.parseFloat(entry.points)

        return {
          letter: entry.letter,
          points: Number.isFinite(points) ? Math.max(0, Math.min(5, points)) : 0,
        }
      })
    )
    setIsEditingScale(false)
    setResult(null)
    setError(null)
  }

  const handleResetScale = () => {
    setGpaScale(DEFAULT_GPA_SCALE)
    setScaleDraft(createScaleDraft(DEFAULT_GPA_SCALE))
    setResult(null)
    setError(null)
  }

  const isDefaultScale = gpaScale.every(
    (entry, index) => entry.points === DEFAULT_GPA_SCALE[index]?.points
  )

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.7) return 'text-primary'
    if (gpa >= 3.0) return 'text-foreground'
    if (gpa >= 2.0) return 'text-muted-foreground'
    if (gpa >= 1.0) return 'text-muted-foreground'
    return 'text-destructive'
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
      <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
        <CardContent className="space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              GPA Summary
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter letter grades and credit hours, then calculate your cumulative GPA.
            </p>
          </div>

          <div className="space-y-3 border-t border-border/70 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium text-foreground">Letter scale</span>{' '}
                <span className="text-muted-foreground">
                  {isDefaultScale ? 'Default' : 'Custom'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScaleDraft(createScaleDraft(gpaScale))
                  setIsEditingScale((value) => !value)
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {isEditingScale ? 'Close' : 'Customize'}
              </Button>
            </div>

            {isEditingScale && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {scaleDraft.map((entry, index) => (
                    <div key={entry.letter} className="flex items-center gap-2">
                      <div className="w-8 text-sm font-medium text-foreground">
                        {entry.letter}
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={entry.points}
                        onChange={(event) => {
                          const points = sanitizeNumberInput(event.target.value)
                          setScaleDraft((prev) =>
                            prev.map((draft, draftIndex) =>
                              draftIndex === index ? { ...draft, points } : draft
                            )
                          )
                        }}
                        className="h-8 rounded-lg"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetScale}>
                    Reset to default
                  </Button>
                  <Button size="sm" onClick={handleSaveScale}>
                    Save scale
                  </Button>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="border-t border-border/70 pt-6">
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/15 bg-primary/5 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-primary">
                    GPA
                  </div>
                  <div className={`mt-3 text-6xl font-semibold leading-none ${getGPAColor(result.gpa)}`}>
                    {result.gpa.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-card/90 px-4 py-3.5">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Credits
                    </div>
                    <div className="mt-4 text-3xl font-semibold leading-none text-foreground">
                      {result.totalCredits}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/90 px-4 py-3.5">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Points
                    </div>
                    <div className="mt-4 text-3xl font-semibold leading-none text-foreground">
                      {result.totalPoints.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleCalculate} className="h-11 flex-1 rounded-xl">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-11 flex-1 rounded-xl">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Course Entry
            </h2>
          </div>

          <div className="px-6 py-4 text-sm text-muted-foreground">
            Add each course with its letter grade and credit hours.
          </div>

          <div className="overflow-x-auto px-2 pb-5">
            <div className="min-w-[34rem]">
              <div className="grid grid-cols-[minmax(12rem,1fr)_7.5rem_6rem_2.5rem] gap-3 border-b border-border/70 px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span>Course</span>
                <span className="text-center">Grade</span>
                <span className="text-center">Credits</span>
                <span></span>
              </div>

              <div className="divide-y divide-border/70">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="group grid grid-cols-[minmax(12rem,1fr)_7.5rem_6rem_2.5rem] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/12"
                  >
                    <Input
                      type="text"
                      placeholder="e.g. Math 101"
                      value={course.name}
                      onChange={(e) =>
                        handleUpdateCourse(course.id, 'name', e.target.value)
                      }
                      className="h-9 rounded-lg border-transparent bg-transparent px-2.5 shadow-none hover:border-border/70 hover:bg-input/90 focus-visible:bg-input"
                    />
                    <Select
                      value={course.grade}
                      onValueChange={(value) =>
                        handleUpdateCourse(course.id, 'grade', value)
                      }
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg border-transparent bg-transparent shadow-none hover:border-border/70 hover:bg-input/90 focus-visible:bg-input">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {GRADE_OPTIONS.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="3"
                      value={course.credits}
                      onChange={(e) =>
                        handleUpdateCourse(
                          course.id,
                          'credits',
                          sanitizeNumberInput(e.target.value)
                        )
                      }
                      className="h-9 rounded-lg border-transparent bg-transparent text-center shadow-none hover:border-border/70 hover:bg-input/90 focus-visible:bg-input"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCourse(course.id)}
                      className={`h-9 w-9 rounded-xl text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive ${
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
            </div>

            <div className="px-4 pt-3">
              <Button
                variant="outline"
                onClick={handleAddCourse}
                className="h-11 w-full rounded-xl border-dashed border-border/80 bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add course
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
