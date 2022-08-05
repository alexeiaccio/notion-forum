import { Client } from '@notionhq/client'
import type {
  CreatePageResponse,
  GetPagePropertyResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { parseISO } from 'date-fns'
import pThrottle from 'p-throttle'
import type { U } from 'ts-toolbelt'
import { MentionType, RichTextType } from './types'

export const throttle = pThrottle({
  limit: 10,
  interval: 1000,
})

export async function throttledAPICall<T>(
  fn: (...args: any) => Promise<any>,
): Promise<T> {
  const res = (await throttle(fn)()) as T
  return res
}

export function uuidFromID(id: string | null | undefined): string {
  return id?.replace(/-/g, '') ?? ''
}

type Properties = Record<string, GetPagePropertyResponse>
type Property = U.NonNullable<Properties[keyof Properties]>
type List = Extract<Property, { object: 'list' }>
type File = {
  url: string
  name: string
}

export function getProperty<
  Props extends Record<string, GetPagePropertyResponse>,
  Prop extends Props[keyof Props],
  Type extends Prop['type'],
  Res extends Extract<Prop, { type: Type }>,
  TypeKey extends Extract<keyof Res, Type>,
>(
  props: Props | null | undefined,
  key: keyof Props,
  type: Type,
): Res[TypeKey] | null {
  if (props?.[key]?.object === 'list') {
    const list = props[key] as List
    return list?.results?.[0]
      ? (getProperty(
          { [key]: list.results[0] } as Props,
          key,
          type,
        ) as Res[TypeKey])
      : null
  }
  return props && key in props
    ? (props[key] as Res)?.[type as TypeKey] || null
    : null
}

export function getPropertiesList<
  Props extends Record<string, GetPagePropertyResponse>,
  Prop extends Props[keyof Props],
  Type extends Prop['type'],
  Res extends Extract<Prop, { type: Type }>,
  TypeKey extends Extract<keyof Res, Type>,
>(
  props: Props | null | undefined,
  key: keyof Props,
  type: Type,
): Res[TypeKey][] {
  if (props?.[key]?.object === 'list') {
    const list = props[key] as List
    return (list?.results || []).map(
      (result) =>
        getProperty({ [key]: result } as Props, key, type) as Res[TypeKey],
    )
  }
  return []
}

export function richTextBlockToPlainText(
  richText: RichTextItemResponse[] | null | undefined,
): string {
  return (richText || [])
    ?.map((text) => richTextToPlainText(text) || '')
    .join('')
}

export function parseRichText(
  richText: RichTextItemResponse[] | null | undefined,
): RichTextType[] {
  return (richText || [])?.reduce<RichTextType[]>((res, item) => {
    if (item.type === 'text') {
      res.push({
        type: 'text',
        text: item.text.content,
        link: item.text.link?.url || null,
        annotations: item.annotations,
      })
    }
    if (item.type === 'mention') {
      const mention =
        item.mention.type === 'date'
          ? {
              type: 'date',
              date: item.mention.date.start,
            }
          : item.mention.type === 'page'
          ? {
              type: 'page',
              page: item.mention.page.id,
            }
          : null
      if (mention) {
        res.push({
          type: 'mention',
          mention,
          text: item.plain_text,
          annotations: item.annotations,
        } as MentionType)
      }
    }
    if (item.type === 'equation') {
      res.push({
        type: 'equation',
        equation: item.equation.expression,
        annotations: item.annotations,
      })
    }
    return res
  }, [])
}

export function parseMention(
  richText: RichTextItemResponse[] | null | undefined,
) {
  const result = {} as { relation: string; author: string; date: string }
  richText?.forEach((text) => {
    if (text.type === 'mention') {
      if (text.mention.type === 'page') {
        result.author = text.plain_text
        result.relation = uuidFromID(text.mention.page.id)
      }
      if (text.mention.type === 'date') {
        result.date = text.mention.date.start
      }
    }
  })
  return result
}

export function richTextToPlainText(
  richText:
    | Extract<Property, { type: 'rich_text' }>['rich_text']
    | null
    | undefined,
): string | null {
  return richText?.plain_text ?? null
}

export function getFile(
  files: Extract<Property, { type: 'files' }>['files'] | null | undefined,
): Array<File> {
  return (files || []).reduce<Array<File>>((res, item) => {
    switch (item.type) {
      case 'external':
        res.push({ url: item.external.url, name: item.name })
        break
      case 'file':
        res.push({ url: item.file.url, name: item.name })
        break

      default:
        break
    }
    return res
  }, [])
}

export async function getProperties(
  client: Client,
  {
    page,
    skip,
    pick,
  }: {
    page: U.Merge<CreatePageResponse> | null | undefined
    skip?: string[]
    pick?: string[]
  },
): Promise<Record<string, GetPagePropertyResponse> | null> {
  if (!page) return null
  const props = await Promise.all(
    Object.entries(page.properties)
      .filter(([key]) =>
        skip ? !skip.includes(key) : pick ? pick.includes(key) : true,
      )
      .map(([, prop]) =>
        throttledAPICall<GetPagePropertyResponse>(() =>
          client.pages.properties.retrieve({
            page_id: page.id,
            property_id: prop.id,
          }),
        ),
      ),
  )
  const result = {} as Record<string, GetPagePropertyResponse>
  Object.keys(page.properties).forEach((key, index) => {
    if (props[index]) {
      result[key] = props[index] as GetPagePropertyResponse
    }
  })
  return result
}
