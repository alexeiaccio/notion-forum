import { Form, FormInput, FormSubmit, useFormState } from 'ariakit'
import axios from 'axios'
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import { unstable_getServerSession as getServerSession } from 'next-auth/next'
import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { nil } from 'tsdef'
import { Button, buttonStyles, Image, RichText } from '~/components'
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
  const utils = trpc.proxy.useContext()
  const { mutate: getUploadFileUrl, isLoading } =
    trpc.proxy.user.getUploadFileUrl.useMutation({
      async onSuccess(urls) {
        if (!urls || !file.current) return
        try {
          await axios.put(
            urls.signedPutUrl,
            {
              body: file.current,
            },
            {
              onUploadProgress: (progressEvent) => {
                const { loaded, total } = progressEvent
                setPercentage(Math.floor((loaded * 100) / total))
              },
            },
          )
          form.setValue('url', urls.signedGetUrl)
          file.current = undefined
        } catch (error) {
          console.error(error)
        }
      },
    })
  const { mutate } = trpc.proxy.user.updateUserImage.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData) => {
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
      <input type="file" onChange={handleUpload} />
      {percentage > 0 && (
        <div>
          {percentage}
          {'%'}
        </div>
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
  const utils = trpc.proxy.useContext()
  const { mutate } = trpc.proxy.user.updateUserName.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData): UserType | null => {
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
  const utils = trpc.proxy.useContext()
  const { mutate } = trpc.proxy.user.updateUserInfo.useMutation({
    onSuccess(nextData) {
      utils.user.getUserInfo.setData(
        (prevData): UserType | null => {
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
