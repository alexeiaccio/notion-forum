import type { Client } from "@notionhq/client";
import type {
  CreatePageResponse,
  GetPagePropertyResponse,
  GetPageResponse,
  QueryDatabaseResponse,
  UpdatePageResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { Account } from "next-auth";
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import type { ProviderType } from "next-auth/providers";
import type { F, U } from "ts-toolbelt";
import { env } from "../../server/env";
import {
  getFile,
  getProperty,
  richTextToPlainText,
  throttledAPICall,
  uuidFromID,
} from "../notion/utils";

const USER_DB = env.NOTION_USER_DB_ID!;
const ACCOUNT_DB = env.NOTION_ACCOUNT_DB_ID!;
const SESSION_DB = env.NOTION_SESSION_DB_ID!;
const VERIFICATION_TOKEN_DB = env.NOTION_VERIFICATION_TOKEN_DB_ID!;

type CreatePageBodyParameters = F.Parameters<
  typeof Client["prototype"]["pages"]["create"]
>[0]["properties"];

type QueryDatabaseResult = U.Merge<QueryDatabaseResponse["results"][0]>;

export default function NotionAdapter(client: Client, options = {}): Adapter {
  return {
    async createUser(user) {
      const properties: CreatePageBodyParameters = {
        name: {
          title: [
            {
              text: {
                content: user.name as string,
              },
            },
          ],
        },
        email: {
          email: user.email as string,
        },
      };
      if (user.verifiedEmail) {
        properties.emailVerified = {
          number: (user.emailVerified as Date)?.getTime() ?? 0,
        };
      }
      if (user.image) {
        properties.image = {
          files: [
            {
              ...((user.image as string).includes("secure.notion-static.com")
                ? { file: { url: user.image as string }, type: "file" }
                : {
                    external: { url: user.image as string },
                    type: "external",
                  }),
              name: "avatar",
            },
          ],
        };
      }
      const createdUser = await throttledAPICall<U.Merge<CreatePageResponse>>(
        () =>
          client.pages.create({
            parent: { database_id: uuidFromID(USER_DB) },
            properties,
          })
      );
      const userProps = await getProperties(client, createdUser);
      if (!createdUser || !userProps) {
        throw new Error("Failed to create user");
      }
      return parseUser(createdUser.id, userProps) as AdapterUser;
    },
    async getUser(id) {
      const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
        client.pages.retrieve({
          page_id: uuidFromID(id),
        })
      );
      const userProps = await getProperties(client, user);
      if (!user || !userProps) return null;
      return parseUser(user?.id, userProps);
    },
    async getUserByEmail(email) {
      const users = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
      const userProps = await getProperties(client, user);
      if (!user || !userProps) return null;
      return parseUser(user?.id, userProps);
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
        client.databases.query({
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
      const userProps = await getProperties(client, user);
      if (!user || !userProps) return null;
      return parseUser(user?.id, userProps);
    },
    async updateUser(user) {
      const properties: CreatePageBodyParameters = {
        name: {
          title: [
            {
              text: {
                content: user.name as string,
              },
            },
          ],
        },
        email: {
          email: user.email as string,
        },
      };
      if (user.verifiedEmail) {
        properties.emailVerified = {
          number: (user.emailVerified as Date)?.getTime() ?? 0,
        };
      }
      if (user.image) {
        properties.image = {
          files: [
            {
              ...((user.image as string).includes("secure.notion-static.com")
                ? { file: { url: user.image as string }, type: "file" }
                : {
                    external: { url: user.image as string },
                    type: "external",
                  }),
              name: "avatar",
            },
          ],
        };
      }
      const updatedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(
        () =>
          client.pages.update({
            page_id: uuidFromID(user.id),
            properties,
          })
      );
      const userProps = await getProperties(client, updatedUser);
      if (!updatedUser || !userProps) {
        throw new Error("Failed to update user");
      }
      return parseUser(updatedUser?.id, userProps);
    },
    async deleteUser(userId) {
      const deletedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(
        () =>
          client.pages.update({
            page_id: uuidFromID(userId),
            archived: true,
          })
      );
      const userProps = await getProperties(client, deletedUser);
      if (!deletedUser || !userProps) return null;
      return parseUser(deletedUser?.id, userProps);
    },
    async linkAccount(account) {
      const properties: CreatePageBodyParameters = {
        userId: {
          relation: [{ id: account.userId }],
        },
        type: {
          select: {
            name: account.provider,
          },
        },
        provider: {
          rich_text: [{ text: { content: account.provider ?? "" } }],
        },
        providerAccountId: {
          title: [{ text: { content: account.providerAccountId ?? "" } }],
        },
      };
      if (account.refresh_token) {
        properties.refresh_token = {
          rich_text: [{ text: { content: account.refresh_token ?? "" } }],
        };
      }
      if (account.access_token) {
        properties.access_token = {
          rich_text: [{ text: { content: account.access_token ?? "" } }],
        };
      }
      if (account.access_token) {
        properties.expires_at = {
          number: account.expires_at ?? 0,
        };
      }
      if (account.token_type) {
        properties.token_type = {
          rich_text: [{ text: { content: account.token_type ?? "" } }],
        };
      }
      if (account.scope) {
        properties.scope = {
          rich_text: [{ text: { content: account.scope ?? "" } }],
        };
      }
      if (account.id_token) {
        properties.id_token = {
          rich_text: [{ text: { content: account.id_token ?? "" } }],
        };
      }
      if (account.session_state) {
        properties.session_state = {
          rich_text: [{ text: { content: account.session_state ?? "" } }],
        };
      }
      if (account.oauth_token_secret) {
        properties.oauth_token_secret = {
          rich_text: [
            { text: { content: (account.oauth_token_secret as string) ?? "" } },
          ],
        };
      }
      if (account.oauth_token) {
        properties.oauth_token = {
          rich_text: [
            { text: { content: (account.oauth_token as string) ?? "" } },
          ],
        };
      }
      const createdAccount = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: uuidFromID(ACCOUNT_DB) },
          properties,
        })
      );
      const accountProps = await getProperties(client, createdAccount);
      if (!createdAccount || !accountProps) {
        throw new Error("Failed to create account");
      }
      return await parseAccount(accountProps);
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: uuidFromID(ACCOUNT_DB),
          filter: {
            and: [
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
      if (account) {
        const deletedAccount = await throttledAPICall<
          U.Merge<UpdatePageResponse>
        >(() =>
          client.pages.update({
            page_id: uuidFromID(account.id),
            archived: true,
          })
        );
        console.log("Account has deleted", deletedAccount?.id);
      }
    },
    async createSession({ sessionToken, userId, expires }) {
      const createdSession = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: uuidFromID(SESSION_DB) },
          properties: {
            userId: {
              relation: [{ id: userId }],
            },
            expires: {
              number: (expires as Date)?.getTime() ?? 0,
            },
            sessionToken: {
              title: [{ text: { content: sessionToken } }],
            },
          },
        })
      );
      const sessionProps = await getProperties(client, createdSession);
      if (!createdSession || !sessionProps) {
        throw new Error("Failed to create account");
      }
      return parseSession(createdSession.id, sessionProps);
    },
    async getSessionAndUser(sessionToken) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
      const sessionProps = await getProperties(client, session);
      if (!session || !sessionProps) return null;
      const users = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
      const userProps = await getProperties(client, user);
      if (!user || !userProps) return null;
      return {
        session: parseSession(session.id, sessionProps),
        user: parseUser(user?.id, userProps),
      };
    },
    async updateSession({ sessionToken }) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
      const session = sessions?.results?.[0];
      if (!session) return null;
      const updatedSession = await throttledAPICall<
        U.Merge<UpdatePageResponse>
      >(() =>
        client.pages.update({
          page_id: uuidFromID(session.id),
          properties: {
            sessionToken: {
              title: [{ text: { content: sessionToken } }],
            },
          },
        })
      );
      const sessionProps = await getProperties(client, updatedSession);
      if (!updatedSession || !sessionProps) {
        throw new Error("Failed to update account");
      }
      return parseSession(updatedSession.id, sessionProps);
    },
    async deleteSession(sessionToken) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
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
      const session = sessions?.results?.[0];
      if (!session) return;
      const deletedSession = await throttledAPICall<UpdatePageResponse>(() =>
        client.pages.update({
          page_id: uuidFromID(session.id),
          archived: true,
        })
      );
      console.log("Account has deleted", deletedSession?.id);
    },
    async createVerificationToken({ identifier, expires, token }) {
      const createdVerificationToken = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: uuidFromID(VERIFICATION_TOKEN_DB) },
          properties: {
            identifier: {
              title: [{ text: { content: identifier } }],
            },
            expires: {
              number: (expires as Date)?.getTime() ?? 0,
            },
            token: {
              rich_text: [{ text: { content: token } }],
            },
          },
        })
      );
      const verificationTokenProps = await getProperties(
        client,
        createdVerificationToken
      );
      if (!createdVerificationToken || !verificationTokenProps) return null;
      return parseVerificationToken(verificationTokenProps);
    },
    async useVerificationToken({ identifier, token }) {
      const verificationTokens = await throttledAPICall<
        U.Merge<QueryDatabaseResponse>
      >(() =>
        client.databases.query({
          database_id: uuidFromID(VERIFICATION_TOKEN_DB),
          filter: {
            and: [
              {
                property: "identifier",
                title: {
                  contains: identifier,
                },
              },
              {
                property: "token",
                rich_text: {
                  contains: token,
                },
              },
            ],
          },
        })
      );
      const tokenToVerificate = verificationTokens
        ?.results?.[0] as QueryDatabaseResult;
      if (!tokenToVerificate) return null;
      await throttledAPICall<U.Merge<UpdatePageResponse>>(() =>
        client.pages.update({
          page_id: uuidFromID(tokenToVerificate.id),
          archived: true,
        })
      );
      const verificationTokenProps = await getProperties(
        client,
        tokenToVerificate
      );
      if (!tokenToVerificate || !verificationTokenProps) return null;
      return parseVerificationToken(verificationTokenProps);
    },
  };
}

