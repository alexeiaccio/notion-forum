import { cva } from 'cva'
import { twMerge } from 'tailwind-merge'
import type { ColorType, ContentType, RichTextType } from '~/utils/notion/types'

export function RichText({
  content,
}: {
  content: ContentType | null | undefined
}) {
  if (!content) return null
  switch (content.type) {
    case 'paragraph':
      return (
        <p>
          <RichTextRenederer textMap={content.rich_text} />
        </p>
      )
    case 'h1':
      return (
        <h1 className="text-3xl font-bold">
          <RichTextRenederer textMap={content.rich_text} />
        </h1>
      )
    case 'h2':
      return (
        <h2 className="text-2xl font-bold">
          <RichTextRenederer textMap={content.rich_text} />
        </h2>
      )
    case 'h3':
      return (
        <h3 className="text-xl font-semibold">
          <RichTextRenederer textMap={content.rich_text} />
        </h3>
      )
    default:
      return null
  }
}

const richTextStyles = cva('', {
  variants: {
    code: {
      code: 'text-amber-500 bg-slate-700 rounded-sm px-1.5 py-0.5',
    },
    color: {
      default: 'text-slate-700',
      blue: 'text-blue-500',
      brown: 'text-amber-600',
      gray: 'text-gray-500',
      green: 'text-green-500',
      orange: 'text-orange-500',
      pink: 'text-pink-500',
      purple: 'text-purple-500',
      red: 'text-red-500',
      yellow: 'text-yellow-700',
      blue_background: 'bg-blue-700',
      brown_background: 'bg-amber-700',
      gray_background: 'bg-slate-700',
      green_background: 'bg-green-700',
      orange_background: 'bg-orange-700',
      pink_background: 'bg-pink-700',
      purple_background: 'bg-purple-700',
      red_background: 'bg-red-700',
      yellow_background: 'bg-yellow-700',
    } as Record<ColorType, string>,
  },
  compoundVariants: [
    { color: 'default', code: 'code', class: 'text-amber-500' },
  ],
  defaultVariants: {
    color: 'default',
  },
})

function RichTextRenederer({
  textMap,
}: {
  textMap: RichTextType[] | null | undefined
}) {
  if (!textMap) return null
  return (
    <>
      {textMap.map((content, idx) => {
        if (content.type === 'text') {
          if (content.annotations.code) {
            return (
              <code
                key={idx}
                className={twMerge(
                  richTextStyles({
                    code: 'code',
                    color: content.annotations.color,
                  }),
                  content.annotations.bold && 'font-bold',
                  content.annotations.italic && 'italic',
                  content.annotations.strikethrough && 'line-through',
                  content.annotations.underline && 'underline',
                )}
              >
                {content.text}
              </code>
            )
          }
          return (
            <span
              key={idx}
              className={twMerge(
                richTextStyles({ color: content.annotations.color }),
                content.annotations.bold && 'font-bold',
                content.annotations.italic && 'italic',
                content.annotations.strikethrough && 'line-through',
                content.annotations.underline && 'underline',
              )}
            >
              {content.text}
            </span>
          )
        }
      })}
    </>
  )
}
