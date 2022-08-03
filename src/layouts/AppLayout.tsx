import { PropsWithChildren, ReactElement } from 'react'
import { Header } from '~/components'

function AppLayout({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="grid grid-rows-[min-content,auto] min-h-screen w-full bg-slate-100">
      <Header />
      <main className="p-4">{children}</main>
    </div>
  )
}

export function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}
