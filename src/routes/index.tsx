import { createFileRoute } from '@tanstack/react-router'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'

export const Route = createFileRoute('/')({
  component: AnonymousCalculatorPage,
})

function AnonymousCalculatorPage() {
  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-page-header-inner">
          <h1 className="app-page-title">Grade Tracker</h1>
          <p className="app-page-subtitle">
            Calculate weighted grades and final exam targets from one quiet workspace.
          </p>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <GradeCalculator
            isSignedIn={false}
            courses={[]}
            selectedCourseId={null}
            onSelectCourse={() => {}}
            onCreateCourse={() => {}}
          />
        </div>
      </main>
    </div>
  )
}
