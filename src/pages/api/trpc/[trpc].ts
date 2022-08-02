import { createNextApiHandler } from '@trpc/server/adapters/next'
import { differenceInMilliseconds, isAfter, parseISO } from 'date-fns'
import { createContext } from '../../../server/trpc/context'
import { appRouter } from '../../../server/trpc/router'

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createContext,
  batching: { enabled: true },
  // responseMeta({ ctx, paths, type, errors }) {
  //   // assuming you have all your auth routes with the keyword `auth` in them
  //   const someAuth = paths?.some((path) => path.includes("proxy"));
  //   // checking that no procedures errored
  //   const allOk = errors.length === 0;
  //   // checking we're doing a query request
  //   const isQuery = type === "query";

  //   if (
  //     someAuth &&
  //     allOk &&
  //     isQuery &&
  //     ctx?.session?.expires &&
  //     isAfter(parseISO(ctx.session.expires), new Date())
  //   ) {
  //     const expires = differenceInMilliseconds(
  //       parseISO(ctx.session.expires),
  //       new Date()
  //     );
  //     return {
  //       headers: {
  //         "Cache-Control": `s-maxage=${expires}, stale-while-revalidate=${expires}`,
  //       },
  //     };
  //   }
  //   return {};
  // },
})
