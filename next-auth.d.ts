import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id?: string;
      email?: string;
      name?: string;
      image?: string;
      workspace?: {
        name?: string
        icon?: string
        id?: string
      }
    } & DefaultSession["user"];
  }
}
