import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Comment, CommentForm, RichText, Timestamp } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getBlockChildren, getPage, getRelations } from '~/utils/notion/api'
import { trpc } from '~/utils/trpc'

const Likes = dynamic(() => import('~/components/Likes/Likes'), { ssr: false })

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
  const tags = await getRelations(page?.tags)
  return {
    props: { page: { ...page, authors, tags, ...blocks } },
  }
}

function Page({ page }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { data } = trpc.proxy.page.getBlockChildren.useQuery(
    { id: page.id },
    { initialData: { content: page.content, comments: page.comments } },
  )

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
          <Link key={author.id} href={`/user/${author.id}`} passHref>
            <a>
              {'@'}
              {author.name}
            </a>
          </Link>
        ))}
      </div>
      <div className="flex items-baseline gap-2">
        {page?.tags?.map((tage) => (
          <span key={tage.id}>{tage.name}</span>
        ))}
      </div>
      <Likes id={page.id} likes={page.likes} dislikes={page.dislikes} />
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
        <CommentForm id={page.id} breadcrambs={page?.id ? [page.id] : null} />
      </div>
    </>
  )
}

Page.getLayout = getLayout

export default Page
