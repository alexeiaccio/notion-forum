import { OverflowNode } from '@lexical/overflow'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode } from '@lexical/rich-text'
import { CharacterLimitPlugin } from './plugins/CharacterLimitPlugin'
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin'
import { HandleChangePlugin } from './plugins/HandleChangePlugin'
import { MaxLengthPlugin } from './plugins/MaxLengthPlugin'

interface Props {
  placeholder?: string
  onChange?: (state: string) => void
  charLimit?: number
}

const initialConfig = {
  namespace: 'CommentEditor',
  nodes: [HeadingNode, OverflowNode],
  onError: (error: any) => {
    throw error
  },
  theme: {
    characterLimit: 'text-red-500',
    heading: {
      h3: 'font-semibold text-xl',
    },
    paragraph: 'text-slate-700',
    text: {
      bold: 'bold',
      code: 'text-amber-500 bg-slate-700 rounded-sm px-1.5 py-0.5',
      italic: 'italic',
      strikethrough: 'line-through',
      subscript: 'subscript',
      superscript: 'superscript',
      underline: 'underline',
      underlineStrikethrough: 'line-through',
    },
  },
}

export function CommentEditor({
  placeholder,
  onChange,
  charLimit,
}: Props): JSX.Element {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-sm bg-slate-100 ring-1 ring-slate-600">
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable className="p-4" />}
            placeholder={
              placeholder ? (
                <span className="absolute inset-0 flex items-center p-4 pointer-events-none text-slate-400">
                  {placeholder}
                </span>
              ) : (
                ''
              )
            }
          />
        </div>
        <FloatingToolbarPlugin />
        <div className="flex items-baseline px-4 py-2 border-t border-t-slate-600">
          {charLimit && (
            <>
              {/* <MaxLengthPlugin maxLength={charLimit + charLimit} /> */}
              <CharacterLimitPlugin charLimit={charLimit} />
            </>
          )}
        </div>
      </div>
      <HandleChangePlugin onChange={onChange} />
    </LexicalComposer>
  )
}
