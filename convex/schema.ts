import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  grades: defineTable({
    userId: v.string(),
    courseId: v.optional(v.id('courses')),  // Link to course for signed-in users
    assignmentName: v.optional(v.string()),
    grade: v.number(),                       // The grade value (percentage, points, or converted from letter)
    gradeType: v.string(),                   // 'percentage' | 'letter' | 'points'
    weight: v.number(),                      // Weight of this grade item
    createdAt: v.number(),
    // Legacy fields - kept for backward compatibility
    courseName: v.optional(v.string()),
    earnedPoints: v.optional(v.number()),
    totalPoints: v.optional(v.number()),
    category: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_course', ['courseId']),

  courses: defineTable({
    userId: v.string(),
    name: v.string(),
    letterGradeThresholds: v.optional(
      v.array(
        v.object({
          min: v.number(),
          letter: v.string(),
        })
      )
    ),
    createdAt: v.number(),
  }).index('by_user', ['userId']),
})
