import { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Calculator, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { GradeTable } from './GradeTable'
import { ResultDisplay } from './ResultDisplay'
import { CourseSelector } from './CourseSelector'
import {
  type GradeRow,
  type GradeType,
  type CalculationResult,
  type Course,
  type LetterGradeThreshold,
  calculateWeightedAverage,
  calculateNeededGrade,
  LETTER_GRADE_THRESHOLDS,
  percentageToLetter,
} from './types'

interface GradeCalculatorProps {
  isSignedIn: boolean
  courses: Course[]
  selectedCourseId: Course['_id'] | null
  onSelectCourse: (courseId: Course['_id'] | null) => void
  onCreateCourse: (name: string) => void | Promise<void>
  onRenameCourse?: (courseId: Course['_id'], name: string) => void | Promise<void>
  onDeleteCourse?: (courseId: Course['_id']) => void | Promise<void>
  onUpdateLetterGradeThresholds?: (
    courseId: Course['_id'],
    thresholds: LetterGradeThreshold[]
  ) => void | Promise<void>
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyRow(): GradeRow {
  return {
    id: generateId(),
    assignment: '',
    grade: '',
    weight: '',
  }
}

export function GradeCalculator({
  isSignedIn,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateCourse,
  onRenameCourse,
  onDeleteCourse,
  onUpdateLetterGradeThresholds,
}: GradeCalculatorProps) {
  const [gradeType, setGradeType] = useState<GradeType>('percentage')
  const [rows, setRows] = useState<GradeRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ])
  const [targetGrade, setTargetGrade] = useState('80')
  const [decimalPlaces, setDecimalPlaces] = useState<0 | 1 | 2>(1)
  const [result, setResult] = useState<CalculationResult | null>(null)

  const selectedCourse = useMemo(
    () => (selectedCourseId ? courses.find((c) => c._id === selectedCourseId) ?? null : null),
    [courses, selectedCourseId]
  )

  const [isEditingScale, setIsEditingScale] = useState(false)
  const [scaleDraft, setScaleDraft] = useState<LetterGradeThreshold[]>([])
  const [isSavingScale, setIsSavingScale] = useState(false)

  useEffect(() => {
    if (!isEditingScale) return
    setScaleDraft(selectedCourse?.letterGradeThresholds ?? LETTER_GRADE_THRESHOLDS)
  }, [isEditingScale, selectedCourse])

  const handleUpdateRow = useCallback(
    (id: string, field: keyof GradeRow, value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      )
      setResult(null) // Clear results when input changes
    },
    []
  )

  const handleDeleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
    setResult(null)
  }, [])

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()])
  }, [])

  const handleGradeTypeChange = (value: string) => {
    if (value) {
      setGradeType(value as GradeType)
      setResult(null)
    }
  }

  const handleCalculate = () => {
    const calcResult = calculateWeightedAverage(rows, gradeType)
    if (!calcResult) {
      setResult(null)
      return
    }

    const remainingWeight = 100 - calcResult.totalWeight
    const target = parseFloat(targetGrade) || 80
    const needed =
      remainingWeight > 0
        ? calculateNeededGrade(calcResult.average, calcResult.totalWeight, target)
        : null

    const averageOnCompletedWork = calcResult.average
    const overallCoursePercentSoFar = calcResult.weightedSum / 100
    const thresholds = selectedCourse?.letterGradeThresholds

    setResult({
      averageOnCompletedWork,
      averageOnCompletedWorkLetter: percentageToLetter(
        averageOnCompletedWork,
        thresholds
      ),
      overallCoursePercentSoFar,
      overallCoursePercentSoFarLetter: percentageToLetter(
        overallCoursePercentSoFar,
        thresholds
      ),
      totalWeight: calcResult.totalWeight,
      remainingWeight,
      neededGrade: needed,
    })
  }

  const handleReset = () => {
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])
    setTargetGrade('80')
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            Calculate your weighted grade average
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grade Type Toggle */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Select grade type
            </Label>
            <ToggleGroup
              type="single"
              value={gradeType}
              onValueChange={handleGradeTypeChange}
              spacing={1}
              className="bg-gray-100 p-1 rounded-xl inline-flex justify-start"
            >
              <ToggleGroupItem
                value="percentage"
                className="px-6 py-2 rounded-md text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
              >
                Percentage
              </ToggleGroupItem>
              <ToggleGroupItem
                value="letters"
                className="px-6 py-2 rounded-md text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
              >
                Letters
              </ToggleGroupItem>
              <ToggleGroupItem
                value="points"
                className="px-6 py-2 rounded-md text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
              >
                Points
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Course Selector (signed-in users only) */}
          {isSignedIn && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Course (save your grades + letter scale)
              </Label>
              <CourseSelector
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={onSelectCourse}
                onCreateCourse={onCreateCourse}
                onRenameCourse={onRenameCourse}
                onDeleteCourse={onDeleteCourse}
              />

              {selectedCourseId && onUpdateLetterGradeThresholds && (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-foreground">
                        Letter grade scale:
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {selectedCourse?.letterGradeThresholds ? 'Custom' : 'Default'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingScale((v) => !v)}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {isEditingScale ? 'Close' : 'Customize'}
                    </Button>
                  </div>

                  {isEditingScale && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {scaleDraft.map((t, idx) => (
                          <div key={t.letter} className="flex items-center gap-2">
                            <div className="w-10 text-sm font-medium text-foreground">
                              {t.letter}
                            </div>
                            <Input
                              type="number"
                              value={t.min}
                              disabled={t.letter.toUpperCase() === 'F'}
                              onChange={(e) => {
                                const value = Number(e.target.value)
                                setScaleDraft((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, min: Number.isFinite(value) ? value : p.min } : p
                                  )
                                )
                              }}
                              className="h-9"
                            />
                            <div className="text-sm text-muted-foreground">%</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScaleDraft(LETTER_GRADE_THRESHOLDS)}
                          disabled={isSavingScale}
                        >
                          Reset to default
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            const normalized = [...scaleDraft]
                              .map((t) => ({
                                letter: t.letter.trim(),
                                min: Math.max(0, Math.min(100, Number(t.min) || 0)),
                              }))
                              .map((t) => (t.letter.toUpperCase() === 'F' ? { ...t, min: 0 } : t))

                            // Ensure ordering matches the default and is descending.
                            const byLetter = new Map(normalized.map((t) => [t.letter, t]))
                            const ordered = LETTER_GRADE_THRESHOLDS.map(
                              (t) => byLetter.get(t.letter) ?? t
                            )
                            const isDescending = ordered.every(
                              (t, i) => i === 0 || ordered[i - 1]!.min >= t.min
                            )
                            if (!isDescending) {
                              window.alert(
                                'Thresholds must be in descending order (A+ ≥ A ≥ ... ≥ F).'
                              )
                              return
                            }

                            try {
                              setIsSavingScale(true)
                              await onUpdateLetterGradeThresholds(selectedCourseId, ordered)
                              setIsEditingScale(false)
                            } finally {
                              setIsSavingScale(false)
                            }
                          }}
                          disabled={isSavingScale}
                        >
                          Save scale
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grade Input Table */}
          <GradeTable
            rows={rows}
            gradeType={gradeType}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onAddRow={handleAddRow}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Target Grade & Decimal Places */}
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Target grade
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Find grade needed to get
                </span>
                <Input
                  type="number"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-20 text-center border-border"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Decimal places
              </Label>
              <ToggleGroup
                type="single"
                value={String(decimalPlaces)}
                onValueChange={(v) => v && setDecimalPlaces(Number(v) as 0 | 1 | 2)}
                spacing={1}
                className="bg-gray-100 p-1 rounded-xl inline-flex"
              >
                <ToggleGroupItem
                  value="0"
                  className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
                >
                  0
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="1"
                  className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
                >
                  1
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="2"
                  className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-sm border-transparent hover:bg-transparent"
                >
                  2
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

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

      {/* Results Display */}
      <ResultDisplay
        result={result}
        decimalPlaces={decimalPlaces}
        targetGrade={parseFloat(targetGrade) || 80}
      />

      {/* Sign-in prompt for anonymous users */}
      {!isSignedIn && (
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Sign in to save your grades and create courses for easy access later.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
