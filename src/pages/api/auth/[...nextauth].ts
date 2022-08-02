import type { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { env } from '../../../server/env'
import NotionAdapter from '../../../utils/adapters/notion'
import { notion, notionVersion } from '../../../utils/notion/client'
import NotionProvider from '../../../utils/providers/notion'

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
    NotionProvider({
      clientId: env.NOTION_CLIENT_ID,
      clientSecret: env.NOTION_CLIENT_SECRET,
      notionVersion,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        name: {
          label: 'Name',
          type: 'text',
          placeholder: 'Enter your name',
        },
      },
      async authorize(credentials, _req) {
        const user = { id: 1, name: credentials?.name ?? 'J Smith' }
        return user
      },
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
