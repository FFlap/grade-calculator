import { useReducer, useCallback, useMemo, useState } from 'react'
import { SortableHeader } from '@/components/SortableHeader'
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
import { Calculator, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import {
  compareNumbers,
  compareText,
  cycleSort,
  stableSort,
  toFiniteNumber,
  type SortDirection,
  type SortState,
} from '@/lib/table-sorting'
import { sanitizeNumberInput } from './types'

export interface CourseEntry {
  id: string
  name: string
  grade: string
  credits: string
}

export interface GPAResult {
  gpa: number
  totalCredits: number
  totalPoints: number
}

export interface GPAScaleEntry {
  letter: string
  points: number
}

export interface GPAScaleDraftEntry {
  letter: string
  points: string
}

export const DEFAULT_GPA_SCALE: GPAScaleEntry[] = [
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

type GPATableSortColumn = 'course' | 'grade' | 'credits'

export function sortGpaCoursesByGrade(
  courses: readonly CourseEntry[],
  direction: SortDirection,
  gpaScale: readonly GPAScaleEntry[]
) {
  const pointsByLetter = new Map(
    gpaScale.map((entry) => [entry.letter, entry.points])
  )

  return stableSort(
    courses,
    direction,
    (course) => {
      const points = pointsByLetter.get(course.grade)
      return points === undefined
        ? null
        : { letter: course.grade, points }
    },
    (a, b) => compareNumbers(a.points, b.points) || compareText(a.letter, b.letter)
  )
}

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

export function createValidatedGPAScale(
  scaleDraft: GPAScaleDraftEntry[]
): GPAScaleEntry[] {
  return scaleDraft.map((entry) => {
    const points = Number.parseFloat(entry.points)

    return {
      letter: entry.letter,
      points: Number.isFinite(points) ? Math.max(0, Math.min(5, points)) : 0,
    }
  })
}

export function calculateGPAResult(
  courses: CourseEntry[],
  gpaScale: GPAScaleEntry[]
): GPAResult | null {
  let totalPoints = 0
  let totalCredits = 0
  const pointsByLetter = new Map(
    gpaScale.map((entry) => [entry.letter, entry.points])
  )

  for (const course of courses) {
    const creditsInput = course.credits.trim()
    const credits = creditsInput === '' ? 3 : parseFloat(creditsInput)
    const gradePoints = pointsByLetter.get(course.grade)

    if (isNaN(credits) || credits <= 0 || gradePoints === undefined) continue

    totalPoints += gradePoints * credits
    totalCredits += credits
  }

  if (totalCredits === 0) return null

  return {
    gpa: totalPoints / totalCredits,
    totalCredits,
    totalPoints,
  }
}

interface GPACalculatorState {
  courses: CourseEntry[]
  gpaScale: GPAScaleEntry[]
  scaleDraft: GPAScaleDraftEntry[]
  isEditingScale: boolean
  result: GPAResult | null
  error: string | null
}

type GPACalculatorAction =
  | { type: 'update-course'; id: string; field: keyof CourseEntry; value: string }
  | { type: 'delete-course'; id: string }
  | { type: 'add-course' }
  | { type: 'calculation-success'; result: GPAResult }
  | { type: 'calculation-error'; message: string }
  | { type: 'reset-courses' }
  | { type: 'toggle-scale-editor' }
  | { type: 'update-scale-draft'; index: number; points: string }
  | { type: 'save-scale' }
  | { type: 'reset-scale' }

function createInitialGPACalculatorState(): GPACalculatorState {
  return {
    courses: [createEmptyCourse(), createEmptyCourse(), createEmptyCourse()],
    gpaScale: DEFAULT_GPA_SCALE,
    scaleDraft: createScaleDraft(DEFAULT_GPA_SCALE),
    isEditingScale: false,
    result: null,
    error: null,
  }
}

function gpaCalculatorReducer(
  state: GPACalculatorState,
  action: GPACalculatorAction
): GPACalculatorState {
  switch (action.type) {
    case 'update-course':
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.id
            ? { ...course, [action.field]: action.value }
            : course
        ),
        result: null,
        error: null,
      }
    case 'delete-course':
      return {
        ...state,
        courses: state.courses.filter((course) => course.id !== action.id),
        result: null,
        error: null,
      }
    case 'add-course':
      return {
        ...state,
        courses: [...state.courses, createEmptyCourse()],
        error: null,
      }
    case 'calculation-success':
      return { ...state, result: action.result, error: null }
    case 'calculation-error':
      return { ...state, result: null, error: action.message }
    case 'reset-courses':
      return {
        ...state,
        courses: [createEmptyCourse(), createEmptyCourse(), createEmptyCourse()],
        result: null,
        error: null,
      }
    case 'toggle-scale-editor':
      return {
        ...state,
        scaleDraft: createScaleDraft(state.gpaScale),
        isEditingScale: !state.isEditingScale,
      }
    case 'update-scale-draft':
      return {
        ...state,
        scaleDraft: state.scaleDraft.map((draft, index) =>
          index === action.index ? { ...draft, points: action.points } : draft
        ),
      }
    case 'save-scale':
      return {
        ...state,
        gpaScale: createValidatedGPAScale(state.scaleDraft),
        isEditingScale: false,
        result: null,
        error: null,
      }
    case 'reset-scale':
      return {
        ...state,
        gpaScale: DEFAULT_GPA_SCALE,
        scaleDraft: createScaleDraft(DEFAULT_GPA_SCALE),
        result: null,
        error: null,
      }
  }
}

