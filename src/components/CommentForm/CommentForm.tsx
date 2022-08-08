import { Form, FormInput, FormSubmit, useFormState } from 'ariakit'
import { Button } from '../Button'
import { CommentEditor } from '../RichTextEditor/CommentEditor'

export function CommentForm({
  onSubmit,
}: {
  onSubmit: (data: string) => void
}) {
  const form = useFormState({
    defaultValues: { comment: '' },
  })
  form.useSubmit(() => {
    onSubmit(form.values.comment)
  })

  return (
    <Form state={form} className="grid gap-2">
      <CommentEditor
        placeholder="Enter you comment"
        onChange={(value: string) => {
          form.setValue('comment', value)
        }}
        charLimit={25}
      />
      <FormSubmit as={Button}>Send</FormSubmit>
    </Form>
  )
}
