import {
  BlockObjectResponse,
  GetBlockResponse,
  GetPagePropertyResponse,
  GetPageResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints'
import type { Account } from 'next-auth'
import { VerificationToken } from 'next-auth/adapters'
import { ProviderType } from 'next-auth/providers'
import { U } from 'ts-toolbelt'
import { env } from '../../server/env'
import { notion } from './client'
import {
  ContentAndCommentsType,
  PagesList,
  RawPageType,
  RelationType,
} from './types'
import {
  getFile,
  getProperties,
  getPropertiesList,
  getProperty,
  parseMention,
  parseRichText,
  richTextBlockToPlainText,
  richTextToPlainText,
  throttledAPICall,
  uuidFromID,
} from './utils'

type QueryDatabaseResult = U.Merge<QueryDatabaseResponse['results'][0]>
type nil = null | undefined
type NonNil<T> = T extends nil ? never : T

const USER_DB = env.NOTION_USER_DB_ID
const ACCOUNT_DB = env.NOTION_ACCOUNT_DB_ID
const SESSION_DB = env.NOTION_SESSION_DB_ID
const ROLE_DB = env.NOTION_ROLE_DB_ID
const PAGE_DB = env.NOTION_PAGE_DB_ID

// #region Auth

export async function getUser(id: string) {
  const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: uuidFromID(id),
    }),
  )
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return parseUser(user?.id, userProps)
}

export async function getUserByEmail(email: string) {
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
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
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return parseUser(user?.id, userProps)
}

export async function getUserByAccount({
  providerAccountId,
  provider,
}: {
  providerAccountId: string
  provider: string
}) {
  const accounts = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(ACCOUNT_DB),
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
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
      filter: {
        and: [
          {
            property: 'accounts',
            relation: {
              contains: uuidFromID(account.id),
            },
          },
        ],
      },
    }),
  )
  const user = users?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return parseUser(user?.id, userProps)
}

export async function getSessionAndUser(sessionToken: string) {
  const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(SESSION_DB),
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
  const sessionProps = await getProperties(notion, { page: session })
  if (!session || !sessionProps) return null
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(USER_DB),
      filter: {
        and: [
          {
            property: 'sessions',
            relation: { contains: uuidFromID(session.id) },
          },
        ],
      },
    }),
  )
  const user = users?.results?.[0] as QueryDatabaseResult
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return {
    session: parseSession(session.id, sessionProps),
    user: parseUser(user?.id, userProps),
  }
}

export async function getUserName(id: string) {
  const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: uuidFromID(id),
    }),
  )
  if (!user?.properties.name?.id) return null
  const name = await throttledAPICall<GetPagePropertyResponse>(() =>
    notion.pages.properties.retrieve({
      page_id: uuidFromID(id),
      property_id: user.properties.name!.id,
    }),
  )
  if (!name) return null
  return richTextToPlainText(getProperty({ name }, 'name', 'title'))
}

export function parseUser(
  id: string,
  user: Record<string, GetPagePropertyResponse>,
) {
  const emailVerified = getProperty(user, 'emailVerified', 'number')
  return {
    id,
    name: richTextToPlainText(getProperty(user, 'name', 'title')),
    email: getProperty(user, 'email', 'email'),
    emailVerified: emailVerified ? new Date(emailVerified) : null,
    image: getFile(getProperty(user, 'image', 'files'))?.[0]?.url ?? null,
  }
}

export function parseSession(
  id: string,
  session: Record<string, GetPagePropertyResponse>,
) {
  const expires = getProperty(session, 'expires', 'number')
  return {
    id,
    userId: getProperty(session, 'userId', 'relation')?.id || '',
    expires: expires ? new Date(expires) : new Date(),
    sessionToken:
      richTextToPlainText(getProperty(session, 'sessionToken', 'title')) || '',
  }
}

