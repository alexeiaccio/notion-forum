import { OverflowNode } from '@lexical/overflow'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  LexicalNode,
} from 'lexical'
import { nil } from 'tsdef'
import { ContentType } from '~/utils/notion/types'
import { CharacterLimitPlugin } from './plugins/CharacterLimitPlugin'
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin'
import { HandleChangePlugin } from './plugins/HandleChangePlugin'
import { TextFormatType, textFormatType } from './types'

interface Props {
  defaultValue?: ContentType[] | nil
  placeholder?: string
  onChange?: (state: string) => void
  charLimit?: number
}

export function InfoEditor({
  defaultValue,
  placeholder,
  onChange,
  charLimit,
}: Props) {
  const initialConfig = {
    editorState: parseDefaultValue(defaultValue),
    namespace: 'InfoEditor',
    nodes: [OverflowNode],
    onError: (error: any) => {
      throw error
    },
    theme: {
      characterLimit: 'text-red-500',
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
        {charLimit && (
          <div className="flex items-baseline px-4 py-2 border-t border-t-slate-600">
            <CharacterLimitPlugin charLimit={charLimit} />
          </div>
        )}
      </div>
      <HandleChangePlugin onChange={onChange} />
    </LexicalComposer>
  )
}

function parseDefaultValue(value: ContentType[] | nil) {
  return function parseEditorState() {
    const root = $getRoot()
    if (root.getFirstChild() === null) {
      value?.forEach((block) => {
        switch (block.type) {
          case 'paragraph': {
            const paragraph = $createParagraphNode()
            const textNodes: LexicalNode[] = []
            block.rich_text?.forEach((text) => {
              switch (text.type) {
                case 'text': {
                  const node = $createTextNode(text.text)
                  Object.keys(text.annotations).forEach((key) => {
                    if (
                      textFormatType.safeParse(key).success &&
                      text.annotations[key]
                    ) {
                      node.toggleFormat(key as TextFormatType)
                    }
                  })
                  textNodes.push(node)
                  break
                }
                default:
                  break
              }
            })
            paragraph.append(...textNodes)
            root.append(paragraph)
            break
          }
          default:
            break
        }
      })
    }
  }
}

export default InfoEditor
