import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const hash = (str: string) =>
  crypto.createHash("md5").update(str).digest("hex");

export const CACHE_FOLDER_PATH = path.resolve(process.cwd(), ".next/cache");

export async function cachedCall(
  fn: (...args: any[]) => Promise<any>,
  ...args: any[]
) {
  const hashedUrl = hash(JSON.stringify(args));
  if (
    process.env.NODE_ENV === "development" ||
    process.env.TEST_NODE_ENV === "development"
  ) {
    try {
      const cache = await fs.readFile(
        path.join(CACHE_FOLDER_PATH, `cached_${hashedUrl}.json`),
        { encoding: "utf8" }
      );

      if (cache) {
        console.log("Read from cache for", hashedUrl);
        return new Response(cache);
      }
    } catch {
      console.log("There is not cache for this query yet");
    }

    try {
      const res = await fn(...args);
      if (res) {
        await fs.writeFile(
          path.join(CACHE_FOLDER_PATH, `cached_${hashedUrl}.json`),
          JSON.stringify(res),
          "utf-8"
        );
      }
      return Promise.resolve(res);
    } catch {}
  }

  return fn(...args);
}

export default cachedCall;
