import { $isCodeHighlightNode } from '@lexical/code'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isAtNodeEnd } from '@lexical/selection'
import {
  BarChartIcon,
  CheckIcon,
  CodeIcon,
  FontBoldIcon,
  FontItalicIcon,
  Link2Icon,
  TrashIcon,
  UnderlineIcon,
} from '@radix-ui/react-icons'
import { Popover, usePopoverState } from 'ariakit'
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  ElementNode,
  FORMAT_TEXT_COMMAND,
  RangeSelection,
  TextNode,
} from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ToolbalTooltip,
  Toolbar,
  ToolbarButton,
  ToolbarForm,
  ToolbarSeparator,
} from '../components/EditorToolbar'
import { $isEquationNode } from '../nodes/EquationNode'
import { INSERT_EQUATION_COMMAND } from './EquationsPlugin'

export const FloatingToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext()
  const [_isText, setIsText] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isCode, setIsCode] = useState(false)
  // const [isEquation, setIsEquation] = useState(false)
  // const [isLink, setIsLink] = useState(false)
  // const [editlink, setEditLink] = useState(false)
  // const [link, setLink] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const popover = usePopoverState({
    placement: 'top',
    gutter: 8,
  })

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      const nativeSelection = window.getSelection()
      const rootElement = editor.getRootElement()

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false)
        return
      }

      if (!$isRangeSelection(selection)) {
        return
      }

      const node = getSelectedNode(selection)

      if (
        selection !== null &&
        nativeSelection !== null &&
        !nativeSelection.isCollapsed &&
        rootElement !== null &&
        rootElement.contains(nativeSelection.anchorNode) &&
        nativeSelection?.rangeCount
      ) {
        popover.anchorRef.current = editor.getElementByKey(node.getKey())
        popover.setOpen(true)
      } else {
        popover.setOpen(false)
        // setEditLink(false)
      }

      // Update text format
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsCode(selection.hasFormat('code'))
      // setIsEquation($isEquationNode(node))

      // Update links
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

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ''
      ) {
        setIsText($isTextNode(node))
      } else {
        setIsText(false)
      }
    })
  }, [editor, popover])

  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup)
    return () => {
      document.removeEventListener('selectionchange', updatePopup)
    }
  }, [updatePopup])

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      updatePopup()
    })
  }, [editor, updatePopup])

  // const insertLink = useCallback(
  //   (url: string) => {
  //     editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  //     setEditLink(false)
  //   },
  //   [editor],
  // )

  const insertEquation = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      editor.dispatchCommand(INSERT_EQUATION_COMMAND, {
        equation: selection.getTextContent(),
        inline: true,
      })
    })
  }, [editor])

  return (
    <Popover state={popover} autoFocusOnShow={false} ref={popoverRef}>
      {
        /* editlink ? (
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
                <TrashIcon
                  onClick={() =>
                    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
                  }
                />
              </ToolbalTooltip>
            )
          }
          placeholder="Link"
        />
      ) :  */ <Toolbar className="flex gap-2 p-2 rounded-md shadow-lg bg-slate-200">
          <ToolbarButton
            title="Bold"
            isActive={isBold}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
            }}
          >
            <FontBoldIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            isActive={isItalic}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
            }}
          >
            <FontItalicIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            isActive={isUnderline}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
            }}
          >
            <UnderlineIcon />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton
            title="Code"
            isActive={isCode}
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
            }}
          >
            <CodeIcon />
          </ToolbarButton>
          {/* <ToolbarButton
            isActive={isEquation}
            title="Equation"
            onClick={insertEquation}
          >
            <BarChartIcon />
          </ToolbarButton> */}
          <ToolbarSeparator />
          {/* <ToolbarButton
            title={isLink ? 'Edit' : 'Link'}
            isActive={isLink}
            onClick={() => setEditLink(true)}
          >
            <Link2Icon />
          </ToolbarButton> */}
        </Toolbar>
      }
    </Popover>
  )
}

export function getSelectedNode(
  selection: RangeSelection,
): TextNode | ElementNode {
  const { anchor } = selection
  const { focus } = selection
  const anchorNode = selection.anchor.getNode()
  const focusNode = selection.focus.getNode()
  if (anchorNode === focusNode) {
    return anchorNode
  }
  const isBackward = selection.isBackward()
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode
  }
}
