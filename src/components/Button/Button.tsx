import { Command, type CommandProps } from 'ariakit'
import { cva, VariantProps } from 'cva'
import { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Button = forwardRef<
  HTMLButtonElement,
  CommandProps & ButtonVariants
>(({ intent, className, ...props }, ref) => {
  return (
    <Command
      ref={ref}
      {...props}
      className={twMerge(buttonStyles({ intent, class: className }))}
    />
  )
})
Button.displayName = 'Button'

export const buttonStyles = cva(
  'py-1 px-2 rounded-sm text-sm [&[data-focus-visible]]:ring ring-blue-400 ring-inset outline-none',
  {
    variants: {
      intent: {
        light: 'bg-white text-slate-600 hover:bg-slate-200',
      },
    },
    defaultVariants: {
      intent: 'light',
    },
  },
)

type ButtonVariants = Omit<VariantProps<typeof buttonStyles>, 'class'>
