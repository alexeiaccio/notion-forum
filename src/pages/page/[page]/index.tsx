import { format, parseISO } from 'date-fns'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { Comment, CommentForm, RichText, Timestamp } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getBlockChildren, getPage, getRelations } from '~/utils/notion/api'
import { ContentAndCommentsType, PageType } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(
  ctx: GetStaticPropsContext<{ page: string }>,
) {
  const id = ctx.params?.page
  const [page, blocks] = await Promise.all([getPage(id), getBlockChildren(id)])
  const authors = await getRelations(page?.authors)
  return {
    props: { page: { ...page, authors, ...blocks } },
  }
}

function Page({ page }: InferGetStaticPropsType<typeof getStaticProps>) {
  const utils = trpc.proxy.useContext()
  const { data } = trpc.proxy.page.getBlockChildren.useQuery(
    { id: page.id },
    { initialData: { content: page.content, comments: page.comments } },
  )
  const { mutate } = trpc.proxy.page.postComment.useMutation({
    onSuccess(nextData) {
      utils.page.getBlockChildren.setData(
        (
          prevData: (ContentAndCommentsType & PageType) | null,
        ): (ContentAndCommentsType & PageType) | null => {
          if (!prevData) return null
          return {
            ...prevData,
            comments: [
              ...(prevData.comments || []),
              ...(nextData?.comments || []),
            ],
          }
        },
        { id: page.id },
      )
      utils.page.getBlockChildren.invalidate({ id: page.id })
    },
  })

  return (
    <>
      <h1>{page?.title}</h1>
      <div className="flex items-baseline gap-2">
        <small>
          Created at: <Timestamp>{page.created}</Timestamp>
        </small>
        <small>
          Updated at: <Timestamp>{page.updated}</Timestamp>
        </small>
      </div>
      <div className="flex items-baseline gap-2">
        {page?.authors?.map((author) => (
          <span key={author.id}>
            {'@'}
            {author.name}
          </span>
        ))}
      </div>
      <div className="flex items-baseline gap-2">
        {page?.tags?.map((tage) => (
          <span key={tage.id}>{tage.name}</span>
        ))}
      </div>
      <article>
        {page?.content?.map((block) => (
          <RichText key={block.id} content={block} />
        ))}
      </article>
      {data?.comments?.map((comment) =>
        page.id ? (
          <Comment
            key={comment.id}
            breadcrambs={[page.id, comment.id]}
            comment={comment}
          />
        ) : null,
      )}
      <div>
        <CommentForm
          onSubmit={(comment) => {
            mutate({ breadcrambs: [page?.id], comment })
          }}
        />
      </div>
    </>
  )
}

Page.getLayout = getLayout

export default Page