export function GPACalculator() {
  const [sort, setSort] = useState<SortState<GPATableSortColumn>>(null)
  const [state, dispatch] = useReducer(
    gpaCalculatorReducer,
    undefined,
    createInitialGPACalculatorState
  )
  const { courses, gpaScale, scaleDraft, isEditingScale, result, error } = state
  const sortedCourses = useMemo(() => {
    if (!sort) return courses

    switch (sort.column) {
      case 'course':
        return stableSort(
          courses,
          sort.direction,
          (course) => course.name,
          compareText
        )
      case 'grade':
        return sortGpaCoursesByGrade(courses, sort.direction, gpaScale)
      case 'credits':
        return stableSort(
          courses,
          sort.direction,
          (course) => toFiniteNumber(course.credits),
          compareNumbers
        )
    }
  }, [courses, gpaScale, sort])

  const getSortDirection = (column: GPATableSortColumn) =>
    sort?.column === column ? sort.direction : null

  const handleUpdateCourse = useCallback(
    (id: string, field: keyof CourseEntry, value: string) => {
      dispatch({ type: 'update-course', id, field, value })
    },
    []
  )

  const handleDeleteCourse = useCallback((id: string) => {
    dispatch({ type: 'delete-course', id })
  }, [])

  const handleAddCourse = useCallback(() => {
    dispatch({ type: 'add-course' })
  }, [])

  const handleCalculate = () => {
    const nextResult = calculateGPAResult(courses, gpaScale)

    if (!nextResult) {
      dispatch({
        type: 'calculation-error',
        message: 'Select a letter grade for at least one course.',
      })
      return
    }

    dispatch({ type: 'calculation-success', result: nextResult })
  }

  const handleReset = () => {
    dispatch({ type: 'reset-courses' })
  }

  const handleSaveScale = () => {
    dispatch({ type: 'save-scale' })
  }

  const handleResetScale = () => {
    dispatch({ type: 'reset-scale' })
  }

  const isDefaultScale =
    gpaScale.length === DEFAULT_GPA_SCALE.length &&
    gpaScale.every(
      (entry, index) => entry.points === DEFAULT_GPA_SCALE[index]?.points
    )

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.7) return 'text-accent-strong'
    if (gpa >= 3.0) return 'text-foreground'
    if (gpa >= 2.0) return 'text-muted-foreground'
    if (gpa >= 1.0) return 'text-muted-foreground'
    return 'text-destructive'
  }

  return (
    <div className="grid items-start gap-4 lg:gap-7 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
      <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 lg:rounded-2xl xl:sticky xl:top-6">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
              GPA Summary
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter letter grades and credit hours, then calculate your cumulative GPA.
            </p>
          </div>

          <div className="space-y-3 border-t border-border/70 pt-4 sm:pt-5">
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
                onClick={() => dispatch({ type: 'toggle-scale-editor' })}
              >
                <SlidersHorizontal className="size-4" />
                {isEditingScale ? 'Close' : 'Customize'}
              </Button>
            </div>

            {isEditingScale && (
              <div className="space-y-3 rounded-sm border border-border/70 bg-muted/25 p-3.5">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
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
                          dispatch({ type: 'update-scale-draft', index, points })
                        }}
                        className="h-8 rounded-sm"
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
              <div className="space-y-3 sm:space-y-4">
                <div className="rounded-sm border border-accent-strong/15 bg-accent-strong/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] lg:rounded-sm sm:p-5">
                  <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-accent-strong lg:text-[0.72rem] sm:tracking-[0.14em]">
                    GPA
                  </div>
                  <div className={`font-display mt-2 text-5xl font-semibold leading-none sm:mt-3 lg:text-6xl ${getGPAColor(result.gpa)}`}>
                    {result.gpa.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  <div className="rounded-sm border border-border/70 bg-card/90 px-3 py-3 lg:rounded-sm lg:px-4 lg:py-3.5">
                    <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:text-[0.72rem] sm:tracking-[0.12em]">
                      Credits
                    </div>
                    <div className="font-display mt-3 text-2xl font-semibold leading-none text-foreground sm:mt-4 lg:text-3xl">
                      {result.totalCredits}
                    </div>
                  </div>
                  <div className="rounded-sm border border-border/70 bg-card/90 px-3 py-3 lg:rounded-sm lg:px-4 lg:py-3.5">
                    <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:text-[0.72rem] sm:tracking-[0.12em]">
                      Points
                    </div>
                    <div className="font-display mt-3 text-2xl font-semibold leading-none text-foreground sm:mt-4 lg:text-3xl">
                      {result.totalPoints.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1 lg:gap-3">
            <Button onClick={handleCalculate} className="h-10 flex-1 text-sm">
              <Calculator className="size-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-10 flex-1 text-sm">
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 lg:rounded-2xl">
        <CardContent className="p-0">
          <div className="border-b border-border/70 px-4 py-4 lg:px-6 lg:py-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
              Course Entry
            </h2>
          </div>

          <div className="px-4 py-3 text-xs text-muted-foreground lg:px-6 lg:py-4 lg:text-sm">
            Add each course with its letter grade and credit hours.
          </div>

          <div>
            <div role="table" aria-label="GPA courses" className="w-full">
              <div role="row" className="grid grid-cols-[minmax(5rem,1fr)_4.25rem_3.8rem_1.5rem] gap-1 border-b border-border/70 px-2 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground min-[390px]:grid-cols-[minmax(5rem,1.35fr)_minmax(4.25rem,1fr)_minmax(3.8rem,1fr)_1.5rem] min-[390px]:gap-1.5 sm:px-3 sm:text-[0.64rem] sm:tracking-[0.08em] xl:grid-cols-[minmax(12rem,1.35fr)_minmax(7.5rem,1fr)_minmax(6rem,1fr)_2.5rem] xl:gap-2.5 xl:px-5 xl:py-3.5 xl:text-[0.72rem] xl:tracking-[0.12em] 2xl:gap-3 2xl:tracking-[0.14em]">
                <SortableHeader
                  label="Course"
                  direction={getSortDirection('course')}
                  className="pl-1.5 lg:pl-2.5"
                  onClick={() =>
                    setSort((current) => cycleSort(current, 'course'))
                  }
                />
                <SortableHeader
                  label="Grade"
                  direction={getSortDirection('grade')}
                  align="center"
                  onClick={() =>
                    setSort((current) => cycleSort(current, 'grade'))
                  }
                />
                <SortableHeader
                  label="Credits"
                  direction={getSortDirection('credits')}
                  align="center"
                  onClick={() =>
                    setSort((current) => cycleSort(current, 'credits'))
                  }
                />
                <span role="columnheader" aria-label="Actions"></span>
              </div>

              <div role="rowgroup" className="divide-y divide-border/70">
                {sortedCourses.map((course) => (
                  <div
                    key={course.id}
                    role="row"
                    className="group grid grid-cols-[minmax(5rem,1fr)_4.25rem_3.8rem_1.5rem] items-center gap-1 px-2 py-2.5 transition-colors hover:bg-muted/45 min-[390px]:grid-cols-[minmax(5rem,1.35fr)_minmax(4.25rem,1fr)_minmax(3.8rem,1fr)_1.5rem] min-[390px]:gap-1.5 sm:px-3 xl:grid-cols-[minmax(12rem,1.35fr)_minmax(7.5rem,1fr)_minmax(6rem,1fr)_2.5rem] xl:gap-2.5 xl:px-5 xl:py-3.5 2xl:gap-3"
                  >
                    <label role="cell" className="min-w-0">
                      <span className="sr-only">
                        Course
                      </span>
                      <Input
                        type="text"
                        placeholder="e.g. Math 101"
                        value={course.name}
                        onChange={(e) =>
                          handleUpdateCourse(course.id, 'name', e.target.value)
                        }
                        className="h-8 rounded-sm border-transparent bg-transparent px-1.5 text-xs shadow-none placeholder:text-muted-foreground/70 hover:border-border/70 hover:bg-input/90 focus-visible:bg-input lg:h-9 lg:px-2.5 lg:text-sm"
                      />
                    </label>
                    <label role="cell" className="w-full max-w-[7rem] justify-self-center">
                      <span className="sr-only">
                        Grade
                      </span>
                      <Select
                        value={course.grade}
                        onValueChange={(value) =>
                          handleUpdateCourse(course.id, 'grade', value)
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 text-xs shadow-none data-[placeholder]:text-muted-foreground/70 hover:border-border/70 hover:bg-input/90 focus-visible:bg-input lg:h-9 lg:px-3 lg:text-sm">
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
                    </label>
                    <label role="cell" className="w-full max-w-[6.25rem] justify-self-center">
                      <span className="sr-only">
                        Credits
                      </span>
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
                        className="h-8 rounded-sm border-transparent bg-transparent px-0.5 text-center text-xs shadow-none placeholder:text-muted-foreground/70 hover:border-border/70 hover:bg-input/90 focus-visible:bg-input lg:h-9 lg:px-1 lg:text-sm"
                      />
                    </label>
                    <div role="cell">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCourse(course.id)}
                        className={`size-6 rounded-sm text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive lg:h-9 lg:w-9 ${
                          courses.length > 1
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        disabled={courses.length <= 1}
                      >
                        <X className="size-3 lg:size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 px-3.5 pt-1.5 pb-2.5 sm:px-[1.125rem] xl:px-[1.875rem] xl:pt-2 xl:pb-3.5">
            <button
              type="button"
              onClick={handleAddCourse}
              className="-ml-2.5 inline-flex h-8 items-center rounded-sm border border-transparent bg-transparent px-2.5 text-sm font-medium text-accent-strong transition-colors hover:border-border/70 hover:bg-background hover:text-accent-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              aria-label="Add course"
            >
              + Add Course
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
