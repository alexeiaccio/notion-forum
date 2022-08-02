import { getLayout } from '~/layouts/AppLayout'
import { trpc } from '~/utils/trpc'

const IndexPage = () => {
  const page = trpc.proxy.page.getPage.useQuery({
    id: '118d88b948cd4f05bb120f356143b7a8',
  })

  return (
    <>
      <pre className="w-screen min-w-0">
        <code className="block w-screen overflow-auto">
          {JSON.stringify(page, null, 2)}
        </code>
      </pre>
    </>
  )
}

IndexPage.getLayout = getLayout

export default IndexPage
