import { format, parseISO } from 'date-fns'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { Button, Comment, CommentForm } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getBlockChildren, getPage, getRelations } from '~/utils/notion/api'
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
  const { data } = trpc.proxy.page.getPageProps.useQuery(
    {
      id: page.id,
    },
    {
      initialData: page,
    },
  )
  const { mutate } = trpc.proxy.page.postComment.useMutation({
    onSuccess(res) {
      // TODO optimistic update
      // utils.page.getPageProps.setData(
      //   () => ({
      //     ...data,
      //     comments: [...(data?.comments || []), ...(res?.comments || [])],
      //   }),
      //   { id: page.id },
      // )
      utils.page.getPageProps.invalidate({ id: page.id })
    },
  })

  return (
    <>
      <h1>{data?.title}</h1>
      {data?.created ? (
        <time dateTime={format(parseISO(data.created), "yyyy-MM-dd'T'HH:mm")}>
          {data.created}
        </time>
      ) : null}
      {data?.updated ? (
        <time dateTime={format(parseISO(data.updated), "yyyy-MM-dd'T'HH:mm")}>
          {data.updated}
        </time>
      ) : null}
      <div>
        {data?.authors?.map((author) => (
          <div key={author.id}>{author.name}</div>
        ))}
      </div>
      <div>
        {data?.tags?.map((tage) => (
          <div key={tage.id}>{tage.name}</div>
        ))}
      </div>
      <article>
        {data?.content?.map((block) => (
          <div key={block.id}>{block.rich_text}</div>
        ))}
      </article>
      {data?.comments?.map((comment) =>
        data.id ? (
          <Comment
            key={comment.id}
            breadcrambs={[data.id, comment.id]}
            comment={comment}
          />
        ) : null,
      )}
      <div>
        <CommentForm
          onSubmit={(comment) => {
            mutate({ breadcrambs: [data?.id], comment })
          }}
        />
      </div>
    </>
  )
}

Page.getLayout = getLayout

export default Page
