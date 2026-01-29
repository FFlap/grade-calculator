export type GradeType = 'percentage' | 'letters' | 'points'

export interface GradeRow {
  id: string
  assignment: string
  grade: string
  weight: string
}

export interface CalculationResult {
  weightedAverage: number
  letterGrade: string
  totalWeight: number
  remainingWeight: number
  neededGrade: number | null
}

export interface Course {
  _id: string
  userId: string
  name: string
  createdAt: number
}

export interface Grade {
  _id: string
  userId: string
  courseId?: string
  assignmentName?: string
  grade: number
  gradeType: string
  weight: number
  createdAt: number
}

// Letter grade conversion mapping
export const LETTER_GRADES: Record<string, number> = {
  'A+': 97,
  'A': 93,
  'A-': 90,
  'B+': 87,
  'B': 83,
  'B-': 80,
  'C+': 77,
  'C': 73,
  'C-': 70,
  'D+': 67,
  'D': 63,
  'D-': 60,
  'F': 50,
}

export const LETTER_GRADE_THRESHOLDS = [
  { min: 97, letter: 'A+' },
  { min: 93, letter: 'A' },
  { min: 90, letter: 'A-' },
  { min: 87, letter: 'B+' },
  { min: 83, letter: 'B' },
  { min: 80, letter: 'B-' },
  { min: 77, letter: 'C+' },
  { min: 73, letter: 'C' },
  { min: 70, letter: 'C-' },
  { min: 67, letter: 'D+' },
  { min: 63, letter: 'D' },
  { min: 60, letter: 'D-' },
  { min: 0, letter: 'F' },
]

export function letterToPercentage(letter: string): number | null {
  const upperLetter = letter.toUpperCase().trim()
  return LETTER_GRADES[upperLetter] ?? null
}

export function percentageToLetter(percent: number): string {
  for (const threshold of LETTER_GRADE_THRESHOLDS) {
    if (percent >= threshold.min) {
      return threshold.letter
    }
  }
  return 'F'
}

export function calculateWeightedAverage(
  rows: GradeRow[],
  gradeType: GradeType
): { average: number; totalWeight: number } | null {
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const row of rows) {
    const weight = parseFloat(row.weight)
    if (isNaN(weight) || weight <= 0) continue

    let gradeValue: number | null = null

    if (gradeType === 'percentage' || gradeType === 'points') {
      gradeValue = parseFloat(row.grade)
    } else if (gradeType === 'letters') {
      gradeValue = letterToPercentage(row.grade)
    }

    if (gradeValue === null || isNaN(gradeValue)) continue

    totalWeightedScore += gradeValue * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return null

  return {
    average: totalWeightedScore / totalWeight,
    totalWeight,
  }
}

export function calculateNeededGrade(
  currentAverage: number,
  currentWeight: number,
  targetGrade: number
): number | null {
  const remainingWeight = 100 - currentWeight
  if (remainingWeight <= 0) return null

  // (currentAverage * currentWeight + neededGrade * remainingWeight) / 100 = targetGrade
  // neededGrade = (targetGrade * 100 - currentAverage * currentWeight) / remainingWeight
  const needed = (targetGrade * 100 - currentAverage * currentWeight) / remainingWeight

  return needed
}
