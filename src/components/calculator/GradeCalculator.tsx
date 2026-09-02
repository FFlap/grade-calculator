import { useEffect, useMemo, useReducer, useRef, useCallback } from 'react'
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
  calculateGradeResult,
  getGradeInputError,
  LETTER_GRADE_THRESHOLDS,
  parseGradeInput,
  sanitizeNumberInput,
  gradeToRow,
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

const EMPTY_ROW_COUNT = 3

function createEmptyRow(): GradeRow {
  return {
    id: generateId(),
    assignment: '',
    date: '',
    grade: '',
    weight: '',
  }
}

function createEmptyRows(count = EMPTY_ROW_COUNT): GradeRow[] {
  return Array.from({ length: count }, createEmptyRow)
}

function matchesDefaultThresholds(thresholds: LetterGradeThreshold[]) {
  return (
    thresholds.length === LETTER_GRADE_THRESHOLDS.length &&
    LETTER_GRADE_THRESHOLDS.every(
      (threshold, index) =>
        threshold.letter === thresholds[index]?.letter &&
        threshold.min === thresholds[index]?.min
    )
  )
}

function formatPercent(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

interface GradeCalculatorState {
  rows: GradeRow[]
  targetGrade: string
  result: CalculationResult | null
  invalidMessage: string | null
  localLetterGradeThresholds: LetterGradeThreshold[] | null
  isEditingScale: boolean
  scaleDraft: LetterGradeThreshold[]
  isSavingScale: boolean
}

type GradeCalculatorAction =
  | { type: 'clear-course' }
  | {
      type: 'load-course'
      rows: GradeRow[]
      targetGrade: string
      result: CalculationResult | null
    }
  | { type: 'update-row'; id: string; field: keyof GradeRow; value: string }
  | { type: 'delete-row'; id: string }
  | { type: 'add-row' }
  | { type: 'target-grade-change'; value: string }
  | { type: 'calculation-error'; message: string }
  | { type: 'calculation-success'; result: CalculationResult | null }
  | { type: 'reset' }
  | { type: 'toggle-scale-editor'; thresholds?: LetterGradeThreshold[] }
  | { type: 'reset-scale-draft' }
  | { type: 'update-scale-draft'; index: number; min: number }
  | { type: 'save-scale-start' }
  | { type: 'save-scale-success'; localThresholds?: LetterGradeThreshold[] | null }
  | { type: 'save-scale-end' }

function createInitialGradeCalculatorState(): GradeCalculatorState {
  return {
    rows: createEmptyRows(),
    targetGrade: '80',
    result: null,
    invalidMessage: null,
    localLetterGradeThresholds: null,
    isEditingScale: false,
    scaleDraft: [],
    isSavingScale: false,
  }
}

function gradeCalculatorReducer(
  state: GradeCalculatorState,
  action: GradeCalculatorAction
): GradeCalculatorState {
  switch (action.type) {
    case 'clear-course':
      return {
        ...state,
        rows: createEmptyRows(),
        targetGrade: '80',
        result: null,
        invalidMessage: null,
      }
    case 'load-course':
      return {
        ...state,
        rows: action.rows,
        targetGrade: action.targetGrade,
        result: action.result,
        invalidMessage: null,
      }
    case 'update-row':
      return {
        ...state,
        rows: state.rows.map((row) =>
          row.id === action.id ? { ...row, [action.field]: action.value } : row
        ),
        result: null,
        invalidMessage: null,
      }
    case 'delete-row':
      return {
        ...state,
        rows: state.rows.filter((row) => row.id !== action.id),
        result: null,
        invalidMessage: null,
      }
    case 'add-row':
      return {
        ...state,
        rows: [...state.rows, createEmptyRow()],
        result: null,
        invalidMessage: null,
      }
    case 'target-grade-change':
      return {
        ...state,
        targetGrade: action.value,
        result: null,
        invalidMessage: null,
      }
    case 'calculation-error':
      return { ...state, result: null, invalidMessage: action.message }
    case 'calculation-success':
      return { ...state, result: action.result, invalidMessage: null }
    case 'reset':
      return {
        ...state,
        rows: createEmptyRows(),
        targetGrade: '80',
        result: null,
        invalidMessage: null,
      }
    case 'toggle-scale-editor': {
      if (state.isEditingScale) {
        return { ...state, isEditingScale: false }
      }
      return {
        ...state,
        isEditingScale: true,
        scaleDraft: action.thresholds ?? LETTER_GRADE_THRESHOLDS,
      }
    }
    case 'reset-scale-draft':
      return { ...state, scaleDraft: LETTER_GRADE_THRESHOLDS }
    case 'update-scale-draft':
      return {
        ...state,
        scaleDraft: state.scaleDraft.map((threshold, index) =>
          index === action.index ? { ...threshold, min: action.min } : threshold
        ),
      }
    case 'save-scale-start':
      return { ...state, isSavingScale: true }
    case 'save-scale-success':
      return {
        ...state,
        localLetterGradeThresholds:
          action.localThresholds === undefined
            ? state.localLetterGradeThresholds
            : action.localThresholds,
        result: null,
        isEditingScale: false,
        isSavingScale: false,
      }
    case 'save-scale-end':
      return { ...state, isSavingScale: false }
  }
}

interface SaveLetterScaleOptions {
  scaleDraft: LetterGradeThreshold[]
  isSignedIn: boolean
  selectedCourseId: Course['_id'] | null
  onUpdateLetterGradeThresholds?: (
    courseId: Course['_id'],
    thresholds: LetterGradeThreshold[]
  ) => void | Promise<void>
  dispatch: (action: GradeCalculatorAction) => void
}

async function saveLetterScale({
  scaleDraft,
  isSignedIn,
  selectedCourseId,
  onUpdateLetterGradeThresholds,
  dispatch,
}: SaveLetterScaleOptions) {
  const normalized = scaleDraft.map((t) => {
    const letter = t.letter.trim()
    const min =
      letter.toUpperCase() === 'F'
        ? 0
        : Math.max(0, Math.min(100, Number(t.min) || 0))
    return { letter, min }
  })

  const byLetter = new Map(normalized.map((t) => [t.letter, t]))
  const ordered = LETTER_GRADE_THRESHOLDS.map((t) => byLetter.get(t.letter) ?? t)
  const isDescending = ordered.every(
    (t, i) => i === 0 || ordered[i - 1]!.min >= t.min
  )
  if (!isDescending) {
    window.alert('Thresholds must be in descending order (A+ ≥ A ≥ ... ≥ F).')
    return
  }

  try {
    if (isSignedIn && selectedCourseId && onUpdateLetterGradeThresholds) {
      dispatch({ type: 'save-scale-start' })
      await onUpdateLetterGradeThresholds(selectedCourseId, ordered)
      dispatch({ type: 'save-scale-success' })
    } else {
      dispatch({
        type: 'save-scale-success',
        localThresholds: matchesDefaultThresholds(ordered) ? null : ordered,
      })
    }
  } finally {
    if (isSignedIn && selectedCourseId && onUpdateLetterGradeThresholds) {
      dispatch({ type: 'save-scale-end' })
    }
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
  const [state, dispatch] = useReducer(
    gradeCalculatorReducer,
    undefined,
    createInitialGradeCalculatorState
  )
  const {
    rows,
    targetGrade,
    result,
    invalidMessage,
    localLetterGradeThresholds,
    isEditingScale,
    scaleDraft,
    isSavingScale,
  } = state

  const selectedCourse = useMemo(
    () => (selectedCourseId ? courses.find((c) => c._id === selectedCourseId) ?? null : null),
    [courses, selectedCourseId]
  )

  const activeLetterGradeThresholds =
    selectedCourse?.letterGradeThresholds ?? localLetterGradeThresholds ?? undefined
  const hasCustomLetterScale = selectedCourse
    ? Boolean(selectedCourse.letterGradeThresholds)
    : Boolean(localLetterGradeThresholds)

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
      return calculateGradeResult(nextRows, nextTargetGradeValue, thresholds)
    },
    []
  )

  const lastLoadedCourseIdRef = useRef<Course['_id'] | null>(null)
  useEffect(() => {
    if (!selectedCourseId) {
      lastLoadedCourseIdRef.current = null
      dispatch({ type: 'clear-course' })
      return
    }
    if (!selectedCourse) return
    if (lastLoadedCourseIdRef.current === selectedCourseId) return
    if (!savedGrades) return

    lastLoadedCourseIdRef.current = selectedCourseId

    const mapped = Array.from(savedGrades)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      .map(gradeToRow)

    const nextRows = mapped.length > 0 ? mapped : createEmptyRows()
    const nextTargetGradeValue = selectedCourse.targetGrade ?? 80
    const thresholds = selectedCourse.letterGradeThresholds

    dispatch({
      type: 'load-course',
      rows: nextRows,
      targetGrade: String(nextTargetGradeValue),
      result: buildResult(nextRows, nextTargetGradeValue, thresholds),
    })
  }, [
    buildResult,
    savedGrades,
    selectedCourse,
    selectedCourseId,
  ])

  const toggleScaleEditor = () => {
    dispatch({
      type: 'toggle-scale-editor',
      thresholds: activeLetterGradeThresholds,
    })
  }

  const resetScaleDraft = () => {
    dispatch({ type: 'reset-scale-draft' })
  }

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
      dispatch({ type: 'update-row', id, field, value })

      scheduleSaveRow(id)
    },
    [scheduleSaveRow]
  )

  const handleDeleteRow = useCallback(
    (id: string) => {
      dispatch({ type: 'delete-row', id })

      if (isSignedIn && selectedCourseId) {
        removeGradeRow({ courseId: selectedCourseId, clientRowId: id }).catch(
          () => {}
        )
      }
    },
    [isSignedIn, removeGradeRow, selectedCourseId]
  )

  const handleAddRow = useCallback(() => {
    dispatch({ type: 'add-row' })
  }, [])

  const handleCalculate = useCallback(() => {
    for (const [index, row] of rows.entries()) {
      const gradeError = getGradeInputError(row.grade)
      if (!gradeError) continue

      const rowName = row.assignment.trim() || `row ${index + 1}`
      dispatch({
        type: 'calculation-error',
        message: `Grade for ${rowName} is invalid. ${gradeError}`,
      })
      return
    }

    const targetGradeValue = Number.parseFloat(targetGrade) || 80
    dispatch({
      type: 'calculation-success',
      result: buildResult(rows, targetGradeValue, activeLetterGradeThresholds),
    })
  }, [activeLetterGradeThresholds, buildResult, rows, targetGrade])

  const handleTargetGradeChange = useCallback(
    (value: string) => {
      dispatch({ type: 'target-grade-change', value })

      if (selectedCourseId) {
        scheduleSaveTargetGrade(selectedCourseId, value)
      }
    },
    [scheduleSaveTargetGrade, selectedCourseId]
  )

  const handleReset = () => {
    dispatch({ type: 'reset' })

    if (isSignedIn && selectedCourseId) {
      removeGradesByCourse({ courseId: selectedCourseId })
      scheduleSaveTargetGrade(selectedCourseId, '80')
    }
  }

  const handleSaveScale = () =>
    saveLetterScale({
      scaleDraft,
      isSignedIn,
      selectedCourseId,
      onUpdateLetterGradeThresholds,
      dispatch,
    })

  const currentAverage = result?.averageOnCompletedWork ?? null
  const projectedGrade = result?.overallCoursePercentSoFar ?? null
  const neededOnRemaining = result?.neededGrade ?? null
  const showOverallSection = result ? result.totalWeight < 100 : false
  const showRequiredOnRemaining = result ? result.totalWeight < 100 : false

  return (
    <div className="grid items-start gap-4 sm:gap-7 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
      <GradeWeightingPanel
        auth={{ isSignedIn }}
        courses={courses}
        selectedCourseId={selectedCourseId}
        targetGrade={targetGrade}
        scale={{
          hasCustomLetterScale,
          isEditingScale,
          scaleDraft,
          isSavingScale,
        }}
        summary={{
          result,
          currentAverage,
          projectedGrade,
          neededOnRemaining,
          showOverallSection,
          showRequiredOnRemaining,
        }}
        invalidMessage={invalidMessage}
        onSelectCourse={onSelectCourse}
        onCreateCourse={onCreateCourse}
        onRenameCourse={onRenameCourse}
        onDeleteCourse={onDeleteCourse}
        onTargetGradeChange={handleTargetGradeChange}
        onToggleScaleEditor={toggleScaleEditor}
        onResetScaleDraft={resetScaleDraft}
        onUpdateScaleDraft={(index, min) =>
          dispatch({ type: 'update-scale-draft', index, min })
        }
        onSaveScale={handleSaveScale}
        onCalculate={handleCalculate}
        onReset={handleReset}
        formatPercent={formatPercent}
      />
      <AssignmentEntryPanel
        rows={rows}
        onUpdateRow={handleUpdateRow}
        onDeleteRow={handleDeleteRow}
        onAddRow={handleAddRow}
      />
    </div>
  )
}

