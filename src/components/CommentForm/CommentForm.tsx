import { Form, FormInput, FormSubmit, useFormState } from 'ariakit'

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
    <Form state={form}>
      <FormInput name={form.names.comment} />
      <FormSubmit>Send</FormSubmit>
    </Form>
  )
}
