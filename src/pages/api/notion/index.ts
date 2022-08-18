import type { NextApiRequest, NextApiResponse } from 'next'
import { env } from '~/server/env'
import { connectSpace } from '~/utils/notion/api'
import { botType, BotType } from '~/utils/notion/types'

async function callback(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(
          `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`,
        ).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: `${env.NEXTAUTH_URL}/api/notion`,
      }),
    })
    const json = await response.json()
    const token = botType.safeParse(json)
    if (token.success) {
      const space = await connectSpace(token.data)
      if (space) {
        res.redirect('/account')
      }
    } else {
      res.status(400).json({ error: token.error, json })
    }
  } catch (error) {
    res.status(400).json({ error })
  }
}

export default callback
