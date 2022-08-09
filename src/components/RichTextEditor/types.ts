import { z } from 'zod'

export const textFormatType = z.union([
  z.literal('bold'),
  z.literal('underline'),
  z.literal('strikethrough'),
  z.literal('italic'),
  z.literal('code'),
  z.literal('subscript'),
  z.literal('superscript'),
])

export type TextFormatType = z.infer<typeof textFormatType>
