import * as trpc from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import LRUCache from 'lru-cache'
import { GetServerSidePropsContext } from 'next'
import { Session } from 'next-auth'
import { unstable_getServerSession as getServerSession } from 'next-auth/next'
import { authOptions as nextAuthOptions } from '~/pages/api/auth/[...nextauth]'

const cache = new LRUCache<'session', Session | null>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24,
  allowStale: true,
  noDeleteOnFetchRejection: true,
})

export async function getSession(opts: GetServerSidePropsContext) {
  if (cache.get('session')) {
    return cache.get('session') as Session
  }
  const session = await getServerSession(opts.req, opts.res, nextAuthOptions)
  cache.set('session', session)
  return session
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  if (cache.get('session')) {
    return { session: cache.get('session') as Session, res: opts.res }
  }
  const session = await getServerSession(opts.req, opts.res, nextAuthOptions)
  cache.set('session', session)
  return { session, res: opts.res }
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>
