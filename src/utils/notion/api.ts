import { Client, LogLevel } from '@notionhq/client'
import {
  BlockObjectResponse,
  CreateDatabaseResponse,
  CreatePageResponse,
  GetBlockResponse,
  GetPagePropertyResponse,
  GetPageResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDatabaseResponse,
  UpdateBlockResponse,
  UpdatePageResponse,
} from '@notionhq/client/build/src/api-endpoints'
import type { Account } from 'next-auth'
import { VerificationToken } from 'next-auth/adapters'
import { ProviderType } from 'next-auth/providers'
import invariant from 'tiny-invariant'
import { U } from 'ts-toolbelt'
import { nil, NonNil } from 'tsdef'
import { env } from '../../server/env'
import { notion, notionVersion } from './client'
import {
  BotType,
  ChildrenType,
  ContentAndCommentsType,
  ContentType,
  LikesType,
  PageLikesType,
  PagesList,
  ParagraphType,
  PublishedType,
  RawPageType,
  RelationType,
  RichTextRequestSchema,
  SpaceType,
} from './types'
import {
  getFile,
  getProperties,
  getPropertiesList,
  getProperty,
  getPropertyItem,
  idFromUUID,
  parseMention,
  parseRichText,
  richTextBlockToPlainText,
  richTextToPlainText,
  throttledAPICall,
} from './utils'

type QueryDatabaseResult = U.Merge<QueryDatabaseResponse['results'][0]>

const USER_DB = env.NOTION_USER_DB_ID
const ACCOUNT_DB = env.NOTION_ACCOUNT_DB_ID
const SESSION_DB = env.NOTION_SESSION_DB_ID
const ROLE_DB = env.NOTION_ROLE_DB_ID
const SPACE_DB = env.NOTION_SPACE_DB_ID
const PAGE_DB = env.NOTION_PAGE_DB_ID
const LIKE_DB = env.NOTION_LIKE_DB_ID

// #region Auth

export async function getUser(id: string) {
  const user = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: idFromUUID(id),
    }),
  )
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return parseUser(user?.id, userProps)
}

