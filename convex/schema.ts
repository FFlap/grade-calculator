import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  grades: defineTable({
    userId: v.string(),
    courseId: v.optional(v.id('courses')),  // Link to course for signed-in users
    clientRowId: v.optional(v.string()),
    assignmentName: v.optional(v.string()),
    dueDate: v.optional(v.string()), // YYYY-MM-DD
    gradeInput: v.optional(v.string()),
    grade: v.number(),                       // The grade value (percentage, points, or converted from letter)
    gradeType: v.string(),                   // 'percentage' | 'letter' | 'points'
    weightInput: v.optional(v.string()),
    weight: v.number(),                      // Weight of this grade item
    createdAt: v.number(),
    // Legacy fields - kept for backward compatibility
    courseName: v.optional(v.string()),
    earnedPoints: v.optional(v.number()),
    totalPoints: v.optional(v.number()),
    category: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_course', ['courseId'])
    .index('by_course_row', ['courseId', 'clientRowId'])
    .index('by_user_course', ['userId', 'courseId'])
    .index('by_user_course_row', ['userId', 'courseId', 'clientRowId']),

  courses: defineTable({
    userId: v.string(),
    semesterId: v.optional(v.id('semesters')),
    name: v.string(),
    credits: v.optional(v.number()),
    gradeType: v.optional(v.string()),
    letterGradeThresholds: v.optional(
      v.array(
        v.object({
          min: v.number(),
          letter: v.string(),
        })
      )
    ),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_semester', ['semesterId'])
    .index('by_user_semester', ['userId', 'semesterId']),

  semesters: defineTable({
    userId: v.string(),
    name: v.string(),
    status: v.string(), // 'in_progress' | 'completed'
    isCurrent: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),
})
