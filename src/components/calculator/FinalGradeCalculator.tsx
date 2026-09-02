import { useMemo, useReducer, useState } from 'react'
import { SortableHeader } from '@/components/SortableHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  compareNumbers,
  compareText,
  cycleSort,
  stableSort,
  toFiniteNumber,
  type SortState,
} from '@/lib/table-sorting'
import { Calculator, RotateCcw } from 'lucide-react'
import { sanitizeNumberInput } from './types'

interface FinalResult {
  neededGrade: number
  isPossible: boolean
}

interface FinalGradeState {
  currentGrade: string
  finalWeight: string
  targetGrade: string
  result: FinalResult | null
  invalidMessage: string | null
}

type FinalGradeAction =
  | { type: 'set-current-grade'; value: string }
  | { type: 'set-final-weight'; value: string }
  | { type: 'set-target-grade'; value: string }
  | { type: 'calculation-success'; result: FinalResult }
  | { type: 'calculation-error'; message: string }
  | { type: 'reset' }

type FinalExamRowKey = 'currentGrade' | 'finalWeight' | 'targetGrade'
type FinalExamSortColumn = 'metric' | 'value'
type FinalExamInputAction =
  | 'set-current-grade'
  | 'set-final-weight'
  | 'set-target-grade'

type FinalExamRow = {
  key: FinalExamRowKey
  label: string
  description: string
  inputId: string
  labelId: string
  descriptionId: string
  placeholder: string
  action: FinalExamInputAction
  value: string
}

type FinalExamValues = Pick<
  FinalGradeState,
  'currentGrade' | 'finalWeight' | 'targetGrade'
>

export const FINAL_EXAM_ROWS: readonly FinalExamRow[] = [
  {
    key: 'currentGrade',
    label: 'Current grade',
    description: 'Your grade before the final exam',
    inputId: 'current-grade',
    labelId: 'current-grade-label',
    descriptionId: 'current-grade-description',
    placeholder: '88',
    action: 'set-current-grade',
    value: '',
  },
  {
    key: 'finalWeight',
    label: 'Final exam weight',
    description: 'How much the final counts',
    inputId: 'final-weight',
    labelId: 'final-weight-label',
    descriptionId: 'final-weight-description',
    placeholder: '40',
    action: 'set-final-weight',
    value: '',
  },
  {
    key: 'targetGrade',
    label: 'Target grade',
    description: 'The overall grade you want',
    inputId: 'target-grade',
    labelId: 'target-grade-label',
    descriptionId: 'target-grade-description',
    placeholder: '90',
    action: 'set-target-grade',
    value: '',
  },
]

export function buildFinalExamRows(values: FinalExamValues) {
  return FINAL_EXAM_ROWS.map((row) => ({
    ...row,
    value: values[row.key],
  }))
}

export function sortFinalExamRows(
  rows: readonly FinalExamRow[],
  sort: SortState<FinalExamSortColumn>
) {
  if (!sort) return [...rows]

  if (sort.column === 'metric') {
    return stableSort(rows, sort.direction, (row) => row.label, compareText)
  }

  return stableSort(
    rows,
    sort.direction,
    (row) => toFiniteNumber(row.value),
    compareNumbers
  )
}

const initialFinalGradeState: FinalGradeState = {
  currentGrade: '',
  finalWeight: '',
  targetGrade: '',
  result: null,
  invalidMessage: null,
}

function finalGradeReducer(
  state: FinalGradeState,
  action: FinalGradeAction
): FinalGradeState {
  switch (action.type) {
    case 'set-current-grade':
      return {
        ...state,
        currentGrade: action.value,
        result: null,
        invalidMessage: null,
      }
    case 'set-final-weight':
      return {
        ...state,
        finalWeight: action.value,
        result: null,
        invalidMessage: null,
      }
    case 'set-target-grade':
      return {
        ...state,
        targetGrade: action.value,
        result: null,
        invalidMessage: null,
      }
    case 'calculation-success':
      return { ...state, result: action.result, invalidMessage: null }
    case 'calculation-error':
      return { ...state, result: null, invalidMessage: action.message }
    case 'reset':
      return initialFinalGradeState
  }
}

