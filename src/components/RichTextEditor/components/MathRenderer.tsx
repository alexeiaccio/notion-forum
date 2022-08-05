export function MathRenderer({
  equation,
  inline,
  onClick,
}: Readonly<{
  equation: string
  inline: boolean
  onClick?: () => void
}>) {
  return (
    <>
      <span className="spacer"> </span>
      <span role="button" tabIndex={-1} onClick={onClick}>
        {equation}
      </span>
      <span className="spacer"> </span>
    </>
  )
}
