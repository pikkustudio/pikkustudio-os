import { Component, type ReactNode } from 'react'

type SlotBoundaryProps = { slot: string; addon: string; fallback: ReactNode; children: ReactNode }

/** Keeps a failing contribution to its own slot: the screen shows the core default there and goes on. */
export class SlotBoundary extends Component<SlotBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn(`The ${this.props.addon} addon's ${this.props.slot} contribution failed; showing the default`, error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
