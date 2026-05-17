import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import TimePicker, { formatTime, parseTime } from './TimePicker'

function timeToMinutes(timeStr) {
  const { hour, minute, period } = parseTime(timeStr)
  let h = hour
  if (period === 'AM') { if (h === 12) h = 0 }
  else { if (h !== 12) h += 12 }
  return h * 60 + parseInt(minute, 10)
}

const sortByTime = (arr) => [...arr].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

// ── Shared data layer ──────────────────────────────────────────────────
export function useScheduleData(userId, viewedDate, onTaskComplete) {
  const [blocks, setBlocks] = useState([])
  const [tasks, setTasks] = useState([])
  const [newStart, setNewStart] = useState(formatTime(9, '00', 'AM'))
  const [newEnd, setNewEnd] = useState(formatTime(9, '30', 'AM'))
  const [newLabel, setNewLabel] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState('')
  const [editingDueDateId, setEditingDueDateId] = useState(null)
  const isToday = viewedDate === todayISO()

  useEffect(() => { load() }, [userId, viewedDate])

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

  const addBlock = async () => {
    if (!newStart || !newEnd || !newLabel.trim()) return
    const { data } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: userId,
        date: viewedDate,
        start_time: newStart,
        end_time: newEnd,
        label: newLabel.trim(),
        position: blocks.length,
      })
      .select()
      .single()
    if (data) setBlocks(sortByTime([...blocks, data]))
    setNewLabel('')
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
    newStart, setNewStart,
    newEnd, setNewEnd,
    newLabel, setNewLabel,
    newTask, setNewTask,
    newTaskEstimate, setNewTaskEstimate,
    editingDueDateId, setEditingDueDateId,
    addBlock, updateBlock, deleteBlock,
    addTask, toggleTask, updateTaskText, updateTaskEstimate,
    updateTaskDueDate, deleteTask,
  }
}

// ── Schedule blocks (time-block list) ─────────────────────────────────
export function ScheduleBlocks({ data }) {
  const {
    viewedDate, blocks, setBlocks,
    newStart, setNewStart, newEnd, setNewEnd, newLabel, setNewLabel,
    addBlock, updateBlock, deleteBlock,
  } = data

  return (
    <div className="schedule">
      {blocks.length === 0 ? (
        <div style={{ padding: 'var(--r4)', textAlign: 'center', color: 'var(--muted)', fontWeight: 500 }}>
          {viewedDate === todayISO()
            ? 'Build today, hour by hour.'
            : 'No schedule recorded for this day.'}
        </div>
      ) : (
        blocks.map((b) => (
          <div key={b.id} className="schedule-block-with-picker">
            <div className="schedule-times">
              <TimePicker value={b.start_time} onChange={(v) => updateBlock(b.id, 'start_time', v)} />
              <span className="schedule-time-dash">–</span>
              <TimePicker value={b.end_time} onChange={(v) => updateBlock(b.id, 'end_time', v)} />
            </div>
            <input
              className="schedule-label-input"
              value={b.label}
              onChange={(e) => setBlocks(blocks.map((x) => x.id === b.id ? { ...x, label: e.target.value } : x))}
              onBlur={(e) => updateBlock(b.id, 'label', e.target.value)}
              placeholder="What's happening?"
            />
            <button className="schedule-delete" onClick={() => deleteBlock(b.id)}>×</button>
          </div>
        ))
      )}
      <div className="schedule-add-with-picker">
        <div className="schedule-times">
          <TimePicker value={newStart} onChange={setNewStart} />
          <span className="schedule-time-dash">–</span>
          <TimePicker value={newEnd} onChange={setNewEnd} />
        </div>
        <input
          className="label-input"
          placeholder="What's happening?"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addBlock()}
        />
        <button className="btn-pill" onClick={addBlock}>Add</button>
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
              <span className="task-due-chip" title={`Originally due ${dueLabel}`}>
                {dueLabel}
              </span>
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
              <button
                className="task-due-btn"
                onClick={() => setEditingDueDateId(t.id)}
                title="Set due date"
              >
                Due
              </button>
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
