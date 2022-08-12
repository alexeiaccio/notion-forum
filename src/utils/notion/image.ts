import { z } from 'zod'

export async function uploadImage(file: File) {
  const urls = await getUploadFileUrl<UploadURL>(file)
  if (!urls) return
  try {
    await fetch(urls.signedPutUrl, {
      method: 'PUT',
    })
    return urls
  } catch (error) {
    console.error(error)
  }

  return urls
}

async function getUploadFileUrl<T>(file: File): Promise<T | undefined> {
  let response
  try {
    response = await fetch('https://api.notion.com/v3/getUploadFileUrl', {
      method: 'POST',
      body: JSON.stringify({
        bucket: 'secure',
        name: file.name,
        contentType: file.type,
        // record: {
        //   table: 'block',
        //   id: '4174c272-6fc8-4626-ade0-fa603350f003',
        //   spaceId: 'a2045dd4-53f8-48a7-b528-b7e6e07e9436',
        // },
        // supportExtraHeaders: true,
        // contentLength: 180056,
      }),
    })
  } catch (error) {
    console.error(error)
  }
  if (response?.status !== 200) return

  return response.json()
}

const uploadUrl = z.object({
  signedGetUrl: z.string(),
  signedPutUrl: z.string(),
  url: z.string(),
})
type UploadURL = z.infer<typeof uploadUrl>
