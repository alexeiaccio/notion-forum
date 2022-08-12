import NextImage, { type ImageProps } from 'next/future/image'

export function Image({
  src,
  id,
  alt = '',
  width = 600,
  height = 600,
}: ImageProps & {
  src?: string
  id?: string
  alt?: string
  width?: number
  height?: number | 'auto'
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
    />
  )
}
