import { Card, CardContent } from '@/components/ui/card'
import type { CalculationResult } from './types'

interface ResultDisplayProps {
  result: CalculationResult | null
  decimalPlaces: number
  targetGrade: number
}

export function ResultDisplay({
  result,
  decimalPlaces,
  targetGrade,
}: ResultDisplayProps) {
  if (!result) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          Enter grades and weights above, then click Calculate to see your results.
        </CardContent>
      </Card>
    )
  }

  const formatNumber = (num: number) => num.toFixed(decimalPlaces)

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600'
    if (grade >= 80) return 'text-blue-600'
    if (grade >= 70) return 'text-yellow-600'
    if (grade >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Main Result */}
        <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
          <div className="text-sm text-muted-foreground mb-1">Your Grade</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold ${getGradeColor(result.weightedAverage)}`}>
              {formatNumber(result.weightedAverage)}%
            </span>
            <span className={`text-2xl font-semibold ${getGradeColor(result.weightedAverage)}`}>
              ({result.letterGrade})
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total weight calculated</span>
            <span className="font-medium">{formatNumber(result.totalWeight)}%</span>
          </div>

          {result.remainingWeight > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining weight</span>
                <span className="font-medium">{formatNumber(result.remainingWeight)}%</span>
              </div>

              {result.neededGrade !== null && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    To reach {targetGrade}% overall:
                  </div>
                  {result.neededGrade > 100 ? (
                    <div className="text-red-600 font-medium">
                      Not achievable - you would need {formatNumber(result.neededGrade)}% on the remaining {formatNumber(result.remainingWeight)}%
                    </div>
                  ) : result.neededGrade < 0 ? (
                    <div className="text-green-600 font-medium">
                      You've already exceeded your target!
                    </div>
                  ) : (
                    <div className="font-medium">
                      You need <span className="text-primary font-bold">{formatNumber(result.neededGrade)}%</span> on the remaining {formatNumber(result.remainingWeight)}%
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
