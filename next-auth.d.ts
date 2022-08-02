import { DefaultSession } from 'next-auth'
import { ZodString } from 'zod'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id?: string
      email?: string
      name?: string
      image?: ZodString
    } & DefaultSession['user']
  }
}
