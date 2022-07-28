import {
  GetPagePropertyResponse,
  GetPageResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Account } from "next-auth";
import { AdapterUser, VerificationToken } from "next-auth/adapters";
import { ProviderType } from "next-auth/providers";
import { U } from "ts-toolbelt";
import { env } from "../../server/env";
import { notion } from "./client";
import {
  getFile,
  getProperties,
  getProperty,
  richTextToPlainText,
  throttledAPICall,
  uuidFromID,
} from "./utils";

type QueryDatabaseResult = U.Merge<QueryDatabaseResponse["results"][0]>;

const USER_DB = env.NOTION_USER_DB_ID;
const ACCOUNT_DB = env.NOTION_ACCOUNT_DB_ID;
const SESSION_DB = env.NOTION_SESSION_DB_ID;

export async function getUser(id: string) {
  const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: uuidFromID(id),
    })
  );
  const userProps = await getProperties(notion, user);
  if (!user || !userProps) return null;
  return parseUser(user?.id, userProps);
}

export async function getUserByEmail(email: string) {
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
      filter: {
        and: [
          {
            property: "email",
            email: {
              equals: email,
            },
          },
        ],
      },
    })
  );
  const user = users?.results?.[0] as U.Merge<
    QueryDatabaseResponse["results"][0]
  >;
  const userProps = await getProperties(notion, user);
  if (!user || !userProps) return null;
  return parseUser(user?.id, userProps);
}

export async function getUserByAccount({
  providerAccountId,
  provider,
}: {
  providerAccountId: string;
  provider: string;
}) {
  const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(ACCOUNT_DB),
      filter: {
        and: [
          {
            property: "provider",
            rich_text: {
              contains: provider,
            },
          },
          {
            property: "providerAccountId",
            title: {
              contains: providerAccountId,
            },
          },
        ],
      },
    })
  );
  const account = accounts?.results?.[0];
  if (!account) return null;
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
      filter: {
        and: [
          {
            property: "accounts",
            relation: {
              contains: uuidFromID(account.id),
            },
          },
        ],
      },
    })
  );
  const user = users?.results?.[0] as U.Merge<
    QueryDatabaseResponse["results"][0]
  >;
  const userProps = await getProperties(notion, user);
  if (!user || !userProps) return null;
  return parseUser(user?.id, userProps);
}

export async function getSessionAndUser(sessionToken: string) {
  const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(SESSION_DB),
      filter: {
        and: [
          {
            property: "sessionToken",
            title: { contains: sessionToken },
          },
        ],
      },
    })
  );
  const session = sessions?.results?.[0] as QueryDatabaseResult;
  const sessionProps = await getProperties(notion, session);
  if (!session || !sessionProps) return null;
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
      filter: {
        and: [
          {
            property: "sessions",
            relation: { contains: uuidFromID(session.id) },
          },
        ],
      },
    })
  );
  const user = users?.results?.[0] as QueryDatabaseResult;
  const userProps = await getProperties(notion, user);
  if (!user || !userProps) return null;
  return {
    session: parseSession(session.id, sessionProps),
    user: parseUser(user?.id, userProps),
  };
}

export async function getUserName(id: string) {
  const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: uuidFromID(id),
    })
  );
  if (!user?.properties.name?.id) return null;
  const name = await throttledAPICall<GetPagePropertyResponse>(() =>
    notion.pages.properties.retrieve({
      page_id: uuidFromID(id),
      property_id: user.properties.name!.id,
    })
  );
  if (!name) return null;
  return richTextToPlainText(getProperty({ name }, "name", "title"));
}

export function parseUser(id: string, user: Record<string, GetPagePropertyResponse>) {
  const emailVerified = getProperty(user, "emailVerified", "number");
  return {
    id,
    name: richTextToPlainText(getProperty(user, "name", "title")),
    email: getProperty(user, "email", "email"),
    emailVerified: emailVerified ? new Date(emailVerified) : null,
    image: getFile(getProperty(user, "image", "files"))?.[0]?.url,
  };
}

export function parseSession(
  id: string,
  session: Record<string, GetPagePropertyResponse>
) {
  const expires = getProperty(session, "expires", "number");
  return {
    id,
    userId: getProperty(session, "userId", "relation")?.id || "",
    expires: expires ? new Date(expires) : new Date(),
    sessionToken:
      richTextToPlainText(getProperty(session, "sessionToken", "title")) || "",
  };
}


export function parseAccount(
  account: Record<string, GetPagePropertyResponse>
): Account {
  return {
    id: richTextToPlainText(getProperty(account, "id", "title")),
    userId: getProperty(account, "userId", "relation")?.id || "",
    type: (getProperty(account, "type", "select")?.name ||
      "oauth") as ProviderType,
    provider:
      richTextToPlainText(getProperty(account, "provider", "rich_text")) ?? "",
    providerAccountId:
      richTextToPlainText(getProperty(account, "providerAccountId", "title")) ??
      "",
    refresh_token:
      richTextToPlainText(getProperty(account, "refresh_token", "rich_text")) ??
      "",
    access_token:
      richTextToPlainText(getProperty(account, "access_token", "rich_text")) ??
      "",
    expires_at: getProperty(account, "expires_at", "number") || undefined,
    token_type:
      richTextToPlainText(getProperty(account, "token_type", "rich_text")) ||
      undefined,
    scope:
      richTextToPlainText(getProperty(account, "scope", "rich_text")) ||
      undefined,
    id_token:
      richTextToPlainText(getProperty(account, "id_token", "rich_text")) ||
      undefined,
    session_state:
      richTextToPlainText(getProperty(account, "session_state", "rich_text")) ||
      undefined,
    oauth_token_secret:
      richTextToPlainText(
        getProperty(account, "oauth_token_secret", "rich_text")
      ) || undefined,
    oauth_token:
      richTextToPlainText(getProperty(account, "oauth_token", "rich_text")) ||
      undefined,
  };
}

export function parseVerificationToken(
  session: Record<string, GetPagePropertyResponse>
): VerificationToken {
  const expires = getProperty(session, "expires", "number");
  return {
    identifier:
      richTextToPlainText(getProperty(session, "identifier", "title")) || "",
    expires: expires ? new Date(expires) : new Date(),
    token:
      richTextToPlainText(getProperty(session, "token", "rich_text")) || "",
  };
}