export async function getUserByEmail(email: string) {
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
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
    notion.databases.query({
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
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return parseUser(user?.id, userProps)
}

export async function getSessionAndUser(sessionToken: string) {
  const sessions = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
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
  const sessionProps = await getProperties(notion, { page: session })
  if (!session || !sessionProps) return null
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
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
  const userProps = await getProperties(notion, { page: user })
  if (!user || !userProps) return null
  return {
    session: parseSession(session.id, sessionProps),
    user: parseUser(user?.id, userProps),
  }
}

export function parseUser(
  id: string,
  user: Record<string, GetPagePropertyResponse>,
) {
  const emailVerified = getProperty(user, 'emailVerified', 'number')
  const image = getFile(getProperty(user, 'image', 'files'))?.[0]?.url ?? null
  return {
    id,
    name: richTextToPlainText(getProperty(user, 'name', 'title')),
    email: getProperty(user, 'email', 'email'),
    emailVerified: emailVerified ? new Date(emailVerified) : null,
    image: image ? new URL(image).pathname : null,
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

// #region User

export async function getUserInfo(id: string | nil) {
  const [user, blocks] = await Promise.all([
    throttledAPICall<U.Merge<GetPageResponse>>(() =>
      notion.pages.retrieve({
        page_id: idFromUUID(id),
      }),
    ),
    throttledAPICall<U.Merge<ListBlockChildrenResponse>>(() =>
      notion.blocks.children.list({
        block_id: idFromUUID(id),
      }),
    ),
  ])
  if (!user?.properties.name?.id || !blocks) return null
  const userProps = await getProperties(notion, {
    page: user,
    pick: ['name', 'image'],
  })
  if (!userProps) return null
  const image =
    getFile(getProperty(userProps, 'image', 'files'))?.[0]?.url ?? null
  return {
    id: user.id,
    name: richTextToPlainText(getProperty(userProps, 'name', 'title')),
    image: image ? new URL(image).pathname : null,
    bio: parseBlocks(blocks.results as BlockObjectResponse[])?.content,
  }
}

export async function updateUserName(id: string | nil, name: string) {
  if (!id) return null
  const updatedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(() =>
    notion.pages.update({
      page_id: idFromUUID(id),
      properties: {
        name: {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
      },
    }),
  )
  const userProps = await getProperties(notion, {
    page: updatedUser,
    pick: ['name'],
  })
  if (!updatedUser || !userProps) {
    throw new Error('Failed to update user')
  }
  return parseUser(updatedUser?.id, userProps).name
}

export async function updateUserImage(id: string | nil, url: string) {
  if (!id) return null
  const updatedUser = await throttledAPICall<U.Merge<UpdatePageResponse>>(() =>
    notion.pages.update({
      page_id: idFromUUID(id),
      properties: {
        image: {
          files: [
            {
              ...(url.includes('secure.notion-static.com')
                ? { file: { url }, type: 'file' }
                : {
                    external: { url },
                    type: 'external',
                  }),
              name: 'avatar',
            },
          ],
        },
      },
    }),
  )
  const userProps = await getProperties(notion, {
    page: updatedUser,
    pick: ['image'],
  })
  if (!updatedUser || !userProps) {
    throw new Error('Failed to update user')
  }
  return parseUser(updatedUser?.id, userProps).image
}

export async function updateUserInfo(
  id: string | nil,
  children: ParagraphType,
) {
  if (!id) return null
  const existingInfo = await getUserInfo(id)
  if (existingInfo?.bio) {
    const updatedInfo = await Promise.all(
      existingInfo.bio.map((block, idx) =>
        throttledAPICall<U.Merge<UpdateBlockResponse>>(() =>
          notion.blocks.update({ block_id: block.id, ...children[idx] }),
        ),
      ),
    )
    if (children.length > existingInfo.bio.length) {
      const appendedInfo = await throttledAPICall<
        U.Merge<ListBlockChildrenResponse>
      >(() =>
        notion.blocks.children.append({
          block_id: id,
          children: children.slice(existingInfo.bio!.length),
        }),
      )
      updatedInfo.push(
        ...(appendedInfo.results as U.Merge<UpdateBlockResponse>[]),
      )
    }
    if (!updatedInfo) return null
    return updatedInfo.flatMap(
      (block) => parseBlocks([block as BlockObjectResponse])?.content || [],
    )
  }
  const newInfo = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () => notion.blocks.children.append({ block_id: id, children }),
  )
  if (!newInfo) return null
  return parseBlocks(newInfo.results as BlockObjectResponse[])?.content
}

export async function getRole(userId: string) {
  const roles = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: idFromUUID(ROLE_DB),
      filter: {
        and: [
          {
            property: 'users',
            relation: {
              contains: idFromUUID(userId),
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

export async function getSpace(userId: string) {
  const spaces = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: idFromUUID(SPACE_DB),
      filter: {
        and: [
          {
            property: 'userId',
            relation: {
              contains: idFromUUID(userId),
            },
          },
        ],
      },
    }),
  )
  const space = spaces?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  const spaceProps = await getProperties(notion, { page: space })
  if (!space || !spaceProps) return null
  return {
    id: space?.id,
    ...parseSpace(spaceProps),
  }
}

export async function connectSpace(callback: BotType) {
  const users = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: idFromUUID(USER_DB),
      filter: {
        and: [
          {
            property: 'email',
            email: {
              equals: callback.owner.user.person.email,
            },
          },
        ],
      },
    }),
  )
  const user = users?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  if (!user) {
    throw new Error('Failed to get user')
  }
  const account = await throttledAPICall<U.Merge<CreatePageResponse>>(() =>
    notion.pages.create({
      parent: { database_id: idFromUUID(ACCOUNT_DB) },
      properties: {
        userId: {
          relation: [{ id: user.id }],
        },
        type: {
          select: { name: 'notion' },
        },
        provider: {
          rich_text: [{ text: { content: callback.bot_id } }],
        },
        providerAccountId: {
          title: [{ text: { content: callback.owner.user.id } }],
        },
        access_token: {
          rich_text: [{ text: { content: callback.access_token } }],
        },
      },
    }),
  )
  if (!account) {
    throw new Error('Failed to create account')
  }
  const createdSpace = await throttledAPICall<U.Merge<CreatePageResponse>>(() =>
    notion.pages.create({
      parent: { database_id: idFromUUID(SPACE_DB) },
      properties: {
        spaceId: {
          title: [{ text: { content: callback.workspace_id } }],
        },
        userId: {
          relation: [{ id: user.id }],
        },
        accountId: {
          relation: [{ id: account.id }],
        },
      },
    }),
  )
  const spaceProps = await getProperties(notion, { page: createdSpace })
  if (!createdSpace || !spaceProps) {
    throw new Error('Failed to create space')
  }
  return {
    id: createdSpace?.id,
    ...parseSpace(spaceProps),
  }
}

export async function getNotionBot(userId: string): Promise<Client> {
  const accounts = await throttledAPICall<U.Merge<QueryDatabaseResponse>>(() =>
    notion.databases.query({
      database_id: idFromUUID(ACCOUNT_DB),
      filter: {
        and: [
          {
            property: 'userId',
            relation: {
              contains: userId,
            },
          },
        ],
      },
    }),
  )
  const account = accounts?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  if (!account) {
    throw new Error('Failed to get account')
  }
  const accountProps = await getProperties(notion, {
    page: account,
    pick: ['access_token'],
  })
  const token = richTextToPlainText(
    getProperty(accountProps, 'access_token', 'rich_text'),
  )
  if (!token) {
    throw new Error('Failed to get account')
  }
  const notionBot = new Client({
    auth: token,
    notionVersion,
    logLevel: LogLevel.ERROR,
  })
  return notionBot
}

export async function connectPage(
  id: string,
  pageId: string,
  userId: string,
): Promise<SpaceType | null> {
  const notionBot = await getNotionBot(userId)
  const connectedPage = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notionBot.pages.retrieve({
      page_id: idFromUUID(pageId),
    }),
  )
  if (!connectedPage) {
    throw new Error('Page not found')
  }
  const updatedSpaceWithPage = await throttledAPICall<
    U.Merge<UpdatePageResponse>
  >(() =>
    notion.pages.update({
      page_id: idFromUUID(id),
      properties: {
        pageId: {
          rich_text: [{ text: { content: pageId } }],
        },
      },
    }),
  )
  if (!updatedSpaceWithPage) {
    throw new Error('Cannot connect page')
  }
  const pageProps = await getProperties(notion, {
    page: updatedSpaceWithPage,
    pick: ['tableId'],
  })
  if (richTextToPlainText(getProperty(pageProps, 'tableId', 'rich_text'))) {
    const spaceWithPageProps = await getProperties(notion, {
      page: updatedSpaceWithPage,
    })
    if (!spaceWithPageProps) {
      throw new Error('Cannot get properties for space')
    }
    return {
      id: updatedSpaceWithPage?.id,
      ...parseSpace(spaceWithPageProps),
    }
  }
  const children = await await throttledAPICall<
    U.Merge<ListBlockChildrenResponse>
  >(() =>
    notionBot.blocks.children.list({
      block_id: idFromUUID(connectedPage.id),
    }),
  )
  let table: string | undefined = (
    children.results as BlockObjectResponse[]
  ).find(
    (block) =>
      block.type === 'child_database' &&
      block.child_database.title === 'Drafts',
  )?.id
  if (!table) {
    const createdTable = await throttledAPICall<
      U.Merge<CreateDatabaseResponse>
    >(() =>
      notionBot.databases.create({
        parent: { type: 'page_id', page_id: idFromUUID(connectedPage.id) },
        title: [{ text: { content: 'Drafts' } }],
        properties: {
          title: { type: 'title', title: {} },
          tags: { type: 'multi_select', multi_select: { options: [] } },
          published: { type: 'rich_text', rich_text: {} },
        },
      }),
    )
    if (createdTable) {
      table = createdTable.id
    }
  }
  if (!table) {
    throw new Error('Table not created')
  }
  const updatedSpaceWithTable = await throttledAPICall<
    U.Merge<UpdatePageResponse>
  >(() =>
    notion.pages.update({
      page_id: idFromUUID(id),
      properties: {
        tableId: {
          rich_text: [{ text: { content: table! } }],
        },
      },
    }),
  )
  if (!updatedSpaceWithTable) {
    throw new Error('Failed to update space')
  }
  const spaceWithTableProps = await getProperties(notion, {
    page: updatedSpaceWithPage,
  })
  if (!spaceWithTableProps) {
    throw new Error('Cannot get properties for space')
  }
  return {
    id: updatedSpaceWithPage?.id,
    ...parseSpace(spaceWithTableProps),
  }
}

export async function getDraftsTable(userId: string): Promise<string> {
  const spaces = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: idFromUUID(SPACE_DB),
      filter: {
        and: [
          {
            property: 'userId',
            relation: {
              contains: idFromUUID(userId),
            },
          },
        ],
      },
    }),
  )
  const space = spaces?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  const spaceProps = await getProperties(notion, {
    page: space,
    pick: ['tableId'],
  })
  const tableId = richTextToPlainText(
    getProperty(spaceProps, 'tableId', 'rich_text'),
  )
  invariant(tableId, 'Failed to get space')
  return tableId
}

