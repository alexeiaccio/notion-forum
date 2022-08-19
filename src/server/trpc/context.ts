import * as trpc from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import LRU from 'lru-cache'
import { GetServerSidePropsContext } from 'next'
import { Session } from 'next-auth'
import { unstable_getServerSession as getServerSession } from 'next-auth/next'
import { authOptions as nextAuthOptions } from '~/pages/api/auth/[...nextauth]'

const cache = new LRU({
  max: 500,
  maxSize: 500,
  sizeCalculation: () => 1,
  allowStale: false,
  ttl: 1000 * 60 * 5,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
})

export async function getSessionContext(opts: GetServerSidePropsContext) {
  if (cache.has('session')) {
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
  if (cache.has('session')) {
    return { session: cache.get('session') as Session, res: opts.res }
  }
  const session = await getServerSession(opts.req, opts.res, nextAuthOptions)
  cache.set('session', session)
  return { session, res: opts.res }
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>
