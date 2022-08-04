import { Role } from 'ariakit'
import { format, parseISO } from 'date-fns'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import { Comment } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getBlock, getBlockChildren } from '~/utils/notion/api'
import { trpc } from '~/utils/trpc'

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(
  ctx: GetStaticPropsContext<{ comments: string[]; page: string }>,
) {
  const id = ctx.params?.comments?.[(ctx.params?.comments?.length ?? 0) - 1]
  const [block, comments] = await Promise.all([
    getBlock(id),
    getBlockChildren(id),
  ])

  return {
    props: {
      comment: {
        ...block,
        ...comments,
      },
      pageId: ctx.params?.page,
      breadcrambs: ctx.params?.comments,
    },
  }
}

function CommentPage({
  pageId = '',
  breadcrambs,
  comment,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { data } = trpc.proxy.page.getBlockChildren.useQuery(
    { id: comment.id },
    { initialData: { content: comment.content, comments: comment.comments } },
  )

  return (
    <>
      <Role role="mark" aria-details={comment.id}>
        <div>{comment.header?.author}</div>
        {comment.header?.date ? (
          <time
            dateTime={format(
              parseISO(comment.header.date),
              "yyyy-MM-dd'T'HH:mm",
            )}
          >
            {format(parseISO(comment.header.date), 'dd MMMM yyyy, HH:mm')}
          </time>
        ) : null}
      </Role>
      <Role role="comment" id={comment.id} data-author={comment.header?.author}>
        {comment.content?.map((block) => (
          <div key={block.id}>{block.rich_text}</div>
        ))}
        {data?.comments?.map((comment) => (
          <Comment
            key={comment.id}
            breadcrambs={[pageId, ...(breadcrambs || []), comment.id]}
            comment={comment}
          />
        ))}
      </Role>
    </>
  )
}

CommentPage.getLayout = getLayout

export default CommentPage
