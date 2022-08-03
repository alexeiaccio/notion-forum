import { Role } from 'ariakit'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'
import { trpc } from '~/utils/trpc'
import { CommentForm } from '../CommentForm'

export function Comment({
  breadcrambs,
  comment,
}: {
  breadcrambs: [string, ...string[]]
  comment: {
    id?: string
    header?: {
      author?: string
      relation?: string
      date?: string
    }
  }
}) {
  const utils = trpc.proxy.useContext()
  const { data } = trpc.proxy.page.getComment.useQuery(
    { breadcrambs },
    { enabled: breadcrambs.length <= 4 },
  )
  const { mutate } = trpc.proxy.page.postComment.useMutation({
    onSuccess(res) {
      utils.page.getComment.invalidate({
        breadcrambs,
      })
    },
  })
  const [pageId, ...comments] = breadcrambs

  return (
    <div className="pl-4">
      <Role
        role="mark"
        aria-details={comment.id}
        className="flex items-baseline gap-2"
      >
        <div>{comment.header?.author}</div>
        {comment.header?.date ? (
          <time
            className="text-sm"
            dateTime={format(
              parseISO(comment.header.date),
              "yyyy-MM-dd'T'HH:mm",
            )}
          >
            {format(parseISO(comment.header.date), 'dd MMMM yyyy, HH:mm')}
          </time>
        ) : null}
        <Link href={`/page/${pageId}/comments/${comments.join('/')}`} passHref>
          <a className="text-xs">Open</a>
        </Link>
      </Role>
      <Role role="comment" id={comment.id} data-author={comment.header?.author}>
        {data?.content?.map((block) => (
          <div key={block.id}>{block.rich_text}</div>
        ))}
        {data?.comments?.map((comment) => (
          <Comment
            key={comment.id}
            breadcrambs={[...breadcrambs, comment.id]}
            comment={comment}
          />
        ))}
      </Role>
      <div>
        <CommentForm
          onSubmit={(text) => {
            mutate({ breadcrambs, comment: text })
          }}
        />
      </div>
    </div>
  )
}
