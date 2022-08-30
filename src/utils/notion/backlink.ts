import { z } from 'zod'
import { env } from '~/server/env'

export async function getBacklinksForBlock(
  id: string,
): Promise<BacklinksType | undefined> {
  let response
  try {
    response = await fetch(
      'https://www.notion.so/api/v3/getBacklinksForBlock',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token_v2=${env.NOTION_TOKEN};`,
        },
        body: JSON.stringify({
          id,
          spaceId: env.NOTION_SPACE_ID,
        }),
      },
    )
  } catch (error) {
    console.error(error)
  }
  if (response?.status !== 200) {
    throw new Error(response?.statusText || 'Cannot getBacklinksForBlock')
  }
  const json = await response.json()
  return json.backlinks?.[0]
}

export const backlinksType = z.object({
  block_id: z.string(),
  mentioned_from: z.object({
    type: z.string(),
    pointer: z.object({
      id: z.string(),
      table: z.string(),
      spaceId: z.string(),
    }),
    block_id: z.string(),
    property_id: z.string(),
  }),
})
export type BacklinksType = z.infer<typeof backlinksType>
