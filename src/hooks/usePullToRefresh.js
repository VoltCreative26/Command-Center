import { useEffect, useRef, useState } from 'react'

// Triggers onRefresh when the user pulls down from the top of the page.
// Returns pullDistance (0–threshold) and refreshing state for the indicator.
export function usePullToRefresh(onRefresh, threshold = 72) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const active = useRef(false)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0 && !refreshing) {
        startY.current = e.touches[0].clientY
        active.current = true
      }
    }

    const onTouchMove = (e) => {
      if (!active.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) setPullDistance(Math.min(delta * 0.5, threshold))
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
