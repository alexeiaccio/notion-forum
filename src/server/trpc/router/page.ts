import { z } from 'zod'
import { getCached } from '~/utils/getWithCache'
import {
  getBlock,
  getBlockChildren,
  getCommentLikes,
  getPage,
  getPageLikes,
  getPagesList,
  getRelations,
} from '~/utils/notion/api'
import {
  commentType,
  contentAndCommentsType,
  pageLikesType,
  pagesList,
  pageType,
  relationType,
} from '~/utils/notion/types'
import { t } from '../utils'

export const pageRouter = t.router({
  getPagesList: t.procedure
    .input(z.object({ cursor: z.string().nullish() }))
    .output(pagesList.nullish())
    .query(async ({ input }) => {
      const res = await getPagesList(input?.cursor)
      return res
    }),
  getUserPagesList: t.procedure
    .input(z.object({ id: z.string().nullish(), cursor: z.string().nullish() }))
    .output(pagesList.nullish())
    .query(async ({ input }) => {
      const res = await getPagesList(input?.cursor, { author: input?.id })
      return res
    }),
  getPage: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(contentAndCommentsType.and(pageType).nullish())
    .query(async ({ input }) => {
      if (!input?.id) return null
      const res = await getCached(
        async () => {
          const [page, blocks] = await Promise.all([
            getPage(input.id!),
            getBlockChildren(input.id),
          ])
          const authors = await getRelations(page?.authors)
          const tags = await getRelations(page?.tags)
          return { ...page, authors, tags, ...blocks }
        },
        `page/${input.id}`,
        'page',
      )()
      return res
    }),
  getBlockChildren: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .output(contentAndCommentsType.nullish())
    .query(async ({ input }) => {
      if (!input?.id) return null
      const blocks = await getBlockChildren(input.id)
      return blocks
    }),
  getComment: t.procedure
    .input(
      z.object({
        breadcrambs: z.array(z.string().nullish()).nullish(),
      }),
    )
    .output(commentType.and(contentAndCommentsType).nullish())
    .query(async ({ input }) => {
      if (!input?.breadcrambs) return null
      const {
        0: pageId,
        length: breadcrambsLength,
        [breadcrambsLength - 1]: commentId,
        ...brdcrmbs
      } = input.breadcrambs
      const breadcrambs = Object.values(brdcrmbs)
      const res = await getCached(
        async () => {
          const [block, comments] = await Promise.all([
            getBlock(commentId),
            getBlockChildren(commentId),
          ])
          return {
            ...block,
            ...comments,
          }
        },
        `page/${pageId}/comments/${
          breadcrambs.length ? `${breadcrambs.join('/')}/` : ''
        }${commentId}`,
        'comment',
      )()
      return res
    }),
  getBreadcrambs: t.procedure
    .input(
      z
        .object({
          breadcrambs: z.array(z.string()).nullish(),
        })
        .nullish(),
    )
    .output(
      z
        .object({
          page: pageType.nullish(),
          comments: z.array(commentType.nullish()).nullish(),
        })
        .nullish(),
    )
    .query(async ({ input }) => {
      if (!input?.breadcrambs) return null
      const [pageId, ...breadcrambs] = input.breadcrambs
      const result = await Promise.all([
        getCached(
          async () => {
            const page = await getPage(pageId)
            const authors = await getRelations(page?.authors)
            const tags = await getRelations(page?.tags)
            return { ...page, authors, tags, content: null, comments: null }
          },
          `page/${pageId}`,
          'page',
        )(),
        ...breadcrambs.map((path, idx) =>
          getCached(
            async () => {
              const comment = await getBlock(path)
              return comment
            },
            `page/${pageId}/comments/${breadcrambs
              .slice(0, idx)
              .join('/')}/${path}`,
            'comment',
          )(),
        ),
      ])
      const [pageProps, ...comments] = result
      const { content: _, comments: __, ...page } = pageProps
      return { page, comments }
    }),
  getRelations: t.procedure
    .input(
      z.object({
        ids: z.array(z.object({ id: z.string().nullish() })).nullish(),
      }),
    )
    .output(z.array(relationType.nullish()).nullish())
    .query(async ({ input }) => {
      const res = await getRelations(input.ids)
      return res
    }),
  getPageLikes: t.procedure
    .input(
      z.object({
        id: z.string().nullish(),
      }),
    )
    .output(pageLikesType.nullish())
    .query(async ({ input }) => {
      const res = await getPageLikes(input.id)
      return res
    }),
  getCommentLikes: t.procedure
    .input(
      z.object({
        id: z.string().nullish(),
      }),
    )
    .output(pageLikesType.nullish())
    .query(async ({ input }) => {
      const res = await getCommentLikes(input.id)
      return res
    }),
})
