import { useState, useEffect, useMemo } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import { CATEGORIES, classify, CLASS_META, formatDelta } from '../lib/estimation'
import { seedSampleTasks, clearSampleTasks } from '../lib/seed'

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 4v5h-5" />
  </svg>
)

const TONE = { over: 'blue', accurate: 'green', under: 'red' }
const PAGE_SIZES = [10, 25, 50, 100]
const SORTS = [
  ['recent', 'Most recent'],
  ['over', 'Biggest overrun'],
  ['savings', 'Biggest savings'],
  ['longest', 'Longest actual'],
  ['name', 'Name A–Z'],
]

function avg(nums) {
  if (!nums.length) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function localKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

export default function TimeInsights({ user, onNavigate, onSignOut }) {
  const userId = user?.id
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('ti-active-tab') || 'overview' } catch { return 'overview' }
  })
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()

  const load = async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .not('actual_minutes', 'is', null)
      .not('estimated_minutes', 'is', null)
      .order('completed_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  const setTab = (t) => {
    setView(t)
    try { localStorage.setItem('ti-active-tab', t) } catch { /* ignore */ }
  }

  const handleSeed = async () => {
    setBusy(true)
    try { await seedSampleTasks(userId); await load() }
    catch (e) { alert('Seed failed: ' + e.message) }
    finally { setBusy(false) }
  }
  const handleClear = async () => {
    setBusy(true)
    try { await clearSampleTasks(userId); await load() }
    catch (e) { alert('Clear failed: ' + e.message) }
    finally { setBusy(false) }
  }

  const tracked = useMemo(
    () => tasks.map((t) => ({ ...t, klass: classify(t.estimated_minutes, t.actual_minutes) }))
      .filter((t) => t.klass),
    [tasks],
  )

  const name = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'You')
  const initials = name.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'U'

  const devTools = import.meta.env.DEV ? (
    <div className="ti-devtools">
      <button onClick={handleSeed} disabled={busy}>{busy ? '…' : 'Seed sample data'}</button>
      <button onClick={handleClear} disabled={busy}>Clear samples</button>
    </div>
  ) : null

  const pageClass = `ti-page ti-page--standalone${isMobile ? ' ti-page--mobile' : ''}`

  return (
    <div className={pageClass}>
      <header className="masthead">
        <h1 className="masthead-title">Time Insights</h1>
        <span className="masthead-status">Live · {tracked.length} tracked</span>
      </header>

      <div className="page-nav">
        <button className="page-nav-btn" onClick={() => onNavigate && onNavigate('dashboard')}>Dashboard</button>
        <button className="page-nav-btn active"><ClockIcon /> Time Insights</button>
      </div>

      <div className="view-tabs ti-subtabs">
        <button className={`view-tab ${view === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`view-tab ${view === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>All Tasks</button>
      </div>

      {devTools}

      {loading ? (
        <div className="loading">Loading insights…</div>
      ) : tracked.length === 0 ? (
        <div className="ti-empty">
          <div className="ti-empty-icon"><ClockIcon /></div>
          <div className="ti-empty-title">No tracked tasks yet</div>
          <div className="ti-empty-sub">
            Add an estimate to a task, then log the actual time when you complete it.
            Your estimation accuracy will appear here.
          </div>
        </div>
      ) : view === 'overview' ? (
        <Overview tracked={tracked} mobile={isMobile} />
      ) : (
        <AllTasks tracked={tracked} />
      )}

      <Footer
        name={name}
        initials={initials}
        email={user?.email}
        onSignOut={onSignOut}
      />
    </div>
  )
}

// ── Derivations shared by overview surfaces ─────────────────────────
function useOverviewStats(tracked) {
  return useMemo(() => {
    const total = tracked.length
    const accurateCount = tracked.filter((t) => t.klass === 'accurate').length
    const accuracyRate = Math.round((accurateCount / total) * 100)
    const avgDelta = avg(tracked.map((t) => t.actual_minutes - t.estimated_minutes))

    const categories = CATEGORIES.map((cat) => {
      const items = tracked.filter((t) => t.category === cat)
      const acc = items.length ? Math.round((items.filter((t) => t.klass === 'accurate').length / items.length) * 100) : 0
      return { cat, count: items.length, acc }
    }).filter((c) => c.count > 0)

    // Blind spots: categories ranked by average overrun % (only overrun tasks)
    const blindSpots = CATEGORIES.map((cat) => {
      const overruns = tracked.filter((t) => t.category === cat && t.actual_minutes > t.estimated_minutes)
      if (!overruns.length) return null
      const avgOver = overruns.reduce((s, t) => s + (t.actual_minutes - t.estimated_minutes) / t.estimated_minutes, 0) / overruns.length
      return { cat, pct: Math.round(avgOver * 100) }
    }).filter(Boolean).sort((a, b) => b.pct - a.pct)

    const sumActual = tracked.reduce((s, t) => s + t.actual_minutes, 0)
    const sumEstimated = tracked.reduce((s, t) => s + t.estimated_minutes, 0)
    const bufferRaw = sumEstimated > 0 ? sumActual / sumEstimated : 1
    const buffer = bufferRaw.toFixed(1)
    const padPct = Math.max(0, Math.round((bufferRaw - 1) * 100))

    // Streak: consecutive days ending today with accurate estimates (empty days skip)
    const byDay = {}
    tracked.forEach((t) => {
      const day = t.date || (t.completed_at ? t.completed_at.slice(0, 10) : null)
      if (!day) return
      if (!byDay[day]) byDay[day] = { any: false, accurate: false }
      byDay[day].any = true
      if (t.klass === 'accurate') byDay[day].accurate = true
    })
    let streak = 0
    const cursor = new Date(todayISO() + 'T00:00:00')
    for (let i = 0; i < 366; i++) {
      const d = byDay[localKey(cursor)]
      if (d) {
        if (d.accurate) streak++
        else break
      }
      cursor.setDate(cursor.getDate() - 1)
    }

    const groups = ['over', 'accurate', 'under'].map((klass) => {
      const items = tracked.filter((t) => t.klass === klass)
      const avgGap = avg(items.map((t) => Math.abs(t.actual_minutes - t.estimated_minutes)))
      const verb = klass === 'over' ? 'saved' : klass === 'under' ? 'over' : 'off'
      return {
        klass,
        tone: TONE[klass],
        label: CLASS_META[klass].label,
        count: items.length,
        sub: items.length ? `~${avgGap}m ${verb} on avg` : 'No tasks',
      }
    })

    return { total, accuracyRate, avgDelta, categories, blindSpots, buffer, padPct, streak, groups }
  }, [tracked])
}

function Overview({ tracked, mobile }) {
  const s = useOverviewStats(tracked)
  return mobile ? <OverviewMobile s={s} /> : <OverviewDesktop s={s} />
}

function takeawayNode(s) {
  const accFrac = fractionPhrase(s.accuracyRate)
  const deltaPhrase = s.avgDelta > 0
    ? <>your tasks run <strong>{formatDelta(s.avgDelta)} over</strong> on average</>
    : s.avgDelta < 0
      ? <>your tasks finish <strong>{formatDelta(s.avgDelta)} under</strong> on average</>
      : <>your tasks land <strong>right on time</strong> on average</>
  const worst = s.blindSpots.slice(0, 2).map((b) => b.cat)
  const padClause = worst.length
    ? <>Pad your plan most on {worst.length > 1
        ? <><strong>{worst[0]}</strong> and <strong>{worst[1]}</strong></>
        : <strong>{worst[0]}</strong>} — that's where the overruns hide.</>
    : null
  return (
    <>Only <strong>{accFrac}</strong> of estimates land within ±20%, and {deltaPhrase}. {padClause}</>
  )
}

function fractionPhrase(pct) {
  if (pct <= 0) return '0%'
  if (pct >= 90) return `${pct}%`
  const approx = Math.round(100 / pct)
  if (pct <= 50 && approx >= 2 && approx <= 5) return `1 in ${approx}`
  return `${pct}%`
}

function OverviewDesktop({ s }) {
  return (
    <div className="ti-stack">
      <div className="ti-takeaway ti-takeaway--hero">
        <div className="ti-takeaway-body">
          <div className="ti-takeaway-eyebrow">What the numbers say</div>
          <div className="ti-takeaway-text">{takeawayNode(s)}</div>
        </div>
        <div className="ti-takeaway-figure">
          <div className="ti-takeaway-figure-num">{s.accuracyRate}%</div>
          <div className="ti-takeaway-figure-label">accurate</div>
        </div>
      </div>

      <div className="ti-grid ti-grid--flip ti-grid--equal">
        <div className="ti-col">
          <section className="section">
            <div className="section-head">
              <span className="section-title">At a glance</span>
              <span className="section-meta">today</span>
            </div>
            <KpiStack s={s} />
          </section>
        </div>
        <div className="ti-col">
          <CategoryBars categories={s.categories} takeaway />
        </div>
      </div>

      <DistributionPanels groups={s.groups} total={s.total} />
    </div>
  )
}

function OverviewMobile({ s }) {
  return (
    <div className="ti-stack">
      <div className="ti-takeaway">
        <div className="ti-takeaway-body">
          <div className="ti-takeaway-eyebrow">What the numbers say</div>
          <div className="ti-takeaway-text">{takeawayNode(s)}</div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <span className="section-title">Estimation accuracy</span>
          <span className="section-meta">{s.total} tracked</span>
        </div>
        <div className="ti-accuracy-hero">
          <div className="ti-accuracy-head">
            <div className="ti-accuracy-headline">
              How close your estimates land
              <span>Within ±20% of planned</span>
            </div>
            <div className="ti-accuracy-rate">
              <div className="ti-accuracy-rate-num">{s.accuracyRate}%</div>
              <div className="ti-accuracy-rate-label">accurate</div>
            </div>
          </div>
          <div className="ti-accuracy-body">
            <CategoryBars categories={s.categories} bare />
            <div className="ti-accuracy-divider" />
            <DistBreakdown groups={s.groups} total={s.total} topGap />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="section-title">At a glance</span>
          <span className="section-meta">today</span>
        </div>
        <KpiStack s={s} />
      </section>
    </div>
  )
}

function KpiStack({ s }) {
  const blind = s.blindSpots[0]
  const rows = [
    { label: 'Estimation Accuracy', hint: 'within ±20%', value: `${s.accuracyRate}%`, goal: 'Goal 60%' },
    {
      label: 'Biggest Blind Spot',
      hint: 'most consistently under-estimated',
      value: blind ? blind.cat : 'None yet',
      word: true,
      valueSub: blind ? `+${blind.pct}% over` : null,
      tone: 'red',
    },
    { label: 'Your Buffer Number', hint: `pad estimates by ${s.padPct}%`, value: `${s.buffer}×` },
    { label: 'Accurate Streak', hint: 'days with accurate estimates', value: `${s.streak}`, tone: 'green' },
  ]
  return (
    <div className="ti-kpi-stack">
      {rows.map((k) => (
        <div key={k.label} className="ti-kpi-row">
          <div className="ti-kpi-text">
            <span className="ti-kpi-label">{k.label}</span>
            {k.hint && <span className="ti-kpi-hint">{k.hint}</span>}
          </div>
          <div className="ti-kpi-valuewrap">
            <span className={`ti-kpi-value ${k.word ? 'ti-kpi-value--word' : ''}`}>{k.value}</span>
            {k.goal && <span className="ti-kpi-goal">{k.goal}</span>}
            {k.valueSub && <span className={`ti-kpi-valuesub ti-kpi-valuesub--${k.tone}`}>{k.valueSub}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function CategoryBars({ categories, bare, takeaway }) {
  const inner = (
    <div className="ti-bars">
      {categories.map((c) => (
        <div key={c.cat} className="ti-bar-row">
          <span className="ti-bar-label">{c.cat}</span>
          <div className="ti-bar-track">
            <div className="ti-bar-fill ti-bar-fill--strong" style={{ width: `${c.acc}%` }} />
          </div>
          <span className="ti-bar-value">{c.acc}%</span>
        </div>
      ))}
    </div>
  )
  if (bare) return inner

  const minAcc = Math.min(...categories.map((c) => c.acc))
  const worst = categories.filter((c) => c.acc === minAcc).map((c) => c.cat)
  const names = worst.length > 1
    ? `${worst.slice(0, -1).join(', ')} and ${worst[worst.length - 1]}`
    : worst[0]
  const footer = takeaway && categories.length ? (
    <div className="ti-cat-takeaway">
      <span className="ti-cat-takeaway-icon">↳</span>
      <span className="ti-cat-takeaway-text">
        <strong>{names}</strong> {worst.length > 1 ? 'are' : 'is'} your least accurate — only {minAcc}% land
        within ±20%. Block buffer time before you commit to {worst.length > 1 ? 'either' : 'it'}.
      </span>
    </div>
  ) : null

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-title">Accuracy by category</span>
        <span className="section-meta">share within ±20%</span>
      </div>
      <div className="ti-card">{inner}{footer}</div>
    </section>
  )
}

function DistributionPanels({ groups }) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="section-title">Estimation distribution</span>
        <span className="section-meta">{groups.reduce((s, g) => s + g.count, 0)} tasks</span>
      </div>
      <div className="ti-panels">
        {groups.map((g) => (
          <div key={g.klass} className={`ti-panel ti-panel--${g.tone}`}>
            <div className="ti-panel-label">{g.label}</div>
            <div className="ti-panel-count">{g.count}</div>
            <div className="ti-panel-sub">{g.sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DistBreakdown({ groups, total, topGap }) {
  const sum = total || groups.reduce((s, g) => s + g.count, 0) || 1
  return (
    <>
      <div className="ti-proportion">
        {groups.map((g) => (
          <div key={g.klass} className={`ti-proportion-seg ti-proportion-seg--${g.tone}`}
            style={{ width: `${(g.count / sum) * 100}%` }} />
        ))}
      </div>
      <div className="ti-dist-rows" style={topGap ? { marginTop: 'var(--r3)' } : null}>
        {groups.map((g) => (
          <div key={g.klass} className="ti-dist-row">
            <span className={`ti-dist-dot ti-dist-dot--${g.tone}`} />
            <div className="ti-dist-text">
              <div className="ti-dist-label">{g.label}</div>
              <div className="ti-dist-sub">{g.sub}</div>
            </div>
            <span className="ti-dist-count">{g.count}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── All Tasks ───────────────────────────────────────────────────────
function pageItems(cur, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const out = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(totalPages - 1, cur + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < totalPages - 1) out.push('…')
  out.push(totalPages)
  return out
}

function AllTasks({ tracked }) {
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [size, setSize] = useState(25)
  const [page, setPage] = useState(1)

  const enriched = useMemo(
    () => tracked.map((t, i) => ({
      id: t.id ?? i,
      i,
      title: t.title,
      category: t.category,
      est: t.estimated_minutes,
      actual: t.actual_minutes,
      delta: t.actual_minutes - t.estimated_minutes,
      klass: t.klass,
    })),
    [tracked],
  )
  const maxAbs = useMemo(() => Math.max(1, ...enriched.map((t) => Math.abs(t.delta))), [enriched])
  const counts = useMemo(() => {
    const c = { all: enriched.length, over: 0, accurate: 0, under: 0 }
    enriched.forEach((t) => { c[t.klass]++ })
    return c
  }, [enriched])

  const availableCats = useMemo(
    () => CATEGORIES.filter((c) => enriched.some((t) => t.category === c)),
    [enriched],
  )

  const filtered = useMemo(() => {
    let r = enriched
    if (cat !== 'all') r = r.filter((t) => t.category === cat)
    if (status !== 'all') r = r.filter((t) => t.klass === status)
    r = [...r]
    if (sort === 'over') r.sort((a, b) => b.delta - a.delta)
    else if (sort === 'savings') r.sort((a, b) => a.delta - b.delta)
    else if (sort === 'longest') r.sort((a, b) => b.actual - a.actual)
    else if (sort === 'name') r.sort((a, b) => a.title.localeCompare(b.title))
    return r
  }, [enriched, cat, status, sort])

  useEffect(() => { setPage(1) }, [cat, status, sort, size])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const curPage = Math.min(page, totalPages)
  const start = (curPage - 1) * size
  const shown = filtered.slice(start, start + size)
  const rangeEnd = Math.min(start + size, filtered.length)

  const STATUS_CHIPS = [
    ['all', 'All', 'all'],
    ['over', 'Over', 'blue'],
    ['accurate', 'Accurate', 'green'],
    ['under', 'Under', 'red'],
  ]

  return (
    <div className="ti-tasks">
      <div className="ti-toolbar">
        <div className="ti-statusfilter">
          {STATUS_CHIPS.map(([key, label, tone]) => (
            <button
              key={key}
              className={`ti-statuschip ${status === key ? 'active' : ''}`}
              onClick={() => setStatus(key)}
            >
              <span className={`ti-statuschip-dot ti-statuschip-dot--${tone}`} />
              {label}
              <span className="ti-statuschip-count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="ti-toolbar-group">
          <div className="ti-field">
            <label>Category</label>
            <select className="ti-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {availableCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="ti-field">
            <label>Sort</label>
            <select className="ti-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="ti-table">
        <div className="ti-thead">
          <span className="ti-th">Task</span>
          <span className="ti-th ti-th--num">Est → Actual</span>
          <span className="ti-th ti-th--num">Delta</span>
          <span className="ti-th ti-th--status">Status</span>
        </div>
        {shown.length === 0 ? (
          <div className="ti-table-empty">No tasks match these filters. Clear one to see more.</div>
        ) : (
          shown.map((t) => <TaskRow key={t.id} t={t} maxAbs={maxAbs} />)
        )}
      </div>

      <div className="ti-pagination">
        <div className="ti-pageleft">
          <div className="ti-pagesize">
            Rows
            <div className="ti-pagesize-opts">
              {PAGE_SIZES.map((sz) => (
                <button
                  key={sz}
                  className={`ti-pagesize-opt ${size === sz ? 'active' : ''}`}
                  onClick={() => setSize(sz)}
                >{sz}</button>
              ))}
            </div>
          </div>
          <span className="ti-result-count">
            {filtered.length === 0 ? '0 tasks' : `${start + 1}–${rangeEnd} of ${filtered.length}`}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="ti-pager">
            <button className="ti-pager-btn" disabled={curPage === 1} onClick={() => setPage(curPage - 1)} aria-label="Previous page">‹</button>
            {pageItems(curPage, totalPages).map((p, idx) =>
              p === '…'
                ? <span key={`e${idx}`} className="ti-pager-ellipsis">…</span>
                : <button key={p} className={`ti-pager-btn ${p === curPage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className="ti-pager-btn" disabled={curPage === totalPages} onClick={() => setPage(curPage + 1)} aria-label="Next page">›</button>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskRow({ t, maxAbs }) {
  const tone = TONE[t.klass]
  const meta = CLASS_META[t.klass]
  const pct = Math.min(50, (Math.abs(t.delta) / maxAbs) * 50)
  const fillStyle = t.delta > 0
    ? { left: '50%', width: `${pct}%` }
    : t.delta < 0
      ? { right: '50%', width: `${pct}%` }
      : { left: 'calc(50% - 3px)', width: '6px' }
  return (
    <div className="ti-trow">
      <div className="ti-tt-name-cell">
        <div className="ti-tt-name">{t.title}</div>
        {t.category && <div className="ti-tt-cat">{t.category}</div>}
      </div>
      <div className="ti-tt-time">
        <span><span className="ti-tt-numlabel">Est </span>{t.est}m</span>
        <span className="ti-tt-time-arrow">→</span>
        <span className="ti-tt-time-actual"><span className="ti-tt-numlabel">Actual </span>{t.actual}m</span>
      </div>
      <div className="ti-tt-delta">
        <div className="ti-tt-deltabar">
          <div className={`ti-tt-deltafill ti-tt-deltafill--${tone}`} style={fillStyle} />
        </div>
        <span className={`ti-tt-deltaval ti-tt-deltaval--${tone}`}>{formatDelta(t.delta)}</span>
      </div>
      <div className="ti-tt-status">
        <span className={`ti-badge ti-badge--${tone}`}>{meta.label}</span>
      </div>
    </div>
  )
}

function Footer({ name, initials, email, onSignOut }) {
  return (
    <div className="ti-footer">
      <div className="ti-account">
        <span className="ti-avatar">{initials}</span>
        <div>
          <div className="ti-account-name">{name}</div>
          {email && <div className="ti-account-email">{email}</div>}
        </div>
      </div>
      <div className="ti-footer-actions">
        <button className="ti-btn-primary" onClick={() => window.location.reload()}><RefreshIcon /> Refresh</button>
        <button className="ti-btn-ghost ti-btn-ghost--danger" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}
