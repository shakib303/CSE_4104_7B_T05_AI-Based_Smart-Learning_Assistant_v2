// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { validate } from '../utils/helpers'

export default function LoginPage() {
  const { login } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const change = (e) => {
    const { name, value } = e.target

    setForm((f) => ({
      ...f,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((er) => ({
        ...er,
        [name]: '',
      }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()

    const errs = {
      email: validate.email(form.email),
      password: validate.required(form.password),
    }

    if (Object.values(errs).some(Boolean)) {
      setErrors(errs)
      return
    }

    setLoading(true)

    try {
      await login(form.email, form.password, 'STUDENT')

      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Invalid email or password'

      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-page ${dark ? 'login-dark' : ''}`}>

      {/* Animated background */}
      <div className="login-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-grid" />
      </div>

      {/* ─────────────────────────────────────────────
          LEFT BRAND PANEL
      ───────────────────────────────────────────── */}

      <section className="login-brand">

        {/* Brand */}
        <div className="brand-header">
          <div className="brand-mark">
            <span>S</span>
          </div>

          <div>
            <div className="brand-name">SmartLearn</div>
            <div className="brand-tagline">
              Learn smarter. Grow faster.
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="brand-content">

          <div className="eyebrow">
            <span className="eyebrow-dot" />
            AI-POWERED LEARNING
          </div>

          <h1>
            Your knowledge.
            <br />
            <span>Supercharged by AI.</span>
          </h1>

          <p className="brand-description">
            A smarter way to study, understand difficult concepts,
            build consistent habits, and reach your academic goals.
          </p>

          {/* AI Visual */}
          <div className="ai-visual">

            <div className="ai-glow" />

            <div className="orbit orbit-1">
              <span className="orbit-dot dot-1" />
            </div>

            <div className="orbit orbit-2">
              <span className="orbit-dot dot-2" />
            </div>

            <div className="ai-core">
              <div className="core-inner">
                <span>✦</span>
              </div>
            </div>

            <div className="floating-card card-top">
              <span className="mini-icon">✦</span>
              <div>
                <strong>AI Tutor</strong>
                <small>Ready to help</small>
              </div>
              <span className="online-dot" />
            </div>

            <div className="floating-card card-bottom">
              <span className="mini-icon">↗</span>
              <div>
                <strong>+32%</strong>
                <small>Study progress</small>
              </div>
            </div>

          </div>

          {/* Feature pills */}
          <div className="feature-row">
            <div className="feature-pill">
              <span>✦</span>
              AI Tutor
            </div>

            <div className="feature-pill">
              <span>◈</span>
              Smart Plans
            </div>

            <div className="feature-pill">
              <span>↗</span>
              Progress
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="brand-footer">
          <span>Built for ambitious learners</span>

          <button
            className="theme-toggle"
            onClick={toggleDark}
            type="button"
            aria-label="Toggle night mode"
          >
            <span>{dark ? '☀' : '☾'}</span>
            {dark ? 'Light mode' : 'Night mode'}
          </button>
        </div>

      </section>


      {/* ─────────────────────────────────────────────
          RIGHT LOGIN PANEL
      ───────────────────────────────────────────── */}

      <section className="login-form-side">

        <div className="login-card">

          {/* Mobile logo */}
          <div className="mobile-brand">
            <div className="brand-mark">
              <span>S</span>
            </div>
            <span>SmartLearn</span>
          </div>

          <div className="form-heading">

            <div className="welcome-badge">
              <span>👋</span>
              Welcome back
            </div>

            <h2>Sign in to your account</h2>

            <p>
              Continue your learning journey where you left off.
            </p>

          </div>


          {/* Form */}
          <form
            onSubmit={submit}
            noValidate
            className="modern-login-form"
          >

            {/* Email */}
            <div className="modern-field">

              <label htmlFor="email">
                Email address
              </label>

              <div
                className={`input-wrapper ${
                  errors.email ? 'input-error' : ''
                }`}
              >

                <span className="input-icon">
                  @
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={form.email}
                  onChange={change}
                  autoComplete="email"
                  autoFocus
                />

              </div>

              {errors.email && (
                <span className="modern-error">
                  {errors.email}
                </span>
              )}

            </div>


            {/* Password */}
            <div className="modern-field">

              <div className="password-label-row">
                <label htmlFor="password">
                  Password
                </label>

                <Link to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <div
                className={`input-wrapper ${
                  errors.password ? 'input-error' : ''
                }`}
              >

                <span className="input-icon">
                  ●
                </span>

                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={change}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPass((value) => !value)
                  }
                  aria-label={
                    showPass
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPass ? '◉' : '◌'}
                </button>

              </div>

              {errors.password && (
                <span className="modern-error">
                  {errors.password}
                </span>
              )}

            </div>


            {/* Submit */}
            <button
              type="submit"
              className="premium-login-btn"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing you in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="btn-arrow">→</span>
                </>
              )}

            </button>

          </form>


          {/* Divider */}
          <div className="modern-divider">
            <span>OR CONTINUE WITH</span>
          </div>


          {/* Google */}
          <a
            href="/student-login"
            className="google-btn" onClick={(e) => { e.preventDefault(); toast("Google sign-in requires OAuth configuration.") }}
          >

            <span className="google-icon">
              G
            </span>

            <span>
              Continue with Google
            </span>

          </a>


          {/* Return to account selection */}
          <div className="login-account-switch">
            <Link to="/login">← Back to account selection</Link>
          </div>

          {/* Signup */}
          <div className="signup-text">
            New to SmartLearn?

            <Link to="/register">
              Create your free account
              <span>→</span>
            </Link>
          </div>


          {/* Security */}
          <div className="secure-note">
            <span>⌁</span>
            <div>
              <strong>Secure & private</strong>
              <small>
                Your account information is protected.
              </small>
            </div>
          </div>

        </div>

      </section>

    </div>
  )
}