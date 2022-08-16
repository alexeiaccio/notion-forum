import { z } from 'zod'
import { revalidateCached } from '~/utils/getWithCache'
import {
  getUser,
  getUserInfo,
  updateUserImage,
  updateUserInfo,
  updateUserName,
} from '~/utils/notion/api'
import { getUploadFileUrl, uploadUrl } from '~/utils/notion/image'
import {
  ChildrenType,
  contentType,
  ParagraphType,
  paragraphType,
  userType,
} from '~/utils/notion/types'
import { authedProcedure, t } from '../utils'

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
  getUserInfo: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(userType.nullish())
    .query(async ({ input }) => {
      if (!input?.id) return null
      const info = await getUserInfo(input.id)
      return info
    }),
  getUploadFileUrl: authedProcedure
    .input(
      z
        .object({
          name: z.string().nullish(),
          contentType: z.string().nullish(),
          contentLength: z.number().optional(),
        })
        .nullish(),
    )
    .output(uploadUrl.nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.name || !ctx.session?.user.id || !input?.contentType) {
        return null
      }
      const res = await getUploadFileUrl(
        ctx.session.user.id,
        input.name,
        input.contentType,
        input.contentLength,
      )
      return res
    }),
  updateUserImage: authedProcedure
    .input(
      z
        .object({
          id: z.string().nullish(),
          url: z.string().nullish(),
        })
        .nullish(),
    )
    .output(z.string().nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.id || !ctx.session?.user.id || !input?.url) {
        return null
      }
      const res = await updateUserImage(input.id, input.url)
      if (res) {
        await revalidateCached(ctx.res, `user/${input.id}`)
      }
      return res
    }),
  updateUserName: authedProcedure
    .input(
      z
        .object({
          id: z.string().nullish(),
          name: z.string().nullish(),
        })
        .nullish(),
    )
    .output(z.string().nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.id || !ctx.session?.user.id || !input?.name) {
        return null
      }
      const res = await updateUserName(input.id, input.name)
      if (res) {
        await revalidateCached(ctx.res, `user/${input.id}`)
      }
      return res
    }),
  updateUserInfo: authedProcedure
    .input(
      z
        .object({
          id: z.string().nullish(),
          info: z.string().nullish(),
        })
        .nullish(),
    )
    .output(z.array(contentType).nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.id || !ctx.session?.user.id || !input?.info) {
        return null
      }
      const res = await updateUserInfo(
        input.id,
        JSON.parse(input.info) as ParagraphType,
      )
      if (res) {
        await revalidateCached(ctx.res, `user/${input.id}`)
      }
      return res
    }),
})
