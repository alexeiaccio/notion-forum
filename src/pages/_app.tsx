import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppProps } from 'next/app'
import { ReactNode } from 'react'
import { trpc } from '~/utils/trpc'
import '../styles/globals.css'

function MyApp({
  Component,
  pageProps,
}: AppProps & {
  Component: AppProps['Component'] & {
    getLayout: ((comp: ReactNode) => ReactNode) | undefined
  }
}) {
  const getLayout = Component.getLayout || ((page: ReactNode) => page)

  return (
    <div>
      {getLayout(<Component {...pageProps} />)}
      <ReactQueryDevtools initialIsOpen={false} />
    </div>
  )
}

export default trpc.withTRPC(MyApp)
