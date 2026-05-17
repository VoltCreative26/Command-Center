import { useState, useEffect } from 'react'
import { supabase, todayISO } from './lib/supabase'
import Auth from './components/Auth'
import DateNavigator from './components/DateNavigator'
import MorningAnchor from './components/MorningAnchor'
import Schedule, { useScheduleData, ScheduleBlocks, TasksList } from './components/Schedule'
import Scoreboard from './components/Scoreboard'
import EstimateModal from './components/EstimateModal'
import IdeaInbox from './components/IdeaInbox'
import NorthStars from './components/NorthStars'
import CalendarView from './components/CalendarView'

const DESKTOP_BREAKPOINT = 1200

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [estimateTask, setEstimateTask] = useState(null)
  const [scoreRefresh, setScoreRefresh] = useState(0)
  const [viewedDate, setViewedDate] = useState(todayISO())
  const [viewMode, setViewMode] = useState('day')
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleTaskComplete = (task) => {
    setScoreRefresh((k) => k + 1)
    setEstimateTask(task)
  }

  const handleAnchorChange = () => {
    setScoreRefresh((k) => k + 1)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const scheduleData = useScheduleData(session?.user?.id, viewedDate, handleTaskComplete)

  if (loading) return <div className="loading">Loading…</div>
  if (!session) return <Auth />

  const userId = session.user.id
  const isPast = viewedDate < todayISO()

  const anchorSection = (
    <section className="section" key="anchor">
      <div className="section-head">
        <span className="section-title">Morning Anchor</span>
      </div>
      <MorningAnchor userId={userId} viewedDate={viewedDate} onAnchorChange={handleAnchorChange} />
    </section>
  )

  const scheduleSection = (
    <section className="section" key="schedule">
      <div className="section-head">
        <span className="section-title">Schedule</span>
        <span className="section-meta">Hour by hour</span>
      </div>
      <ScheduleBlocks data={scheduleData} />
    </section>
  )

  const tasksSection = (
    <section className="section" key="tasks">
      <div className="section-head">
        <span className="section-title">Tasks</span>
      </div>
      <TasksList data={scheduleData} />
    </section>
  )

  const scoreboardSection = (
    <section className="section" key="scoreboard">
      <div className="section-head">
        <span className="section-title">Scoreboard</span>
      </div>
      <Scoreboard userId={userId} viewedDate={viewedDate} refreshKey={scoreRefresh} />
    </section>
  )

  const ideasSection = (
    <section className="section" key="ideas">
      <div className="section-head">
        <span className="section-title">Idea Inbox</span>
        <span className="section-meta">{isPast ? 'Snapshot' : '7-day shelf life'}</span>
      </div>
      <IdeaInbox userId={userId} viewedDate={viewedDate} onIdeaShipped={() => setScoreRefresh((k) => k + 1)} />
    </section>
  )

  const northStarsSection = (
    <section className="section" key="ns">
      <div className="section-head">
        <span className="section-title">90-Day North Stars</span>
      </div>
      <NorthStars userId={userId} />
    </section>
  )

  return (
    <div className={`app${isDesktop ? ' is-desktop' : ''}`}>
      <header className="masthead">
        <h1 className="masthead-title">Mission Control</h1>
      </header>

      {viewMode === 'day' && <DateNavigator viewedDate={viewedDate} onChange={setViewedDate} />}

      <div className="view-tabs">
        <button className={`view-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Day</button>
        <button className={`view-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
        <button className={`view-tab ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Month</button>
      </div>

      {viewMode !== 'day' && (
        <CalendarView
          userId={userId}
          viewedDate={viewedDate}
          mode={viewMode}
          onDayClick={(date) => { setViewedDate(date); setViewMode('day') }}
        />
      )}

      {viewMode === 'day' && isPast && (
        <div className="past-day-banner">
          Viewing a past day. Edits are saved to that day's record.
        </div>
      )}

      {viewMode === 'day' && (
        isDesktop ? (
          <div className="desktop-grid">
            <div className="desktop-col desktop-hero">
              {scheduleSection}
              {tasksSection}
            </div>
            <div className="desktop-col desktop-side">
              {anchorSection}
              {scoreboardSection}
              {ideasSection}
              {northStarsSection}
            </div>
          </div>
        ) : (
          <div className="mobile-stack">
            {anchorSection}
            {scheduleSection}
            {scoreboardSection}
            {tasksSection}
            {ideasSection}
            {northStarsSection}
          </div>
        )
      )}

      <button className="signout" onClick={handleSignOut}>Sign out</button>

      {estimateTask && (
        <EstimateModal task={estimateTask} onClose={() => setEstimateTask(null)} />
      )}
    </div>
  )
}
