import { useState, useEffect } from 'react'
import { supabase, todayISO, daysUntilExpiry } from '../lib/supabase'

export default function IdeaInbox({ userId, viewedDate, onIdeaShipped }) {
  const [ideas, setIdeas] = useState([])
  const [shippedThatDay, setShippedThatDay] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newAction, setNewAction] = useState('')
  const [pendingAction, setPendingAction] = useState({})
  const isToday = viewedDate === todayISO()

  useEffect(() => {
    load()
  }, [userId, viewedDate])

  const load = async () => {
    if (isToday) {
      // Today: auto-expire and show fresh inbox
      await supabase
        .from('ideas')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'fresh')
        .lt('expires_at', new Date().toISOString())

      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'fresh')
        .order('created_at', { ascending: false })
      setIdeas(data || [])
      setShippedThatDay([])
    } else {
      // Past day: show ideas that were active (fresh) on that date and those scheduled that day
      const endOfDay = `${viewedDate}T23:59:59`
      const startOfDay = `${viewedDate}T00:00:00`

      // Active ideas on that day: created on or before, not yet expired, not yet scheduled before that day
      const { data: active } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .lte('created_at', endOfDay)
        .gt('expires_at', startOfDay)
      // Filter: ideas that, at the close of viewedDate, were still fresh
      // i.e., either still status='fresh' today, OR scheduled_for is AFTER viewedDate, OR they were shipped/expired AFTER viewedDate
      const filtered = (active || []).filter((idea) => {
        if (idea.status === 'fresh') return true
        if (idea.scheduled_for && idea.scheduled_for > viewedDate) return true
        return false
      })
      setIdeas(filtered)

      // Ideas shipped on that day
      const { data: shipped } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_for', viewedDate)
      setShippedThatDay(shipped || [])
    }
  }

  const addIdea = async () => {
    if (!newTitle.trim()) return
    const { data } = await supabase
      .from('ideas')
      .insert({
        user_id: userId,
        title: newTitle.trim(),
        first_action: newAction.trim() || null,
      })
      .select()
      .single()
    if (data) setIdeas([data, ...ideas])
    setNewTitle('')
    setNewAction('')
  }

  const setIdeaAction = async (id, action) => {
    setIdeas(ideas.map((i) => (i.id === id ? { ...i, first_action: action } : i)))
    await supabase.from('ideas').update({ first_action: action }).eq('id', id)
  }

  const ship = async (idea) => {
    const actionText = idea.first_action || pendingAction[idea.id]
    if (!actionText || !actionText.trim()) {
      const promptedAction = prompt("What's the smallest first move? (under 25 min)")
      if (!promptedAction || !promptedAction.trim()) return
      await setIdeaAction(idea.id, promptedAction.trim())
      return ship({ ...idea, first_action: promptedAction.trim() })
    }
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', todayISO())
    await supabase.from('tasks').insert({
      user_id: userId,
      date: todayISO(),
      title: actionText,
      estimated_minutes: 25,
      from_idea_id: idea.id,
      position: count || 0,
    })
    await supabase
      .from('ideas')
      .update({ status: 'scheduled', scheduled_for: todayISO() })
      .eq('id', idea.id)
    setIdeas(ideas.filter((i) => i.id !== idea.id))
    onIdeaShipped()
  }

  const kill = async (id) => {
    setIdeas(ideas.filter((i) => i.id !== id))
    await supabase.from('ideas').update({ status: 'killed' }).eq('id', id)
  }

  // Past-day, read-only-style view
  if (!isToday) {
    const allItems = [
      ...shippedThatDay.map((i) => ({ ...i, _kind: 'shipped' })),
      ...ideas.map((i) => ({ ...i, _kind: 'active' })),
    ]
    if (allItems.length === 0) {
      return <div className="ideas-empty">No ideas in flight on this day.</div>
    }
    return (
      <div>
        {allItems.map((idea) => (
          <div key={idea.id} className="idea">
            <div className="idea-header">
              <div className="idea-title">{idea.title}</div>
              <div
                className="idea-countdown"
                style={idea._kind === 'shipped' ? { background: 'var(--primary-soft)', color: 'var(--primary-darker)' } : {}}
              >
                {idea._kind === 'shipped' ? 'Shipped' : 'Active'}
              </div>
            </div>
            {idea.first_action && <div className="idea-action">→ {idea.first_action}</div>}
          </div>
        ))}
      </div>
    )
  }

  // Today: full capture + action UI
  return (
    <div>
      <div className="idea-add">
        <input
          className="idea-add-title"
          placeholder="An idea worth capturing..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          className="idea-add-action"
          placeholder="Smallest first move (under 25 min)"
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addIdea()}
        />
        <div className="idea-add-row">
          <span className="idea-add-hint">Auto-expires in 7 days</span>
          <button className="btn-pill" onClick={addIdea}>Capture</button>
        </div>
      </div>

      {ideas.length === 0 ? (
        <div className="ideas-empty">No ideas in flight. Capture one, or focus on what's already on the schedule.</div>
      ) : (
        ideas.map((idea) => {
          const days = daysUntilExpiry(idea.expires_at)
          const cls = days <= 1 ? 'critical' : days <= 3 ? 'urgent' : ''
          return (
            <div key={idea.id} className="idea">
              <div className="idea-header">
                <div className="idea-title">{idea.title}</div>
                <div className={`idea-countdown ${cls}`}>
                  {days === 0 ? 'Expires today' : days === 1 ? '1 day left' : `${days} days left`}
                </div>
              </div>
              {idea.first_action ? (
                <div className="idea-action">→ {idea.first_action}</div>
              ) : (
                <>
                  <div className="idea-action-empty">No first action defined. What's the smallest move?</div>
                  <input
                    className="idea-action-input"
                    placeholder="Under 25 minutes..."
                    value={pendingAction[idea.id] || ''}
                    onChange={(e) =>
                      setPendingAction({ ...pendingAction, [idea.id]: e.target.value })
                    }
                    onBlur={(e) => e.target.value && setIdeaAction(idea.id, e.target.value)}
                  />
                </>
              )}
              <div className="idea-actions">
                <button className="idea-btn idea-btn-ship" onClick={() => ship(idea)}>
                  Ship today
                </button>
                <button className="idea-btn idea-btn-kill" onClick={() => kill(idea.id)}>
                  Kill it
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
