import { createFileRoute } from '@tanstack/react-router'
import { FinalGradeCalculator } from '@/components/calculator/FinalGradeCalculator'

export const Route = createFileRoute('/final-exam')({
  component: FinalExamPage,
})

function FinalExamPage() {
  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-page-header-inner">
          <div className="app-page-title-row">
            <div>
              <h1 className="app-page-title">Final Exam Calculator</h1>
              <p className="app-page-subtitle">
                Figure out what you need on the final to hit your target grade.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <FinalGradeCalculator />
        </div>
      </main>
    </div>
  )
}
