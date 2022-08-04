import React, { PureComponent, ReactNode } from 'react'

interface IState {
  error: Error | null
}

interface IProps {
  children: ReactNode
}

// catch JavaScript errors anywhere in their child component tree,
// log those errors, and display a fallback UI
// https://reactjs.org/docs/error-boundaries.html
export class ErrorBoundary extends PureComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props)

    this.state = {
      error: null,
    }
  }

  componentDidCatch(error: Error): void {
    this.setState({ error })
  }

  render(): React.ReactNode {
    const { error } = this.state
    const { children } = this.props

    if (error) {
      console.error(error) // eslint-disable-line
      // render fallback UI
      return <div>{JSON.stringify(error, null, 2)}</div>
    }

    return children
  }
}
