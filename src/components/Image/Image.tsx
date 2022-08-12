import NextImage, { type ImageProps } from 'next/future/image'

export function Image({
  src,
  id,
  alt = '',
  width = 1280,
  height = 600,
  ...props
}: ImageProps & {
  src?: string
  id?: string
}) {
  if (!src || !id) return null
  return (
    <NextImage
      src={`http://localhost:3000/api/image/${encodeURIComponent(
        src,
      )}?id=${id}&width=${width}`}
      alt={alt}
      width={width}
      height={height}
      {...props}
    />
  )
}
