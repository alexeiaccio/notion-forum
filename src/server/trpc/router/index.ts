// src/server/trpc/router/index.ts
import { t } from "../utils";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { userRouter } from "./user";

export const appRouter = t.router({
  example: exampleRouter,
  auth: authRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
