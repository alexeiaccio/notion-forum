import { Form, FormSubmit, Role, useFormState } from 'ariakit'
import Link from 'next/link'
import { useState } from 'react'
import { nil } from 'tsdef'
import { ContentAndCommentsType, PageType } from '~/utils/notion/types'
import { trpc } from '~/utils/trpc'
import { Button } from '../Button'
import { CommentLikes } from '../Likes'
import { RichText } from '../RichText'
import { CommentEditor } from '../RichTextEditor'
import { Timestamp } from '../Timestamp'

export function Comment({
  breadcrambs,
  comment,
}: {
  breadcrambs: [string, ...string[]]
  comment: {
    id?: string
    header?: {
      author?: string
      relation?: string
      date?: string
      likes?: string
    }
  }
}) {
  const { data } = trpc.page.getComment.useQuery(
    { breadcrambs },
    { enabled: breadcrambs.length <= 4 },
  )
  const [pageId, ...comments] = breadcrambs
  const [showComments, setShowComments] = useState(false)
  const [addComment, setAddComment] = useState(false)

  return (
    <div className="pl-4">
      <Role
        role="mark"
        aria-details={comment.id}
        className="flex items-baseline gap-2"
      >
        <div>
          {'@'}
          {comment.header?.author}
        </div>
        {comment.header?.date ? (
          <Timestamp className="text-sm">{comment.header.date}</Timestamp>
        ) : null}
        {comment.header?.likes ? (
          <CommentLikes id={comment.header.likes} commentId={comment.id} />
        ) : null}
        <Link href={`/page/${pageId}/comments/${comments.join('/')}`} passHref>
          <a className="text-xs">Open</a>
        </Link>
      </Role>
      <Role role="comment" id={comment.id} data-author={comment.header?.author}>
        {data?.content?.map((block) => (
          <RichText key={block.id} content={block} />
        ))}
        {breadcrambs.length <= 4 ? (
          <>
            {showComments ? (
              <>
                {data?.comments?.map((comment) => (
                  <Comment
                    key={comment.id}
                    breadcrambs={[...breadcrambs, comment.id]}
                    comment={comment}
                  />
                ))}
                <Button onClick={() => setShowComments(false)}>
                  Collapse comments
                </Button>
              </>
            ) : data?.comments?.length ? (
              <Button onClick={() => setShowComments(true)}>
                Show comments
              </Button>
            ) : null}
          </>
        ) : null}
      </Role>
      {breadcrambs.length <= 4 ? (
        <>
          {addComment ? (
            <div>
              <CommentForm
                id={comment.id}
                breadcrambs={breadcrambs}
                onSummit={() => setAddComment(false)}
              />
            </div>
          ) : (
            <Button onClick={() => setAddComment(true)}>Add comment</Button>
          )}
        </>
      ) : null}
    </div>
  )
}

export function CommentForm({
  id,
  breadcrambs,
  onSummit,
}: {
  id: string | nil
  breadcrambs: [string, ...string[]] | nil
  onSummit?: () => void
}) {
  const utils = trpc.useContext()
  const { mutate } = trpc.user.postComment.useMutation({
    onSuccess(nextData) {
      utils.page.getBlockChildren.setData(
        (
          prevData: ContentAndCommentsType | nil,
        ): ContentAndCommentsType | nil => {
          if (!prevData) return null
          return {
            ...prevData,
            comments: [
              ...(prevData.comments || []),
              ...(nextData?.comments || []),
            ],
          }
        },
        { id },
      )
      utils.page.getComment.invalidate({
        breadcrambs,
      })
    },
  })
  const form = useFormState({
    defaultValues: { comment: '' },
  })
  form.useSubmit(() => {
    mutate({ breadcrambs, comment: form.values.comment })
    onSummit?.()
  })

  return (
    <Form state={form} className="grid gap-2">
      <CommentEditor
        placeholder="Enter you comment"
        onChange={(value: string) => {
          form.setValue('comment', value)
        }}
        charLimit={255}
      />
      <FormSubmit as={Button}>Send</FormSubmit>
    </Form>
  )
}
