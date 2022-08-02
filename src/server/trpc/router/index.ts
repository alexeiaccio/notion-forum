// src/server/trpc/router/index.ts
import { t } from '../utils'
import { authRouter } from './auth'
import { pageRouter } from './page'
import { userRouter } from './user'

export const appRouter = t.router({
  auth: authRouter,
  page: pageRouter,
  user: userRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
