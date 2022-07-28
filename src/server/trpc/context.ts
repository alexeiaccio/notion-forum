
import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import {
  unstable_getServerSession as getServerSession, type Session
} from "next-auth";

import { authOptions as nextAuthOptions } from "../../pages/api/auth/[...nextauth]";

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext(
  opts: trpcNext.CreateNextContextOptions
) {
  const session = await getServerSession(opts.req, opts.res, nextAuthOptions);

  return { session };
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
