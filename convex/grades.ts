import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// List all grades for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    return await ctx.db
      .query('grades')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect()
  },
})

// List grades for a specific course
export const listByCourse = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    return await ctx.db
      .query('grades')
      .withIndex('by_course', (q) => q.eq('courseId', args.courseId))
      .order('desc')
      .collect()
  },
})

// Add a new grade (with optional course linking)
export const add = mutation({
  args: {
    courseId: v.optional(v.id('courses')),
    assignmentName: v.optional(v.string()),
    grade: v.number(),
    gradeType: v.string(),
    weight: v.number(),
    // Legacy fields for backward compatibility
    courseName: v.optional(v.string()),
    earnedPoints: v.optional(v.number()),
    totalPoints: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    return await ctx.db.insert('grades', {
      userId: identity.subject,
      courseId: args.courseId,
      assignmentName: args.assignmentName,
      grade: args.grade,
      gradeType: args.gradeType,
      weight: args.weight,
      courseName: args.courseName,
      earnedPoints: args.earnedPoints,
      totalPoints: args.totalPoints,
      category: args.category,
      createdAt: Date.now(),
    })
  },
})

// Update an existing grade
export const update = mutation({
  args: {
    id: v.id('grades'),
    courseId: v.optional(v.id('courses')),
    assignmentName: v.optional(v.string()),
    grade: v.optional(v.number()),
    gradeType: v.optional(v.string()),
    weight: v.optional(v.number()),
    // Legacy fields
    courseName: v.optional(v.string()),
    earnedPoints: v.optional(v.number()),
    totalPoints: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const grade = await ctx.db.get(args.id)
    if (!grade || grade.userId !== identity.subject) {
      throw new Error('Grade not found')
    }
    const { id, ...updates } = args
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    return await ctx.db.patch(id, filteredUpdates)
  },
})

// Remove a grade
export const remove = mutation({
  args: { id: v.id('grades') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const grade = await ctx.db.get(args.id)
    if (!grade || grade.userId !== identity.subject) {
      throw new Error('Grade not found')
    }
    return await ctx.db.delete(args.id)
  },
})

// Remove all grades for a specific course
export const removeByCourse = mutation({
  args: { courseId: v.id('courses') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const grades = await ctx.db
      .query('grades')
      .withIndex('by_course', (q) => q.eq('courseId', args.courseId))
      .collect()

    for (const grade of grades) {
      if (grade.userId === identity.subject) {
        await ctx.db.delete(grade._id)
      }
    }
  },
})
