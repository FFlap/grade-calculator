import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { GradeTable } from './GradeTable'
import { CourseSelector } from './CourseSelector'
import {
  type Grade,
  type GradeRow,
  type CalculationResult,
  type Course,
  type LetterGradeThreshold,
  calculateWeightedAverage,
  calculateNeededGrade,
  getGradeInputError,
  LETTER_GRADE_THRESHOLDS,
  parseGradeInput,
  percentageToLetter,
  sanitizeNumberInput,
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
    date: '',
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
  const [rows, setRows] = useState<GradeRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ])
  const [targetGrade, setTargetGrade] = useState('80')
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)

  const selectedCourse = useMemo(
    () => (selectedCourseId ? courses.find((c) => c._id === selectedCourseId) ?? null : null),
    [courses, selectedCourseId]
  )

  const savedGrades = useQuery(
    api.grades.listByCourse,
    selectedCourseId ? { courseId: selectedCourseId } : 'skip'
  ) as Grade[] | undefined
  const upsertGradeRow = useMutation(api.grades.upsertRow)
  const removeGradeRow = useMutation(api.grades.removeRow)
  const removeGradesByCourse = useMutation(api.grades.removeByCourse)
  const updateCourseTargetGrade = useMutation(api.courses.updateTargetGrade)

  const latestRowsRef = useRef<GradeRow[]>(rows)
  useEffect(() => {
    latestRowsRef.current = rows
  }, [rows])

  const buildResult = useCallback(
    (
      nextRows: GradeRow[],
      nextTargetGradeValue: number,
      thresholds?: LetterGradeThreshold[]
    ): CalculationResult | null => {
      const calcResult = calculateWeightedAverage(nextRows)
      if (!calcResult) {
        return null
      }

      const remainingWeight = 100 - calcResult.totalWeight
      const needed =
        remainingWeight > 0
          ? calculateNeededGrade(
              calcResult.average,
              calcResult.totalWeight,
              nextTargetGradeValue
            )
          : null

      const averageOnCompletedWork = calcResult.average
      const overallCoursePercentSoFar = calcResult.weightedSum / 100

      return {
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
      }
    },
    []
  )

  const lastLoadedCourseIdRef = useRef<Course['_id'] | null>(null)
  useEffect(() => {
    if (!selectedCourseId) {
      lastLoadedCourseIdRef.current = null
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])
      setTargetGrade('80')
      setResult(null)
      setInvalidMessage(null)
      return
    }
    if (!selectedCourse) return
    if (lastLoadedCourseIdRef.current === selectedCourseId) return
    if (!savedGrades) return

    lastLoadedCourseIdRef.current = selectedCourseId

    const mapped = [...savedGrades]
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      .map((g) => ({
        id: String(g.clientRowId ?? g._id),
        assignment: g.assignmentName ?? '',
        date: g.dueDate ?? '',
        grade: g.gradeInput ?? String(g.grade ?? ''),
        weight: g.weightInput ?? String(g.weight ?? ''),
      }))

    const nextRows =
      mapped.length > 0
        ? mapped
        : [createEmptyRow(), createEmptyRow(), createEmptyRow()]
    const nextTargetGradeValue = selectedCourse.targetGrade ?? 80
    const thresholds = selectedCourse.letterGradeThresholds

    setTargetGrade(String(nextTargetGradeValue))
    setRows(nextRows)
    setResult(buildResult(nextRows, nextTargetGradeValue, thresholds))
    setInvalidMessage(null)
  }, [
    buildResult,
    savedGrades,
    selectedCourse,
    selectedCourseId,
  ])

  const [isEditingScale, setIsEditingScale] = useState(false)
  const [scaleDraft, setScaleDraft] = useState<LetterGradeThreshold[]>([])
  const [isSavingScale, setIsSavingScale] = useState(false)

  useEffect(() => {
    if (!isEditingScale) return
    setScaleDraft(selectedCourse?.letterGradeThresholds ?? LETTER_GRADE_THRESHOLDS)
  }, [isEditingScale, selectedCourse])

  const saveTimeoutsRef = useRef<Map<string, number>>(new Map())
  const targetGradeSaveTimeoutsRef = useRef<Map<string, number>>(new Map())
  const scheduleSaveRow = useCallback(
    (rowId: string) => {
      if (!isSignedIn || !selectedCourseId) return

      const existing = saveTimeoutsRef.current.get(rowId)
      if (existing) window.clearTimeout(existing)

      const handle = window.setTimeout(async () => {
        const row = latestRowsRef.current.find((r) => r.id === rowId)
        if (!row) return

        const weightParsed = Number.parseFloat(row.weight.trim().replace(/%$/, ''))
        const weight = Number.isFinite(weightParsed) && weightParsed > 0 ? weightParsed : 0
        const gradeValue = parseGradeInput(row.grade) ?? 0

        await upsertGradeRow({
          courseId: selectedCourseId,
          clientRowId: row.id,
          assignmentName: row.assignment,
          dueDate: row.date,
          gradeInput: row.grade,
          grade: gradeValue,
          weightInput: row.weight,
          weight,
        })

        saveTimeoutsRef.current.delete(rowId)
      }, 350)

      saveTimeoutsRef.current.set(rowId, handle)
    },
    [isSignedIn, selectedCourseId, upsertGradeRow]
  )

  const scheduleSaveTargetGrade = useCallback(
    (courseId: Course['_id'], value: string) => {
      if (!isSignedIn) return

      const key = String(courseId)
      const existing = targetGradeSaveTimeoutsRef.current.get(key)
      if (existing) window.clearTimeout(existing)

      const handle = window.setTimeout(async () => {
        const nextTargetGrade = Number.parseFloat(value)
        if (!Number.isFinite(nextTargetGrade)) {
          targetGradeSaveTimeoutsRef.current.delete(key)
          return
        }

        await updateCourseTargetGrade({
          id: courseId,
          targetGrade: nextTargetGrade,
        })

        targetGradeSaveTimeoutsRef.current.delete(key)
      }, 350)

      targetGradeSaveTimeoutsRef.current.set(key, handle)
    },
    [isSignedIn, updateCourseTargetGrade]
  )

  const handleUpdateRow = useCallback(
    (id: string, field: keyof GradeRow, value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      )
      setResult(null)
      setInvalidMessage(null)

      scheduleSaveRow(id)
    },
    [scheduleSaveRow]
  )

  const handleDeleteRow = useCallback(
    (id: string) => {
      setRows((prev) => prev.filter((row) => row.id !== id))
      setResult(null)
      setInvalidMessage(null)

      if (isSignedIn && selectedCourseId) {
        removeGradeRow({ courseId: selectedCourseId, clientRowId: id }).catch(
          () => {}
        )
      }
    },
    [isSignedIn, removeGradeRow, selectedCourseId]
  )

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()])
    setResult(null)
    setInvalidMessage(null)
  }, [])

  const handleCalculate = useCallback(() => {
    for (const [index, row] of rows.entries()) {
      const gradeError = getGradeInputError(row.grade)
      if (!gradeError) continue

      const rowName = row.assignment.trim() || `row ${index + 1}`
      setResult(null)
      setInvalidMessage(`Grade for ${rowName} is invalid. ${gradeError}`)
      return
    }

    const targetGradeValue = Number.parseFloat(targetGrade) || 80
    setInvalidMessage(null)
    setResult(
      buildResult(
        rows,
        targetGradeValue,
        selectedCourse?.letterGradeThresholds
      )
    )
  }, [buildResult, rows, selectedCourse?.letterGradeThresholds, targetGrade])

  const handleTargetGradeChange = useCallback(
    (value: string) => {
      setTargetGrade(value)
      setResult(null)
      setInvalidMessage(null)

      if (selectedCourseId) {
        scheduleSaveTargetGrade(selectedCourseId, value)
      }
    },
    [scheduleSaveTargetGrade, selectedCourseId]
  )

  const handleReset = () => {
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])
    setTargetGrade('80')
    setResult(null)
    setInvalidMessage(null)

    if (isSignedIn && selectedCourseId) {
      removeGradesByCourse({ courseId: selectedCourseId })
      scheduleSaveTargetGrade(selectedCourseId, '80')
    }
  }

  const currentAverage = result?.averageOnCompletedWork ?? null
  const projectedGrade = result?.overallCoursePercentSoFar ?? null
  const neededOnRemaining = result?.neededGrade ?? null
  const showOverallSection = result ? result.totalWeight <= 100 : false

  const formatPercent = (value: number | null) =>
    value === null ? '—' : `${value.toFixed(1)}%`

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
      <div className="space-y-5">
        <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Grade Weighting
              </h2>
            </div>

            <div className="space-y-2">
              <Label className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Select course
              </Label>
              <CourseSelector
                isSignedIn={isSignedIn}
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={onSelectCourse}
                onCreateCourse={onCreateCourse}
                onRenameCourse={onRenameCourse}
                onDeleteCourse={onDeleteCourse}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Target grade
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={targetGrade}
                  onChange={(e) =>
                    handleTargetGradeChange(sanitizeNumberInput(e.target.value))
                  }
                  className="h-12 rounded-xl pr-10 text-lg"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            {isSignedIn && selectedCourseId && onUpdateLetterGradeThresholds && (
              <div className="space-y-3 border-t border-border/70 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Letter scale</span>{' '}
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
                  <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {scaleDraft.map((t, idx) => (
                        <div key={t.letter} className="flex items-center gap-2">
                          <div className="w-8 text-sm font-medium text-foreground">
                            {t.letter}
                          </div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={t.min}
                            disabled={t.letter.toUpperCase() === 'F'}
                            onChange={(e) => {
                              const value = Number(sanitizeNumberInput(e.target.value))
                              setScaleDraft((prev) =>
                                prev.map((p, i) =>
                                  i === idx
                                    ? { ...p, min: Number.isFinite(value) ? value : p.min }
                                    : p
                                )
                              )
                            }}
                            className="h-8"
                          />
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
                            .map((t) =>
                              t.letter.toUpperCase() === 'F' ? { ...t, min: 0 } : t
                            )

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

            {result && (
              <div className="border-t border-border/70 pt-6">
                <div className={`grid gap-4 ${showOverallSection ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="rounded-xl border border-border/70 bg-card/90 px-4 py-3.5">
                    <div className="text-[0.72rem] leading-[1.35] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Current average
                    </div>
                    <div className="mt-6 text-4xl font-semibold leading-none text-primary">
                      {formatPercent(currentAverage)}
                    </div>
                  </div>
                  {showOverallSection && (
                    <div className="rounded-xl border border-border/70 bg-card/90 px-4 py-3.5">
                      <div className="text-[0.72rem] leading-[1.35] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Overall
                      </div>
                      <div className="mt-6 text-4xl font-semibold leading-none text-foreground">
                        {formatPercent(projectedGrade)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-4.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                  <div className="text-[0.72rem] leading-[1.35] font-semibold uppercase tracking-[0.12em] text-primary">
                    Required on remaining
                  </div>
                  <div className="mt-2.5 text-5xl font-semibold leading-none text-primary">
                    {neededOnRemaining !== null &&
                    neededOnRemaining < 0
                      ? '0%'
                      : `${neededOnRemaining?.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            )}

            {invalidMessage && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {invalidMessage}
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

        {!isSignedIn && (
          <Card className="bg-card border-border/70 py-0 rounded-2xl">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Sign in to save your grades and create courses for easy access later.
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border/70 py-0 gap-0 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Assignment Entry
            </h2>
          </div>

          <div className="px-6 py-4 text-sm text-muted-foreground">
            Enter grades as percentages, point fractions like{' '}
            <span className="font-medium text-foreground">17/20</span>, or letters like{' '}
            <span className="font-medium text-foreground">A-</span>.
          </div>

          <div className="px-2 pb-5">
            <GradeTable
              rows={rows}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
              onAddRow={handleAddRow}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
