import { Button, Form, FormSubmit, useFormState } from 'ariakit'
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next'
import { unstable_getServerSession as getServerSession } from 'next-auth/next'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { nil } from 'tsdef'
import { RichText } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { authOptions as nextAuthOptions } from '~/pages/api/auth/[...nextauth]'
import { ContentType, UserType } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

const InfoEditor = dynamic(
  () => import('~/components/RichTextEditor/InfoEditor'),
  { ssr: false },
)

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, nextAuthOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/login',
        permanent: false,
      },
    }
  }

  return {
    props: {
      user: session.user,
    },
  }
}

function ProfilePage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { data } = trpc.proxy.user.getUserInfo.useQuery({
    id: user.id,
  })
  const [edit, setEdit] = useState(false)

  return (
    <>
      <h1>{user?.name}</h1>
      {edit ? (
        <>
          <InfoForm id={user.id} bio={data?.bio} />
          <Button onClick={() => setEdit(false)}>Close</Button>
        </>
      ) : null}
      {data?.bio?.length && !edit ? (
        <div>
          {data?.bio?.map((block) => (
            <RichText key={block.id} content={block} />
          ))}
          <Button onClick={() => setEdit(true)}>Edit</Button>
        </div>
      ) : null}
      {!data?.bio?.length && !edit ? (
        <Button onClick={() => setEdit(true)}>Add Bio</Button>
      ) : null}
    </>
  )
}

ProfilePage.getLayout = getLayout

export default ProfilePage

export function InfoForm({
  id,
  bio,
}: {
  id: string | nil
  bio: ContentType[] | nil
}) {
  const utils = trpc.proxy.useContext()
  const { mutate } = trpc.proxy.user.updateUserInfo.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData: UserType | null): UserType | null => {
          if (!prevData || !nextData) return null
          return {
            ...prevData,
            bio: nextData,
          }
        },
        { id },
      )
      utils.user.getUserInfo.invalidate({
        id,
      })
    },
  })
  const form = useFormState({
    defaultValues: { bio: '' },
  })
  form.useSubmit(() => {
    mutate({ id, info: form.values.bio })
  })

  return (
    <Form state={form} className="grid gap-2">
      <InfoEditor
        defaultValue={bio}
        placeholder="Write about yourself"
        onChange={(value: string) => {
          form.setValue('bio', value)
        }}
      />
      <FormSubmit as={Button}>Send</FormSubmit>
    </Form>
  )
}
