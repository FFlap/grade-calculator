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
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    status: v.string(), // 'in_progress' | 'completed'
    makeCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const allowedStatuses = new Set(['in_progress', 'completed'])
    if (!allowedStatuses.has(args.status)) {
      throw new Error('Invalid semester status')
    }

    const shouldBeCurrent =
      args.makeCurrent === true || args.status === 'in_progress'
    const status = shouldBeCurrent ? 'in_progress' : args.status

    if (shouldBeCurrent) {
      const existing = await ctx.db
        .query('semesters')
        .withIndex('by_user', (q) => q.eq('userId', identity.subject))
        .collect()
      for (const sem of existing) {
        if (sem.isCurrent || sem.status === 'in_progress') {
          await ctx.db.patch(sem._id, { isCurrent: false, status: 'completed' })
        }
      }
    }

    return await ctx.db.insert('semesters', {
      userId: identity.subject,
      name: args.name,
      status,
      isCurrent: shouldBeCurrent,
      createdAt: Date.now(),
    })
  },
})

export const updateName = mutation({
  args: { id: v.id('semesters'), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const semester = await ctx.db.get(args.id)
    if (!semester || semester.userId !== identity.subject) {
      throw new Error('Semester not found')
    }
    await ctx.db.patch(args.id, { name: args.name })
  },
})

export const setCurrent = mutation({
  args: { id: v.id('semesters') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const semester = await ctx.db.get(args.id)
    if (!semester || semester.userId !== identity.subject) {
      throw new Error('Semester not found')
    }

    const existing = await ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    for (const sem of existing) {
      if (sem._id === args.id) continue
      if (sem.isCurrent || sem.status === 'in_progress') {
        await ctx.db.patch(sem._id, { isCurrent: false, status: 'completed' })
      }
    }
    await ctx.db.patch(args.id, { isCurrent: true, status: 'in_progress' })
  },
})

export const updateStatus = mutation({
  args: { id: v.id('semesters'), status: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const semester = await ctx.db.get(args.id)
    if (!semester || semester.userId !== identity.subject) {
      throw new Error('Semester not found')
    }

    const allowedStatuses = new Set(['in_progress', 'completed'])
    if (!allowedStatuses.has(args.status)) {
      throw new Error('Invalid semester status')
    }

    if (args.status === 'in_progress') {
      const existing = await ctx.db
        .query('semesters')
        .withIndex('by_user', (q) => q.eq('userId', identity.subject))
        .collect()
      for (const sem of existing) {
        if (sem._id === args.id) continue
        if (sem.isCurrent || sem.status === 'in_progress') {
          await ctx.db.patch(sem._id, { isCurrent: false, status: 'completed' })
        }
      }
      await ctx.db.patch(args.id, { status: 'in_progress', isCurrent: true })
      return
    }

    await ctx.db.patch(args.id, { status: 'completed', isCurrent: false })
  },
})

export const remove = mutation({
  args: { id: v.id('semesters') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    const semester = await ctx.db.get(args.id)
    if (!semester || semester.userId !== identity.subject) {
      throw new Error('Semester not found')
    }

    const courses = await ctx.db
      .query('courses')
      .withIndex('by_semester', (q) => q.eq('semesterId', args.id))
      .collect()

    for (const course of courses) {
      if (course.userId !== identity.subject) continue

      const grades = await ctx.db
        .query('grades')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .collect()
      for (const grade of grades) {
        if (grade.userId === identity.subject) {
          await ctx.db.delete(grade._id)
        }
      }

      await ctx.db.delete(course._id)
    }

    if (semester.isCurrent) {
      const remaining = await ctx.db
        .query('semesters')
        .withIndex('by_user', (q) => q.eq('userId', identity.subject))
        .order('desc')
        .collect()
      const next = remaining.find((s) => s._id !== args.id && s.status === 'in_progress')
      if (next) {
        await ctx.db.patch(next._id, { isCurrent: true })
      }
    }

    return await ctx.db.delete(args.id)
  },
})

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { semesters: [], courses: [], grades: [] }
    }

    const semesters = await ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect()

    const courses = await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect()

    const grades = await ctx.db
      .query('grades')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()

    return { semesters, courses, grades }
  },
})