export async function getDraftsList(
  userId: string,
  cursor?: string | nil,
  filter?: {
    author?: string | nil
  },
): Promise<PagesList> {
  const notionBot = await getNotionBot(userId)
  const tableId = await getDraftsTable(userId)
  const pages = await throttledAPICall<U.Merge<QueryDatabaseResponse>>(() =>
    notionBot.databases.query({
      database_id: idFromUUID(tableId),
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 10,
      start_cursor: cursor || undefined,
      ...(filter
        ? {
            filter: {
              or: [
                {
                  property: 'authors',
                  relation: { contains: idFromUUID(filter.author) },
                },
              ],
            },
          }
        : {}),
    }),
  )
  const results = await Promise.all(
    (pages.results as PageObjectResponse[]).map(async (page) => {
      const pageProps = await getProperties(notionBot, { page })
      return {
        id: idFromUUID(page.id),
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

export async function getDraft(
  userId: string,
  id: string | undefined,
): Promise<RawPageType | null> {
  const notionBot = await getNotionBot(userId)
  const page = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notionBot.pages.retrieve({
      page_id: idFromUUID(id),
    }),
  )
  if (!page) return null
  const pageProps = await getProperties(notionBot, { page })
  return {
    id: idFromUUID(page.id),
    created: page.created_time,
    updated: page.last_edited_time,
    ...parsePage(pageProps),
  }
}

export async function getDraftContent(
  userId: string,
  id: string | nil,
): Promise<ContentType[] | nil> {
  const notionBot = await getNotionBot(userId)
  const blocks = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () =>
      notionBot.blocks.children.list({
        block_id: idFromUUID(id),
      }),
  )
  return parseBlocks(blocks.results as BlockObjectResponse[]).content
}

export async function createDraft(
  userId: string,
  children: ChildrenType,
  title?: string | nil,
): Promise<RawPageType | null> {
  const notionBot = await getNotionBot(userId)
  const tableId = await getDraftsTable(userId)
  const page = await throttledAPICall<U.Merge<CreatePageResponse>>(() =>
    notionBot.pages.create({
      parent: { type: 'database_id', database_id: idFromUUID(tableId) },
      properties: {
        title: [
          { text: { content: title || `Draft: ${new Date().toISOString()}` } },
        ],
      },
      children,
    }),
  )
  if (!page) return null
  const pageProps = await getProperties(notionBot, { page })
  return {
    id: idFromUUID(page.id),
    created: page.created_time,
    updated: page.last_edited_time,
    ...parsePage(pageProps),
  }
}

export async function publishDraft(
  userId: string,
  id: string | nil,
): Promise<string | nil> {
  const notionBot = await getNotionBot(userId)
  const page = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notionBot.pages.retrieve({
      page_id: idFromUUID(id),
    }),
  )
  invariant(page, 'Draft not found')
  const pageProps = await getProperties(notionBot, { page, pick: ['title'] })
  const blocks = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () =>
      notionBot.blocks.children.list({
        block_id: idFromUUID(id),
      }),
  )
  const createdPage = await throttledAPICall<U.Merge<CreatePageResponse>>(() =>
    notion.pages.create({
      parent: { type: 'database_id', database_id: PAGE_DB },
      properties: {
        title: {
          title: [
            {
              text: {
                content:
                  getProperty(pageProps, 'title', 'title')?.plain_text ||
                  'No title',
              },
            },
          ],
        },
        authors: {
          relation: [{ id: idFromUUID(userId) }],
        },
      },
      children: [
        {
          synced_block: {
            synced_from: null,
            children: (
              blocks.results as BlockObjectResponse[]
            ).reduce<ChildrenType>((acc, block) => {
              switch (block.type) {
                case 'paragraph':
                  acc.push({
                    paragraph: {
                      rich_text: block.paragraph
                        .rich_text as RichTextRequestSchema[],
                      color: block.paragraph.color,
                    },
                  })
                  break
                case 'heading_3':
                  acc.push({
                    heading_3: {
                      rich_text: block.heading_3
                        .rich_text as RichTextRequestSchema[],
                      color: block.heading_3.color,
                    },
                  })
                  break
                default:
                  break
              }
              return acc
            }, []),
          },
        },
      ],
    }),
  )
  invariant(createdPage, 'Page not created')
  notion.pages.create({
    parent: { type: 'database_id', database_id: LIKE_DB },
    properties: {
      title: {
        title: [
          {
            text: {
              content: idFromUUID(createdPage.id),
            },
          },
        ],
      },
      pageId: {
        relation: [{ id: idFromUUID(createdPage.id) }],
      },
    },
  })
  const updatedPage = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notionBot.pages.update({
      page_id: idFromUUID(id),
      properties: {
        published: {
          rich_text: [{ text: { content: createdPage.id } }],
        },
      },
    }),
  )
  invariant(updatedPage, 'Draft not updated')
  return createdPage?.id
}

