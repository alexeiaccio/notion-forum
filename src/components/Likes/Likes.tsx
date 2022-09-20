import { twMerge } from 'tailwind-merge'
import { Nilable } from 'tsdef'
import { PageLikesType } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'
import { Button } from '../Button'

export default function Likes({
  id,
  likes = 0,
  dislikes = 0,
}: {
  id: Nilable<string>
  likes: Nilable<number>
  dislikes: Nilable<number>
}) {
  const utils = trpc.useContext()
  const { data: page } = trpc.page.getPageLikes.useQuery(
    { id },
    {
      initialData: {
        likes,
        dislikes,
      },
      enabled: Boolean(id),
    },
  )
  const { data, isLoading, isFetched } = trpc.user.getUserLikes.useQuery(
    { id },
    { enabled: Boolean(id), trpc: { context: { skipBatch: true } } },
  )
  const { mutate, isLoading: isMutating } = trpc.user.postLike.useMutation({
    onSuccess(nextValue) {
      utils.user.getUserLikes.setData(() => nextValue, { id })
      utils.user.getUserLikes.invalidate({ id })
      utils.page.getPageLikes.setData(
        (prevData: PageLikesType) => ({
          likes: (prevData?.likes ?? 0) + (nextValue?.like ? 1 : 0),
          dislikes: (prevData?.dislikes ?? 0) + (nextValue?.dislike ? 1 : 0),
        }),
        { id },
      )
      utils.page.getPageLikes.invalidate({ id })
    },
  })

  return (
    <div className="flex items-center gap-2 text-xs leading-normal">
      <LikeIcon fill={data?.like} />
      <span className={twMerge(data?.like && 'font-semibold')}>
        {page?.likes ?? 0}
      </span>
      <DislikeIcon fill={data?.dislike} />
      <span className={twMerge(data?.dislike && 'font-semibold')}>
        {page?.dislikes ?? 0}
      </span>
      {isFetched && !data ? (
        <>
          <Button
            onClick={() => mutate({ id, action: 'likes' })}
            disabled={isLoading || isMutating}
          >
            <LikeIcon />
          </Button>
          <Button
            onClick={() => mutate({ id, action: 'dislikes' })}
            disabled={isLoading || isMutating}
          >
            <DislikeIcon />
          </Button>
        </>
      ) : null}
    </div>
  )
}

export function CommentLikes({
  id,
  commentId,
}: {
  id: Nilable<string>
  commentId: Nilable<string>
}) {
  const utils = trpc.useContext()
  const { data: page } = trpc.page.getCommentLikes.useQuery(
    { id },
    {
      enabled: Boolean(id),
    },
  )
  const { data, isLoading, isFetched } = trpc.user.getUserLikes.useQuery(
    { id: commentId },
    { enabled: Boolean(commentId), trpc: { context: { skipBatch: true } } },
  )
  const { mutate, isLoading: isMutating } = trpc.user.postLike.useMutation({
    onSuccess(nextValue) {
      utils.user.getUserLikes.setData(() => nextValue, { id: commentId })
      utils.user.getUserLikes.invalidate({ id: commentId })
      utils.page.getCommentLikes.setData(
        (prevData: PageLikesType) => ({
          likes: (prevData?.likes ?? 0) + (nextValue?.like ? 1 : 0),
          dislikes: (prevData?.dislikes ?? 0) + (nextValue?.dislike ? 1 : 0),
        }),
        { id },
      )
      utils.page.getCommentLikes.invalidate({ id })
    },
  })

  return (
    <div className="flex items-center gap-2 text-xs leading-normal">
      <LikeIcon fill={data?.like} />
      <span className={twMerge(data?.like && 'font-semibold')}>
        {page?.likes ?? 0}
      </span>
      <DislikeIcon fill={data?.dislike} />
      <span className={twMerge(data?.dislike && 'font-semibold')}>
        {page?.dislikes ?? 0}
      </span>
      {isFetched && !data ? (
        <>
          <Button
            onClick={() => mutate({ id: commentId, action: 'likes' })}
            disabled={isLoading || isMutating}
          >
            <LikeIcon />
          </Button>
          <Button
            onClick={() => mutate({ id: commentId, action: 'dislikes' })}
            disabled={isLoading || isMutating}
          >
            <DislikeIcon />
          </Button>
        </>
      ) : null}
    </div>
  )
}

export function LikeIcon({ fill = false }: { fill?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      {...(fill
        ? { fill: 'currentColor' }
        : { stroke: 'currentColor', fill: 'none' })}
      className="w-[1.5em] h-[1.5em]"
    >
      <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 01-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 01-1.341-.317l-2.734-1.366A3 3 0 006.292 15H5V8h.963c.685 0 1.258-.483 1.612-1.068a4.011 4.011 0 012.166-1.73c.432-.143.853-.386 1.011-.814.16-.432.248-.9.248-1.388z" />
    </svg>
  )
}

export function DislikeIcon({ fill = false }: { fill?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      {...(fill
        ? { fill: 'currentColor' }
        : { stroke: 'currentColor', fill: 'none' })}
      className="w-[1.5em] h-[1.5em]"
    >
      <path d="M18.905 12.75a1.25 1.25 0 01-2.5 0v-7.5a1.25 1.25 0 112.5 0v7.5zM8.905 17v1.3c0 .268-.14.526-.395.607A2 2 0 015.905 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.242 0-2.26-1.01-2.146-2.247.193-2.08.652-4.082 1.341-5.974C2.752 3.678 3.833 3 5.005 3h3.192a3 3 0 011.342.317l2.733 1.366A3 3 0 0013.613 5h1.292v7h-.963c-.684 0-1.258.482-1.612 1.068a4.012 4.012 0 01-2.165 1.73c-.433.143-.854.386-1.012.814-.16.432-.248.9-.248 1.388z" />
    </svg>
  )
}
