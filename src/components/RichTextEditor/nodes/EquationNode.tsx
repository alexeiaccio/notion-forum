import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical'
import {
  $getNodeByKey,
  COMMAND_PRIORITY_HIGH,
  DecoratorNode,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'
import { U } from 'ts-toolbelt'

import EquationEditor from '../components/EquationEditor'
import { MathRenderer } from '../components/MathRenderer'

type EquationComponentProps = {
  equation: string
  inline: boolean
  nodeKey: NodeKey
}

function EquationComponent({
  equation,
  inline,
  nodeKey,
}: EquationComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [equationValue, setEquationValue] = useState(equation)
  const [showEquationEditor, setShowEquationEditor] = useState<boolean>(false)
  const inputRef = useRef(null)
  const readOnly = !editor.isEditable()

  const onHide = useCallback(
    (restoreSelection?: boolean) => {
      setShowEquationEditor(false)
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isEquationNode(node)) {
          node.setEquation(equationValue)
          if (restoreSelection) {
            node.selectNext(0, 0)
          }
        }
      })
    },
    [editor, equationValue, nodeKey],
  )

  useEffect(() => {
    if (showEquationEditor) {
      return mergeRegister(
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          (_payload) => {
            const { activeElement } = document
            const inputElem = inputRef.current
            if (inputElem !== activeElement) {
              onHide()
            }
            return false
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          (_payload) => {
            const { activeElement } = document
            const inputElem = inputRef.current
            if (inputElem === activeElement) {
              onHide(true)
              return true
            }
            return false
          },
          COMMAND_PRIORITY_HIGH,
        ),
      )
    }
  }, [editor, onHide, showEquationEditor])

  return (
    <>
      {showEquationEditor ? (
        <EquationEditor
          equation={equationValue}
          setEquation={setEquationValue}
          inline={inline}
          inputRef={inputRef}
        />
      ) : (
        <MathRenderer
          equation={equationValue}
          inline={inline}
          onClick={() => {
            !readOnly && setShowEquationEditor(true)
          }}
        />
      )}
    </>
  )
}

export type SerializedEquationNode = U.Merge<
  | {
      type: 'equation'
      equation: string
      inline: boolean
    }
  | SerializedLexicalNode
>

export class EquationNode extends DecoratorNode<JSX.Element> {
  __equation: string
  __inline: boolean

  static getType(): string {
    return 'equation'
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__equation, node.__inline, node.__key)
  }

  constructor(equation: string, inline?: boolean, key?: NodeKey) {
    super(key)
    this.__equation = equation
    this.__inline = inline ?? false
  }

  static importJSON(serializedNode: SerializedEquationNode): EquationNode {
    const node = $createEquationNode(
      serializedNode.equation,
      serializedNode.inline,
    )
    return node
  }

  exportJSON(): SerializedEquationNode {
    return {
      equation: this.getEquation(),
      inline: this.__inline,
      type: 'equation',
      version: 1,
    }
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement(this.__inline ? 'span' : 'div')
  }

  updateDOM(prevNode: EquationNode): boolean {
    // If the inline property changes, replace the element
    return this.__inline !== prevNode.__inline
  }

  getEquation(): string {
    return this.__equation
  }

  setEquation(equation: string): void {
    const writable = this.getWritable()
    writable.__equation = equation
  }

  decorate(): JSX.Element {
    return (
      <EquationComponent
        equation={this.__equation}
        inline={this.__inline}
        nodeKey={this.__key}
      />
    )
  }
}

export function $createEquationNode(
  equation = '',
  inline = false,
): EquationNode {
  const equationNode = new EquationNode(equation, inline)
  return equationNode
}

export function $isEquationNode(
  node: LexicalNode | null | undefined,
): node is EquationNode {
  return node instanceof EquationNode
}