export async function getPublished(id: string): Promise<PublishedType | nil> {
  const page = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: idFromUUID(id),
    }),
  )
  const pageProps = await getProperties(notion, {
    page,
    pick: ['published'],
  })
  return {
    published: idFromUUID(
      richTextToPlainText(getProperty(pageProps, 'published', 'rich_text')),
    ),
  }
}

export async function getLikes(
  userId: string,
  id: string,
): Promise<LikesType | null> {
  const likes = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: LIKE_DB,
      filter: {
        and: [
          {
            property: 'pageId',
            relation: { contains: idFromUUID(id) },
          },
          {
            or: [
              {
                property: 'likes',
                relation: { contains: idFromUUID(userId) },
              },
              {
                property: 'dislikes',
                relation: { contains: idFromUUID(userId) },
              },
            ],
          },
        ],
      },
    }),
  )
  const page = likes?.results?.[0] as U.Merge<
    QueryDatabaseResponse['results'][0]
  >
  const likesProps = await getProperties(notion, {
    page,
    pick: ['likes', 'dislikes'],
  })
  if (!page || !likesProps) return null
  return {
    like: getPropertiesList(likesProps, 'likes', 'relation').some(
      (item) => idFromUUID(item.id) === idFromUUID(userId),
    ),
    dislike: getPropertiesList(likesProps, 'dislikes', 'relation').some(
      (item) => idFromUUID(item.id) === idFromUUID(userId),
    ),
  }
}

