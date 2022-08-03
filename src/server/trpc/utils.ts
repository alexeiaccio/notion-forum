import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { Context } from './context'

export const t = initTRPC<{ ctx: Context }>()({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})
