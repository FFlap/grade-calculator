import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { GradeCalculator } from '@/components/calculator/GradeCalculator'
import type { Course, LetterGradeThreshold } from '@/components/calculator/types'

export const Route = createFileRoute('/grade-calculator/$courseId')({
  component: GradeCalculatorWithCourse,
})

function GradeCalculatorWithCourse() {
  const { courseId } = Route.useParams()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()

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
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-page-header-inner">
          <div className="app-page-title-row">
            <div>
              <h1 className="app-page-title">
                {currentCourse ? currentCourse.name : 'Grade Calculator'}
              </h1>
              <p className="app-page-subtitle">
                Monitor weighted grade average, saved assessments, and final exam targets.
              </p>
            </div>
            <div className="app-muted-pill">
              {courses.length} course{courses.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </section>

      <main className="app-page-body">
        <div className="app-page-body-narrow">
          <GradeCalculator
            isSignedIn={Boolean(isLoaded && isSignedIn)}
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
        </div>
      </main>
    </div>
  )
}
