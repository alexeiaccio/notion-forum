import { z } from 'zod'

export const rawPageType = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  authors: z
    .array(
      z.object({
        id: z.string().nullish(),
      }),
    )
    .nullish(),
  tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .nullish(),
  created: z.string().nullish(),
  updated: z.string().nullish(),
})

export type RawPageType = z.infer<typeof rawPageType>

export const relationType = z.object({
  id: z.string().nullish(),
  name: z.string().nullish(),
})

export type RelationType = z.infer<typeof relationType>

export const pageType = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  authors: z.array(relationType).nullish(),
  tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .nullish(),
  created: z.string().nullish(),
  updated: z.string().nullish(),
})

export type PageType = z.infer<typeof pageType>

export const pagesList = z.object({
  results: z.array(pageType).nullish(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullish(),
})

export type PagesList = z.infer<typeof pagesList>

export const commentType = z.object({
  id: z.string().nullish(),
  header: z
    .object({
      author: z.string(),
      relation: z.string(),
      date: z.string(),
    })
    .nullish(),
})

export type CommentType = z.infer<typeof commentType>

export const contentType = z.object({
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

export type ContentType = z.infer<typeof contentType>
