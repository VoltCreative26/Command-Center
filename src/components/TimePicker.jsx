// Time stored as a string like "8:30 AM", "12:00 PM", "2:15 PM"
// Hour: 1-12, Minute: 00/15/30/45, Period: AM/PM

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = ['00', '15', '30', '45']
const PERIODS = ['AM', 'PM']

// Parse a stored time string into parts. Falls back to safe defaults if malformed.
export function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 9, minute: '00', period: 'AM' }
  }
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return { hour: 9, minute: '00', period: 'AM' }
  let h = parseInt(match[1], 10)
  if (h < 1 || h > 12) h = 9
  let m = match[2]
  if (!MINUTES.includes(m)) {
    // Snap to nearest valid minute
    const mNum = parseInt(m, 10)
    if (mNum < 8) m = '00'
    else if (mNum < 23) m = '15'
    else if (mNum < 38) m = '30'
    else if (mNum < 53) m = '45'
    else { m = '00'; h = h === 12 ? 1 : h + 1 }
  }
  const p = match[3].toUpperCase()
  return { hour: h, minute: m, period: p }
}

export function formatTime(hour, minute, period) {
  return `${hour}:${minute} ${period}`
}

export default function TimePicker({ value, onChange }) {
  const { hour, minute, period } = parseTime(value)

  const update = (h, m, p) => {
    onChange(formatTime(h, m, p))
  }

  return (
    <span className="time-picker">
      <select
        value={hour}
        onChange={(e) => update(parseInt(e.target.value, 10), minute, period)}
        aria-label="Hour"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="time-picker-colon">:</span>
      <select
        value={minute}
        onChange={(e) => update(hour, e.target.value, period)}
        aria-label="Minute"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        className="time-picker-period-select"
        value={period}
        onChange={(e) => update(hour, minute, e.target.value)}
        aria-label="AM or PM"
        style={{
          paddingLeft: 8,
          marginLeft: 4,
          borderLeft: '1px solid var(--line)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.02em',
        }}
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </span>
  )
}
