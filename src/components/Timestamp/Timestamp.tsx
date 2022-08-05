import { format, parseISO } from 'date-fns'

export function Timestamp({
  children,
  template = 'MMMM dd, yyyy HH:mm',
  className,
}: {
  children: string | null | undefined
  template?: string
  className?: string
}) {
  if (!children) return null
  return (
    <time
      className={className}
      dateTime={format(parseISO(children), "yyyy-MM-dd'T'HH:mm")}
    >
      {format(parseISO(children), template)}
    </time>
  )
}
