import type { NextRequest } from 'next/server'

export default async function imageRoutes(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url)
  const url = new URL(
    `https://www.notion.so/image/${encodeURIComponent(
      'https://s3-us-west-2.amazonaws.com',
    )}${pathname.replace('/api/image/', '')}`,
  )
  url.searchParams.set('table', 'block')
  if (searchParams.get('id')) {
    url.searchParams.set('id', searchParams.get('id')!)
  }
  if (searchParams.get('width')) {
    url.searchParams.set('width', searchParams.get('width')!)
  }
  url.searchParams.set('cache', 'v2')
  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      cookie: `token_v2=${process.env.NOTION_TOKEN};`,
    },
    redirect: 'manual',
  })
}

export const config = {
  runtime: 'experimental-edge',
}
