/* eslint-disable jsx-a11y/no-autofocus */

import { Hovercard, HovercardAnchor, useHovercardState } from 'ariakit'
import * as React from 'react'
import { ChangeEvent, RefObject } from 'react'

import { MathRenderer } from './MathRenderer'

type BaseEquationEditorProps = {
  equation: string
  inline: boolean
  inputRef: { current: null | HTMLInputElement | HTMLTextAreaElement }
  setEquation: (equation: string) => void
}

export default function EquationEditor({
  equation,
  setEquation,
  inline,
  inputRef,
}: BaseEquationEditorProps): JSX.Element {
  const onChange = (event: any) => {
    setEquation(event.target.value)
  }

  const props = {
    equation,
    inputRef,
    onChange,
  }

  return inline ? (
    <InlineEquationEditor
      {...props}
      inputRef={inputRef as RefObject<HTMLInputElement>}
    />
  ) : (
    <BlockEquationEditor
      {...props}
      inputRef={inputRef as RefObject<HTMLTextAreaElement>}
    />
  )
}

type EquationEditorImplProps = {
  equation: string
  inputRef: { current: null | HTMLInputElement }
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

function InlineEquationEditor({
  equation,
  onChange,
  inputRef,
}: EquationEditorImplProps): JSX.Element {
  const hovercard = useHovercardState({
    placement: 'top',
    gutter: 8,
    sameWidth: true,
    open: true,
  })

  return (
    <HovercardAnchor as="span" state={hovercard}>
      <span>$</span>
      <input value={equation} onChange={onChange} ref={inputRef} autoFocus />
      <span>$</span>
      <Hovercard state={hovercard}>
        <MathRenderer equation={equation} inline={false} />
      </Hovercard>
    </HovercardAnchor>
  )
}

type BlockEquationEditorImplProps = {
  equation: string
  inputRef: { current: null | HTMLTextAreaElement }
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

function BlockEquationEditor({
  equation,
  onChange,
  inputRef,
}: BlockEquationEditorImplProps): JSX.Element {
  const hovercard = useHovercardState({
    placement: 'top',
    gutter: 8,
    sameWidth: true,
    open: true,
  })

  return (
    <HovercardAnchor as="div" state={hovercard}>
      <span>{'$$\n'}</span>
      <textarea value={equation} onChange={onChange} ref={inputRef} />
      <span>{'\n$$'}</span>
      <Hovercard state={hovercard}>
        <MathRenderer equation={equation} inline={false} />
      </Hovercard>
    </HovercardAnchor>
  )
}
