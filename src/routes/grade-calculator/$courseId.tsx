import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import { FinalGradeCalculator } from '@/components/calculator/FinalGradeCalculator'
import type { Course, LetterGradeThreshold } from '@/components/calculator/types'

export const Route = createFileRoute('/grade-calculator/$courseId')({
  component: GradeCalculatorWithCourse,
})

function GradeCalculatorWithCourse() {
  const { courseId } = Route.useParams()
  const navigate = useNavigate()

  const coursesData = useQuery(api.courses.list)
  const courses = (coursesData ?? []) as Course[]

  // Find the current course name for the title
  const courseIdAsId = courseId as Course['_id']
  const currentCourse = courses.find((c) => c._id === courseIdAsId) ?? null

  useEffect(() => {
    if (coursesData !== undefined && !currentCourse) {
      navigate({ to: '/grade-calculator' })
    }
  }, [coursesData, currentCourse, navigate])

  const [selectedCourseId, setSelectedCourseId] = useState<Course['_id'] | null>(courseIdAsId)

  useEffect(() => {
    setSelectedCourseId(courseIdAsId)
  }, [courseIdAsId])

  const addCourse = useMutation(api.courses.add)
  const updateCourseName = useMutation(api.courses.updateName)
  const updateLetterGradeThresholds = useMutation(api.courses.updateLetterGradeThresholds)
  const removeCourse = useMutation(api.courses.remove)

  const handleCreateCourse = async (name: string) => {
    const newCourseId = await addCourse({ name })
    navigate({ to: '/grade-calculator/$courseId', params: { courseId: newCourseId } })
  }

  const handleRenameCourse = async (id: Course['_id'], name: string) => {
    await updateCourseName({ id, name })
  }

  const handleUpdateThresholds = async (
    id: Course['_id'],
    thresholds: LetterGradeThreshold[]
  ) => {
    await updateLetterGradeThresholds({ id, thresholds })
  }

  const handleDeleteCourse = async (id: Course['_id']) => {
    await removeCourse({ id })
    if (id === courseIdAsId) {
      navigate({ to: '/grade-calculator' })
    }
    setSelectedCourseId((prev) => (prev === id ? null : prev))
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {currentCourse ? currentCourse.name : 'Grade Calculator'}
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
              onSelectCourse={(id) => {
                setSelectedCourseId(id)
                if (!id) {
                  navigate({ to: '/grade-calculator' })
                } else {
                  navigate({ to: '/grade-calculator/$courseId', params: { courseId: id } })
                }
              }}
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
