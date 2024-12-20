import { useTheme } from '@app/hooks/use-theme'
import { type SpringOptions, type Variants, motion, useMotionValue, } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const springConfig = {
  stiffness: 1000,
  damping: 70,
  velocity: 1000
} satisfies SpringOptions



function hasButtonOrAnchorAncestor(element: HTMLElement | null): boolean {
  if (!element) return false
  if (element.tagName === 'BUTTON' || element.tagName === 'A') return true
  return hasButtonOrAnchorAncestor(element.parentElement)
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
    default: {
    },
    pointer: {
      scale: 2.5,
    },
    text: {
      height: caretHeight,
      width: 2,
      borderRadius: 0,
    }
  } satisfies Variants

  const cursor = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<keyof typeof variants>('default')

  const storedPosition =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('cursor-position')
  const initialPosition = useRef<{ x: number; y: number }>(
    storedPosition ? JSON.parse(storedPosition) : { x: 0, y: 0 },
  )

  const positionX = useMotionValue(initialPosition.current.x)
  const positionY = useMotionValue(initialPosition.current.y)

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!cursor.current) return

      const isHovered = e.target instanceof HTMLElement && hasButtonOrAnchorAncestor(e.target)
      const postion = document.caretPositionFromPoint(e.clientX, e.clientY)
      const isOverText = !!postion && postion.offsetNode.nodeType === Node.TEXT_NODE && postion.offsetNode.parentElement === e.target

      const state = isHovered ? 'pointer' : isOverText ? 'text' : 'default'
      setState(state)
      if (state === 'text') {
        setCaretHeight(postion?.getClientRect()?.height || 0)
      }

      positionX.set(e.clientX)
      positionY.set(e.clientY)
      localStorage.setItem(
        'cursor-position',
        JSON.stringify({ x: e.clientX, y: e.clientY }),
      )
    }

    initialPosition.current.x = window.innerWidth / 2
    initialPosition.current.y = window.innerHeight / 2

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
