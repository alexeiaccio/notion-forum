import { z } from 'zod'
import { getCached } from '~/utils/getWithCache'
import {
  getBlock,
  getBlockChildren,
  getPage,
  getRelations,
} from '~/utils/notion/api'
import { t } from '../utils'

export const pageRouter = t.router({
  getPage: t.procedure
    .input(z.object({ id: z.string().nullish() }).nullish())
    .query(async ({ input }) => {
      if (!input?.id) return null
      const [page, blocks] = await Promise.all([
        getPage(input.id),
        getBlockChildren(input.id),
      ])
      const authors = await getRelations(page?.authors)
      return { ...page, authors, ...blocks }
    }),
  getComment: t.procedure
    .input(
      z.object({
        breadcrambs: z.array(z.string()).nullish(),
      }),
    )
    .output(
      z
        .object({
          id: z.string().nullish(),
          header: z
            .object({
              author: z.string(),
              relation: z.string(),
              date: z.string(),
            })
            .nullish(),
          content: z
            .array(
              z.object({
                id: z.string(),
                rich_text: z.string().nullish(),
              }),
            )
            .nullish(),
          comments: z
            .array(
              z.object({
                id: z.string(),
                header: z.object({
                  author: z.string(),
                  relation: z.string(),
                  date: z.string(),
                }),
              }),
            )
            .nullish(),
        })
        .nullish(),
    )
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
        `page/${pageId}/comments/${breadcrambs.join('/')}/${commentId}`,
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
          page: z
            .object({
              title: z.string().nullish(),
              authors: z
                .array(
                  z.object({
                    id: z.string().nullish(),
                    name: z.string().nullish(),
                  }),
                )
                .nullish(),
              tags: z
                .array(
                  z.object({
                    id: z.string(),
                  }),
                )
                .nullish(),
              id: z.string().nullish().nullish(),
              created: z.string().nullish(),
              updated: z.string().nullish(),
            })
            .nullish(),
          comments: z
            .array(
              z
                .object({
                  id: z.string().nullish(),
                  header: z
                    .object({
                      author: z.string(),
                      relation: z.string(),
                      date: z.string(),
                    })
                    .nullish(),
                })
                .nullish(),
            )
            .nullish(),
        })
        .nullish(),
    )
    .query(async ({ input }) => {
      if (!input?.breadcrambs) return null
      const {
        0: pageId,
        length: breadcrambsLength,
        [breadcrambsLength - 1]: commentId,
        ...brdcrmbs
      } = input.breadcrambs
      const breadcrambs = Object.values(brdcrmbs)
      const result = await Promise.all([
        getCached(
          async () => {
            const page = await getPage(pageId)
            const authors = await getRelations(page?.authors)
            return { ...page, authors }
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
      const [page, ...comments] = result
      return { page, comments }
    }),
})
