import { z } from 'zod'

export const colorType = z.union([
  z.literal('default'),
  z.literal('gray'),
  z.literal('brown'),
  z.literal('orange'),
  z.literal('yellow'),
  z.literal('green'),
  z.literal('blue'),
  z.literal('purple'),
  z.literal('pink'),
  z.literal('red'),
  z.literal('gray_background'),
  z.literal('brown_background'),
  z.literal('orange_background'),
  z.literal('yellow_background'),
  z.literal('green_background'),
  z.literal('blue_background'),
  z.literal('purple_background'),
  z.literal('pink_background'),
  z.literal('red_background'),
])
export type ColorType = z.infer<typeof colorType>
export const annotationType = z.object({
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  underline: z.boolean(),
  code: z.boolean(),
  color: colorType,
})
export type AnnotationType = z.infer<typeof annotationType>
export const textType = z.object({
  type: z.literal('text'),
  text: z.string(),
  link: z.string().nullish(),
  annotations: annotationType,
})
export type TextType = z.infer<typeof textType>
export const mentionType = z.object({
  type: z.literal('mention'),
  text: z.string(),
  mention: z.union([
    z.object({
      type: z.literal('date'),
      date: z.string().nullish(),
    }),
    z.object({
      type: z.literal('page'),
      page: z.string().nullish(),
    }),
  ]),
  annotations: annotationType,
})
export type MentionType = z.infer<typeof mentionType>
export const richTextType = z.union([textType, mentionType])
export type RichTextType = z.infer<typeof richTextType>

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

export const contentType = z.union([
  z.object({
    id: z.string(),
    type: z.literal('paragraph'),
    created_time: z.string(),
    edited_time: z.string(),
    rich_text: z.array(richTextType).nullish(),
    plain_text: z.string().nullish(),
    color: colorType.nullish(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('h1'),
    created_time: z.string(),
    edited_time: z.string(),
    rich_text: z.array(richTextType).nullish(),
    plain_text: z.string().nullish(),
    color: colorType.nullish(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('h2'),
    created_time: z.string(),
    edited_time: z.string(),
    rich_text: z.array(richTextType).nullish(),
    plain_text: z.string().nullish(),
    color: colorType.nullish(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('h3'),
    created_time: z.string(),
    edited_time: z.string(),
    rich_text: z.array(richTextType).nullish(),
    plain_text: z.string().nullish(),
    color: colorType.nullish(),
  }),
])

export type ContentType = z.infer<typeof contentType>

const commentHeaderType = z.object({
  id: z.string(),
  header: z.object({
    author: z.string(),
    relation: z.string(),
    date: z.string(),
  }),
})

export type CommentHeaderType = z.infer<typeof commentHeaderType>

export const contentAndCommentsType = z.object({
  content: z.array(contentType).nullish(),
  comments: z.array(commentHeaderType).nullish(),
})

export type ContentAndCommentsType = z.infer<typeof contentAndCommentsType>
