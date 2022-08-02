import { Button, Header } from '~/components'

export async function getStaticProps() {
  if (process.env.NODE_ENV === 'production') {
    return {
      notFound: true,
    }
  }

  return {
    props: {},
  }
}

function UIKitPage() {
  return (
    <>
      <Header />
      <main className="grid gap-8 p-4">
        <h1 className="text-2xl font-bold text-slate-700">UIKit</h1>
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-700">Button</h2>
          <div className="grid grid-cols-4 gap-4">
            <Button>Button</Button>
            <Button>Button</Button>
            <Button>Button</Button>
            <Button>Button</Button>
          </div>
        </section>
      </main>
    </>
  )
}

export default UIKitPage
