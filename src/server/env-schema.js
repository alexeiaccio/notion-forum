const { z } = require('zod')

const envSchema = z.object({
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  EMAIL_SERVER_USER: z.string(),
  EMAIL_SERVER_PASSWORD: z.string(),
  EMAIL_SERVER_HOST: z.string(),
  EMAIL_SERVER_PORT: z.string(),
  EMAIL_FROM: z.string().email(),

  NOTION_CLIENT_ID: z.string(),
  NOTION_CLIENT_SECRET: z.string(),

  NOTION_KEY: z.string(),
  NOTION_TOKEN: z.string(),
  NOTION_USER_DB_ID: z.string(),
  NOTION_ACCOUNT_DB_ID: z.string(),
  NOTION_SESSION_DB_ID: z.string(),
  NOTION_VERIFICATION_TOKEN_DB_ID: z.string(),
  NOTION_ROLE_DB_ID: z.string(),
  NOTION_PAGE_DB_ID: z.string(),
})

module.exports.envSchema = envSchema
