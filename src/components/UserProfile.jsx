import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UserProfile({ user }) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(user.user_metadata?.full_name || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const saveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    if (error) showMessage(error.message, 'error')
    else showMessage('Name updated.', 'success')
    setSaving(false)
  }

  const changePassword = async () => {
    if (newPassword.length < 8) {
      showMessage('Password must be at least 8 characters.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match.', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) showMessage(error.message, 'error')
    else {
      showMessage('Password changed successfully.', 'success')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSaving(false)
  }

  if (!expanded) {
    return (
      <button className="profile-collapsed" onClick={() => setExpanded(true)}>
        <div className="profile-collapsed-info">
          <span className="profile-collapsed-name">
            {user.user_metadata?.full_name || 'My Profile'}
          </span>
          <span className="profile-collapsed-email">{user.email}</span>
        </div>
        <span className="profile-collapsed-chevron">›</span>
      </button>
    )
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <h3 className="profile-title">Profile</h3>
        <button className="profile-close" onClick={() => { setExpanded(false); setMessage('') }}>×</button>
      </div>

      <div className="profile-field">
        <label className="profile-label">Email</label>
        <div className="profile-email">{user.email}</div>
      </div>

      <div className="profile-field">
        <label className="profile-label">Name</label>
        <div className="profile-input-row">
          <input
            className="profile-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
          <button className="profile-save-btn" onClick={saveName} disabled={saving}>
            Save
          </button>
        </div>
      </div>

      <div className="profile-divider" />

      <div className="profile-field">
        <label className="profile-label">New Password</label>
        <input
          className="profile-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8+ characters"
          autoComplete="new-password"
        />
      </div>

      <div className="profile-field">
        <label className="profile-label">Confirm Password</label>
        <input
          className="profile-input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
          onKeyDown={(e) => e.key === 'Enter' && changePassword()}
        />
      </div>

      <button
        className="profile-change-password-btn"
        onClick={changePassword}
        disabled={saving || !newPassword || !confirmPassword}
      >
        {saving ? 'Saving…' : 'Change Password'}
      </button>

      {message && (
        <p className={`profile-message ${messageType === 'error' ? 'profile-message--error' : messageType === 'success' ? 'profile-message--success' : ''}`}>
          {message}
        </p>
      )}
    </div>
  )
}
