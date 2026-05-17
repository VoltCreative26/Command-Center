import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Mode: 'signin' (default), 'signup' (first-time)
export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') // 'info' | 'error'

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
  }

  const handlePasswordSignIn = async () => {
    if (!email || !password) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) showMessage(error.message, 'error')
    setLoading(false)
  }

  const handleSignUp = async () => {
    if (!email || !password) return
    if (password.length < 8) {
      showMessage('Password must be at least 8 characters.', 'error')
      return
    }
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      showMessage(error.message, 'error')
    } else if (data.user && !data.session) {
      showMessage('Check your email to confirm your account.', 'info')
    }
    setLoading(false)
  }

  const handleMagicLink = async () => {
    if (!email) {
      showMessage('Enter your email first.', 'error')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) showMessage(error.message, 'error')
    else showMessage('Magic link sent. Check your email.', 'info')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      showMessage('Enter your email first.', 'error')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) showMessage(error.message, 'error')
    else showMessage('Password reset email sent. Check your inbox.', 'info')
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (mode === 'signin') handlePasswordSignIn()
      else if (mode === 'signup') handleSignUp()
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Command Center</h1>
        <p className="auth-subtitle">
          {mode === 'signup' ? 'Create your account' : 'Personal operating system'}
        </p>

        <input
          className="auth-input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="email"
        />

        <input
          className="auth-input"
          type="password"
          placeholder={mode === 'signup' ? 'Pick a password (8+ chars)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        <button
          className="auth-button"
          onClick={mode === 'signup' ? handleSignUp : handlePasswordSignIn}
          disabled={loading || !email || !password}
        >
          {loading
            ? 'Working…'
            : mode === 'signup'
            ? 'Create account'
            : 'Sign in'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="auth-button-secondary"
          onClick={handleMagicLink}
          disabled={loading}
        >
          Email me a magic link
        </button>

        <div className="auth-links">
          {mode === 'signin' ? (
            <>
              <button className="auth-link" onClick={() => { setMode('signup'); setMessage('') }}>
                Create an account
              </button>
              <span className="auth-link-divider">·</span>
              <button className="auth-link" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </>
          ) : (
            <button className="auth-link" onClick={() => { setMode('signin'); setMessage('') }}>
              Already have an account? Sign in
            </button>
          )}
        </div>

        {message && (
          <p className={`auth-msg ${messageType === 'error' ? 'auth-msg-error' : ''}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
