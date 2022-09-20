import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import Link from 'next/link'
import { nil } from 'tsdef'
import { Button, RichText, Timestamp } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSession } from '~/server/trpc/context'
import { getDraft, getDraftContent, getRelations } from '~/utils/notion/api'
import { trpc } from '~/utils/trpc'

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const id = ctx.params?.draft
  const session = await getSession(ctx)
  if (!session?.user?.id || !id) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
      props: { page: null },
    }
  }
  const [page, content] = await Promise.all([
    getDraft(session.user.id, id as string),
    getDraftContent(session.user.id, id as string),
  ])
  const authors = await getRelations(page?.authors)
  const tags = await getRelations(page?.tags)
  return { props: { page: { ...page, authors, tags, content } } }
}

function Page({
  page,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <h1>{page?.title}</h1>
      <div className="flex items-baseline gap-2">
        <small>
          Created at: <Timestamp>{page?.created}</Timestamp>
        </small>
        <small>
          Updated at: <Timestamp>{page?.updated}</Timestamp>
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
      <article>
        {page?.content?.map((block) => (
          <RichText key={block.id} content={block} />
        ))}
      </article>
      {page?.published ? (
        <Link href={`/page/${page.published}`} passHref>
          <a>Open page</a>
        </Link>
      ) : (
        <PublishDraft pageId={page?.id} />
      )}
    </>
  )
}

Page.getLayout = getLayout

export default Page

function PublishDraft({ pageId }: { pageId: string | nil }) {
  const utils = trpc.useContext()
  const { mutate, data } = trpc.user.publishDraft.useMutation({
    onSuccess: () => {
      utils.page.getPagesList.invalidate()
    },
  })
  if (data) {
    return (
      <Link href={`/page/${data}`} passHref>
        <a>Open page</a>
      </Link>
    )
  }
  return (
    <div>
      <Button
        onClick={() => {
          mutate({ pageId })
        }}
      >
        Publish
      </Button>
    </div>
  )
}
