import { createSSGHelpers } from '@trpc/react/ssg'
import superjson from 'superjson'
import type { Context } from './context'
import { appRouter } from './router'

export function getSSG() {
  return createSSGHelpers({
    router: appRouter,
    ctx: {} as Context,
    transformer: superjson,
  })
}