export async function postLike(
  userId: string,
  id: string,
  action: 'likes' | 'dislikes',
): Promise<LikesType | null> {
  const likes = await throttledAPICall<QueryDatabaseResponse>(() =>
    notion.databases.query({
      database_id: LIKE_DB,
      filter: {
        or: [
          {
            property: 'pageId',
            relation: { contains: idFromUUID(id) },
          },
        ],
      },
    }),
  )
  invariant(likes?.results?.[0], 'Not likes for this page') // TODO make page item in Like DB
  const page = likes.results[0] as U.Merge<QueryDatabaseResponse['results'][0]>
  const likesProps = await getProperties(notion, {
    page,
    pick: [action],
  })
  if (!page || !likesProps) return null
  const updatedLikes = await throttledAPICall<UpdatePageResponse>(() =>
    notion.pages.update({
      page_id: idFromUUID(page.id),
      properties: {
        [action]: {
          relation: [
            ...getPropertiesList(likesProps, action, 'relation'),
            { id: idFromUUID(userId) },
          ],
        },
      },
    }),
  )
  invariant(updatedLikes, 'Cannot post this like/dislike')
  return {
    like: action === 'likes',
    dislike: action === 'dislikes',
  }
}

// #endregion

// #region Page

export async function getPagesList(
  cursor?: string | nil,
  filter?: {
    author?: string | nil
  },
): Promise<PagesList> {
  const pages = await throttledAPICall<U.Merge<QueryDatabaseResponse>>(() =>
    notion.databases.query({
      database_id: idFromUUID(PAGE_DB),
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 10,
      start_cursor: cursor || undefined,
      ...(filter
        ? {
            filter: {
              or: [
                {
                  property: 'authors',
                  relation: { contains: idFromUUID(filter.author) },
                },
              ],
            },
          }
        : {}),
    }),
  )
  const results = await Promise.all(
    (pages.results as PageObjectResponse[]).map(async (page) => {
      const pageProps = await getProperties(notion, {
        page,
        skip: ['likeId', 'published'],
      })
      return {
        id: idFromUUID(page.id),
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
      page_id: idFromUUID(id),
    }),
  )
  if (!page) return null
  const pageProps = await getProperties(notion, {
    page,
    skip: ['likeId', 'published'],
  })
  return {
    id: idFromUUID(page.id),
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
      block_id: idFromUUID(id),
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
        block_id: idFromUUID(id),
      }),
  )
  if (!id || !blocks) return null
  if (
    blocks.results?.[0]?.object === 'block' &&
    'type' in blocks.results[0] &&
    blocks.results[0].type === 'synced_block'
  ) {
    const syncedBlocks = await throttledAPICall<
      U.Merge<ListBlockChildrenResponse>
    >(() =>
      notion.blocks.children.list({
        block_id: idFromUUID(blocks.results[0]?.id),
      }),
    )
    return {
      ...parseBlocks(blocks.results as BlockObjectResponse[]),
      ...parseBlocks(syncedBlocks.results as BlockObjectResponse[]),
    }
  }
  return parseBlocks(blocks.results as BlockObjectResponse[])
}

