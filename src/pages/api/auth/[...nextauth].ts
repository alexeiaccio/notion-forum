import type { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth/next'
import EmailProvider from 'next-auth/providers/email'
import { env } from '../../../server/env'
import NotionAdapter from '../../../utils/adapters/notion'
import { notion } from '../../../utils/notion/client'
// import NotionProvider from '../../../utils/providers/notion'

export const authOptions: NextAuthOptions = {
  adapter: NotionAdapter(notion),
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  providers: [
    // NotionProvider({
    //   clientId: env.NOTION_CLIENT_ID,
    //   clientSecret: env.NOTION_CLIENT_SECRET,
    //   notionVersion,
    // }),
    EmailProvider({
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT,
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: env.EMAIL_FROM,
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
