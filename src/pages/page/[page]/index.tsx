import { format, parseISO } from 'date-fns'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { Comment } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getBlockChildren, getPage, getRelations } from '~/utils/notion/api'

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
  return (
    <>
      <h1>{page?.title}</h1>
      {page?.created ? (
        <time dateTime={format(parseISO(page.created), "yyyy-MM-dd'T'HH:mm")}>
          {page.created}
        </time>
      ) : null}
      {page?.updated ? (
        <time dateTime={format(parseISO(page.updated), "yyyy-MM-dd'T'HH:mm")}>
          {page.updated}
        </time>
      ) : null}
      <div>
        {page?.authors?.map((author) => (
          <div key={author.id}>{author.name}</div>
        ))}
      </div>
      <div>
        {page?.tags?.map((tage) => (
          <div key={tage.id}>{tage.name}</div>
        ))}
      </div>
      <article>
        {page?.content?.map((block) => (
          <div key={block.id}>{block.rich_text}</div>
        ))}
      </article>
      {page.comments?.map((comment) =>
        page.id ? (
          <Comment
            key={comment.id}
            breadcrambs={[page.id, comment.id]}
            comment={comment}
          />
        ) : null,
      )}
    </>
  )
}

Page.getLayout = getLayout

export default Page
