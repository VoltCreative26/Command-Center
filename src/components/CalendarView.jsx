import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'

function getWeekDates(base) {
  const d = new Date(base + 'T00:00:00')
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(d)
  monday.setDate(d.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd.toISOString().split('T')[0]
  })
}

function getMonthDates(base) {
  const d = new Date(base + 'T00:00:00')
  const year = d.getFullYear()
  const month = d.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const offset = startDow === 0 ? -6 : 1 - startDow
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() + offset)
  const dates = []
  const cur = new Date(start)
  while ((cur <= lastDay || dates.length % 7 !== 0) && dates.length < 42) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarView({ userId, viewedDate, mode, onDayClick }) {
  const [calBase, setCalBase] = useState(viewedDate)
  const [tasks, setTasks] = useState([])
  const today = todayISO()

  useEffect(() => { setCalBase(viewedDate) }, [viewedDate])

  useEffect(() => { loadTasks() }, [userId, calBase, mode])

  const loadTasks = async () => {
    const dates = mode === 'week' ? getWeekDates(calBase) : getMonthDates(calBase)
    if (!dates.length) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', dates[0])
      .lte('due_date', dates[dates.length - 1])
    setTasks(data || [])
  }

  const navigate = (dir) => {
    const d = new Date(calBase + 'T00:00:00')
    if (mode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCalBase(d.toISOString().split('T')[0])
  }

  const dates = mode === 'week' ? getWeekDates(calBase) : getMonthDates(calBase)
  const calMonth = new Date(calBase + 'T00:00:00')

  const tasksByDate = {}
  tasks.forEach((t) => {
    if (!t.due_date) return
    if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = []
    tasksByDate[t.due_date].push(t)
  })

  const rangeLabel = mode === 'week'
    ? (() => {
        const first = new Date(dates[0] + 'T00:00:00')
        const last = new Date(dates[6] + 'T00:00:00')
        return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      })()
    : calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="cal-view">
      <div className="cal-nav">
        <button className="cal-nav-arrow" onClick={() => navigate(-1)}>‹</button>
        <span className="cal-nav-label">{rangeLabel}</span>
        <button className="cal-nav-arrow" onClick={() => navigate(1)}>›</button>
      </div>

      <div className={`cal-grid cal-grid--${mode}`}>
        {DAY_NAMES.map((d) => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
        {dates.map((date) => {
          const dayTasks = tasksByDate[date] || []
          const isToday = date === today
          const isViewed = date === viewedDate
          const dayNum = new Date(date + 'T00:00:00').getDate()
          const isCurrentMonth = mode === 'week'
            ? true
            : new Date(date + 'T00:00:00').getMonth() === calMonth.getMonth()

          return (
            <div
              key={date}
              className={[
                'cal-cell',
                isToday ? 'cal-cell--today' : '',
                isViewed ? 'cal-cell--viewed' : '',
                !isCurrentMonth ? 'cal-cell--outside' : '',
              ].join(' ')}
              onClick={() => onDayClick(date)}
            >
              <span className="cal-cell-num">{dayNum}</span>
              <div className="cal-cell-tasks">
                {dayTasks.slice(0, mode === 'week' ? 5 : 3).map((t) => (
                  <div key={t.id} className={`cal-task-chip ${t.completed ? 'done' : ''}`}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > (mode === 'week' ? 5 : 3) && (
                  <div className="cal-task-more">
                    +{dayTasks.length - (mode === 'week' ? 5 : 3)} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
