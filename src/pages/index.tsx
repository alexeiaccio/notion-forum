import { Button } from 'ariakit'
import { Card } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSSG } from '~/server/trpc/ssg'
import { PagesList } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getStaticProps() {
  const ssg = await getSSG()
  ssg.prefetchInfiniteQuery('page.getPagesList')
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
    trpc.proxy.page.getPagesList.useInfiniteQuery(
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
