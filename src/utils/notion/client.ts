import { Client, LogLevel } from '@notionhq/client'
import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints'
import { env } from '../../server/env'
import { throttledAPICall, idFromUUID } from './utils'

export const notionVersion = '2022-06-28'

export const notion = new Client({
  auth: env.NOTION_KEY,
  notionVersion,
  logLevel: LogLevel.DEBUG,
})

// export const fetchAPI = (<T>() =>
//   throttledAPICall(async function fetchAPI<T>(url: string): Promise<T | undefined> {
//     let response;
//     try {
//       response = await fetch(`https://api.notion.com/v1${url}`, {
//         headers: {
//           Authorization: `Bearer ${env.NOTION_TOKEN}`,
//           "Notion-Version": notionVersion,
//         },
//       });
//     } catch (error) {
//       console.error(error);
//     }
//     if (response?.status !== 200) return;

//     return response.json();
//   }))();

// export const getDatabase = throttledAPICall(async function getDatabase(params: {
//   databaseId: string;
//   pageSize?: number | null;
//   filter?: QueryDatabaseParameters["filter"];
//   sorts?: QueryDatabaseParameters["sorts"];
//   cursor?: string | null;
// }) {
//   let response;
//   try {
//     response = await notion.databases.query({
//       database_id: uuidFromID(params.databaseId),
//       page_size: params.pageSize ?? 100,
//       filter: params.filter,
//       sorts: params.sorts,
//       start_cursor: params.cursor || undefined,
//     });
//   } catch (error) {
//     console.error(error);
//   }
//   return response;
// });

// export const getPage = throttledAPICall(async function getPage(pageId: string) {
//   let response;
//   try {
//     response = await notion.pages.retrieve({ page_id: uuidFromID(pageId) });
//   } catch (error) {
//     console.error(error);
//   }
//   return response;
// });

// export async function getPageProperty(
//   pageId: string | null | undefined,
//   propertyId: string | null | undefined
// ) {
//   if (!pageId || !propertyId) return;

//   let response;
//   try {
//     response = await notion.pages.properties.retrieve({
//       page_id: pageId,
//       property_id: propertyId,
//     });
//   } catch (error) {
//     console.error(error);
//   }
//   return response;
// }

// export const getBlocks = throttledAPICall(async function getBlocks(
//   blockId: string,
//   pageSize: number = 100
// ) {
//   let response;
//   try {
//     response = await notion.blocks.children.list({
//       block_id: uuidFromID(blockId),
//       page_size: pageSize ?? 100,
//     });
//   } catch (error) {
//     console.error(error);
//   }
//   return response?.results || [];
// });
