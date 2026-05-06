import { createFileRoute } from '@tanstack/react-router'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import { GPACalculator } from '@/components/calculator/GPACalculator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
            Calculate weighted grades, final exam targets, and GPA from one quiet workspace.
          </p>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <Tabs defaultValue="grades" className="gap-6">
            <TabsList className="rounded-xl border border-border/70 bg-card p-1">
              <TabsTrigger value="grades" className="rounded-lg px-5">
                Grades
              </TabsTrigger>
              <TabsTrigger value="gpa" className="rounded-lg px-5">
                GPA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grades">
              <GradeCalculator
                isSignedIn={false}
                courses={[]}
                selectedCourseId={null}
                onSelectCourse={() => {}}
                onCreateCourse={() => {}}
              />
            </TabsContent>

            <TabsContent value="gpa">
              <GPACalculator />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
