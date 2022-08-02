import { z } from 'zod'
import { getUser, getUserName } from '../../../utils/notion/api'
import { t } from '../utils'

export const userRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(
      z
        .object({
          id: z.string(),
          name: z.string().nullish(),
          email: z.string().nullish(),
          emailVerified: z.date().nullish(),
          image: z.string().nullish(),
          role: z.string().nullish(),
        })
        .nullish(),
    )
    .query(async ({ input }) => {
      if (!input?.id) return null
      const user = await getUser(input.id)
      return user
    }),
  getUserName: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(
      z
        .object({
          name: z.string().nullish(),
        })
        .nullish(),
    )
    .query(async ({ input }) => {
      if (!input?.id) return null
      const name = await getUserName(input.id)
      return { name }
    }),
})
