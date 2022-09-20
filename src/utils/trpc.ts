import { httpBatchLink, httpLink, loggerLink, splitLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server'
import superjson from 'superjson'
// import { devtoolsLink } from 'trpc-client-devtools-link'
import type { AppRouter } from '../server/trpc/router'

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '' // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createReactQueryHooks`.
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 */
export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      url: `${getBaseUrl()}/api/trpc`,
      /**
       * @link https://trpc.io/docs/data-transformers
       */
      transformer: superjson,
      /**
       * @link https://trpc.io/docs/links
       */
      links: [
        splitLink({
          condition(op) {
            // check for context property `skipBatch`
            return op.context.skipBatch === true
          },
          // when condition is true, use normal request
          true: httpLink({
            url: '/api/trpc',
          }),
          // when condition is false, use batching
          false: httpBatchLink({
            url: '/api/trpc',
          }),
        }),
        // adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        // seems don't work with v10
        // @link https://github.com/rhenriquez28/trpc-client-devtools
        // devtoolsLink({
        //   // `enabled` is true by default
        //   // If you want to use the devtools extension just for development, do the following
        //   enabled: process.env.NODE_ENV === 'development',
        // }),
      ],
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      queryClientConfig: { defaultOptions: { queries: { staleTime: 600 } } },
    }
  },
  ssr: false,
})

/**
 * This is a helper method to infer the output of a query resolver
 * @example type HelloOutput = inferQueryOutput<'hello'>
 */
export type inferQueryOutput<
  TRouteKey extends keyof AppRouter['_def']['queries'],
> = inferProcedureOutput<AppRouter['_def']['queries'][TRouteKey]>

export type inferQueryInput<
  TRouteKey extends keyof AppRouter['_def']['queries'],
> = inferProcedureInput<AppRouter['_def']['queries'][TRouteKey]>

export type inferMutationOutput<
  TRouteKey extends keyof AppRouter['_def']['mutations'],
> = inferProcedureOutput<AppRouter['_def']['mutations'][TRouteKey]>

export type inferMutationInput<
  TRouteKey extends keyof AppRouter['_def']['mutations'],
> = inferProcedureInput<AppRouter['_def']['mutations'][TRouteKey]>