export function parseAccount(
  account: Record<string, GetPagePropertyResponse>,
): Account {
  return {
    id: richTextToPlainText(getProperty(account, 'id', 'title')),
    userId: getProperty(account, 'userId', 'relation')?.id || '',
    type: (getProperty(account, 'type', 'select')?.name ||
      'oauth') as ProviderType,
    provider:
      richTextToPlainText(getProperty(account, 'provider', 'rich_text')) ?? '',
    providerAccountId:
      richTextToPlainText(getProperty(account, 'providerAccountId', 'title')) ??
      '',
    refresh_token:
      richTextToPlainText(getProperty(account, 'refresh_token', 'rich_text')) ??
      '',
    access_token:
      richTextToPlainText(getProperty(account, 'access_token', 'rich_text')) ??
      '',
    expires_at: getProperty(account, 'expires_at', 'number') || undefined,
    token_type:
      richTextToPlainText(getProperty(account, 'token_type', 'rich_text')) ||
      undefined,
    scope:
      richTextToPlainText(getProperty(account, 'scope', 'rich_text')) ||
      undefined,
    id_token:
      richTextToPlainText(getProperty(account, 'id_token', 'rich_text')) ||
      undefined,
    session_state:
      richTextToPlainText(getProperty(account, 'session_state', 'rich_text')) ||
      undefined,
    oauth_token_secret:
      richTextToPlainText(
        getProperty(account, 'oauth_token_secret', 'rich_text'),
      ) || undefined,
    oauth_token:
      richTextToPlainText(getProperty(account, 'oauth_token', 'rich_text')) ||
      undefined,
  }
}

export function parseVerificationToken(
  session: Record<string, GetPagePropertyResponse>,
): VerificationToken {
  const expires = getProperty(session, 'expires', 'number')
  return {
    identifier:
      richTextToPlainText(getProperty(session, 'identifier', 'title')) || '',
    expires: expires ? new Date(expires) : new Date(),
    token:
      richTextToPlainText(getProperty(session, 'token', 'rich_text')) || '',
  }
}

// #endregion

// #region Role

export async function getRole(userId: string) {
  const roles = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: uuidFromID(ROLE_DB),
      filter: {
        and: [
          {
            property: 'users',
            relation: {
              contains: uuidFromID(userId),
            },
          },
        ],
      },
    }),
  )
  const role = roles?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  const roleProps = await getProperties(notion, { page: role, pick: ['role'] })
  if (!role || !roleProps) return null
  return {
    id: role?.id,
    role: richTextToPlainText(getProperty(roleProps, 'role', 'title')),
  }
}

// #endregion

// #region Page

export async function getPagesList(cursor?: string | nil): Promise<PagesList> {
  const pages = await throttledAPICall<U.Merge<QueryDatabaseResponse>>(() =>
    notion.databases.query({
      database_id: uuidFromID(PAGE_DB),
      sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
      page_size: 10,
      start_cursor: cursor || undefined,
    }),
  )
  const results = await Promise.all(
    (pages.results as PageObjectResponse[]).map(async (page) => {
      const pageProps = await getProperties(notion, { page })
      return {
        id: uuidFromID(page.id),
        created: page.created_time,
        updated: page.last_edited_time,
        ...parsePage(pageProps),
      }
    }),
  )
  return {
    results,
    hasMore: pages.has_more,
    nextCursor: pages.next_cursor,
  }
}

export async function getPage(
  id: string | undefined,
): Promise<RawPageType | null> {
  const page = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: uuidFromID(id),
    }),
  )
  if (!page) return null
  const pageProps = await getProperties(notion, { page })
  return {
    id: uuidFromID(page.id),
    created: page.created_time,
    updated: page.last_edited_time,
    ...parsePage(pageProps),
  }
}

export async function getBlock(
  id: string | nil,
): Promise<NonNil<ContentAndCommentsType['comments']>[number] | null> {
  const block = await throttledAPICall<U.Merge<GetBlockResponse>>(() =>
    notion.blocks.retrieve({
      block_id: uuidFromID(id),
    }),
  )
  if (!block) return null
  return parseBlocks([block] as BlockObjectResponse[]).comments?.[0] || null
}

export async function getBlockChildren(
  id: string | nil,
): Promise<ContentAndCommentsType | null> {
  const blocks = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () =>
      notion.blocks.children.list({
        block_id: uuidFromID(id),
      }),
  )
  if (!id || !blocks) return null
  return parseBlocks(blocks.results as BlockObjectResponse[])
}

