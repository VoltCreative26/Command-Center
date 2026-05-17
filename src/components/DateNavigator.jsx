import { useState, useRef, useEffect } from 'react'
import { todayISO } from '../lib/supabase'

// Format YYYY-MM-DD → { label: 'Monday', meta: 'November 14' }
function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const label = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const meta = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return { label, meta }
}

function shiftDay(isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  dateObj.setDate(dateObj.getDate() + delta)
  const yy = dateObj.getFullYear()
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const dd = String(dateObj.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export default function DateNavigator({ viewedDate, onChange }) {
  const today = todayISO()
  const isToday = viewedDate === today
  const isPast = viewedDate < today
  const { label, meta } = formatDate(viewedDate)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const goToToday = () => {
    onChange(today)
    setPickerOpen(false)
  }

  return (
    <div className="date-nav">
      <button
        className="date-nav-arrow"
        onClick={() => onChange(shiftDay(viewedDate, -1))}
        aria-label="Previous day"
      >
        ‹
      </button>

      <div
        className={`date-nav-current ${isPast ? 'past' : ''}`}
        onClick={() => setPickerOpen((o) => !o)}
        ref={pickerRef}
      >
        <span className="date-nav-label">{label}</span>
        <span className="date-nav-meta">
          {isToday ? 'Today' : isPast ? meta : meta}
        </span>
        {pickerOpen && (
          <div className="date-nav-picker" onClick={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={viewedDate}
              max={today}
              onChange={(e) => {
                onChange(e.target.value)
                setPickerOpen(false)
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      <button
        className="date-nav-arrow"
        onClick={() => onChange(shiftDay(viewedDate, 1))}
        disabled={isToday}
        style={isToday ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
        aria-label="Next day"
      >
        ›
      </button>

      {!isToday && (
        <button className="date-nav-today" onClick={goToToday}>
          Today
        </button>
      )}
    </div>
  )
}
