import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import { GPACalculator } from '@/components/calculator/GPACalculator'

export const Route = createFileRoute('/')({
  component: AnonymousCalculatorPage,
})

function AnonymousCalculatorPage() {
  return (
    <Tabs defaultValue="grade" className="app-page">
      <section className="app-page-header">
        <div className="app-page-header-inner">
          <h1 className="app-page-title">Grade Tracker</h1>
          <p className="app-page-subtitle">
            Calculate weighted grades, final exam targets, and GPA from one quiet workspace.
          </p>

          <TabsList variant="line" className="mt-8">
            <TabsTrigger value="grade">Grades</TabsTrigger>
            <TabsTrigger value="gpa">GPA</TabsTrigger>
          </TabsList>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <TabsContent value="grade">
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
        </div>
      </main>
    </Tabs>
  )
}
