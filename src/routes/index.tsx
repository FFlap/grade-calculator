import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import { FinalGradeCalculator } from '@/components/calculator/FinalGradeCalculator'
import { GPACalculator } from '@/components/calculator/GPACalculator'
import type { Course } from '@/components/calculator/types'

export const Route = createFileRoute('/')({
  component: GradeCalculatorPage,
})

function GradeCalculatorPage() {
  const { isSignedIn } = useUser()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Only fetch courses if signed in
  const coursesData = useQuery(api.courses.list)
  const courses = (coursesData ?? []) as Course[]
  const addCourse = useMutation(api.courses.add)

  const handleCreateCourse = async (name: string) => {
    const courseId = await addCourse({ name })
    setSelectedCourseId(courseId)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Grade Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate your weighted grade average, find out what you need on your
            final, or compute your GPA.
          </p>
        </div>

        <Tabs defaultValue="grade" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grade">Grade Calculator</TabsTrigger>
            <TabsTrigger value="final">Final Grade</TabsTrigger>
            <TabsTrigger value="gpa">GPA Calculator</TabsTrigger>
          </TabsList>

          <TabsContent value="grade" className="mt-6">
            <GradeCalculator
              isSignedIn={!!isSignedIn}
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              onCreateCourse={handleCreateCourse}
            />
          </TabsContent>

          <TabsContent value="final" className="mt-6">
            <FinalGradeCalculator />
          </TabsContent>

          <TabsContent value="gpa" className="mt-6">
            <GPACalculator />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
