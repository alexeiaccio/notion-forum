import { z } from 'zod'
import { env } from '~/server/env'

export async function getUploadFileUrl(
  id: string,
  name: string,
  contentType: string,
  contentLength?: number,
): Promise<UploadURL | undefined> {
  let response
  try {
    response = await fetch('https://www.notion.so/api/v3/getUploadFileUrl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token_v2=${env.NOTION_TOKEN};`,
      },
      body: JSON.stringify({
        bucket: 'secure',
        name,
        contentType,
        contentLength,
        record: {
          table: 'block',
          id,
          spaceId: env.NOTION_SPACE_ID,
        },
      }),
    })
  } catch (error) {
    console.error(error)
  }
  if (response?.status !== 200) return
  return response.json()
}

export const uploadUrl = z.object({
  signedGetUrl: z.string(),
  signedPutUrl: z.string(),
  url: z.string(),
})
export type UploadURL = z.infer<typeof uploadUrl>