export async function postComment(
  blockId: string | nil,
  authorId: string,
  content: string,
): Promise<ContentAndCommentsType | null> {
  const comment = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () =>
      notion.blocks.children.append({
        block_id: uuidFromID(blockId),
        children: [
          {
            type: 'toggle',
            toggle: {
              rich_text: [
                {
                  type: 'mention',
                  mention: {
                    page: {
                      id: authorId,
                    },
                  },
                },
                {
                  type: 'mention',
                  mention: {
                    date: {
                      start: new Date().toISOString(),
                      end: null,
                      time_zone: null,
                    },
                  },
                },
              ],
              children: [
                {
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        type: 'text',
                        text: {
                          content,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }),
  )
  if (!comment) return null
  return parseBlocks(comment.results as BlockObjectResponse[])
}

// #endregion

// #region Parsers

export function parsePage(
  page: Record<string, GetPagePropertyResponse> | null,
): RawPageType | null {
  if (!page) return null
  return {
    title: richTextToPlainText(getProperty(page, 'title', 'title')),
    authors: getPropertiesList(page, 'authors', 'relation'),
    tags: getProperty(page, 'tags', 'multi_select'),
  }
}

export function parseBlocks(
  blocks: BlockObjectResponse[],
): ContentAndCommentsType {
  const content: ContentAndCommentsType['content'] = []
  const comments: ContentAndCommentsType['comments'] = []

  blocks.forEach((block) => {
    if ('type' in block) {
      switch (block.type) {
        case 'paragraph':
          content.push({
            id: uuidFromID(block.id),
            type: 'paragraph',
            created_time: block.created_time,
            edited_time: block.last_edited_time,
            rich_text: parseRichText(block.paragraph.rich_text),
            plain_text: richTextBlockToPlainText(block.paragraph.rich_text),
            color: block.paragraph.color,
          })
          break
        case 'heading_1':
          content.push({
            id: uuidFromID(block.id),
            type: 'h1',
            created_time: block.created_time,
            edited_time: block.last_edited_time,
            rich_text: parseRichText(block.heading_1.rich_text),
            plain_text: richTextBlockToPlainText(block.heading_1.rich_text),
            color: block.heading_1.color,
          })
          break
        case 'heading_2':
          content.push({
            id: uuidFromID(block.id),
            type: 'h2',
            created_time: block.created_time,
            edited_time: block.last_edited_time,
            rich_text: parseRichText(block.heading_2.rich_text),
            plain_text: richTextBlockToPlainText(block.heading_2.rich_text),
            color: block.heading_2.color,
          })
          break
        case 'heading_3':
          content.push({
            id: uuidFromID(block.id),
            type: 'h3',
            created_time: block.created_time,
            edited_time: block.last_edited_time,
            rich_text: parseRichText(block.heading_3.rich_text),
            plain_text: richTextBlockToPlainText(block.heading_3.rich_text),
            color: block.heading_3.color,
          })
          break
        case 'toggle':
          comments.push({
            id: uuidFromID(block.id),
            header: parseMention(block.toggle.rich_text),
          })
          break

        default:
          break
      }
    }
  })

  return { content, comments }
}

export async function getRelations(
  ids: { id?: string | nil }[] | nil = [],
): Promise<RelationType[] | null> {
  const relations = await Promise.all(
    (ids || []).map(({ id }) =>
      throttledAPICall<U.Merge<GetPageResponse>>(() =>
        notion.pages.retrieve({
          page_id: uuidFromID(id),
        }),
      ),
    ),
  )
  const relationsProps = await Promise.all(
    relations.map((relation, idx) =>
      throttledAPICall<GetPagePropertyResponse>(() =>
        notion.pages.properties.retrieve({
          page_id: uuidFromID(relations[idx]?.id),
          property_id: relation.properties.name!.id,
        }),
      ),
    ),
  )
  return relationsProps.map((relation, idx) => ({
    id: uuidFromID(relations[idx]?.id) || null,
    name: richTextToPlainText(getProperty({ name: relation }, 'name', 'title')),
  }))
}

// #endregion
