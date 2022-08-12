import { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { Button, Card, Image, RichText } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSSG } from '~/server/trpc/ssg'
import { getUserInfo } from '~/utils/notion/api'
import { PagesList } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(
  ctx: GetStaticPropsContext<{ user: string }>,
) {
  const id = ctx.params?.user
  const user = await getUserInfo(id)
  const ssg = await getSSG()
  ssg.prefetchInfiniteQuery('page.getUserPagesList', { id })
  return {
    props: { user, trpcState: ssg.dehydrate() },
  }
}

function ProfilePage({ user }: InferGetStaticPropsType<typeof getStaticProps>) {
  // FIXME
  const { data, hasNextPage, fetchNextPage } =
    // @ts-ignore
    trpc.proxy.page.getUserPagesList.useInfiniteQuery(
      { id: user?.id },
      { getNextPageParam: (lastPage: PagesList) => lastPage.nextCursor },
    )

  return (
    <>
      {user?.image ? (
        <Image
          src={user.image}
          id={user.id}
          alt={user.name || ''}
          width={200}
          height={200}
        />
      ) : null}
      <h1>{user?.name}</h1>
      <div>
        {user?.bio?.map((block) => (
          <RichText key={block.id} content={block} />
        ))}
      </div>
      <ul>
        {data?.pages?.flatMap((page: PagesList) =>
          page?.results?.map((item) => <Card key={item.id} item={item} />),
        )}
      </ul>
      {hasNextPage ? (
        <div>
          <Button onClick={fetchNextPage}>Load next</Button>
        </div>
      ) : null}
    </>
  )
}

ProfilePage.getLayout = getLayout

export default ProfilePage