export function FinalGradeCalculator() {
  const [state, dispatch] = useReducer(finalGradeReducer, initialFinalGradeState)
  const [sort, setSort] = useState<SortState<FinalExamSortColumn>>(null)
  const { currentGrade, finalWeight, targetGrade, result, invalidMessage } = state
  const sortedRows = useMemo(
    () =>
      sortFinalExamRows(
        buildFinalExamRows({ currentGrade, finalWeight, targetGrade }),
        sort
      ),
    [currentGrade, finalWeight, sort, targetGrade]
  )

  const handleCalculate = () => {
    const current = Number.parseFloat(currentGrade)
    const weight = parseFloat(finalWeight)
    const target = Number.parseFloat(targetGrade)

    if (!Number.isFinite(current) || isNaN(weight) || !Number.isFinite(target)) {
      dispatch({
        type: 'calculation-error',
        message: 'Enter a current grade, final exam weight, and target grade.',
      })
      return
    }

    if (weight <= 0 || weight > 100) {
      dispatch({
        type: 'calculation-error',
        message: 'Final exam weight must be greater than 0 and no more than 100.',
      })
      return
    }

    // Formula: target = current * (1 - weight/100) + needed * (weight/100)
    // needed = (target - current * (1 - weight/100)) / (weight/100)
    const currentWeight = 1 - weight / 100
    const needed = (target - current * currentWeight) / (weight / 100)

    dispatch({
      type: 'calculation-success',
      result: {
        neededGrade: needed,
        isPossible: needed <= 100 && needed >= 0,
      },
    })
  }

  const handleReset = () => {
    dispatch({ type: 'reset' })
  }

  return (
    <div className="grid items-start gap-4 lg:gap-7 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-8">
      <Card className="gap-0 overflow-hidden rounded-xl border-border/70 py-0 lg:rounded-2xl">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
              Final Summary
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Calculate the score needed on the final exam to reach your target.
            </p>
          </div>

          {result && (
            <div className="border-t border-border/70 pt-6">
              {result.isPossible ? (
                <div className="space-y-4">
                  <div className="rounded-sm border border-accent-strong/15 bg-accent-strong/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] lg:rounded-sm sm:p-5">
                    <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-accent-strong lg:text-[0.72rem] sm:tracking-[0.14em]">
                      Required score
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="font-display text-5xl font-semibold leading-none text-accent-strong lg:text-6xl">
                        {result.neededGrade.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : result.neededGrade > 100 ? (
                <div className="rounded-sm border border-destructive/25 bg-destructive/5 p-4 lg:rounded-sm sm:p-5">
                  <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-destructive lg:text-[0.72rem] sm:tracking-[0.14em]">
                    Not achievable
                  </div>
                  <div className="font-display mt-2 text-3xl font-semibold leading-none text-destructive sm:mt-3 lg:text-4xl">
                    {result.neededGrade.toFixed(1)}%
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This exceeds 100% on the final.
                  </p>
                </div>
              ) : (
                <div className="rounded-sm border border-accent-strong/15 bg-accent-strong/5 p-4 lg:rounded-sm sm:p-5">
                  <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-accent-strong lg:text-[0.72rem] sm:tracking-[0.14em]">
                    Already reached
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Even with 0% on the final, you will exceed your target.
                  </p>
                </div>
              )}
            </div>
          )}

          {invalidMessage && (
            <div className="rounded-sm border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {invalidMessage}
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
              Exam Inputs
            </h2>
          </div>

          <div className="px-4 py-3 text-xs text-muted-foreground lg:px-6 lg:py-4 lg:text-sm">
            Enter percentages for your current course grade, final exam weight, and target grade.
          </div>

          <div className="pb-4 lg:pb-5">
            <div role="table" aria-label="Final exam inputs" className="w-full">
              <div
                role="row"
                className="grid grid-cols-[minmax(7rem,1.2fr)_minmax(4.5rem,1fr)_1rem] gap-1 border-b border-border/70 px-2 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground min-[390px]:gap-1.5 sm:px-3 sm:text-[0.64rem] sm:tracking-[0.08em] xl:grid-cols-[minmax(12rem,1.2fr)_minmax(12rem,1fr)_2.5rem] xl:gap-2.5 xl:px-5 xl:py-3.5 xl:text-[0.72rem] xl:tracking-[0.12em] 2xl:gap-3 2xl:tracking-[0.14em]"
              >
                <SortableHeader
                  label="Metric"
                  direction={sort?.column === 'metric' ? sort.direction : null}
                  onClick={() => setSort((current) => cycleSort(current, 'metric'))}
                />
                <SortableHeader
                  label="Value"
                  align="center"
                  direction={sort?.column === 'value' ? sort.direction : null}
                  onClick={() => setSort((current) => cycleSort(current, 'value'))}
                />
                <span role="columnheader" aria-label="Actions" />
              </div>

              <div role="rowgroup" className="divide-y divide-border/70">
                {sortedRows.map((row) => (
                  <div
                    key={row.key}
                    role="row"
                    className="group grid grid-cols-[minmax(7rem,1.2fr)_minmax(4.5rem,1fr)_1rem] items-center gap-1 px-2 py-2.5 transition-colors hover:bg-muted/45 min-[390px]:gap-1.5 sm:px-3 xl:grid-cols-[minmax(12rem,1.2fr)_minmax(12rem,1fr)_2.5rem] xl:gap-2.5 xl:px-5 xl:py-3.5 2xl:gap-3"
                  >
                    <div role="cell">
                      <div
                        id={row.labelId}
                        className="text-sm font-medium text-foreground lg:text-base"
                      >
                        {row.label}
                      </div>
                      <div
                        id={row.descriptionId}
                        className="text-[0.7rem] leading-snug text-muted-foreground lg:text-sm"
                      >
                        {row.description}
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="relative w-full max-w-[7.5rem] justify-self-center"
                    >
                      <Input
                        id={row.inputId}
                        aria-labelledby={row.labelId}
                        aria-describedby={row.descriptionId}
                        type="text"
                        inputMode="decimal"
                        placeholder={row.placeholder}
                        value={row.value}
                        onChange={(event) => {
                          dispatch({
                            type: row.action,
                            value: sanitizeNumberInput(event.target.value),
                          })
                        }}
                        className="h-8 rounded-sm border-transparent bg-transparent pr-5 text-center text-xs shadow-none placeholder:text-muted-foreground/70 hover:border-border/70 hover:bg-input/90 focus-visible:bg-input lg:h-9 lg:pr-8 lg:text-sm"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground lg:right-3 lg:text-sm">
                        %
                      </span>
                    </div>
                    <span role="cell" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
