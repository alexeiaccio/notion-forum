import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  EditorState,
  ElementNode,
  LexicalNode,
  RangeSelection,
} from 'lexical'
import React from 'react'
import { boolean } from 'zod'
import {
  AnnotationType,
  ChildrenType,
  RichTextRequestSchema,
} from '~/utils/notion/types'

export function HandleChangePlugin({
  onChange,
}: {
  onChange?: (state: string) => void
  onChangeTimeoutMs?: number
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const handleChange = React.useCallback(() => {
    onChange?.(JSON.stringify(generateContent(editor.getEditorState())))
  }, [editor, onChange])

  return (
    <OnChangePlugin
      onChange={handleChange}
      ignoreInitialChange
      ignoreSelectionChange
    />
  )
}

function generateContent(editorState: EditorState): Record<string, any> {
  let state: ChildrenType = []
  editorState.read(() => {
    state = visitTree($getRoot())
  })
  return state
}

function visitChildren(currentNode: ElementNode): RichTextRequestSchema[] {
  const richText: RichTextRequestSchema[] = []
  const childNodes = currentNode.getChildren()
  childNodes.forEach((childNode) => {
    const type = childNode.getType() || ''

    const annotations = FORMAT_PREDICATES.reduce<AnnotationType>(
      (res, predicate) => {
        if (predicate(childNode)) {
          res[predicate(childNode)] = true
        }
        return res
      },
      {},
    )
    switch (type) {
      case 'text': {
        richText.push({
          type: 'text',
          text: {
            content: childNode.getTextContent(),
          },
          ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
        })
        break
      }
      default:
        break
    }
  })
  return richText
}

function visitTree(currentNode: ElementNode): ChildrenType {
  const childNodes = currentNode.getChildren()
  const children: ChildrenType = []
  childNodes.forEach((childNode) => {
    const type = childNode.getType() || ''
    if ($isElementNode(childNode)) {
      switch (type) {
        case 'heading': {
          children.push({
            type: 'heading_3',
            heading_3: {
              rich_text: visitChildren(childNode),
            },
          })
          break
        }
        case 'paragraph': {
          children.push({
            type: 'paragraph',
            paragraph: {
              rich_text: visitChildren(childNode),
            },
          })
          break
        }
        default:
          break
      }
    }
  })
  return children
}

const FORMAT_PREDICATES = [
  (node: LexicalNode) => node.hasFormat('bold') && 'bold',
  (node: LexicalNode) => node.hasFormat('code') && 'code',
  (node: LexicalNode) => node.hasFormat('italic') && 'italic',
  (node: LexicalNode) => node.hasFormat('strikethrough') && 'strikethrough',
  (node: LexicalNode) => node.hasFormat('underline') && 'underline',
] as const