function parseUser(
  id: string,
  user: Record<string, GetPagePropertyResponse>
): AdapterUser {
  const emailVerified = getProperty(user, "emailVerified", "number");
  return {
    id,
    name: richTextToPlainText(getProperty(user, "name", "title")),
    email: getProperty(user, "email", "email"),
    emailVerified: emailVerified ? new Date(emailVerified) : null,
    image: getFile(getProperty(user, "image", "files"))?.[0]?.url,
  };
}

function parseAccount(
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

function parseSession(
  id: string,
  session: Record<string, GetPagePropertyResponse>
): AdapterSession {
  const expires = getProperty(session, "expires", "number");
  return {
    id,
    userId: getProperty(session, "userId", "relation")?.id || "",
    expires: expires ? new Date(expires) : new Date(),
    sessionToken:
      richTextToPlainText(getProperty(session, "sessionToken", "title")) || "",
  };
}

function parseVerificationToken(
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

async function getProperties(
  client: Client,
  page: U.Merge<CreatePageResponse> | null | undefined
): Promise<Record<string, GetPagePropertyResponse> | null> {
  if (!page) return null;
  const props = await Promise.all(
    Object.values(page.properties).map((prop) =>
      throttledAPICall<GetPagePropertyResponse>(() =>
        client.pages.properties.retrieve({
          page_id: page.id,
          property_id: prop.id,
        })
      )
    )
  );
  const result = {} as Record<string, GetPagePropertyResponse>;
  Object.keys(page.properties).forEach((key, index) => {
    if (props[index]) {
      result[key] = props[index] as GetPagePropertyResponse;
    }
  });
  return result;
}
