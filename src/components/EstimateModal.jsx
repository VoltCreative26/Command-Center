import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EstimateModal({ task, onClose }) {
  const [actual, setActual] = useState('')

  const save = async () => {
    const val = parseInt(actual, 10)
    if (val > 0) {
      await supabase.from('tasks').update({ actual_minutes: val }).eq('id', task.id)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-eyebrow">Shipped</div>
        <div className="modal-title">How long did it really take?</div>
        <div className="modal-task">"{task.title}"</div>

        <div className="modal-row">
          <div className="modal-stat">
            <span className="modal-stat-label">Estimated</span>
            <span className="modal-stat-value">{task.estimated_minutes || '—'}</span>
          </div>
          <span className="modal-divider">/</span>
          <div className="modal-stat">
            <span className="modal-stat-label">Actual</span>
            <input
              className="modal-stat-input"
              type="number"
              autoFocus
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="min"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-skip" onClick={onClose}>Skip</button>
          <button className="modal-save" onClick={save}>Log it</button>
        </div>
      </div>
    </div>
  )
}
