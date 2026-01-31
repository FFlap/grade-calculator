import { createFileRoute } from '@tanstack/react-router'
import { GPACalculator } from '@/components/calculator/GPACalculator'

export const Route = createFileRoute('/gpa-calculator')({
  component: GPACalculatorPage,
})

function GPACalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            GPA Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate your cumulative GPA based on your course grades and credit hours.
          </p>
        </div>

        <GPACalculator />
      </main>
    </div>
  )
}
