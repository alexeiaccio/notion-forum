import type { GetPagePropertyResponse } from "@notionhq/client/build/src/api-endpoints";
import pThrottle from "p-throttle";
import type { U } from "ts-toolbelt";

export const throttle = pThrottle({
  limit: 5,
  interval: 1000,
});


export async function throttledAPICall<T>(
  fn: (...args: any) => Promise<any>
): Promise<T | null> {
  try {
    const res = (await throttle(fn)()) as T;
    return res;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function uuidFromID(id: string | null | undefined): string {
  return id?.replace(/-/g, "") ?? "";
}

type Properties = Record<string, GetPagePropertyResponse>;
type Property = U.NonNullable<Properties[keyof Properties]>;
type List = Extract<Property, { object: "list" }>;
type File = {
  url: string;
  name: string;
};

export function getProperty<
  Props extends Record<string, GetPagePropertyResponse>,
  Prop extends Props[keyof Props],
  Type extends Prop["type"],
  Res extends Extract<Prop, { type: Type }>,
  TypeKey extends Extract<keyof Res, Type>
>(
  props: Props | null | undefined,
  key: keyof Props,
  type: Type
): Res[TypeKey] | null {
  if (props?.[key]?.object === "list") {
    const list = props[key] as List;
    return list?.results?.[0]
      ? (getProperty(
          { [key]: list.results[0] } as Props,
          key,
          type
        ) as Res[TypeKey])
      : null;
  }
  return props && key in props
    ? (props[key] as Res)?.[type as TypeKey] || null
    : null;
}

export function richTextToPlainText(
  richText:
    | Extract<Property, { type: "rich_text" }>["rich_text"]
    | null
    | undefined
): string | null {
  return richText?.plain_text ?? null;
}

export function getFile(
  files: Extract<Property, { type: "files" }>["files"] | null | undefined
): Array<File> {
  return (files || []).reduce<Array<File>>((res, item) => {
    switch (item.type) {
      case "external":
        res.push({ url: item.external.url, name: item.name });
        break;
      case "file":
        res.push({ url: item.file.url, name: item.name });
        break;

      default:
        break;
    }
    return res;
  }, []);
}
