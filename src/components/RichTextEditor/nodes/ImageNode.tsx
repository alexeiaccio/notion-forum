import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createEditor,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical'
import * as React from 'react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

export interface ImagePayload {
  altText: string
  caption?: LexicalEditor
  height?: number
  key?: NodeKey
  maxWidth?: number
  showCaption?: boolean
  src: string
  width?: number
}

const imageCache = new Set()

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        imageCache.add(src)
        resolve(null)
      }
    })
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth,
}: {
  altText: string
  className: string | null
  height: 'inherit' | number
  imageRef: { current: null | HTMLImageElement }
  maxWidth: number
  src: string
  width: 'inherit' | number
}): JSX.Element {
  useSuspenseImage(src)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className || undefined}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        maxWidth,
        width,
      }}
      draggable="false"
    />
  )
}

function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
}: {
  altText: string
  caption: LexicalEditor
  height: 'inherit' | number
  maxWidth: number
  nodeKey: NodeKey
  resizable: boolean
  showCaption: boolean
  src: string
  width: 'inherit' | number
}): JSX.Element {
  const ref = useRef(null)
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)
  const [editor] = useLexicalComposerContext()
  const [selection, setSelection] = useState<any>(null)

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload
        event.preventDefault()
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.remove()
        }
        setSelected(false)
      }
      return false
    },
    [isSelected, nodeKey, setSelected],
  )

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        setSelection(editorState.read(() => $getSelection()))
      }),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload

          if (event.target === ref.current) {
            if (!event.shiftKey) {
              clearSelection()
            }
            setSelected(!isSelected)
            return true
          }

          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected])

  const draggable = isSelected && $isNodeSelection(selection)
  const isFocused = $isNodeSelection(selection) && isSelected

  return (
    <Suspense fallback={null}>
      <div draggable={draggable}>
        <LazyImage
          className={isFocused ? 'focused' : null}
          src={src}
          altText={altText}
          imageRef={ref}
          width={width}
          height={height}
          maxWidth={maxWidth}
        />
      </div>
    </Suspense>
  )
}

export type SerializedImageNode = Spread<
  {
    altText: string
    caption: SerializedEditor
    height?: number
    maxWidth: number
    showCaption: boolean
    src: string
    width?: number
    type: 'image'
    version: 1
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __width: 'inherit' | number
  __height: 'inherit' | number
  __maxWidth: number
  __showCaption: boolean
  __caption: LexicalEditor

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__key,
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, caption, src, showCaption } =
      serializedNode
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      showCaption,
      src,
      width,
    })
    const nestedEditor = node.__caption
    const editorState = nestedEditor.parseEditorState(caption.editorState)
    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState)
    }
    return node
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    key?: NodeKey,
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__maxWidth = maxWidth
    this.__width = width || 'inherit'
    this.__height = height || 'inherit'
    this.__showCaption = showCaption || false
    this.__caption = caption || createEditor()
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
    }
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable()
    writable.__showCaption = showCaption
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const { theme } = config
    const className = theme.image
    if (className !== undefined) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        showCaption={this.__showCaption}
        caption={this.__caption}
        resizable
      />
    )
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 800,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(
    src,
    altText,
    maxWidth,
    width,
    height,
    showCaption,
    caption,
    key,
  )
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode
}
