import { useEffect, useRef, useState } from 'react'

// Triggers onRefresh when the user pulls down from the top of the page.
// Returns pullDistance (0–threshold) and refreshing state for the indicator.
export function usePullToRefresh(onRefresh, threshold = 72) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const startX = useRef(null)
  const active = useRef(false)
  // null = undecided, 'v' = vertical pull, 'h' = horizontal swipe (ignored)
  const axis = useRef(null)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0 && !refreshing) {
        startY.current = e.touches[0].clientY
        startX.current = e.touches[0].clientX
        active.current = true
        axis.current = null
      }
    }

    const onTouchMove = (e) => {
      if (!active.current || startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      const dx = e.touches[0].clientX - startX.current

      // Lock the gesture axis once movement is unambiguous. A horizontal
      // swipe must never drive the pull-to-refresh indicator.
      if (axis.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (axis.current === 'h') return

      if (dy > 0) setPullDistance(Math.min(dy * 0.5, threshold))
    }

    const onTouchEnd = () => {
      if (!active.current) return
      active.current = false
      if (pullDistance >= threshold) {
        setRefreshing(true)
        setTimeout(() => {
          onRefresh()
        }, 300)
      } else {
        setPullDistance(0)
      }
      startY.current = null
      startX.current = null
      axis.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, refreshing, onRefresh, threshold])

  return { pullDistance, refreshing }
}
