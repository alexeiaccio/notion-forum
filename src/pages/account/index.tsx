import { Form, FormInput, FormSubmit, useFormState } from 'ariakit'
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { nil } from 'tsdef'
import { Button, buttonStyles, Image, RichText } from '~/components'
import { getLayout } from '~/layouts/AppLayout'
import { getSession } from '~/server/trpc/context'
import type { ContentType, UserType } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'

const InfoEditor = dynamic(
  () => import('~/components/RichTextEditor/InfoEditor'),
  { ssr: false },
)

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

  return {
    props: {
      user: session.user,
    },
  }
}

function ProfilePage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { data, isFetching, isLoading } = trpc.user.getUserInfo.useQuery(
    {
      id: user.id,
    },
    {
      initialData: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )
  const [editImage, setEditImage] = useState(false)
  const [editName, setEditName] = useState(false)
  const [editBio, setEditBio] = useState(false)

  return (
    <>
      {data?.image ? (
        <div className="overflow-hidden rounded-full w-36 h-36">
          <Image
            src={data.image}
            id={user.id}
            alt={data.name || ''}
            className="object-cover w-full h-full"
            width={144}
            height={144}
          />
        </div>
      ) : null}
      {editImage && user.id ? (
        <>
          <ImageForm id={user.id} onSubmit={() => setEditImage(false)} />
          <Button
            className={buttonStyles()}
            onClick={() => setEditImage(false)}
          >
            Close
          </Button>
        </>
      ) : (
        <Button
          className={buttonStyles()}
          onClick={() => setEditImage(true)}
          disabled={isFetching}
        >
          Edit Avatar
        </Button>
      )}
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
            Edit Name
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
      <Space />
    </>
  )
}

ProfilePage.getLayout = getLayout

export default ProfilePage

function ImageForm({ id, onSubmit }: { id: string; onSubmit: () => void }) {
  const [percentage, setPercentage] = useState<number>(0)
  const file = useRef<File>()
  const form = useFormState({
    defaultValues: { url: '' },
  })
  const utils = trpc.useContext()
  const { mutate: getUploadFileUrl, isLoading } =
    trpc.user.getUploadFileUrl.useMutation({
      async onSuccess(urls) {
        if (!urls || !file.current) return
        try {
          await fetch(urls.signedPutUrl, {
            method: 'PUT',
            body: file.current,
          })
          form.setValue('url', urls.signedGetUrl)
          file.current = undefined
        } catch (error) {
          console.error(error)
        }
      },
    })
  const { mutate } = trpc.user.updateUserImage.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData: UserType) => {
          if (!prevData || !nextData) return null
          return {
            ...prevData,
            image: nextData,
          }
        },
        { id },
      )
      utils.user.getUserInfo.invalidate({
        id,
      })
    },
  })
  form.useSubmit(() => {
    if (!form.values.url) return
    mutate({ id, url: form.values.url })
    onSubmit()
  })

  async function handleUpload(e: any) {
    const f = e.target.files[0] as File
    file.current = f
    getUploadFileUrl({
      name: f.name,
      contentType: f.type,
      contentLength: f.size,
    })
  }

  return (
    <Form state={form} className="flex gap-2">
      <FormInput name={form.names.url} hidden placeholder="Drop image" />
      {form.values.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.values.url} className="object-cover w-36 h-36" alt="" />
      ) : (
        <>
          <input type="file" onChange={handleUpload} />
          {percentage > 0 && (
            <div>
              {percentage}
              {'%'}
            </div>
          )}
        </>
      )}
      <FormSubmit
        as={Button}
        disabled={
          (percentage > 0 && percentage < 100) || !form.values.url || isLoading
        }
      >
        Send
      </FormSubmit>
    </Form>
  )
}

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
  const utils = trpc.useContext()
  const { mutate } = trpc.user.updateUserName.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData: UserType): UserType | null => {
          if (!prevData || !nextData) return null
          return {
            ...prevData,
            name: nextData,
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
    defaultValues: { name: name },
  })
  form.useSubmit(() => {
    mutate({ id, name: form.values.name })
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
  const utils = trpc.useContext()
  const { mutate } = trpc.user.updateUserInfo.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData: UserType): UserType | null => {
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

function Space() {
  const { data, isLoading } = trpc.user.getSpace.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  if (data?.type === 'url') {
    return <a href={data.url}>Connect to Notion</a>
  }
  return (
    <div>
      <div>Space: {data?.spaceId}</div>
      {data?.pageId ? (
        <div>Page: {data.pageId}</div>
      ) : (
        <PageForm id={data?.id} />
      )}
      {data?.tableId ? (
        <>
          <div>Table: {data.tableId}</div>
          <div>
            <Link href="/account/draft" passHref>
              <a>Drafts</a>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}

function PageForm({ id }: { id: string | nil }) {
  const utils = trpc.useContext()
  const { mutate } = trpc.user.connectPage.useMutation({
    onSuccess(nextData) {
      utils.user.getSpace.setData(() => {
        if (!nextData) return null
        return { ...nextData, type: 'space' }
      })
      utils.user.getSpace.invalidate()
    },
  })
  const form = useFormState({
    defaultValues: { page: '' },
  })
  form.useSubmit(() => {
    if (!form.values.page) return
    mutate({ spaceId: id, pageId: form.values.page })
  })
  return (
    <Form state={form}>
      <FormInput name={form.names.page} />
      <FormSubmit as={Button}>Set Page</FormSubmit>
    </Form>
  )
}
