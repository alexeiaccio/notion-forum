import { getRole } from '~/utils/notion/api'
import { authedProcedure, t } from '../utils'

export const authRouter = t.router({
  getSession: t.procedure.query(({ ctx }) => {
    return ctx.session
  }),
  getRole: authedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) return null
    const role = await getRole(ctx.session.user.id)
    return role
  }),
})
