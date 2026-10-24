// src/pages/AdminPanel.jsx
import { useState, useEffect } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getInitials, formatDate, timeAgo } from '../utils/helpers'
import api from '../utils/api'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, change, changeType = 'up' }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      {change && (
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: changeType === 'up' ? 'var(--green)' : changeType === 'warn' ? 'var(--gold)' : 'var(--red)',
        }}>
          {change}
        </div>
      )}
    </div>
  )
}

function BarChart({ data, color = '#3B82F6' }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', width: 80, textAlign: 'right', flexShrink: 0 }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 30, textAlign: 'right' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Badge({ children, type = 'blue' }) {
  const styles = {
    blue:   { background: 'var(--accent-lt)', color: 'var(--accent)' },
    green:  { background: 'var(--green-lt)',  color: 'var(--green)' },
    red:    { background: 'var(--red-lt)',    color: 'var(--red)' },
    gold:   { background: 'var(--gold-lt)',   color: 'var(--gold)' },
    purple: { background: '#EDE9FE',          color: 'var(--purple)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 999, fontSize: 11, fontWeight: 600,
      ...styles[type],
    }}>
      {children}
    </span>
  )
}

function ActionBtn({ children, onClick, danger = false }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 9px', borderRadius: 6, fontSize: 11,
        border: `0.5px solid ${danger && hover ? 'var(--red)' : 'var(--border)'}`,
        background: danger && hover ? 'var(--red-lt)' : hover ? 'var(--bg-hover)' : 'transparent',
        color: danger && hover ? 'var(--red)' : 'var(--text-2)',
        cursor: 'pointer', transition: 'all .15s',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal — Add / Edit user
// ─────────────────────────────────────────────────────────────────────────────

function UserModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT', status: 'Active' })

  useEffect(() => {
    if (initial) setForm({ name: initial.name, email: initial.email, role: initial.role, status: initial.status })
    else setForm({ name: '', email: '', role: 'STUDENT', status: 'Active' })
  }, [initial, open])

  if (!open) return null

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Enter a valid email address')
      return
    }
    onSave(form)
  }

  return (
    // Faux-overlay — uses normal flow height so the widget viewport is correct
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300,
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)',
          padding: 24, width: 380, maxWidth: '90vw',
          boxShadow: '0 20px 40px rgba(0,0,0,.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          {initial ? 'Edit user' : 'Add new user'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
          {initial ? `Update account details for ${initial.name}` : 'Create a new student or admin account'}
        </p>

        {/* Name + Email */}
        {[
          { label: 'Full name', name: 'name', type: 'text', placeholder: 'Alice Rahman' },
          { label: 'Email address', name: 'email', type: 'email', placeholder: 'alice@university.edu' },
        ].map(f => (
          <div key={f.name} className="field mb-12">
            <label className="label">{f.label}</label>
            <input
              name={f.name} type={f.type}
              value={form[f.name]} onChange={change}
              placeholder={f.placeholder}
              className="input"
              style={{ height: 36 }}
            />
          </div>
        ))}

        {/* Role + Status */}
        <div className="grid-2 mb-20">
          <div className="field">
            <label className="label">Role</label>
            <select name="role" value={form.role} onChange={change}
              className="input" style={{ height: 36, cursor: 'pointer' }}>
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Status</label>
            <select name="status" value={form.status} onChange={change}
              className="input" style={{ height: 36, cursor: 'pointer' }}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={save}>
            {initial ? 'Save changes' : 'Add user'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'overview',  icon: '📊', label: 'Dashboard' },
  { id: 'users',     icon: '👥', label: 'Users',       badge: null },
  { id: 'activity',  icon: '📋', label: 'Activity log' },
  { id: 'reports',   icon: '📈', label: 'Reports' },
  { id: 'settings',  icon: '⚙️', label: 'Settings' },
]

