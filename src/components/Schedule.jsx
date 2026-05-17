import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import TimePicker, { formatTime, parseTime } from './TimePicker'

export function timeToMinutes(timeStr) {
  const { hour, minute, period } = parseTime(timeStr)
  let h = hour
  if (period === 'AM') { if (h === 12) h = 0 }
  else { if (h !== 12) h += 12 }
  return h * 60 + parseInt(minute, 10)
}

// "9:00 AM" → "9:00 AM" (stored format is already 12h)
function displayTime(timeStr) {
  return timeStr || ''
}

// Add 60 minutes to a stored time string
function addOneHour(timeStr) {
  const totalMins = timeToMinutes(timeStr) + 60
  const h24 = totalMins % (24 * 60) / 60 | 0
  const m = totalMins % 60
  const snappedM = String(Math.round(m / 15) * 15 % 60).padStart(2, '0')
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return formatTime(h12, snappedM === '60' ? '00' : snappedM, period)
}

const sortByTime = (arr) => [...arr].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

// ── Shared data layer ──────────────────────────────────────────────────
export function useScheduleData(userId, viewedDate, onTaskComplete) {
  const [blocks, setBlocks] = useState([])
  const [tasks, setTasks] = useState([])
  const [newLabel, setNewLabel] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState('')
  const [editingDueDateId, setEditingDueDateId] = useState(null)
  const isToday = viewedDate === todayISO()

  useEffect(() => { if (userId) load() }, [userId, viewedDate])

  const load = async () => {
    const blocksQuery = supabase
      .from('schedule_blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('date', viewedDate)
      .order('position')

    const todayTasksQuery = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('due_date', viewedDate)
      .order('position')

    if (isToday) {
      const [blocksRes, todayRes, carryoverRes] = await Promise.all([
        blocksQuery,
        todayTasksQuery,
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', false)
          .lt('due_date', viewedDate)
          .order('due_date'),
      ])
      setBlocks(sortByTime(blocksRes.data || []))
      setTasks([...(carryoverRes.data || []), ...(todayRes.data || [])])
    } else {
      const [blocksRes, tasksRes] = await Promise.all([blocksQuery, todayTasksQuery])
      setBlocks(sortByTime(blocksRes.data || []))
      setTasks(tasksRes.data || [])
    }
  }

  const addBlock = async (label, start, end) => {
    if (!label.trim()) return
    const { data } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: userId,
        date: viewedDate,
        start_time: start,
        end_time: end,
        label: label.trim(),
        position: blocks.length,
      })
      .select()
      .single()
    if (data) setBlocks(sortByTime([...blocks, data]))
  }

  const updateBlock = async (id, field, value) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    setBlocks(field === 'start_time' ? sortByTime(updated) : updated)
    await supabase.from('schedule_blocks').update({ [field]: value }).eq('id', id)
  }

  const deleteBlock = async (id) => {
    setBlocks(blocks.filter((b) => b.id !== id))
    await supabase.from('schedule_blocks').delete().eq('id', id)
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    const estimate = newTaskEstimate ? parseInt(newTaskEstimate, 10) : null
    const { data } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        date: viewedDate,
        due_date: viewedDate,
        title: newTask.trim(),
        estimated_minutes: estimate,
        position: tasks.length,
      })
      .select()
      .single()
    if (data) setTasks([...tasks, data])
    setNewTask('')
    setNewTaskEstimate('')
  }

  const toggleTask = async (task) => {
    if (task.completed) {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: false, completed_at: null } : t)))
      await supabase.from('tasks').update({ completed: false, completed_at: null }).eq('id', task.id)
    } else {
      const completedAt = new Date().toISOString()
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: true, completed_at: completedAt } : t)))
      await supabase.from('tasks').update({ completed: true, completed_at: completedAt }).eq('id', task.id)
      onTaskComplete?.({ ...task, completed: true })
    }
  }

  const updateTaskText = async (id, title) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, title } : t)))
    await supabase.from('tasks').update({ title }).eq('id', id)
  }

  const updateTaskEstimate = async (id, value) => {
    const estimate = value === '' ? null : parseInt(value, 10)
    setTasks(tasks.map((t) => (t.id === id ? { ...t, estimated_minutes: estimate } : t)))
    await supabase.from('tasks').update({ estimated_minutes: estimate }).eq('id', id)
  }

  const updateTaskDueDate = async (id, due_date) => {
    await supabase.from('tasks').update({ due_date }).eq('id', id)
    setEditingDueDateId(null)
    load()
  }

  const deleteTask = async (id) => {
    setTasks(tasks.filter((t) => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  return {
    viewedDate,
    blocks, setBlocks,
    tasks, setTasks,
    newLabel, setNewLabel,
    newTask, setNewTask,
    newTaskEstimate, setNewTaskEstimate,
    editingDueDateId, setEditingDueDateId,
    addBlock, updateBlock, deleteBlock,
    addTask, toggleTask, updateTaskText, updateTaskEstimate,
    updateTaskDueDate, deleteTask,
  }
}

// ── Schedule blocks ────────────────────────────────────────────────────
export function ScheduleBlocks({ data }) {
  const {
    viewedDate, blocks, setBlocks,
    newLabel, setNewLabel,
    addBlock, updateBlock, deleteBlock,
  } = data

  const [editingTimeId, setEditingTimeId] = useState(null)

  const getNextSlot = () => {
    if (blocks.length === 0) return { start: formatTime(9, '00', 'AM'), end: formatTime(10, '00', 'AM') }
    const last = blocks[blocks.length - 1]
    return { start: last.end_time, end: addOneHour(last.end_time) }
  }

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    const { start, end } = getNextSlot()
    await addBlock(newLabel, start, end)
    setNewLabel('')
  }

  return (
    <div className="schedule-v2">
      {blocks.length === 0 ? (
        <div className="schedule-v2-empty">
          {viewedDate === todayISO() ? 'Build today, hour by hour.' : 'No schedule recorded for this day.'}
        </div>
      ) : (
        <div className="schedule-v2-list">
          {blocks.map((b) => (
            <div key={b.id} className="schedule-v2-block">
              <div className="schedule-v2-block-top">
                {editingTimeId === b.id ? (
                  <div className="schedule-v2-time-edit">
                    <TimePicker value={b.start_time} onChange={(v) => updateBlock(b.id, 'start_time', v)} />
                    <span className="schedule-v2-dash">—</span>
                    <TimePicker value={b.end_time} onChange={(v) => updateBlock(b.id, 'end_time', v)} />
                    <button className="schedule-v2-time-done" onClick={() => setEditingTimeId(null)}>Done</button>
                  </div>
                ) : (
                  <button className="schedule-v2-time" onClick={() => setEditingTimeId(b.id)}>
                    {displayTime(b.start_time)} — {displayTime(b.end_time)}
                  </button>
                )}
                <button className="schedule-v2-delete" onClick={() => deleteBlock(b.id)}>×</button>
              </div>
              <input
                className="schedule-v2-label"
                value={b.label}
                onChange={(e) => setBlocks(blocks.map((x) => x.id === b.id ? { ...x, label: e.target.value } : x))}
                onBlur={(e) => updateBlock(b.id, 'label', e.target.value)}
                placeholder="What's happening?"
              />
            </div>
          ))}
        </div>
      )}

      <div className="schedule-v2-add">
        <input
          className="schedule-v2-add-input"
          placeholder="Add a block — what are you doing?"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="schedule-v2-add-btn" onClick={handleAdd}>Add</button>
      </div>
    </div>
  )
}

// ── Tasks list ─────────────────────────────────────────────────────────
export function TasksList({ data }) {
  const {
    viewedDate, tasks, setTasks,
    newTask, setNewTask, newTaskEstimate, setNewTaskEstimate,
    editingDueDateId, setEditingDueDateId,
    addTask, toggleTask, updateTaskText, updateTaskEstimate, updateTaskDueDate, deleteTask,
  } = data

  return (
    <div className="tasks-list">
      {tasks.map((t) => {
        const isCarryover = t.due_date && t.due_date < viewedDate
        const dueLabel = isCarryover
          ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : null

        return (
          <div key={t.id} className={`task ${t.completed ? 'done' : ''}`}>
            <button className="task-check" onClick={() => toggleTask(t)}>
              {t.completed && <span className="task-check-mark">✓</span>}
            </button>
            <input
              className="task-text"
              value={t.title}
              onChange={(e) => setTasks(tasks.map((x) => x.id === t.id ? { ...x, title: e.target.value } : x))}
              onBlur={(e) => updateTaskText(t.id, e.target.value)}
            />
            {isCarryover && (
              <span className="task-due-chip" title={`Originally due ${dueLabel}`}>{dueLabel}</span>
            )}
            {editingDueDateId === t.id ? (
              <input
                type="date"
                className="task-due-input"
                defaultValue={t.due_date || viewedDate}
                onChange={(e) => e.target.value && updateTaskDueDate(t.id, e.target.value)}
                onBlur={() => setEditingDueDateId(null)}
                autoFocus
              />
            ) : (
              <button className="task-due-btn" onClick={() => setEditingDueDateId(t.id)} title="Set due date">Due</button>
            )}
            <div className="task-estimate" title="Estimated minutes">
              <input
                type="number"
                value={t.estimated_minutes || ''}
                onChange={(e) => updateTaskEstimate(t.id, e.target.value)}
                placeholder="—"
              />
              <span>m</span>
            </div>
            <button className="task-delete" onClick={() => deleteTask(t.id)}>×</button>
          </div>
        )
      })}
      <div className="task-add">
        <div className="task-check" style={{ borderStyle: 'dashed', borderColor: 'var(--ghost)' }}></div>
        <input
          placeholder="Add a task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <div className="task-estimate" style={{ background: 'transparent', border: '1px dashed var(--line-strong)', color: 'var(--muted)' }}>
          <input
            type="number"
            placeholder="min"
            value={newTaskEstimate}
            onChange={(e) => setNewTaskEstimate(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            style={{ width: '32px', color: 'var(--muted)' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Back-compat default export ─────────────────────────────────────────
export default function Schedule({ userId, viewedDate, onTaskComplete }) {
  const data = useScheduleData(userId, viewedDate, onTaskComplete)
  return (
    <div>
      <ScheduleBlocks data={data} />
      <TasksList data={data} />
    </div>
  )
}
