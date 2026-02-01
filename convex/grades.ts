import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const LETTER_GRADES: Record<string, number> = {
  'A+': 97,
  A: 93,
  'A-': 90,
  'B+': 87,
  B: 83,
  'B-': 80,
  'C+': 77,
  C: 73,
  'C-': 70,
  'D+': 67,
  D: 63,
  'D-': 60,
  F: 50,
}

function normalizeGradeType(gradeType: string): 'percentage' | 'letters' | 'points' {
  const normalized = gradeType === 'letter' ? 'letters' : gradeType
  if (normalized !== 'percentage' && normalized !== 'letters' && normalized !== 'points') {
    throw new Error('Invalid grade type')
  }
  return normalized
}

function parseGradeValue(gradeType: 'percentage' | 'letters' | 'points', input: string): number {
  const trimmed = input.trim()
  if (!trimmed) return 0

  if (gradeType === 'letters') {
    return LETTER_GRADES[trimmed.toUpperCase()] ?? 0
  }

  const n = Number.parseFloat(trimmed.replace(/%$/, ''))
  return Number.isFinite(n) ? n : 0
}

function parseWeightValue(input: string): number {
  const n = Number.parseFloat(input.trim().replace(/%$/, ''))
  return Number.isFinite(n) ? n : 0
}

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
    const course = await ctx.db.get(args.courseId)
    if (!course || course.userId !== identity.subject) {
      return []
    }
    return await ctx.db
      .query('grades')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', identity.subject).eq('courseId', args.courseId)
      )
      .order('desc')
      .collect()
  },
})

export const upsertRow = mutation({
  args: {
    courseId: v.id('courses'),
    clientRowId: v.string(),
    assignmentName: v.optional(v.string()),
    gradeInput: v.optional(v.string()),
    grade: v.optional(v.number()),
    gradeType: v.optional(v.string()),
    weightInput: v.optional(v.string()),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.courseId)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }

    const row = await ctx.db
      .query('grades')
      .withIndex('by_user_course_row', (q) =>
        q
          .eq('userId', identity.subject)
          .eq('courseId', args.courseId)
          .eq('clientRowId', args.clientRowId)
      )
      .unique()

    const resolvedGradeType = normalizeGradeType(
      args.gradeType ?? (row ? row.gradeType : undefined) ?? course.gradeType ?? 'percentage'
    )

    const nextAssignmentName =
      args.assignmentName ?? (row ? row.assignmentName : undefined)
    const nextGradeInput = args.gradeInput ?? (row ? row.gradeInput : undefined) ?? ''
    const nextWeightInput = args.weightInput ?? (row ? row.weightInput : undefined) ?? ''

    const grade = args.grade ?? parseGradeValue(resolvedGradeType, nextGradeInput)
    const weight = args.weight ?? parseWeightValue(nextWeightInput)

    if (row) {
      await ctx.db.patch(row._id, {
        assignmentName: nextAssignmentName,
        gradeInput: nextGradeInput,
        grade,
        gradeType: resolvedGradeType,
        weightInput: nextWeightInput,
        weight,
      })
      return row._id
    }

    return await ctx.db.insert('grades', {
      userId: identity.subject,
      courseId: args.courseId,
      clientRowId: args.clientRowId,
      assignmentName: nextAssignmentName,
      gradeInput: nextGradeInput,
      grade,
      gradeType: resolvedGradeType,
      weightInput: nextWeightInput,
      weight,
      createdAt: Date.now(),
    })
  },
})

export const removeRow = mutation({
  args: { courseId: v.id('courses'), clientRowId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.courseId)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }

    const row = await ctx.db
      .query('grades')
      .withIndex('by_user_course_row', (q) =>
        q
          .eq('userId', identity.subject)
          .eq('courseId', args.courseId)
          .eq('clientRowId', args.clientRowId)
      )
      .unique()

    if (!row) return false
    await ctx.db.delete(row._id)
    return true
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
    const course = await ctx.db.get(args.courseId)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    const grades = await ctx.db
      .query('grades')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', identity.subject).eq('courseId', args.courseId)
      )
      .collect()

    for (const grade of grades) {
      await ctx.db.delete(grade._id)
    }
  },
})
