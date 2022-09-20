import { createProxySSGHelpers } from '@trpc/react/ssg'
import superjson from 'superjson'
import type { Context } from './context'
import { appRouter } from './router'

export function getSSG() {
  return createProxySSGHelpers({
    router: appRouter,
    ctx: {} as Context,
    transformer: superjson,
  })
}
