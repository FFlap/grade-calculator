import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    return await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    semesterId: v.optional(v.id('semesters')),
    credits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    if (args.semesterId !== undefined) {
      const semester = await ctx.db.get(args.semesterId)
      if (!semester || semester.userId !== identity.subject) {
        throw new Error('Semester not found')
      }
    }
    return await ctx.db.insert('courses', {
      userId: identity.subject,
      name: args.name,
      semesterId: args.semesterId,
      credits: args.credits ?? 3,
      createdAt: Date.now(),
    })
  },
})

export const updateName = mutation({
  args: { id: v.id('courses'), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    return await ctx.db.patch(args.id, { name: args.name })
  },
})

export const updateCredits = mutation({
  args: { id: v.id('courses'), credits: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    return await ctx.db.patch(args.id, { credits: args.credits })
  },
})

export const updateGradeType = mutation({
  args: { id: v.id('courses'), gradeType: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    const allowed = new Set(['percentage', 'letters', 'points'])
    if (!allowed.has(args.gradeType)) {
      throw new Error('Invalid grade type')
    }
    return await ctx.db.patch(args.id, { gradeType: args.gradeType })
  },
})

export const updateSemester = mutation({
  args: { id: v.id('courses'), semesterId: v.optional(v.id('semesters')) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    if (args.semesterId !== undefined) {
      const semester = await ctx.db.get(args.semesterId)
      if (!semester || semester.userId !== identity.subject) {
        throw new Error('Semester not found')
      }
    }
    return await ctx.db.patch(args.id, { semesterId: args.semesterId })
  },
})

export const updateLetterGradeThresholds = mutation({
  args: {
    id: v.id('courses'),
    thresholds: v.array(v.object({ min: v.number(), letter: v.string() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }
    return await ctx.db.patch(args.id, { letterGradeThresholds: args.thresholds })
  },
})

export const remove = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const course = await ctx.db.get(args.id)
    if (!course || course.userId !== identity.subject) {
      throw new Error('Course not found')
    }

    // Cascade delete: remove grades linked to this course for the current user.
    const grades = await ctx.db
      .query('grades')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', identity.subject).eq('courseId', args.id)
      )
      .collect()
    for (const grade of grades) {
      await ctx.db.delete(grade._id)
    }

    return await ctx.db.delete(args.id)
  },
})
