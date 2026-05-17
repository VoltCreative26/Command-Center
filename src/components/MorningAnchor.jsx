import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'

export default function MorningAnchor({ userId, viewedDate, onAnchorChange }) {
  const [anchor, setAnchor] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [yesterdayWin, setYesterdayWin] = useState('')
  const [futureMattThanks, setFutureMattThanks] = useState('')
  const [nonNegotiable, setNonNegotiable] = useState('')
  const [sayNoTo, setSayNoTo] = useState('')
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
      setYesterdayWin(data.feeling || '')
      setFutureMattThanks(data.win || '')
      setNonNegotiable(data.focus || '')
      setSayNoTo(data.say_no_to || '')
      setExpanded(false)
    } else {
      setAnchor(null)
      setYesterdayWin('')
      setFutureMattThanks('')
      setNonNegotiable('')
      setSayNoTo('')
      setExpanded(isToday)
    }
  }

  const save = async () => {
    if (!futureMattThanks || !nonNegotiable || !sayNoTo) return
    const { data } = await supabase
      .from('morning_anchors')
      .upsert(
        {
          user_id: userId,
          date: viewedDate,
          feeling: yesterdayWin,
          win: futureMattThanks,
          focus: nonNegotiable,
          say_no_to: sayNoTo,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()
    setAnchor(data)
    setExpanded(false)
    onAnchorChange?.()
  }

  // Summary card — anchor exists and not editing
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
          {anchor.feeling && (
            <div className="anchor-summary-row">
              <span className="anchor-summary-row-label">Yesterday</span>
              <span className="anchor-summary-row-value">{anchor.feeling}</span>
            </div>
          )}
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Future Matt</span>
            <span className={`anchor-summary-row-value ${!anchor.win ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.win || '—'}
            </span>
          </div>
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Today</span>
            <span className={`anchor-summary-row-value ${!anchor.focus ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.focus || '—'}
            </span>
          </div>
          <div className="anchor-summary-row">
            <span className="anchor-summary-row-label">Say No</span>
            <span className={`anchor-summary-row-value ${!anchor.say_no_to ? 'anchor-summary-row-empty' : ''}`}>
              {anchor.say_no_to || '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed hint for past days with no anchor
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
        <label className="anchor-label">01 — What did I do well yesterday? <span className="anchor-label-optional">(optional)</span></label>
        <input
          className="anchor-input"
          value={yesterdayWin}
          onChange={(e) => setYesterdayWin(e.target.value)}
          placeholder="A win, big or small"
        />
      </div>
      <div className="anchor-field">
        <label className="anchor-label">02 — What would future Matt thank me for doing today?</label>
        <input
          className="anchor-input"
          value={futureMattThanks}
          onChange={(e) => setFutureMattThanks(e.target.value)}
          placeholder="The move that compounds"
        />
      </div>
      <div className="anchor-field">
        <label className="anchor-label">03 — What's my non-negotiable today?</label>
        <input
          className="anchor-input"
          value={nonNegotiable}
          onChange={(e) => setNonNegotiable(e.target.value)}
          placeholder="The one thing that must happen"
        />
      </div>
      <div className="anchor-field">
        <label className="anchor-label">04 — What will I say no to today?</label>
        <input
          className="anchor-input"
          value={sayNoTo}
          onChange={(e) => setSayNoTo(e.target.value)}
          placeholder="Protect your focus"
        />
      </div>
      <button className="anchor-done" onClick={save}>Done</button>
    </div>
  )
}
