import type { SerializedEditorState } from 'lexical'
import dynamic from 'next/dynamic'
import { Button, Header } from '~/components'
import { ChildrenType } from '~/utils/notion/types'

const RichTextEditor = dynamic(
  () => import('../components/RichTextEditor/RichTextEditor'),
  { ssr: false },
)

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
  function handleChange(state: string) {
    const parsedState = JSON.parse(state) as ChildrenType
    console.log(parsedState)
  }

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
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-700">
            Rich Text Editor
          </h2>
          <div>
            <RichTextEditor
              isRichText
              onChange={handleChange}
              placeholder="Placeholder"
            />
          </div>
        </section>
      </main>
    </>
  )
}

export default UIKitPage
