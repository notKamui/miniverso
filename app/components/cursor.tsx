import { useTheme } from '@app/hooks/use-theme'
import { type Variants, motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

function hasButtonOrAnchorAncestor(element: HTMLElement | null): boolean {
  if (!element) return false
  if (element.tagName === 'BUTTON' || element.tagName === 'A') return true
  return hasButtonOrAnchorAncestor(element.parentElement)
}

function getTextRectOrNull(x: number, y: number): DOMRect | null {
  const element = document.elementFromPoint(x, y)
  if (element == null) return null
  const nodes = element.childNodes
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange()
      range.selectNode(node)
      const rects = range.getClientRects()
      for (const rect of rects) {
        if (
          x > rect.left &&
          x < rect.right &&
          y > rect.top &&
          y < rect.bottom
        ) {
          return rect
        }
      }
    }
  }
  return null
}

export function Cursor() {
  const { theme } = useTheme()

  useEffect(() => {
    const style = document.createElement('style')
    style.appendChild(document.createTextNode('* { cursor: none !important; }'))
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const [caretHeight, setCaretHeight] = useState(0)
  const variants = {
    default: {},
    pointer: {
      scale: 2.5,
    },
    text: {
      height: caretHeight,
      width: 2,
      borderRadius: 0,
    },
  } satisfies Variants

  const cursor = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<keyof typeof variants>('default')

  const positionX = useMotionValue(0)
  const positionY = useMotionValue(0)

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!cursor.current) return

      const isHovered =
        e.target instanceof HTMLElement && hasButtonOrAnchorAncestor(e.target)
      const textRect = getTextRectOrNull(e.clientX, e.clientY)

      const state = isHovered
        ? 'pointer'
        : textRect !== null
          ? 'text'
          : 'default'
      setState(state)
      if (state === 'text') {
        setCaretHeight(textRect!.height || 0)
      }

      positionX.set(e.clientX)
      positionY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [positionX.set, positionY.set])

  return (
    <motion.div
      ref={cursor}
      variants={variants}
      animate={state}
      style={{
        position: 'fixed',
        left: positionX,
        top: positionY,
        pointerEvents: 'none',
        zIndex: 9999,
        translateX: '-50%',
        translateY: '-50%',
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor:
          theme === 'dark' ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
        mixBlendMode: 'difference',
      }}
    />
  )
}