function AdminSidebar({ tab, setTab, userCount }) {
  const { user, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()

  return (
    <div style={{
      width: 220, minHeight: '100vh', background: '#0A1628',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ width: 30, height: 30, background: '#D97706', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>S</div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>SmartLearn</span>
        <span style={{ marginLeft: 'auto', background: '#D97706', color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>ADMIN</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.08em', textTransform: 'uppercase', padding: '10px 8px 4px' }}>Overview</p>
        {NAV.map(({ id, icon, label }) => (
          <button key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '8px 10px', borderRadius: 8, marginBottom: 2,
              background: tab === id ? 'rgba(255,255,255,.13)' : 'transparent',
              color: tab === id ? '#fff' : 'rgba(255,255,255,.55)',
              fontSize: 13, fontWeight: tab === id ? 600 : 500,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'all .15s',
            }}
          >
            <span>{icon}</span>
            {label}
            {id === 'users' && userCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#3B82F6', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 999 }}>
                {userCount}
              </span>
            )}
          </button>
        ))}

        <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.08em', textTransform: 'uppercase', padding: '14px 8px 4px' }}>App</p>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, marginBottom: 2, background: 'transparent', color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
          <span>🏠</span>Main app
        </button>
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        {/* Night mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 6 }}>
          <span style={{ fontSize: 13 }}>🌙</span>
          <label style={{ position: 'relative', width: 34, height: 18, flexShrink: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={dark} onChange={toggleDark} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <span style={{
              position: 'absolute', inset: 0, background: dark ? '#3B82F6' : 'rgba(255,255,255,.15)',
              borderRadius: 999, transition: 'background .2s', cursor: 'pointer',
            }}>
              <span style={{
                position: 'absolute', width: 12, height: 12, background: '#fff', borderRadius: '50%',
                top: 3, left: dark ? 19 : 3, transition: 'left .2s',
              }} />
            </span>
          </label>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Night mode</span>
        </div>

        {/* User chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {getInitials(user?.name || 'Admin')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Administrator</div>
          </div>
          <button onClick={async () => { await logout(); navigate('/admin-login', { replace: true }); }} title="Sign out" aria-label="Sign out"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 16, padding: 2 }}>
            🚪
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Overview (Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ users }) {
  const WEEK_DATA = [
    { label: 'Mon', value: 11 }, { label: 'Tue', value: 15 },
    { label: 'Wed', value: 8 },  { label: 'Thu', value: 18 },
    { label: 'Fri', value: 13 }, { label: 'Sat', value: 6 },
    { label: 'Sun', value: 4 },
  ]
  const SUBJECTS = [
    { label: 'Computer Sci', value: 94 }, { label: 'Mathematics', value: 57 },
    { label: 'Physics',      value: 54 }, { label: 'Literature',  value: 42 },
  ]
  const SUBJ_COLORS = ['#3B82F6', '#7C3AED', '#10B981', '#F59E0B']

  const LOGS = [
    { dot: '#10B981', msg: 'New user registered: Alice Rahman (alice.rahman@example.com)',       time: '2 min ago' },
    { dot: '#3B82F6', msg: 'AI chat started by Demo Student — Binary Search Trees',             time: '5 min ago' },
    { dot: '#D97706', msg: 'Successful login: Sarah Chen (mobile device)',                       time: '8 min ago' },
    { dot: '#7C3AED', msg: 'Study plan generated for Mohammed Al-Farsi via AI',                 time: '12 min ago' },
    { dot: '#DC2626', msg: 'Failed login (3 attempts): unknown@test.com',                       time: '18 min ago' },
  ]

  return (
    <div>
      {/* Stats */}
      <div className="grid-4 mb-16">
        <StatCard icon="👥" label="Total users"    value={users.length} change="↑ 12 this week" changeType="up" />
        <StatCard icon="✅" label="Active today"   value={84}           change="↑ 6 vs yesterday" changeType="up" />
        <StatCard icon="🤖" label="AI messages"    value="1,342"        change="↑ 18% this week" changeType="up" />
        <StatCard icon="⚠️" label="Flagged issues" value={3}            change="Needs review" changeType="warn" />
      </div>

      {/* Charts */}
      <div className="grid-2 mb-16">
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>New registrations — last 7 days</h3>
          <BarChart data={WEEK_DATA} color="#3B82F6" />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Top subjects studied</h3>
          {/* Donut */}
          <svg viewBox="0 0 100 100" width={90} height={90} style={{ display: 'block', margin: '0 auto 12px' }} role="img" aria-label="Subject breakdown">
            <title>Subject breakdown donut</title>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#3B82F6" strokeWidth="14" strokeDasharray="89 149" strokeDashoffset="0"   transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#7C3AED" strokeWidth="14" strokeDasharray="45 149" strokeDashoffset="-89"  transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="14" strokeDasharray="30 149" strokeDashoffset="-134" transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeDasharray="21 149" strokeDashoffset="-164" transform="rotate(-90 50 50)" />
            <text x="50" y="54" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{users.length}</text>
          </svg>
          {SUBJECTS.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: SUBJ_COLORS[i], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{Math.round((s.value / 247) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent logs */}
      <div className="card">
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Recent system activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {LOGS.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < LOGS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.dot, flexShrink: 0, marginTop: 5 }} />
              <p style={{ flex: 1, fontSize: 13, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: l.msg }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{l.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Users
// ─────────────────────────────────────────────────────────────────────────────

function UsersTab({ users, setUsers }) {
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('ALL')
  const [modal,       setModal]       = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [selectAll,   setSelectAll]   = useState(false)
  const [selected,    setSelected]    = useState(new Set())

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openAdd  = () => { setEditTarget(null); setModal(true) }
  const openEdit = u  => { setEditTarget(u);    setModal(true) }

  const handleSave = (form) => {
    if (editTarget) {
      setUsers(us => us.map(u => u.id === editTarget.id ? { ...u, ...form } : u))
      toast.success('User updated successfully')
    } else {
      const newUser = { id: Date.now(), ...form, streak: 0, createdAt: new Date().toISOString() }
      setUsers(us => [...us, newUser])
      toast.success('User added successfully')
    }
    setModal(false)
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return
    setUsers(us => us.filter(u => u.id !== id))
    toast.success('User deleted')
  }

  const toggleSelect = (id) => {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectAll) { setSelected(new Set()); setSelectAll(false) }
    else { setSelected(new Set(filtered.map(u => u.id))); setSelectAll(true) }
  }

  const roleBadge   = r => ({ ADMIN: 'purple', STUDENT: 'blue' }[r] || 'blue')
  const statusBadge = s => ({ Active: 'green', Inactive: 'red', Suspended: 'gold' }[s] || 'blue')

  return (
    <div>
      <UserModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={handleSave}
        initial={editTarget}
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>All users</h3>
            <Badge type="blue">{filtered.length}</Badge>
            {selected.size > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{selected.size} selected</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Search name or email…"
              className="input"
              style={{ height: 34, width: 200, fontSize: 13 }}
            />
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input"
              style={{ height: 34, width: 120, fontSize: 13, cursor: 'pointer' }}
              aria-label="Filter by role"
            >
              <option value="ALL">All roles</option>
              <option value="STUDENT">Students</option>
              <option value="ADMIN">Admins</option>
            </select>
            {/* Add user */}
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              ＋ Add user
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={{ padding: '10px 18px', textAlign: 'left', width: 40 }}>
                  <input type="checkbox" checked={selectAll} onChange={toggleAll} style={{ cursor: 'pointer' }} aria-label="Select all" />
                </th>
                {['User', 'Role', 'Status', 'Streak', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
                    No users match your search.
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: selected.has(u.id) ? 'var(--accent-lt)' : 'transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!selected.has(u.id)) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!selected.has(u.id)) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: '10px 18px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      style={{ cursor: 'pointer' }}
                      aria-label={`Select ${u.name}`}
                    />
                  </td>

                  {/* User */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: u.role === 'ADMIN' ? '#D97706' : 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '10px 14px' }}>
                    <Badge type={roleBadge(u.role)}>{u.role}</Badge>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 14px' }}>
                    <Badge type={statusBadge(u.status)}>{u.status}</Badge>
                  </td>

                  {/* Streak */}
                  <td style={{ padding: '10px 14px', color: u.streak > 0 ? '#F59E0B' : 'var(--text-3)', fontWeight: u.streak > 0 ? 600 : 400, fontSize: 13 }}>
                    {u.streak > 0 ? `🔥 ${u.streak} days` : '—'}
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                    {formatDate(u.createdAt) || u.joined || '—'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <ActionBtn onClick={() => openEdit(u)}>✏️ Edit</ActionBtn>
                      <ActionBtn danger onClick={() => handleDelete(u.id)}>🗑</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            Showing 1–{filtered.length} of {filtered.length} users
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['←', '1', '2', '→'].map(p => (
              <button key={p} style={{
                width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border)',
                background: p === '1' ? 'var(--accent)' : 'transparent',
                color: p === '1' ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Activity log
// ─────────────────────────────────────────────────────────────────────────────

const ALL_LOGS = [
  { type: 'register', dot: '#10B981', msg: 'New user registered: <b>Alice Rahman</b> (alice.rahman@example.com)',      time: '2 min ago' },
  { type: 'ai',       dot: '#3B82F6', msg: 'AI chat started by <b>Demo Student</b> — Binary Search Trees',             time: '5 min ago' },
  { type: 'login',    dot: '#D97706', msg: 'Successful login: <b>Sarah Chen</b> (mobile device)',                      time: '8 min ago' },
  { type: 'ai',       dot: '#7C3AED', msg: 'Study plan generated for <b>Mohammed Al-Farsi</b> via AI',                 time: '12 min ago' },
  { type: 'login',    dot: '#DC2626', msg: 'Failed login (3 attempts): <b>unknown@test.com</b>',                       time: '18 min ago' },
  { type: 'register', dot: '#10B981', msg: 'New user registered: <b>Mohammed Al-Farsi</b> (m.alfarsi@uni.edu)',        time: '2h ago' },
  { type: 'ai',       dot: '#3B82F6', msg: 'AI chat started by <b>Alice Rahman</b> — Newton\'s Laws of Motion',       time: '3h ago' },
  { type: 'login',    dot: '#D97706', msg: 'Password reset requested: <b>demo@smartlearning.app</b>',                  time: '5h ago' },
  { type: 'register', dot: '#10B981', msg: 'New user registered: <b>Sarah Chen</b> (sarah.chen@student.ac)',           time: '8h ago' },
  { type: 'ai',       dot: '#7C3AED', msg: 'Recommendations generated for <b>Demo Student</b> — Mathematics topic',   time: '10h ago' },
]

function ActivityTab() {
  const [filter, setFilter] = useState('all')
  const logs = filter === 'all' ? ALL_LOGS : ALL_LOGS.filter(l => l.type === filter)

  const FILTER_OPTS = [
    { value: 'all',      label: 'All events' },
    { value: 'register', label: 'Registrations' },
    { value: 'login',    label: 'Login events' },
    { value: 'ai',       label: 'AI activity' },
  ]

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>System activity log</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTER_OPTS.map(o => (
            <button key={o.value} onClick={() => setFilter(o.value)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === o.value ? 'var(--accent)' : 'var(--bg-hover)',
              color: filter === o.value ? '#fff' : 'var(--text-2)',
              transition: 'all .15s',
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div>
        {logs.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 18px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot, flexShrink: 0, marginTop: 5 }} />
            <p style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}
               dangerouslySetInnerHTML={{ __html: l.msg }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{l.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Reports
// ─────────────────────────────────────────────────────────────────────────────

function ReportsTab() {
  const MONTHLY = [
    { label: 'January',  value: 18 }, { label: 'February', value: 27 },
    { label: 'March',    value: 42 }, { label: 'April',    value: 33 },
    { label: 'May',      value: 51 }, { label: 'June',     value: 76 },
  ]

  return (
    <div>
      <div className="grid-4 mb-16">
        <StatCard icon="⏱️" label="Total study hours" value="4,820" change="↑ 340 this week" />
        <StatCard icon="🤖" label="AI messages sent"  value="8,431" change="↑ 18%" />
        <StatCard icon="🔥" label="Average streak"    value="5.2"   change="↑ 0.8 days" />
        <StatCard icon="✅" label="Tasks completed"   value="1,204" change="↑ 87 today" />
      </div>

      <div className="card mb-16">
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Monthly registrations — 2026</h3>
        <BarChart data={MONTHLY} color="#3B82F6" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm">📊 Export CSV</button>
        <button className="btn btn-primary btn-sm">📄 Export PDF report</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Settings
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState({
    siteName:         'SmartLearn — AI Study Assistant',
    supportEmail:     'support@smartlearning.app',
    maxUsersPerPlan:  100,
    aiEnabled:        true,
    maintenanceMode:  false,
    emailVerRequired: true,
  })

  const toggle = key => setSettings(s => ({ ...s, [key]: !s[key] }))

  const save = () => toast.success('Settings saved successfully')

  const Toggle = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      <label style={{ position: 'relative', width: 42, height: 22, cursor: 'pointer' }}>
        <input type="checkbox" checked={value} onChange={onChange} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 999, cursor: 'pointer', transition: 'background .2s',
          background: value ? 'var(--accent)' : 'var(--border)',
        }}>
          <span style={{ position: 'absolute', width: 16, height: 16, background: '#fff', borderRadius: '50%', top: 3, left: value ? 23 : 3, transition: 'left .2s' }} />
        </span>
      </label>
    </div>
  )

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card mb-16">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>General settings</h3>
        <div className="field mb-14">
          <label className="label">Site name</label>
          <input className="input" value={settings.siteName}
            onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} />
        </div>
        <div className="field mb-14">
          <label className="label">Support email</label>
          <input className="input" type="email" value={settings.supportEmail}
            onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">Max users per plan</label>
          <input className="input" type="number" value={settings.maxUsersPerPlan}
            onChange={e => setSettings(s => ({ ...s, maxUsersPerPlan: Number(e.target.value) }))} />
        </div>
      </div>

      <div className="card mb-16">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Feature flags</h3>
        <Toggle value={settings.aiEnabled}        onChange={() => toggle('aiEnabled')}        label="Enable AI chat and recommendations" />
        <Toggle value={settings.emailVerRequired} onChange={() => toggle('emailVerRequired')} label="Require email verification on signup" />
        <Toggle value={settings.maintenanceMode}  onChange={() => toggle('maintenanceMode')}  label="Maintenance mode (blocks all users)" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => toast('Changes discarded')}>Discard</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save settings</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPanel page
// ─────────────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { id: 1, name: 'Demo Student',       email: 'demo@smartlearning.app',    role: 'STUDENT', status: 'Active',   streak: 7,  createdAt: '2026-06-28T15:05:44Z' },
  { id: 2, name: 'Alice Rahman',       email: 'alice.rahman@example.com',  role: 'STUDENT', status: 'Active',   streak: 3,  createdAt: '2026-06-28T15:06:20Z' },
  { id: 3, name: 'Mohammed Al-Farsi',  email: 'm.alfarsi@uni.edu',          role: 'STUDENT', status: 'Inactive', streak: 0,  createdAt: '2026-06-25T10:30:00Z' },
  { id: 4, name: 'Sarah Chen',         email: 'sarah.chen@student.ac',     role: 'STUDENT', status: 'Active',   streak: 12, createdAt: '2026-06-20T08:00:00Z' },
  { id: 5, name: 'Admin User',         email: 'admin@smartlearning.app',   role: 'ADMIN',   status: 'Active',   streak: 0,  createdAt: '2026-06-01T00:00:00Z' },
]

const TAB_TITLES = {
  overview: 'Dashboard overview',
  users:    'User management',
  activity: 'Activity log',
  reports:  'Analytics reports',
  settings: 'System settings',
}

export default function AdminPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab,   setTab]   = useState('overview')
  const [users, setUsers] = useState(SEED_USERS)

  // Guard: only admins can access this page
  // Uncomment below in production:
  // useEffect(() => {
  //   if (user && user.role !== 'ADMIN') {
  //     toast.error('Admin access required')
  //     navigate('/dashboard')
  //   }
  // }, [user])

  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = () => {
    setRefreshing(true)
    toast('Data refreshed', { icon: '🔄' })
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar */}
      <AdminSidebar tab={tab} setTab={setTab} userCount={users.length} />

      {/* Page body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

        {/* Topbar */}
        <div style={{
          height: 60, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12,
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            {TAB_TITLES[tab]}
          </h1>
          <button
            onClick={handleRefresh}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, transition: 'all .15s', color: 'var(--text-2)' }}
            aria-label="Refresh data"
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
          </button>
          <button
            onClick={() => toast('Notifications coming soon')}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-2)' }}
            aria-label="View notifications"
          >
            🔔
          </button>
          <button
            onClick={() => toast.success('Export initiated — file will download shortly')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📥 Export
          </button>
        </div>

        {/* Content */}
        <main style={{ flex: 1, padding: 28, maxWidth: 1280 }}>
          {tab === 'overview'  && <OverviewTab  users={users} />}
          {tab === 'users'     && <UsersTab     users={users} setUsers={setUsers} />}
          {tab === 'activity'  && <ActivityTab />}
          {tab === 'reports'   && <ReportsTab />}
          {tab === 'settings'  && <SettingsTab />}
        </main>
      </div>

      {/* Keyframe for refresh spin */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
