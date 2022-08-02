import { PropsWithChildren, ReactNode } from 'react'
import { Header } from '~/components'

function AppLayout({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="grid grid-rows-[min-content,auto] min-h-screen w-full bg-slate-100">
      <Header />
      <main className="">{children}</main>
    </div>
  )
}

export function getLayout(page: ReactNode) {
  return <AppLayout>{page}</AppLayout>
}
