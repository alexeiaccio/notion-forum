import { $createCodeNode } from '@lexical/code'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text'
import { $wrapLeafNodesInElements } from '@lexical/selection'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  BarChartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  DropdownMenuIcon,
  ImageIcon,
  Link2Icon,
  LinkBreak2Icon,
  ListBulletIcon,
  ResetIcon,
} from '@radix-ui/react-icons'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { useCallback, useEffect, useState } from 'react'

import {
  ToolbalTooltip,
  Toolbar,
  ToolbarButton,
  ToolbarForm,
  ToolbarImageForm,
  ToolbarPopover,
  ToolbarSelect,
  ToolbarSeparator,
} from '../components/EditorToolbar'
import { INSERT_EQUATION_COMMAND } from './EquationsPlugin'
import { getSelectedNode } from './FloatingToolbarPlugin'
import { InsertImagePayload, INSERT_IMAGE_COMMAND } from './ImagesPlugin'

const supportedBlockTypes = new Set([
  // 'h1',
  // 'h2',
  'h3',
  // 'h4',
  'paragraph',
  // 'quote',
])

export default function ToolbarPlugin({
  onImageUpload,
}: {
  onImageUpload?: (payload: File | undefined) => InsertImagePayload
}) {
  const [editor] = useLexicalComposerContext()
  const [activeEditor, setActiveEditor] = useState(editor)
  const [blockType, setBlockType] = useState('paragraph')
  // const [isCode, setIsCode] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  // const [isLink, setIsLink] = useState(false)
  // const [link, setLink] = useState('')
  const BLOCK_TYPES = [
    // { value: 'h1', label: 'Heading 1' },
    // { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'paragraph', label: 'Paragraph' },
    // { value: 'h4', label: 'Heading 4' },
    // { value: 'quote', label: 'Quote' },
  ]

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = activeEditor.getElementByKey(elementKey)

      // Update text format
      // setIsCode(selection.hasFormat('code'))

      // Update block type
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          )
          const type = parentList
            ? parentList.getListType()
            : element.getListType()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType()
          setBlockType(type)
        }
      }

      // Update links
      // const node = getSelectedNode(selection)
      // const parent = node.getParent()
      // if ($isLinkNode(node)) {
      //   setIsLink(true)
      //   setLink(node.getURL())
      // } else if ($isLinkNode(parent)) {
      //   setIsLink(true)
      //   setLink(parent.getURL())
      // } else {
      //   setIsLink(false)
      //   setLink('')
      // }
    }
  }, [activeEditor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar()
        setActiveEditor(newEditor)
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, updateToolbar])

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  }, [activeEditor, updateToolbar])

  const formatBlockType = (type: string) => {
    if (!supportedBlockTypes.has(type)) return
    if (blockType !== 'paragraph' && type === 'paragraph') {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          $wrapLeafNodesInElements(selection, () => $createParagraphNode())
        }
      })
    }
    // if (blockType !== 'quote' && type === 'quote') {
    //   editor.update(() => {
    //     const selection = $getSelection()

    //     if ($isRangeSelection(selection)) {
    //       $wrapLeafNodesInElements(selection, () => $createQuoteNode())
    //     }
    //   })
    // }
    if (blockType !== type) {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          $wrapLeafNodesInElements(selection, () =>
            $createHeadingNode(type as HeadingTagType),
          )
        }
      })
    }
  }
  // const formatNumberedList = () => {
  //   if (blockType !== 'number') {
  //     editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  //   } else {
  //     editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
  //   }
  // }
  // const formatBulletList = () => {
  //   if (blockType !== 'bullet') {
  //     editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  //   } else {
  //     editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
  //   }
  // }
  // const formatCode = () => {
  //   if (blockType !== 'code') {
  //     editor.update(() => {
  //       const selection = $getSelection()

  //       if ($isRangeSelection(selection)) {
  //         if (selection.isCollapsed()) {
  //           $wrapLeafNodesInElements(selection, () => $createCodeNode('python'))
  //         } else {
  //           const textContent = selection.getTextContent()
  //           const codeNode = $createCodeNode('python')
  //           selection.removeText()
  //           selection.insertNodes([codeNode])
  //           selection.insertRawText(textContent)
  //         }
  //       }
  //     })
  //   }
  // }
  // const insertLink = (url: string) => {
  //   activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  // }

  return (
    <div>
      <Toolbar className="flex justify-between gap-2 p-2 border-b border-b-slate-400">
        <ToolbarSelect
          title="Block type"
          options={BLOCK_TYPES}
          value={blockType}
          onChange={formatBlockType}
        >
          <DropdownMenuIcon />
        </ToolbarSelect>
        <ToolbarSeparator />
        {/* <ToolbarButton
          title="Numbered list"
          isActive={blockType === 'number'}
          onClick={formatNumberedList}
        >
          <ListBulletIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          isActive={blockType === 'bullet'}
          onClick={formatBulletList}
        >
          <ListBulletIcon />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          title="Increase indent"
          onClick={() =>
            activeEditor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
          }
        >
          <ChevronRightIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Decrease indent"
          onClick={() =>
            activeEditor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
          }
        >
          <ChevronLeftIcon />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          title="Code"
          isActive={isCode}
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
          }}
        >
          <CodeIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          isActive={blockType === 'code'}
          onClick={formatCode}
        >
          <CodeIcon />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarPopover isActive={isLink} title="Link" button={<Link2Icon />}>
          <ToolbarForm
            onSubmit={insertLink}
            defaultValue={link}
            submit={
              <ToolbalTooltip title="Save">
                <CheckIcon />
              </ToolbalTooltip>
            }
            reset={
              link && (
                <ToolbalTooltip title="Delete link">
                  <LinkBreak2Icon
                    onClick={() =>
                      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
                    }
                  />
                </ToolbalTooltip>
              )
            }
            placeholder="Link"
          />
        </ToolbarPopover>
        <ToolbarPopover title="Image" button={<ImageIcon />}>
          <ToolbarImageForm
            onUpload={onImageUpload}
            onSubmit={(payload: InsertImagePayload) => {
              activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload)
            }}
            submit="Insert image"
            placeholder="Link"
          />
        </ToolbarPopover>
        <ToolbarSeparator />
        <ToolbarButton
          title="Equation"
          onClick={() => {
            activeEditor.dispatchCommand(INSERT_EQUATION_COMMAND, {
              equation: 'Equation',
              inline: true,
            })
          }}
        >
          <BarChartIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Equation block"
          onClick={() => {
            activeEditor.dispatchCommand(INSERT_EQUATION_COMMAND, {
              equation: 'Equation',
              inline: false,
            })
          }}
        >
          <BarChartIcon />
        </ToolbarButton> */}
        <ToolbarSeparator className="ml-auto" />
        <ToolbarButton
          title="Undo"
          className="disabled:opacity-50"
          onClick={() => {
            activeEditor.dispatchCommand(UNDO_COMMAND, undefined)
          }}
          disabled={!canUndo}
        >
          <ResetIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          className="-scale-x-100 disabled:opacity-50"
          onClick={() => {
            activeEditor.dispatchCommand(REDO_COMMAND, undefined)
          }}
          disabled={!canRedo}
        >
          <ResetIcon />
        </ToolbarButton>
      </Toolbar>
    </div>
  )
}
