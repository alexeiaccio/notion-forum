import { format, parseISO } from 'date-fns'
import Link from 'next/link'

import { PageType } from '~/utils/notion/types'

export function Card({
  item,
  pathname = '/page',
}: {
  item: PageType | null | undefined
  pathname?: string
}) {
  return (
    <Link href={`${pathname}/${item?.id}`} passHref>
      <a>
        <h3>{item?.title}</h3>
        <div>
          {item?.authors?.map((author) => (
            <div key={author.id}>{author.name}</div>
          ))}
        </div>
        <div>
          {item?.tags?.map((tage) => (
            <div key={tage.id}>{tage.name}</div>
          ))}
        </div>
        {item?.created ? (
          <time
            className="text-sm"
            dateTime={format(parseISO(item.created), "yyyy-MM-dd'T'HH:mm")}
          >
            {format(parseISO(item.created), 'dd MMMM yyyy, HH:mm')}
          </time>
        ) : null}
        {item?.updated ? (
          <time
            className="text-sm"
            dateTime={format(parseISO(item.updated), "yyyy-MM-dd'T'HH:mm")}
          >
            {format(parseISO(item.updated), 'dd MMMM yyyy, HH:mm')}
          </time>
        ) : null}
      </a>
    </Link>
  )
}
