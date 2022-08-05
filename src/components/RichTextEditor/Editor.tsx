import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { AutoScrollPlugin } from '@lexical/react/LexicalAutoScrollPlugin'
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin'
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { SerializedEditorState } from 'lexical'
import * as React from 'react'

import CodeHighlightPlugin from './plugins/CodeHighlightPlugin'
import EquationsPlugin from './plugins/EquationsPlugin'
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin'
import { HandleChangePlugin } from './plugins/HandleChangePlugin'
import ImagesPlugin, { InsertImagePayload } from './plugins/ImagesPlugin'
import ToolbarPlugin from './plugins/ToolbarPlugin'
import { useSharedHistoryContext } from './SharedHistoryContext'

export interface IEditorProps {
  isRichText?: boolean
  isCharLimit?: boolean
  readOnly?: boolean
  placeholder?: string | JSX.Element | null
  className?: string
  onChange?: (state: string) => void
  onImageUpload?: (payload: File | undefined) => InsertImagePayload
}

export default function Editor({
  isRichText,
  readOnly,
  isCharLimit,
  placeholder,
  onChange,
  onImageUpload,
}: IEditorProps): JSX.Element {
  const { historyState } = useSharedHistoryContext()
  const scrollRef = React.useRef(null)

  return (
    <div
      ref={scrollRef}
      className="rounded-sm bg-slate-100 border-1 border-slate-300"
    >
      {!readOnly && isRichText && (
        <ToolbarPlugin onImageUpload={onImageUpload} />
      )}
      <div className="relative">
        {isRichText ? (
          <>
            {!readOnly && <FloatingToolbarPlugin />}
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
            <ListPlugin />
            <ImagesPlugin />
            <LinkPlugin />
          </>
        ) : (
          <PlainTextPlugin
            contentEditable={<ContentEditable className="p-2" />}
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
        )}
        {isCharLimit && <CharacterLimitPlugin charset="UTF-16" />}
      </div>
      {!readOnly && <HandleChangePlugin onChange={onChange} />}
      {!readOnly && (
        <>
          <HistoryPlugin externalHistoryState={historyState} />
          <AutoScrollPlugin scrollRef={scrollRef} />
          <MarkdownShortcutPlugin />
          <AutoFocusPlugin />
          <ClearEditorPlugin />
        </>
      )}
      <CodeHighlightPlugin />
      <EquationsPlugin />
    </div>
  )
}
