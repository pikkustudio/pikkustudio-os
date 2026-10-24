import { useCallback, useEffect, useRef, useState } from 'react'

/** How far from the end still counts as "at the bottom", so a pixel of rounding doesn't break following. */
const SLACK = 48

/**
 * Keeps a scrolling log pinned to its end while the reader is there: new content follows them down.
 * Scrolling up lets go; `atBottom` turns false so the caller can offer a way back, and `toBottom` takes them there and pins again.
 */
export function useStickToBottom<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const stuck = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  const toBottom = useCallback(() => {
    stuck.current = true
    setAtBottom(true)
    if (el) el.scrollTop = el.scrollHeight
  }, [el])

  useEffect(() => {
    if (!el) return
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight <= SLACK
      stuck.current = near
      setAtBottom(near)
    }
    const follow = () => {
      if (stuck.current) el.scrollTop = el.scrollHeight
      else setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= SLACK)
    }
    const changes = new MutationObserver(follow)
    changes.observe(el, { childList: true, subtree: true, characterData: true })
    const size = new ResizeObserver(follow)
    size.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    stuck.current = true
    follow()
    return () => {
      changes.disconnect()
      size.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [el])

  return { ref: setEl, atBottom, toBottom }
}
