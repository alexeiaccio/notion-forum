import { Form, FormInput, FormSubmit, useFormState } from 'ariakit'
import type { GetServerSidePropsContext } from 'next'
import { useState } from 'react'
import { Button, Card, CommentEditor } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSession } from '~/server/trpc/context'
import { getSSG } from '~/server/trpc/ssg'
import { PagesList } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getSession(ctx)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  const ssg = getSSG()
  ssg.user.getDraftsList.prefetchInfinite({})
  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  }
}

function DraftsPage() {
  const { data, hasNextPage, fetchNextPage } =
    trpc.user.getDraftsList.useInfiniteQuery(
      {},
      { getNextPageParam: (lastPage: PagesList) => lastPage.nextCursor },
    )
  const [addDraft, setAddDraft] = useState(false)

  return (
    <div>
      <ul>
        {data?.pages?.flatMap((page: PagesList) =>
          page?.results?.map((item) => (
            <Card key={item.id} item={item} pathname="/account/draft" />
          )),
        )}
      </ul>
      {hasNextPage ? (
        <div>
          <Button onClick={() => fetchNextPage()}>Load next</Button>
        </div>
      ) : null}
      {addDraft ? (
        <div>
          <DraftForm onSubmit={() => setAddDraft(false)} />
        </div>
      ) : (
        <Button onClick={() => setAddDraft(true)}>Add draft</Button>
      )}
    </div>
  )
}

DraftsPage.getLayout = getLayout

export default DraftsPage

export function DraftForm({ onSubmit }: { onSubmit?: () => void }) {
  const utils = trpc.useContext()
  const { mutate } = trpc.user.createDraft.useMutation({
    onSuccess() {
      utils.user.getDraftsList.invalidate()
    },
  })
  const form = useFormState({
    defaultValues: { title: '', draft: '' },
  })
  form.useSubmit(() => {
    mutate({ title: form.values.title, draft: form.values.draft })
    onSubmit?.()
  })

  return (
    <Form state={form} className="grid gap-2">
      <FormInput name={form.names.title} placeholder="Title" />
      {/* TODO replace with Draft editor */}
      <CommentEditor
        placeholder="Enter you comment"
        onChange={(value: string) => {
          form.setValue('draft', value)
        }}
      />
      <FormSubmit as={Button}>Send</FormSubmit>
    </Form>
  )
}
