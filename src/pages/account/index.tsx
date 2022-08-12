import { useIsFetching } from '@tanstack/react-query'
import { Button, Form, FormInput, FormSubmit, useFormState } from 'ariakit'
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import { unstable_getServerSession as getServerSession } from 'next-auth/next'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { nil } from 'tsdef'
import { buttonStyles, Image, RichText } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { authOptions as nextAuthOptions } from '~/pages/api/auth/[...nextauth]'
import type { ContentType, UserType } from '~/utils/notion/types'
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
  const { data, isFetching, isLoading } = trpc.proxy.user.getUserInfo.useQuery(
    {
      id: user.id,
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )
  const [editName, setEditName] = useState(false)
  const [editBio, setEditBio] = useState(false)

  return (
    <>
      {data?.image ? (
        <Image
          src={data.image}
          id={user.id}
          alt={data.name || ''}
          width={200}
          height={200}
        />
      ) : null}
      {(!isLoading && !data?.name) || editName ? (
        <>
          <NameForm
            id={user.id}
            name={data?.name || ''}
            email={user.email}
            onSubmit={() => setEditName(false)}
          />
          <Button className={buttonStyles()} onClick={() => setEditName(false)}>
            Close
          </Button>
        </>
      ) : (
        <>
          <h1 className={twMerge(isFetching && 'animate-pulse')}>
            {data?.name}
          </h1>
          <Button
            className={buttonStyles()}
            onClick={() => setEditName(true)}
            disabled={isFetching}
          >
            Edit
          </Button>
        </>
      )}
      {editBio ? (
        <>
          <InfoForm
            id={user.id}
            bio={data?.bio}
            onSubmit={() => setEditBio(false)}
          />
          <Button className={buttonStyles()} onClick={() => setEditBio(false)}>
            Close
          </Button>
        </>
      ) : null}
      {data?.bio?.length && !editBio ? (
        <>
          <div className={twMerge(isFetching && 'animate-pulse')}>
            {data?.bio?.map((block) => (
              <RichText key={block.id} content={block} />
            ))}
          </div>
          <Button
            className={buttonStyles()}
            onClick={() => setEditBio(true)}
            disabled={isFetching}
          >
            Edit
          </Button>
        </>
      ) : null}
      {!data?.bio?.length && !editBio ? (
        <Button
          className={buttonStyles()}
          onClick={() => setEditBio(true)}
          disabled={isFetching}
        >
          Add Bio
        </Button>
      ) : null}
    </>
  )
}

ProfilePage.getLayout = getLayout

export default ProfilePage

function NameForm({
  id,
  name,
  email,
  onSubmit,
}: {
  id: string
  name: string
  email: string
  onSubmit: () => void
}) {
  const utils = trpc.proxy.useContext()
  const { mutate } = trpc.proxy.user.updateUserName.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData: UserType | null): UserType | null => {
          if (!prevData || !nextData) return null
          return {
            ...prevData,
            name: nextData,
          }
        },
        { id: id },
      )
      utils.user.getUserInfo.invalidate({
        id: id,
      })
    },
  })
  const form = useFormState({
    defaultValues: { name: name },
  })
  form.useSubmit(() => {
    mutate({ id: id, name: form.values.name })
    onSubmit()
  })

  return (
    <Form state={form} className="flex gap-2">
      <FormInput name={form.names.name} placeholder={email?.split('@')[0]} />
      <FormSubmit as={Button}>Send</FormSubmit>
    </Form>
  )
}

function InfoForm({
  id,
  bio,
  onSubmit,
}: {
  id: string | nil
  bio: ContentType[] | nil
  onSubmit: () => void
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
    onSubmit()
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
