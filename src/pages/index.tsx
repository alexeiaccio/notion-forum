import { createSSGHelpers } from '@trpc/react/ssg'
import { Button } from 'ariakit'
import superjson from 'superjson'
import { Card } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { appRouter } from '~/server/trpc/router'
import { PagesList } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getStaticProps() {
  const ssg = await createSSGHelpers({
    router: appRouter,
    ctx: { session: null },
    transformer: superjson,
  })
  ssg.prefetchInfiniteQuery('page.infinitePagesList')
  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  }
}

function IndexPage() {
  // FIXME
  const { data, hasNextPage, fetchNextPage } =
    // @ts-ignore
    trpc.proxy.page.infinitePagesList.useInfiniteQuery(
      {},
      { getNextPageParam: (lastPage: PagesList) => lastPage.nextCursor },
    )

  return (
    <>
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

IndexPage.getLayout = getLayout

export default IndexPage
