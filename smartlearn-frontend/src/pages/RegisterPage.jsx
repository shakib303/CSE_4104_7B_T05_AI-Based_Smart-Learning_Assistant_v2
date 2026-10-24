// src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  validate,
  passwordStrength,
  STRENGTH_LABEL,
  STRENGTH_COLOR,
} from '../utils/helpers'

// ─── Password strength bar component ─────────────────────────────────────────
function StrengthBar({ password }) {
  const score = passwordStrength(password)
  return (
    <div style={{ marginTop: 8 }}>
      {/* 4 coloured bars */}
      <div className="pw-bars">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="pw-bar"
            style={{ background: i <= score ? STRENGTH_COLOR[score] : undefined }}
          />
        ))}
      </div>
      {/* Label */}
      {password && (
        <p style={{ fontSize: 11, marginTop: 4, color: STRENGTH_COLOR[score], fontWeight: 500 }}>
          {STRENGTH_LABEL[score]}
        </p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register }         = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate             = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    confirm:   '',
    studentId: '',
  })
  const [errors,   setErrors]   = useState({})
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [agreed,   setAgreed]   = useState(false)
  const [loading,  setLoading]  = useState(false)

  // ── Field change handler ────────────────────────────────────────────
  const change = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    // Clear that field's error immediately as user types
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }))
  }

  // ── Client-side validation ──────────────────────────────────────────
  const runValidation = () => {
    const errs = {
      firstName: validate.required(form.firstName),
      lastName:  validate.required(form.lastName),
      email:     validate.email(form.email),
      password:  validate.password(form.password),
      confirm:   validate.match(form.password)(form.confirm),
      studentId:  validate.required(form.studentId),
    }
    setErrors(errs)
    return !Object.values(errs).some(Boolean)
  }

  // ── Form submit ─────────────────────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault()

    if (!runValidation()) {
      toast.error('Please fix the highlighted errors')
      return
    }
    if (!agreed) {
      toast.error('You must accept the Terms of Service to continue')
      return
    }

    setLoading(true)
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`
      const result = await register({
        name: fullName,
        email: form.email.trim(),
        password: form.password,
        studentId: form.studentId.trim(),
      })
      toast.success(result.message || 'Registration submitted successfully.')
      navigate('/student-login')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.'
      // If server says email taken, highlight that field
      if (msg.toLowerCase().includes('email')) {
        setErrors(er => ({ ...er, email: 'This email is already registered' }))
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="auth-shell">

      {/* ════════════════════════════════════════════════════════════
          LEFT — Hero / benefits panel
      ════════════════════════════════════════════════════════════ */}
      <div className="auth-left">

        {/* Logo */}
        <div className="flex-c gap-8 mb-24">
          <div className="sb-logo-box">S</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>SmartLearn</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 10 }}>
          Start learning smarter<br />today — it's free
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: 32 }}>
          Join thousands of students using AI to study better, faster and with less stress.
        </p>

        {/* Steps */}
        {[
          { icon: '🤖', title: 'AI Study Assistant',   sub: 'Ask anything, get instant academic help' },
          { icon: '📅', title: 'Personalized Plans',   sub: 'AI builds your weekly study schedule' },
          { icon: '📊', title: 'Progress Tracking',    sub: 'Streaks, stats and subject proficiency' },
          { icon: '📚', title: 'Smart Resources',      sub: 'Curated videos, articles and exercises' },
        ].map(({ icon, title, sub }) => (
          <div
            key={title}
            className="flex-c gap-12"
            style={{
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,.07)',
            }}
          >
            {/* Coloured circle */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{sub}</p>
            </div>
          </div>
        ))}

        {/* Night mode toggle */}
        <div
          className="flex-c gap-8"
          style={{ marginTop: 'auto', paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.1)' }}
        >
          <span style={{ fontSize: 16 }}>🌙</span>
          <label className="toggle" aria-label="Toggle night mode">
            <input type="checkbox" checked={dark} onChange={toggleDark} />
            <span className="toggle-slider" />
          </label>
          <span className="dm-label">Night mode</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT — Registration form
      ════════════════════════════════════════════════════════════ */}
      <div className="auth-right">
        <div className="auth-form">

          <h2 className="auth-h1">Create your account</h2>
          <p className="auth-sub">Free forever — no credit card needed</p>

          <form onSubmit={submit} noValidate>

            {/* ── Name row (First + Last) ────────────────────────── */}
            <div className="grid-2 mb-16">

              {/* First name */}
              <div className="field">
                <label className="label" htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={`input ${errors.firstName ? 'error' : ''}`}
                  placeholder="Alice"
                  value={form.firstName}
                  onChange={change}
                  autoComplete="given-name"
                  autoFocus
                />
                {errors.firstName && (
                  <span className="error-msg">{errors.firstName}</span>
                )}
              </div>

              {/* Last name */}
              <div className="field">
                <label className="label" htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={`input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Rahman"
                  value={form.lastName}
                  onChange={change}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <span className="error-msg">{errors.lastName}</span>
                )}
              </div>
            </div>

            {/* ── Email ─────────────────────────────────────────── */}
            <div className="field mb-16">
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${errors.email ? 'error' : ''}`}
                placeholder="alice@university.edu"
                value={form.email}
                onChange={change}
                autoComplete="email"
              />
              {errors.email && (
                <span className="error-msg">{errors.email}</span>
              )}
            </div>

            {/* ── Student ID ───────────────────────────────────── */}
            <div className="field mb-16">
              <label className="label" htmlFor="studentId">Student ID</label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                className={`input ${errors.studentId ? 'error' : ''}`}
                placeholder="Your university student ID"
                value={form.studentId}
                onChange={change}
                autoComplete="off"
              />
              {errors.studentId && (
                <span className="error-msg">{errors.studentId}</span>
              )}
            </div>

            {/* ── Password ──────────────────────────────────────── */}
            <div className="field mb-16">
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={form.password}
                  onChange={change}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 13, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-3)', cursor: 'pointer',
                    fontSize: 17, lineHeight: 1, padding: 2,
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {/* Strength bar (only shown when user is typing) */}
              {form.password && <StrengthBar password={form.password} />}
              {errors.password && (
                <span className="error-msg mt-4">{errors.password}</span>
              )}
            </div>

            {/* ── Confirm password ──────────────────────────────── */}
            <div className="field mb-16">
              <label className="label" htmlFor="confirm">Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm"
                  name="confirm"
                  type={showConf ? 'text' : 'password'}
                  className={`input ${errors.confirm ? 'error' : ''}`}
                  placeholder="Re-enter your password"
                  value={form.confirm}
                  onChange={change}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConf(v => !v)}
                  aria-label={showConf ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 13, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-3)', cursor: 'pointer',
                    fontSize: 17, lineHeight: 1, padding: 2,
                  }}
                >
                  {showConf ? '🙈' : '👁'}
                </button>
              </div>
              {/* Real-time match check */}
              {form.confirm && form.confirm !== form.password && (
                <span className="error-msg">Passwords do not match</span>
              )}
              {form.confirm && form.confirm === form.password && form.password && (
                <span style={{ fontSize: 12, color: 'var(--green)', marginTop: 2, display: 'block' }}>
                  ✓ Passwords match
                </span>
              )}
              {errors.confirm && !form.confirm && (
                <span className="error-msg">{errors.confirm}</span>
              )}
            </div>

            {/* ── Terms checkbox ─────────────────────────────────── */}
            <label
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginBottom: 20, cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{
                  width: 16, height: 16, marginTop: 2, flexShrink: 0,
                  accentColor: 'var(--accent)', cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="#" style={{ color: 'var(--accent)', fontWeight: 500 }}
                  onClick={e => e.stopPropagation()}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: 'var(--accent)', fontWeight: 500 }}
                  onClick={e => e.stopPropagation()}>
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* ── Submit button ──────────────────────────────────── */}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginBottom: 16 }}
            >
              {loading ? (
                <><span className="spinner" />Creating account…</>
              ) : 'Create account'}
            </button>
          </form>

          {/* ── Google sign-up ───────────────────────────────────── */}
          <div className="divider mb-16">or</div>

          <a
            href="/register"
            className="btn btn-secondary btn-full"
            style={{ marginBottom: 20, fontWeight: 500 }}
            onClick={e => { e.preventDefault(); toast("Google sign-up requires OAuth configuration.") }}
          >
            <span style={{
              display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
              background: 'conic-gradient(#4285F4 0 90deg,#34A853 90deg 180deg,#FBBC05 180deg 270deg,#EA4335 270deg 360deg)',
              flexShrink: 0,
            }} />
            Sign up with Google
          </a>

          {/* ── Login link ───────────────────────────────────────── */}
          <p className="text-sm text-muted center">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Sign in →
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
