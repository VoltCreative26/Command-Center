import { supabase } from './supabase'
import { todayISO } from './supabase'

// Dev-only: insert a spread of completed tasks with estimate + actual so the
// Time Insights views have realistic data to render. All rows are tagged with
// a marker prefix so they can be cleared again.
export const SEED_MARKER = '[sample] '

const SAMPLES = [
  // category, name, estimated, actual
  ['Strategy & Planning', 'Draft client proposal', 90, 70],
  ['Admin', 'Weekly status call prep', 30, 35],
  ['Design & Production', 'Revise deliverable v2', 60, 110],
  ['Design & Production', 'Storyboard hero video', 120, 80],
  ['Design & Production', 'Color grade reel', 45, 50],
  ['Marketing & R&D', 'Design social templates', 60, 95],
  ['Admin', 'Inbox zero sweep', 20, 40],
  ['Admin', 'Submit expense report', 15, 12],
  ['Strategy & Planning', 'Q3 roadmap outline', 90, 88],
  ['Strategy & Planning', 'Competitive teardown', 60, 130],
  ['Web & Digital', 'Wire up auth flow', 120, 100],
  ['Web & Digital', 'Fix layout regression', 30, 75],
  ['Web & Digital', 'Write unit tests', 45, 44],
  ['Misc', 'Order a new desk', 45, 20],
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function seedSampleTasks(userId) {
  const rows = SAMPLES.map(([category, name, estimated, actual], i) => {
    const date = daysAgo(i % 10)
    return {
      user_id: userId,
      date,
      due_date: date,
      title: SEED_MARKER + name,
      category,
      estimated_minutes: estimated,
      actual_minutes: actual,
      completed: true,
      completed_at: new Date().toISOString(),
      position: i,
    }
  })
  const { error } = await supabase.from('tasks').insert(rows)
  if (error) throw error
  return rows.length
}

export async function clearSampleTasks(userId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .like('title', SEED_MARKER + '%')
  if (error) throw error
}
