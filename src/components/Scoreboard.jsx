import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Compute the consecutive-day morning-anchor streak ending at viewedDate.
// Pulls all anchor dates and counts backward from viewedDate.
function computeStreakEndingAt(anchorDates, viewedDate) {
  // anchorDates: Set of YYYY-MM-DD strings
  if (!anchorDates.has(viewedDate)) return 0
  let streak = 0
  let cursor = viewedDate
  while (anchorDates.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

function shiftDay(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Monday-anchored week containing the given date
function weekBounds(viewedDate) {
  const [y, m, d] = viewedDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(dt)
  monday.setDate(dt.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)
  return { start: monday.toISOString(), end: sunday.toISOString() }
}

export default function Scoreboard({ userId, viewedDate, refreshKey }) {
  const [streak, setStreak] = useState(0)
  const [shippedThisWeek, setShippedThisWeek] = useState(0)
  const [inflationRatio, setInflationRatio] = useState(null)

  useEffect(() => {
    load()
  }, [userId, viewedDate, refreshKey])

  const load = async () => {
    // 1. Streak from anchor history
    const { data: anchorRows } = await supabase
      .from('morning_anchors')
      .select('date')
      .eq('user_id', userId)
      .lte('date', viewedDate)
    const anchorDates = new Set((anchorRows || []).map((r) => r.date))
    setStreak(computeStreakEndingAt(anchorDates, viewedDate))

    // 2. Shipped count for the week containing viewedDate
    const { start, end } = weekBounds(viewedDate)
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', start)
      .lt('completed_at', end)
    setShippedThisWeek(count || 0)

    // 3. Inflation insight - global across all time, not date-scoped
    const { data: logs } = await supabase
      .from('tasks')
      .select('estimated_minutes, actual_minutes')
      .eq('user_id', userId)
      .eq('completed', true)
      .not('estimated_minutes', 'is', null)
      .not('actual_minutes', 'is', null)
    if (logs && logs.length >= 5) {
      const ratios = logs.map((l) => l.estimated_minutes / l.actual_minutes)
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
      setInflationRatio(avg)
    } else {
      setInflationRatio(null)
    }
  }

  return (
    <>
      <div className="scoreboard">
        <div className="score-card score-card-streak">
          <div className="score-card-eyebrow">Anchor streak</div>
          <div className="score-card-number">{streak}</div>
          <div className="score-card-suffix">
            {streak === 1 ? 'day showing up' : 'days showing up'}
          </div>
        </div>
        <div className="score-card">
          <div className="score-card-eyebrow">This week</div>
          <div className="score-card-number">{shippedThisWeek}</div>
          <div className="score-card-suffix">
            {shippedThisWeek === 1 ? 'action shipped' : 'actions shipped'}
          </div>
        </div>
      </div>

      {inflationRatio !== null && inflationRatio < 0.9 && (
        <div className="insight" style={{ marginTop: 'var(--r3)' }}>
          <div className="insight-icon">i</div>
          <div className="insight-text">
            You estimate tasks at <strong>{inflationRatio.toFixed(1)}×</strong> shorter than they actually take.
            {' '}When sizing the next task, multiply your gut estimate by <strong>{(1 / inflationRatio).toFixed(1)}×</strong>.
          </div>
        </div>
      )}
      {inflationRatio !== null && inflationRatio > 1.1 && (
        <div className="insight" style={{ marginTop: 'var(--r3)' }}>
          <div className="insight-icon">i</div>
          <div className="insight-text">
            Your estimates are <strong>{inflationRatio.toFixed(1)}×</strong> longer than reality.
            {' '}You're inflating task size — try cutting estimates by <strong>{((1 - 1 / inflationRatio) * 100).toFixed(0)}%</strong>.
          </div>
        </div>
      )}
    </>
  )
}
