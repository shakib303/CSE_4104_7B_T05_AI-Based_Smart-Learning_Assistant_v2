// src/utils/helpers.js

/** Get initials from a name  e.g. "Alice Rahman" → "AR" */
export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

/** Format ISO date to "Jun 28, 2026" */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** "5 min ago", "3h ago", "2d ago" */
export const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/** CSS badge class by task priority */
export const priorityBadge = (p) =>
  ({ LOW: 'badge-green', MEDIUM: 'badge-blue', HIGH: 'badge-gold', URGENT: 'badge-red' }[p] || 'badge-blue')

/** CSS badge class by task status */
export const statusBadge = (s) =>
  ({ TODO: 'badge-blue', IN_PROGRESS: 'badge-gold', DONE: 'badge-green', CANCELLED: 'badge-red' }[s] || 'badge-blue')

/** Simple form validators — return error string or '' */
export const validate = {
  required : v => (!v || !String(v).trim())   ? 'This field is required' : '',
  email    : v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address' : '',
  minLen   : n  => v => String(v || '').length < n ? `Minimum ${n} characters required` : '',
  password : v => {
    if (!v || v.length < 8)  return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(v))    return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(v))    return 'Password must contain at least one number'
    return ''
  },
  match    : other => v => v !== other ? 'Passwords do not match' : '',
}

/** Password strength 0–4 */
export const passwordStrength = (v = '') => {
  let score = 0
  if (v.length >= 8)           score++
  if (/[A-Z]/.test(v))        score++
  if (/[0-9]/.test(v))        score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  return score
}

export const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
export const STRENGTH_COLOR = ['', '#DC2626', '#F59E0B', '#3B82F6', '#059669']
