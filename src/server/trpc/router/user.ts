import { z } from 'zod'
import { env } from '~/server/env'
import { revalidateCached } from '~/utils/getWithCache'
import {
  connectPage,
  createDraft,
  getDraft,
  getDraftContent,
  getDraftsList,
  getLikes,
  getPublished,
  getRelations,
  getSpace,
  getUser,
  getUserInfo,
  postLike,
  publishDraft,
  updateUserImage,
  updateUserInfo,
  updateUserName,
} from '~/utils/notion/api'
import { getUploadFileUrl, uploadUrl } from '~/utils/notion/image'
import {
  ChildrenType,
  contentAndCommentsType,
  contentType,
  likesType,
  pagesList,
  pageType,
  ParagraphType,
  publishedType,
  rawPageType,
  spaceType,
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
  getSpace: authedProcedure
    .output(
      z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('space') }).merge(spaceType),
          z.object({ type: z.literal('url'), url: z.string() }),
        ])
        .nullish(),
    )
    .query(async ({ ctx }) => {
      if (!ctx.session.user?.id) return null
      const space = await getSpace(ctx.session.user.id)
      if (space) return { type: 'space', ...space }
      const url = new URL('https://api.notion.com/v1/oauth/authorize')
      url.searchParams.append('client_id', env.NOTION_CLIENT_ID)
      url.searchParams.append('redirect_uri', `${env.NEXTAUTH_URL}/api/notion`)
      url.searchParams.append('response_type', 'code')
      url.searchParams.append('owner', 'user')
      return { type: 'url', url: url.toString() }
    }),
  connectSpace: authedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session.user?.id) return null
  }),
  connectPage: authedProcedure
    .input(
      z
        .object({
          spaceId: z.string().nullish(),
          pageId: z.string().nullish(),
        })
        .nullish(),
    )
    .output(spaceType.nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.spaceId || !input?.pageId || !ctx.session?.user.id) {
        return null
      }
      const res = await connectPage(
        input.spaceId,
        input.pageId,
        ctx.session.user.id,
      )
      return res
    }),
  getDraftsList: authedProcedure
    .input(z.object({ cursor: z.string().nullish() }).nullish())
    .output(pagesList.nullish())
    .query(async ({ input, ctx }) => {
      if (!ctx.session.user?.id) return null
      const res = await getDraftsList(ctx.session.user.id, input?.cursor)
      return res
    }),
  getDraft: authedProcedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(contentAndCommentsType.and(pageType).nullish())
    .query(async ({ input, ctx }) => {
      if (!input?.id || !ctx.session.user?.id) return null
      const [page, content] = await Promise.all([
        getDraft(ctx.session.user.id, input.id!),
        getDraftContent(ctx.session.user.id, input.id),
      ])
      const authors = await getRelations(page?.authors)
      return { ...page, authors, content }
    }),
  createDraft: authedProcedure
    .input(
      z
        .object({
          title: z.string().nullish(),
          draft: z.string().nullish(),
        })
        .nullish(),
    )
    .output(rawPageType.nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.draft || !ctx.session?.user.id) {
        return null
      }
      const res = await createDraft(
        ctx.session?.user.id,
        JSON.parse(input.draft) as ChildrenType,
        input.title,
      )
      return res
    }),
  publishDraft: authedProcedure
    .input(
      z
        .object({
          pageId: z.string().nullish(),
        })
        .nullish(),
    )
    .output(z.string().nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input?.pageId || !ctx.session?.user.id) {
        return null
      }
      const res = await publishDraft(ctx.session.user.id, input.pageId)
      return res
    }),
  getPublished: authedProcedure
    .input(z.object({ id: z.string().nullish() }))
    .output(publishedType.nullish())
    .query(async ({ input, ctx }) => {
      if (!input.id || !ctx?.session?.user?.id) return null
      const published = await getPublished(input.id)
      return published
    }),
  getLikes: authedProcedure
    .input(z.object({ id: z.string().nullish() }))
    .output(likesType.nullish())
    .query(async ({ input, ctx }) => {
      if (!input.id || !ctx?.session?.user?.id) return null
      const likes = await getLikes(ctx.session.user.id, input.id)
      return likes
    }),
  postLike: authedProcedure
    .input(
      z.object({
        id: z.string().nullish(),
        action: z.union([z.literal('likes'), z.literal('dislikes')]),
      }),
    )
    .output(likesType.nullish())
    .mutation(async ({ input, ctx }) => {
      if (!input.id || !ctx?.session?.user?.id) return null
      const likes = await postLike(ctx.session.user.id, input.id, input.action)
      return likes
    }),
})
