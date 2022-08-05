import {
  Form,
  FormInput,
  FormReset,
  FormSubmit,
  Popover,
  PopoverDisclosure,
  PopoverHeading,
  Tooltip,
  TooltipAnchor,
  useFormState,
  usePopoverState,
  useTooltipState,
} from 'ariakit'
import {
  Select,
  SelectItem,
  SelectPopover,
  useSelectState,
} from 'ariakit/select'
import {
  Toolbar as BaseToolbar,
  ToolbarItem,
  ToolbarSeparator as BaseToolbarSeparator,
  useToolbarState,
} from 'ariakit/toolbar'
import React, {
  ButtonHTMLAttributes,
  forwardRef,
  HTMLAttributes,
  ReactNode,
} from 'react'
import { OverwriteProps } from 'tsdef'

import { InsertImagePayload } from '../plugins/ImagesPlugin'

export type ToolbarProps = HTMLAttributes<HTMLDivElement>

/** Toolbar */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const toolbar = useToolbarState()
    return <BaseToolbar ref={ref} state={toolbar} {...props} />
  },
)
Toolbar.displayName = 'Toolbar'

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean
}

/** ToolbarButton */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ isActive, title, ...props }, ref) => {
    return (
      <ToolbalTooltip title={title}>
        <ToolbarItem ref={ref} {...props} />
      </ToolbalTooltip>
    )
  },
)
ToolbarButton.displayName = 'ToolbarButton'

export type ToolbarSeparatorProps = HTMLAttributes<HTMLDivElement>

/** ToolbarSeparator */
export const ToolbarSeparator = forwardRef<
  HTMLDivElement,
  ToolbarSeparatorProps
>((props, ref) => {
  return <BaseToolbarSeparator as="div" ref={ref} {...props} />
})
ToolbarSeparator.displayName = 'ToolbarSeparator'

export type ToolbarSelectProps = OverwriteProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  {
    options: Array<{ value: string; icon?: ReactNode; label?: ReactNode }>
    value?: string
    onChange?: (value: string) => void
    defaultValue?: string
    children?: ReactNode
  }
>

/** ToolbarSelect */
export const ToolbarSelect = forwardRef<HTMLButtonElement, ToolbarSelectProps>(
  (props, ref) => {
    const { options, value, onChange, defaultValue, children, title, ...rest } =
      props
    const select = useSelectState({
      value,
      setValue: onChange,
      defaultValue,
      gutter: 8,
    })

    return (
      <>
        <ToolbalTooltip title={title}>
          <Select as={ToolbarItem} ref={ref} state={select} {...rest}>
            {children}
          </Select>
        </ToolbalTooltip>
        <SelectPopover
          state={select}
          className="flex flex-col gap-2 p-2 text-sm rounded-md shadow-lg bg-slate-200"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="px-2 py-1 rounded cursor-pointer hover:bg-slate-300"
            >
              {option.icon}
              {option.label || option.value}
            </SelectItem>
          ))}
        </SelectPopover>
      </>
    )
  },
)
ToolbarSelect.displayName = 'ToolbarSelect'

export type ToolbarTooltipProps = {
  children: ReactNode
  title?: string
}

/** ToolbarTooltip */
export const ToolbalTooltip = forwardRef<HTMLDivElement, ToolbarTooltipProps>(
  ({ title, children, ...props }, ref) => {
    const tooltip = useTooltipState()

    return (
      <>
        <TooltipAnchor
          ref={ref}
          state={tooltip}
          title={title}
          aria-label={title}
          {...props}
        >
          {children}
        </TooltipAnchor>
        <Tooltip
          state={tooltip}
          className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-200"
        >
          {title}
        </Tooltip>
      </>
    )
  },
)
ToolbalTooltip.displayName = 'ToolbalTooltip'

/** ToolbarForm */
export const ToolbarForm = ({
  onSubmit,
  placeholder,
  submit,
  reset,
  defaultValue = '',
}: {
  onSubmit: (field: string) => void
  placeholder?: string
  defaultValue?: string
  submit?: ReactNode
  reset?: ReactNode
}) => {
  const form = useFormState({ defaultValues: { field: defaultValue } })

  form.useSubmit(() => {
    onSubmit(form.values.field)
  })

  return (
    <Form state={form}>
      <FormInput name={form.names.field} required placeholder={placeholder} />
      <FormSubmit>{submit}</FormSubmit>
      {reset ? <FormReset>{reset}</FormReset> : null}
    </Form>
  )
}

/** ToolbarImageForm */
export const ToolbarImageForm = ({
  onUpload,
  onSubmit,
  placeholder,
  submit,
}: {
  onUpload?: (val: File | undefined) => InsertImagePayload
  onSubmit: (args: InsertImagePayload) => void
  placeholder?: string
  submit?: ReactNode
}) => {
  const form = useFormState({ defaultValues: { image: '' } })
  const [uploaded, setUploaded] = React.useState(false)

  form.useSubmit(() => {
    onSubmit({ src: form.values.image, altText: '' })
  })

  const handleUpload = (input: File | File[] | undefined) => {
    if (!input || !onUpload) return
    const file = Array.isArray(input) ? input[0] : input
    const payload = onUpload(file)
    form.setValue('image', payload.src)
    setUploaded(true)
  }

  return (
    <Form state={form}>
      <div>{onUpload ? <div>Upload</div> : null}</div>
      <FormInput
        name={form.names.image}
        disabled={uploaded}
        required
        placeholder={placeholder}
      />
      <FormSubmit>{submit}</FormSubmit>
    </Form>
  )
}

export type ToolbarPopoverProps = ToolbarButtonProps & {
  button: ReactNode
  heading?: ReactNode
  children: ReactNode
}

/** ToolbarPopover */
export const ToolbarPopover = forwardRef<
  HTMLButtonElement,
  ToolbarPopoverProps
>(({ button, heading, children, ...props }, ref) => {
  const popover = usePopoverState({
    gutter: 8,
  })

  return (
    <>
      <PopoverDisclosure
        ref={ref}
        state={popover}
        as={ToolbarButton}
        {...props}
      >
        {button}
      </PopoverDisclosure>
      <Popover state={popover}>
        {heading ? <PopoverHeading>{heading}</PopoverHeading> : null}
        {popover.mounted ? children : null}
      </Popover>
    </>
  )
})
ToolbarPopover.displayName = 'ToolbarPopover'
