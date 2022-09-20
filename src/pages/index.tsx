import { Button, Card } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSSG } from '~/server/trpc/ssg'
import type { PagesList } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getStaticProps() {
  const ssg = getSSG()
  ssg.page.getPagesList.prefetchInfinite({})
  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  }
}

function IndexPage() {
  const { data, hasNextPage, fetchNextPage } =
    trpc.page.getPagesList.useInfiniteQuery(
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
          <Button onClick={() => fetchNextPage()}>Load next</Button>
        </div>
      ) : null}
    </>
  )
}

IndexPage.getLayout = getLayout

export default IndexPage
