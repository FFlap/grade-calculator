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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    return await ctx.db.insert('courses', {
      userId: identity.subject,
      name: args.name,
      createdAt: Date.now(),
    })
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
    return await ctx.db.delete(args.id)
  },
})
