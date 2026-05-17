import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'

export default function MorningAnchor({ userId, viewedDate, onAnchorChange }) {
  const [anchor, setAnchor] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [feeling, setFeeling] = useState('')
  const [win, setWin] = useState('')
  const [focus, setFocus] = useState('')
  const isToday = viewedDate === todayISO()

  useEffect(() => {
    loadAnchor()
  }, [userId, viewedDate])

  const loadAnchor = async () => {
    const { data } = await supabase
      .from('morning_anchors')
      .select('*')
      .eq('user_id', userId)
      .eq('date', viewedDate)
      .maybeSingle()
    if (data) {
      setAnchor(data)
      setFeeling(data.feeling || '')
      setWin(data.win || '')
      setFocus(data.focus || '')
      setExpanded(false)
    } else {
      setAnchor(null)
      setFeeling('')
      setWin('')
      setFocus('')
      setExpanded(isToday) // auto-expand the form for today, hide for past days with no anchor
    }
  }

  const save = async () => {
    if (!feeling && !win && !focus) return
    const { data } = await supabase
      .from('morning_anchors')
      .upsert(
        { user_id: userId, date: viewedDate, feeling, win, focus },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()
    setAnchor(data)
    setExpanded(false)
    onAnchorChange?.() // tell parent so streak can recalculate
  }

  // If anchor exists and we're not editing — show the summary card
  if (anchor && !expanded) {
    const headline = isToday
      ? "Let's make today your best one yet."
      : `Anchor from ${new Date(viewedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`

    return (
      <div className="anchor-summary">
        <button className="anchor-edit" onClick={() => setExpanded(true)}>
          Edit
        </button>
        <h2 className="anchor-summary-headline">{headline}</h2>
        <div className="anchor-summary-grid">
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Feeling</span>
            <span className={`anchor-summary-row-value ${!anchor.feeling ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.feeling || '—'}
            </span>
          </div>
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Win</span>
            <span className={`anchor-summary-row-value ${!anchor.win ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.win || '—'}
            </span>
          </div>
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Focus</span>
            <span className={`anchor-summary-row-value ${!anchor.focus ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.focus || '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // If there's no anchor and we're viewing a past day — show a quiet collapsed hint
  if (!anchor && !expanded) {
    return (
      <div className="anchor-collapsed" onClick={() => setExpanded(true)}>
        <span className="anchor-collapsed-text">No anchor recorded for this day · tap to add</span>
      </div>
    )
  }

  // Expanded form
  return (
    <div className="anchor">
      <h2 className="anchor-header">Three questions before the day begins.</h2>
      <p className="anchor-instructions">
        {isToday
          ? 'No phone for 20 minutes. Answer honestly. Move on.'
          : 'Backfilling this day. Be honest about what was true then.'}
      </p>
      <div className="anchor-field">
        <label className="anchor-label">01 — How am I feeling?</label>
        <input
          className="anchor-input"
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          placeholder="Honestly, in one line"
        />
      </div>
      <div className="anchor-field">
        <label className="anchor-label">02 — What would make today a win?</label>
        <input
          className="anchor-input"
          value={win}
          onChange={(e) => setWin(e.target.value)}
          placeholder="One specific thing"
        />
      </div>
      <div className="anchor-field">
        <label className="anchor-label">03 — Where will my focus go?</label>
        <input
          className="anchor-input"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="The one priority above all"
        />
      </div>
      <button className="anchor-done" onClick={save}>Done</button>
    </div>
  )
}