interface GradeWeightingPanelProps {
  auth: {
    isSignedIn: boolean
  }
  courses: Course[]
  selectedCourseId: Course['_id'] | null
  targetGrade: string
  scale: {
    hasCustomLetterScale: boolean
    isEditingScale: boolean
    scaleDraft: LetterGradeThreshold[]
    isSavingScale: boolean
  }
  summary: {
    result: CalculationResult | null
    currentAverage: number | null
    projectedGrade: number | null
    neededOnRemaining: number | null
    showOverallSection: boolean
    showRequiredOnRemaining: boolean
  }
  invalidMessage: string | null
  onSelectCourse: (courseId: Course['_id'] | null) => void
  onCreateCourse: (name: string) => void | Promise<void>
  onRenameCourse?: (courseId: Course['_id'], name: string) => void | Promise<void>
  onDeleteCourse?: (courseId: Course['_id']) => void | Promise<void>
  onTargetGradeChange: (value: string) => void
  onToggleScaleEditor: () => void
  onResetScaleDraft: () => void
  onUpdateScaleDraft: (index: number, min: number) => void
  onSaveScale: () => void | Promise<void>
  onCalculate: () => void
  onReset: () => void
  formatPercent: (value: number | null) => string
}

function GradeWeightingPanel({
  auth,
  courses,
  selectedCourseId,
  targetGrade,
  scale,
  summary,
  invalidMessage,
  onSelectCourse,
  onCreateCourse,
  onRenameCourse,
  onDeleteCourse,
  onTargetGradeChange,
  onToggleScaleEditor,
  onResetScaleDraft,
  onUpdateScaleDraft,
  onSaveScale,
  onCalculate,
  onReset,
  formatPercent,
}: GradeWeightingPanelProps) {
  const { isSignedIn } = auth
  const {
    hasCustomLetterScale,
    isEditingScale,
    scaleDraft,
    isSavingScale,
  } = scale
  const {
    result,
    currentAverage,
    projectedGrade,
    neededOnRemaining,
    showOverallSection,
    showRequiredOnRemaining,
  } = summary
  return (
    <div className="min-w-0 space-y-4 sm:space-y-5 xl:sticky xl:top-6">
      <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 sm:rounded-2xl">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Grade Weighting
            </h2>
          </div>

          {isSignedIn && (
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
          )}

          <div className="space-y-2">
            <Label className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Target grade
            </Label>
            <div className="relative">
              <Input
                type="text"
                value={targetGrade}
                onChange={(e) =>
                  onTargetGradeChange(sanitizeNumberInput(e.target.value))
                }
                className="h-9 pr-9 text-sm sm:pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground sm:right-4">
                %
              </span>
            </div>
          </div>

          <LetterScaleEditor
            hasCustomLetterScale={hasCustomLetterScale}
            isEditingScale={isEditingScale}
            scaleDraft={scaleDraft}
            isSavingScale={isSavingScale}
            onToggleScaleEditor={onToggleScaleEditor}
            onResetScaleDraft={onResetScaleDraft}
            onUpdateScaleDraft={onUpdateScaleDraft}
            onSaveScale={onSaveScale}
          />

          {result && (
            <GradeResultSummary
              currentAverage={currentAverage}
              projectedGrade={projectedGrade}
              neededOnRemaining={neededOnRemaining}
              showOverallSection={showOverallSection}
              showRequiredOnRemaining={showRequiredOnRemaining}
              formatPercent={formatPercent}
            />
          )}

          {invalidMessage && (
            <div className="rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {invalidMessage}
            </div>
          )}

          <div className="flex gap-2 pt-1 sm:gap-3">
            <Button onClick={onCalculate} className="h-10 flex-1 text-sm">
              <Calculator className="size-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline" onClick={onReset} className="h-10 flex-1 text-sm">
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isSignedIn && (
        <Card className="rounded-xl border-border/70 bg-card py-0 sm:rounded-2xl">
          <CardContent className="p-3 text-xs text-muted-foreground sm:p-4 sm:text-sm">
            Sign in to save your grades and create courses for easy access later.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface LetterScaleEditorProps {
  hasCustomLetterScale: boolean
  isEditingScale: boolean
  scaleDraft: LetterGradeThreshold[]
  isSavingScale: boolean
  onToggleScaleEditor: () => void
  onResetScaleDraft: () => void
  onUpdateScaleDraft: (index: number, min: number) => void
  onSaveScale: () => void | Promise<void>
}

function LetterScaleEditor({
  hasCustomLetterScale,
  isEditingScale,
  scaleDraft,
  isSavingScale,
  onToggleScaleEditor,
  onResetScaleDraft,
  onUpdateScaleDraft,
  onSaveScale,
}: LetterScaleEditorProps) {
  return (
    <div className="space-y-3 border-t border-border/70 pt-4 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-foreground">Letter scale</span>{' '}
          <span className="text-muted-foreground">
            {hasCustomLetterScale ? 'Custom' : 'Default'}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onToggleScaleEditor}>
          <SlidersHorizontal className="size-4" />
          {isEditingScale ? 'Close' : 'Customize'}
        </Button>
      </div>

      {isEditingScale && (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/25 p-3 sm:rounded-md sm:p-3.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {scaleDraft.map((threshold, index) => (
              <div key={threshold.letter} className="flex items-center gap-2">
                <div className="w-8 text-sm font-medium text-foreground">
                  {threshold.letter}
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={threshold.min}
                  disabled={threshold.letter.toUpperCase() === 'F'}
                  onChange={(e) => {
                    const value = Number(sanitizeNumberInput(e.target.value))
                    onUpdateScaleDraft(
                      index,
                      Number.isFinite(value) ? value : threshold.min
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
              onClick={onResetScaleDraft}
              disabled={isSavingScale}
            >
              Reset to default
            </Button>
            <Button size="sm" onClick={onSaveScale} disabled={isSavingScale}>
              Save scale
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface GradeResultSummaryProps {
  currentAverage: number | null
  projectedGrade: number | null
  neededOnRemaining: number | null
  showOverallSection: boolean
  showRequiredOnRemaining: boolean
  formatPercent: (value: number | null) => string
}

function GradeResultSummary({
  currentAverage,
  projectedGrade,
  neededOnRemaining,
  showOverallSection,
  showRequiredOnRemaining,
  formatPercent,
}: GradeResultSummaryProps) {
  return (
    <div className="border-t border-border/70 pt-4 sm:pt-6">
      <div className={`grid gap-3 sm:gap-4 ${showOverallSection ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="rounded-md border border-border/70 bg-card/90 px-3 py-3 sm:rounded-md sm:px-4 sm:py-3.5">
          <div className="text-[0.64rem] leading-[1.35] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.72rem] sm:tracking-[0.12em]">
            Current average
          </div>
          <div className="font-display mt-4 text-3xl font-semibold leading-none text-accent-strong sm:mt-6 sm:text-4xl">
            {formatPercent(currentAverage)}
          </div>
        </div>
        {showOverallSection && (
          <div className="rounded-md border border-border/70 bg-card/90 px-3 py-3 sm:rounded-md sm:px-4 sm:py-3.5">
            <div className="text-[0.64rem] leading-[1.35] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[0.72rem] sm:tracking-[0.12em]">
              Overall
            </div>
            <div className="font-display mt-4 text-3xl font-semibold leading-none text-foreground sm:mt-6 sm:text-4xl">
              {formatPercent(projectedGrade)}
            </div>
          </div>
        )}
      </div>

      {showRequiredOnRemaining && (
        <div className="mt-3 rounded-md border border-accent-strong/15 bg-accent-strong/5 p-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:rounded-md sm:p-4.5">
          <div className="text-[0.64rem] leading-[1.35] font-semibold uppercase tracking-[0.1em] text-accent-strong sm:text-[0.72rem] sm:tracking-[0.12em]">
            Required on remaining
          </div>
          <div className="font-display mt-2 text-4xl font-semibold leading-none text-accent-strong sm:mt-2.5 sm:text-5xl">
            {neededOnRemaining !== null && neededOnRemaining < 0
              ? '0%'
              : `${neededOnRemaining?.toFixed(1)}%`}
          </div>
        </div>
      )}
    </div>
  )
}

interface AssignmentEntryPanelProps {
  rows: GradeRow[]
  onUpdateRow: (id: string, field: keyof GradeRow, value: string) => void
  onDeleteRow: (id: string) => void
  onAddRow: () => void
}

function AssignmentEntryPanel({
  rows,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
}: AssignmentEntryPanelProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 sm:rounded-2xl">
      <CardContent className="p-0">
        <div className="border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Assignment Entry
          </h2>
        </div>

        <div className="px-4 py-3 text-xs text-muted-foreground sm:px-6 sm:py-4 sm:text-sm">
          Enter grades as percentages, point fractions like{' '}
          <span className="font-medium text-foreground">17/20</span>, or letters like{' '}
          <span className="font-medium text-foreground">A-</span>.
        </div>

        <div>
          <GradeTable
            rows={rows}
            onUpdateRow={onUpdateRow}
            onDeleteRow={onDeleteRow}
          />
        </div>

        <div className="border-t border-border/60 px-[1.125rem] pt-1.5 pb-2.5 xl:px-[1.875rem] xl:pt-2 xl:pb-3.5">
          <button
            type="button"
            onClick={onAddRow}
            className="-ml-2.5 inline-flex h-8 items-center rounded-sm border border-transparent bg-transparent px-2.5 text-sm font-medium text-accent-strong transition-colors hover:border-border/70 hover:bg-background hover:text-accent-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            aria-label="Add row"
          >
            + Add Assignment
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