export async function postComment(
  blockId: string | nil,
  authorId: string,
  children: ChildrenType,
): Promise<ContentAndCommentsType | null> {
  const comment = await throttledAPICall<U.Merge<ListBlockChildrenResponse>>(
    () =>
      notion.blocks.children.append({
        block_id: idFromUUID(blockId),
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
              children,
            },
          },
        ],
      }),
  )
  if (!comment) return null
  return parseBlocks(comment.results as BlockObjectResponse[])
}

export async function getPageLikes(id: string | nil): Promise<PageLikesType> {
  const page = await throttledAPICall<U.Merge<GetPageResponse>>(() =>
    notion.pages.retrieve({
      page_id: idFromUUID(id),
    }),
  )
  const pageProps = await getProperties(notion, {
    page,
    pick: ['likes', 'dislikes'],
  })
  const parsedPage = parsePage(pageProps)
  return {
    likes: parsedPage?.likes ?? 0,
    dislikes: parsedPage?.dislikes ?? 0,
  }
}

// #endregion

// #region Parsers

export function parsePage(
  page: Record<string, GetPagePropertyResponse> | null,
): RawPageType | null {
  if (!page) return null
  let likes = 0
  let dislikes = 0
  const likesProp = getPropertyItem(page, 'likes', 'property_item')
  const dislikesProp = getPropertyItem(page, 'dislikes', 'property_item')
  if (likesProp?.type === 'rollup' && likesProp.rollup.type === 'number') {
    likes = likesProp.rollup.number ?? 0
  }
  if (
    dislikesProp?.type === 'rollup' &&
    dislikesProp.rollup.type === 'number'
  ) {
    dislikes = dislikesProp.rollup.number ?? 0
  }
  return {
    title: richTextToPlainText(getProperty(page, 'title', 'title')),
    authors: getPropertiesList(page, 'authors', 'relation'),
    tags: getPropertiesList(page, 'tags', 'relation'),
    likes,
    dislikes,
    published: idFromUUID(
      richTextToPlainText(getProperty(page, 'published', 'rich_text')),
    ),
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
            id: idFromUUID(block.id),
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
            id: idFromUUID(block.id),
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
            id: idFromUUID(block.id),
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
            id: idFromUUID(block.id),
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
            id: idFromUUID(block.id),
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
          page_id: idFromUUID(id),
        }),
      ),
    ),
  )
  const relationsProps = await Promise.all(
    relations.map((relation, idx) =>
      throttledAPICall<GetPagePropertyResponse>(() =>
        notion.pages.properties.retrieve({
          page_id: idFromUUID(relations[idx]?.id),
          property_id: relation.properties.name!.id,
        }),
      ),
    ),
  )
  return relationsProps.map((relation, idx) => ({
    id: idFromUUID(relations[idx]?.id) || null,
    name: richTextToPlainText(getProperty({ name: relation }, 'name', 'title')),
  }))
}

export function parseSpace(
  page: Record<string, GetPagePropertyResponse> | null,
): SpaceType | null {
  if (!page) return null
  return {
    spaceId: richTextToPlainText(getProperty(page, 'spaceId', 'title')),
    pageId: richTextToPlainText(getProperty(page, 'pageId', 'rich_text')),
    tableId: richTextToPlainText(getProperty(page, 'tableId', 'rich_text')),
    userId: getProperty(page, 'userId', 'relation')?.id,
    accountId: getProperty(page, 'accountId', 'relation')?.id,
  }
}

// #endregion
