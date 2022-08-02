import { createSSGHelpers } from '@trpc/react/ssg'
import { initTRPC, TRPCError } from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'

import superjson from 'superjson'
import { Context, createContext } from './context'
import { appRouter } from './router'

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

export async function createSSG(ctx: trpcNext.CreateNextContextOptions) {
  const ssg = await createSSGHelpers({
    router: appRouter,
    ctx: { session: null },
    transformer: superjson,
  })
  return ssg
}
