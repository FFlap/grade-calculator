import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, RotateCcw } from 'lucide-react'
import { percentageToLetter } from './types'

interface FinalResult {
  neededGrade: number
  isPossible: boolean
  letterGrade: string
}

export function FinalGradeCalculator() {
  const [currentGrade, setCurrentGrade] = useState('')
  const [finalWeight, setFinalWeight] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [result, setResult] = useState<FinalResult | null>(null)

  const handleCalculate = () => {
    const current = parseFloat(currentGrade)
    const weight = parseFloat(finalWeight)
    const target = parseFloat(targetGrade)

    if (isNaN(current) || isNaN(weight) || isNaN(target)) {
      setResult(null)
      return
    }

    if (weight <= 0 || weight > 100) {
      setResult(null)
      return
    }

    // Formula: target = current * (1 - weight/100) + needed * (weight/100)
    // needed = (target - current * (1 - weight/100)) / (weight/100)
    const currentWeight = 1 - weight / 100
    const needed = (target - current * currentWeight) / (weight / 100)

    setResult({
      neededGrade: needed,
      isPossible: needed <= 100 && needed >= 0,
      letterGrade: percentageToLetter(needed),
    })
  }

  const handleReset = () => {
    setCurrentGrade('')
    setFinalWeight('')
    setTargetGrade('')
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            What do I need on my final?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-grade" className="text-sm">
                Current grade
              </Label>
              <div className="relative">
                <Input
                  id="current-grade"
                  type="number"
                  placeholder="85"
                  value={currentGrade}
                  onChange={(e) => setCurrentGrade(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="final-weight" className="text-sm">
                Final exam weight
              </Label>
              <div className="relative">
                <Input
                  id="final-weight"
                  type="number"
                  placeholder="30"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-grade" className="text-sm">
                Target grade
              </Label>
              <div className="relative">
                <Input
                  id="target-grade"
                  type="number"
                  placeholder="80"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

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
            <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10">
              {result.isPossible ? (
                <>
                  <div className="text-sm text-muted-foreground mb-1">
                    You need to score
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-primary">
                      {result.neededGrade.toFixed(1)}%
                    </span>
                    <span className="text-2xl font-semibold text-primary">
                      ({result.letterGrade})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    on your final exam to reach {targetGrade}% overall
                  </div>
                </>
              ) : result.neededGrade > 100 ? (
                <div className="text-center">
                  <div className="text-xl font-semibold text-destructive mb-2">
                    Not achievable
                  </div>
                  <div className="text-muted-foreground">
                    You would need {result.neededGrade.toFixed(1)}% on the final,
                    which exceeds 100%.
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl font-semibold text-green-600 mb-2">
                    You've already made it!
                  </div>
                  <div className="text-muted-foreground">
                    Even with 0% on the final, you'll exceed your target.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-6 text-center text-muted-foreground">
            Enter your current grade, final exam weight, and target grade to see
            what you need on the final.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
