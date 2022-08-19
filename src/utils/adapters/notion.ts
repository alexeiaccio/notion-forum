import type { Client } from '@notionhq/client'
import type {
  CreatePageResponse,
  GetPageResponse,
  QueryDatabaseResponse,
  UpdatePageResponse,
} from '@notionhq/client/build/src/api-endpoints'
import type { Adapter, AdapterUser } from 'next-auth/adapters'
import type { F, U } from 'ts-toolbelt'
import { env } from '../../server/env'
import {
  parseAccount,
  parseSession,
  parseUser,
  parseVerificationToken,
} from '../notion/api'
import { getProperties, throttledAPICall, idFromUUID } from '../notion/utils'

const USER_DB = env.NOTION_USER_DB_ID!
const ACCOUNT_DB = env.NOTION_ACCOUNT_DB_ID!
const SESSION_DB = env.NOTION_SESSION_DB_ID!
const VERIFICATION_TOKEN_DB = env.NOTION_VERIFICATION_TOKEN_DB_ID!

type CreatePageBodyParameters = F.Parameters<
  typeof Client['prototype']['pages']['create']
>[0]['properties']

type QueryDatabaseResult = U.Merge<QueryDatabaseResponse['results'][0]>

export default function NotionAdapter(client: Client, options = {}): Adapter {
  return {
    async createUser(user) {
      const properties: CreatePageBodyParameters = {
        name: {
          title: [
            {
              text: {
                content:
                  (user.name as string) ?? (user.email as string).split('@')[0],
              },
            },
          ],
        },
        email: {
          email: user.email as string,
        },
      }
      if (user.verifiedEmail) {
        properties.emailVerified = {
          number: (user.emailVerified as Date)?.getTime() ?? 0,
        }
      }
      if (user.image) {
        properties.image = {
          files: [
            {
              ...((user.image as string).includes('secure.notion-static.com')
                ? { file: { url: user.image as string }, type: 'file' }
                : {
                    external: { url: user.image as string },
                    type: 'external',
                  }),
              name: 'avatar',
            },
          ],
        }
      }
      const createdUser = await throttledAPICall<U.Merge<CreatePageResponse>>(
        () =>
          client.pages.create({
            parent: { database_id: idFromUUID(USER_DB) },
            properties,
          }),
      )
      const userProps = await getProperties(client, { page: createdUser })
      if (!createdUser || !userProps) {
        throw new Error('Failed to create user')
      }
      return parseUser(createdUser.id, userProps) as AdapterUser
    },
    async getUser(id) {
      const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
        client.pages.retrieve({
          page_id: idFromUUID(id),
        }),
      )
      const userProps = await getProperties(client, { page: user })
      if (!user || !userProps) return null
      return parseUser(user?.id, userProps)
    },
    async getUserByEmail(email) {
      const users = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(USER_DB),
          filter: {
            and: [
              {
                property: 'email',
                email: {
                  equals: email,
                },
              },
            ],
          },
        }),
      )
      const user = users?.results?.[0] as U.Merge<
        QueryDatabaseResponse['results'][0]
      >
      const userProps = await getProperties(client, { page: user })
      if (!user || !userProps) return null
      return parseUser(user?.id, userProps)
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(ACCOUNT_DB),
          filter: {
            and: [
              {
                property: 'provider',
                rich_text: {
                  contains: provider,
                },
              },
              {
                property: 'providerAccountId',
                title: {
                  contains: providerAccountId,
                },
              },
            ],
          },
        }),
      )
      const account = accounts?.results?.[0]
      if (!account) return null
      const users = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(USER_DB),
          filter: {
            and: [
              {
                property: 'accounts',
                relation: {
                  contains: idFromUUID(account.id),
                },
              },
            ],
          },
        }),
      )
      const user = users?.results?.[0] as U.Merge<
        QueryDatabaseResponse['results'][0]
      >
      const userProps = await getProperties(client, { page: user })
      if (!user || !userProps) return null
      return parseUser(user?.id, userProps)
    },
    async updateUser(user) {
      // const properties: CreatePageBodyParameters = {
      //   name: {
      //     title: [
      //       {
      //         text: {
      //           content: (user.name as string) || '',
      //         },
      //       },
      //     ],
      //   },
      //   email: {
      //     email: user.email as string,
      //   },
      // }
      // if (user.verifiedEmail) {
      //   properties.emailVerified = {
      //     number: (user.emailVerified as Date)?.getTime() ?? 0,
      //   }
      // }
      // if (user.image) {
      //   properties.image = {
      //     files: [
      //       {
      //         ...((user.image as string).includes('secure.notion-static.com')
      //           ? { file: { url: user.image as string }, type: 'file' }
      //           : {
      //               external: { url: user.image as string },
      //               type: 'external',
      //             }),
      //         name: 'avatar',
      //       },
      //     ],
      //   }
      // }
      // const updatedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(
      //   () =>
      //     client.pages.update({
      //       page_id: uuidFromID(user.id),
      //       properties,
      //     }),
      // )
      // const userProps = await getProperties(client, { page: updatedUser })
      // if (!updatedUser || !userProps) {
      //   throw new Error('Failed to update user')
      // }
      return user as AdapterUser
    },
    async deleteUser(userId) {
      const deletedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(
        () =>
          client.pages.update({
            page_id: idFromUUID(userId),
            archived: true,
          }),
      )
      const userProps = await getProperties(client, { page: deletedUser })
      if (!deletedUser || !userProps) return null
      return parseUser(deletedUser?.id, userProps)
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
          rich_text: [{ text: { content: account.provider ?? '' } }],
        },
        providerAccountId: {
          title: [{ text: { content: account.providerAccountId ?? '' } }],
        },
      }
      if (account.refresh_token) {
        properties.refresh_token = {
          rich_text: [{ text: { content: account.refresh_token ?? '' } }],
        }
      }
      if (account.access_token) {
        properties.access_token = {
          rich_text: [{ text: { content: account.access_token ?? '' } }],
        }
      }
      if (account.access_token) {
        properties.expires_at = {
          number: account.expires_at ?? 0,
        }
      }
      if (account.token_type) {
        properties.token_type = {
          rich_text: [{ text: { content: account.token_type ?? '' } }],
        }
      }
      if (account.scope) {
        properties.scope = {
          rich_text: [{ text: { content: account.scope ?? '' } }],
        }
      }
      if (account.id_token) {
        properties.id_token = {
          rich_text: [{ text: { content: account.id_token ?? '' } }],
        }
      }
      if (account.session_state) {
        properties.session_state = {
          rich_text: [{ text: { content: account.session_state ?? '' } }],
        }
      }
      if (account.oauth_token_secret) {
        properties.oauth_token_secret = {
          rich_text: [
            { text: { content: (account.oauth_token_secret as string) ?? '' } },
          ],
        }
      }
      if (account.oauth_token) {
        properties.oauth_token = {
          rich_text: [
            { text: { content: (account.oauth_token as string) ?? '' } },
          ],
        }
      }
      const createdAccount = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: idFromUUID(ACCOUNT_DB) },
          properties,
        }),
      )
      const accountProps = await getProperties(client, { page: createdAccount })
      if (!createdAccount || !accountProps) {
        throw new Error('Failed to create account')
      }
      return await parseAccount(accountProps)
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(ACCOUNT_DB),
          filter: {
            and: [
              {
                property: 'providerAccountId',
                title: {
                  contains: providerAccountId,
                },
              },
            ],
          },
        }),
      )
      const account = accounts?.results?.[0]
      if (account) {
        const deletedAccount = await throttledAPICall<
          U.Merge<UpdatePageResponse>
        >(() =>
          client.pages.update({
            page_id: idFromUUID(account.id),
            archived: true,
          }),
        )
        console.log('Account has deleted', deletedAccount?.id)
      }
    },
    async createSession({ sessionToken, userId, expires }) {
      const createdSession = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: idFromUUID(SESSION_DB) },
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
        }),
      )
      const sessionProps = await getProperties(client, { page: createdSession })
      if (!createdSession || !sessionProps) {
        throw new Error('Failed to create account')
      }
      return parseSession(createdSession.id, sessionProps)
    },
    async getSessionAndUser(sessionToken) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(SESSION_DB),
          filter: {
            and: [
              {
                property: 'sessionToken',
                title: { contains: sessionToken },
              },
            ],
          },
        }),
      )
      const session = sessions?.results?.[0] as QueryDatabaseResult
      const sessionProps = await getProperties(client, { page: session })
      if (!session || !sessionProps) return null
      const users = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(USER_DB),
          filter: {
            and: [
              {
                property: 'sessions',
                relation: { contains: idFromUUID(session.id) },
              },
            ],
          },
        }),
      )
      const user = users?.results?.[0] as QueryDatabaseResult
      const userProps = await getProperties(client, { page: user })
      if (!user || !userProps) return null
      return {
        session: parseSession(session.id, sessionProps),
        user: parseUser(user?.id, userProps),
      }
    },
    async updateSession({ sessionToken }) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(SESSION_DB),
          filter: {
            and: [
              {
                property: 'sessionToken',
                title: { contains: sessionToken },
              },
            ],
          },
        }),
      )
      const session = sessions?.results?.[0]
      if (!session) return null
      const updatedSession = await throttledAPICall<
        U.Merge<UpdatePageResponse>
      >(() =>
        client.pages.update({
          page_id: idFromUUID(session.id),
          properties: {
            sessionToken: {
              title: [{ text: { content: sessionToken } }],
            },
          },
        }),
      )
      const sessionProps = await getProperties(client, { page: updatedSession })
      if (!updatedSession || !sessionProps) {
        throw new Error('Failed to update account')
      }
      return parseSession(updatedSession.id, sessionProps)
    },
    async deleteSession(sessionToken) {
      const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
        client.databases.query({
          database_id: idFromUUID(SESSION_DB),
          filter: {
            and: [
              {
                property: 'sessionToken',
                title: { contains: sessionToken },
              },
            ],
          },
        }),
      )
      const session = sessions?.results?.[0]
      if (!session) return
      const deletedSession = await throttledAPICall<UpdatePageResponse>(() =>
        client.pages.update({
          page_id: idFromUUID(session.id),
          archived: true,
        }),
      )
      console.log('Account has deleted', deletedSession?.id)
    },
    async createVerificationToken({ identifier, expires, token }) {
      const createdVerificationToken = await throttledAPICall<
        U.Merge<CreatePageResponse>
      >(() =>
        client.pages.create({
          parent: { database_id: idFromUUID(VERIFICATION_TOKEN_DB) },
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
        }),
      )
      const verificationTokenProps = await getProperties(client, {
        page: createdVerificationToken,
      })
      if (!createdVerificationToken || !verificationTokenProps) return null
      return parseVerificationToken(verificationTokenProps)
    },
    async useVerificationToken({ identifier, token }) {
      const verificationTokens = await throttledAPICall<
        U.Merge<QueryDatabaseResponse>
      >(() =>
        client.databases.query({
          database_id: idFromUUID(VERIFICATION_TOKEN_DB),
          filter: {
            and: [
              {
                property: 'identifier',
                title: {
                  contains: identifier,
                },
              },
              {
                property: 'token',
                rich_text: {
                  contains: token,
                },
              },
            ],
          },
        }),
      )
      const tokenToVerificate = verificationTokens
        ?.results?.[0] as QueryDatabaseResult
      if (!tokenToVerificate) return null
      // TODO find a way to delete the token
      // await throttledAPICall<U.Merge<UpdatePageResponse>>(() =>
      //   client.pages.update({
      //     page_id: uuidFromID(tokenToVerificate.id),
      //     archived: true,
      //   }),
      // )
      const verificationTokenProps = await getProperties(client, {
        page: tokenToVerificate,
      })
      if (!tokenToVerificate || !verificationTokenProps) return null
      return parseVerificationToken(verificationTokenProps)
    },
  }
}
