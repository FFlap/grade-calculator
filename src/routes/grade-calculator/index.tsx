import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import { FinalGradeCalculator } from '@/components/calculator/FinalGradeCalculator'
import type { Course, LetterGradeThreshold } from '@/components/calculator/types'

export const Route = createFileRoute('/grade-calculator/')({
  component: GradeCalculatorPage,
})

function GradeCalculatorPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<Course['_id'] | null>(null)

  const coursesData = useQuery(api.courses.list)
  const courses = (coursesData ?? []) as Course[]
  const addCourse = useMutation(api.courses.add)
  const updateCourseName = useMutation(api.courses.updateName)
  const updateLetterGradeThresholds = useMutation(api.courses.updateLetterGradeThresholds)
  const removeCourse = useMutation(api.courses.remove)

  const handleCreateCourse = async (name: string) => {
    const courseId = await addCourse({ name })
    setSelectedCourseId(courseId)
  }

  const handleRenameCourse = async (courseId: Course['_id'], name: string) => {
    await updateCourseName({ id: courseId, name })
  }

  const handleUpdateThresholds = async (
    courseId: Course['_id'],
    thresholds: LetterGradeThreshold[]
  ) => {
    await updateLetterGradeThresholds({ id: courseId, thresholds })
  }

  const handleDeleteCourse = async (courseId: Course['_id']) => {
    await removeCourse({ id: courseId })
    setSelectedCourseId((prev) => (prev === courseId ? null : prev))
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Grade Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate your weighted grade average or find out what you need on your final.
          </p>
        </div>

        <Tabs defaultValue="grade" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grade">Grade Calculator</TabsTrigger>
            <TabsTrigger value="final">Final Grade</TabsTrigger>
          </TabsList>

          <TabsContent value="grade" className="mt-6">
            <GradeCalculator
              isSignedIn={true}
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              onCreateCourse={handleCreateCourse}
              onRenameCourse={handleRenameCourse}
              onDeleteCourse={handleDeleteCourse}
              onUpdateLetterGradeThresholds={handleUpdateThresholds}
            />
          </TabsContent>

          <TabsContent value="final" className="mt-6">
            <FinalGradeCalculator />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
