// src/pages/DashboardPage.jsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LearningShell from '../components/LearningShell'

export default function DashboardPage() {
  const navigate = useNavigate()

  const { user } = useAuth()
  const { dark } = useTheme()

  // =========================================================
  // STATE
  // =========================================================

  const [dashboard, setDashboard] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)


  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const [showStudyModal, setShowStudyModal] = useState(false)
  const [studyLoading, setStudyLoading] = useState(false)

  const [studyForm, setStudyForm] = useState({
    durationMin: '',
    notes: '',
  })

  // =========================================================
  // THEME
  // =========================================================

  const theme = dark
    ? {
        page: '#07111f',
        panel: '#0f1c2e',
        panelSoft: '#0b1728',
        border: '#203047',
        text: '#e7eef8',
        muted: '#91a4bb',
        subtle: '#64748b',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        hover: '#15253a',
        input: '#0d1929',
        shadow: 'rgba(0,0,0,.30)',
      }
    : {
        page: '#f5f7fb',
        panel: '#ffffff',
        panelSoft: '#f8fafc',
        border: '#e2e8f0',
        text: '#172033',
        muted: '#64748b',
        subtle: '#94a3b8',
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        hover: '#f1f5f9',
        input: '#ffffff',
        shadow: 'rgba(15,23,42,.08)',
      }

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await api.get('/dashboard')

      setDashboard(response.data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)

      toast.error(
        error.response?.data?.error ||
          'Unable to load dashboard'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // =========================================================
  // GEMINI AI INSIGHT
  // =========================================================

  async function generateAIInsight() {
    try {
      setAiLoading(true)
      setAiError('')

      /*
       * The frontend does NOT call Gemini directly.
       *
       * Your backend should expose something similar to:
       *
       * POST /api/ai/dashboard-insight
       *
       * The backend collects the authenticated user's
       * real study/task/subject data and sends it to Gemini.
       */

      const response = await api.get(
        '/dashboard/ai-insight'
      )

      const insight =
        response.data?.reply ||
        response.data?.insight ||
        response.data?.message

      if (!insight) {
        throw new Error(
          'No AI insight returned from backend'
        )
      }

      setAiInsight(insight)
    } catch (error) {
      console.error(
        'Failed to generate AI insight:',
        error
      )

      const message =
        error.response?.data?.error ||
        'Unable to generate AI insight right now.'

      setAiError(message)
      toast.error(message)
    } finally {
      setAiLoading(false)
    }
  }

  // =========================================================
  // OPEN AI CHAT WITH CONTEXT
  // =========================================================

  function openAIWithPrompt(prompt) {
    navigate('/chat', {
      state: {
        initialPrompt: prompt,
      },
    })
  }

  // =========================================================
  // LOG STUDY SESSION
  // =========================================================

  async function handleStudySubmit(event) {
    event.preventDefault()

    const duration = parseInt(
      studyForm.durationMin,
      10
    )

    if (!duration || duration <= 0) {
      toast.error(
        'Study duration must be greater than 0 minutes'
      )
      return
    }

    try {
      setStudyLoading(true)

      await api.post('/dashboard/study-log', {
        durationMin: duration,
        notes: studyForm.notes.trim() || null,
      })

      toast.success(
        'Study session logged successfully'
      )

      setStudyForm({
        durationMin: '',
        notes: '',
      })

      setShowStudyModal(false)

      await loadDashboard(true)
    } catch (error) {
      console.error(
        'Failed to log study session:',
        error
      )

      toast.error(
        error.response?.data?.error ||
          'Unable to log study session'
      )
    } finally {
      setStudyLoading(false)
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function getUserName() {
    return (
      user?.name ||
      user?.fullName ||
      user?.username ||
      user?.email?.split('@')[0] ||
      'Student'
    )
  }

  function getFirstName() {
    return getUserName().split(' ')[0]
  }

  function formatHours(hours) {
    const value = Number(hours || 0)

    if (value === 0) return '0h'

    if (Number.isInteger(value)) {
      return `${value}h`
    }

    return `${value.toFixed(1)}h`
  }

  function formatDate(date) {
    if (!date) return 'No date'

    const value = new Date(date)

    if (Number.isNaN(value.getTime())) {
      return 'No date'
    }

    return value.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  }

  function getTaskStatusLabel(status) {
    const labels = {
      TODO: 'To Do',
      IN_PROGRESS: 'In Progress',
      DONE: 'Completed',
      CANCELLED: 'Cancelled',
    }

    return labels[status] || status
  }

  function getTaskStatusColor(status) {
    if (status === 'DONE') {
      return theme.success
    }

    if (status === 'IN_PROGRESS') {
      return theme.primary
    }

    if (status === 'CANCELLED') {
      return theme.danger
    }

    return theme.warning
  }

  function getProgressPercentage() {
    const hours = Number(
      dashboard?.weeklyStudyHours || 0
    )

    const goal = Number(
      dashboard?.studyGoalHrs || 0
    )

    if (!goal) return 0

    return Math.min(
      100,
      Math.round((hours / goal) * 100)
    )
  }

  function getSubjectColor(index) {
    const colors = [
      theme.primary,
      theme.success,
      theme.warning,
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
    ]

    return colors[index % colors.length]
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  const navigation = [
    { label: 'Dashboard', icon: '⌂', path: '/dashboard' },
    { label: 'AI Tutor', icon: '✦', path: '/chat' },
    { label: 'Tasks', icon: '✓', path: '/tasks' },
    { label: 'Smart Quiz', icon: '?', path: '/quiz' },
    { label: 'Documents', icon: '▤', path: '/documents' },
    { label: 'Recommendations', icon: '★', path: '/recommendations' },
    { label: 'Progress & Weakness', icon: '◔', path: '/analytics' },
    { label: 'Voice Tutor', icon: '◉', path: '/voice' },
  ]

  const secondaryNavigation = [
    {
      label: 'Notifications',
      icon: '♢',
      path: '/notifications',
    },
    {
      label: 'Profile',
      icon: '◉',
      path: '/profile',
    },
    {
      label: 'Settings',
      icon: '⚙',
      path: '/settings',
    },
  ]

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.page,
          color: theme.text,
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              margin: '0 auto 14px',
              borderRadius: '50%',
              border: `4px solid ${theme.border}`,
              borderTopColor: theme.primary,
              animation:
                'smartlearn-spin .8s linear infinite',
            }}
          />

          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Loading your dashboard...
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              color: theme.muted,
            }}
          >
            Preparing your study overview
          </div>
        </div>

        <style>
          {`
            @keyframes smartlearn-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    )
  }

  // =========================================================
  // DATABASE DATA
  // =========================================================

  const taskSummary =
    dashboard?.taskSummary || {}

  const weeklyStudyHours = Number(
    dashboard?.weeklyStudyHours || 0
  )

  const studyGoalHrs = Number(
    dashboard?.studyGoalHrs || 0
  )

  const streak = Number(
    dashboard?.streak || 0
  )

  const upcomingTasks =
    dashboard?.upcomingTasks || []

  /*
   * These arrays MUST come from backend.
   *
   * If the backend doesn't provide them yet,
   * the dashboard simply shows an empty-state message.
   */

  const studyAnalytics =
    Array.isArray(dashboard?.studyAnalytics)
      ? dashboard.studyAnalytics
      : []

  const subjectProficiency =
    Array.isArray(
      dashboard?.subjectProficiency
    )
      ? dashboard.subjectProficiency
      : []

  const completedTasks = Number(
    taskSummary.DONE || 0
  )

  const pendingTasks = Number(
    taskSummary.TODO || 0
  )

  const inProgressTasks = Number(
    taskSummary.IN_PROGRESS || 0
  )

  const cancelledTasks = Number(
    taskSummary.CANCELLED || 0
  )

  const progress = getProgressPercentage()

  // =========================================================
  // MAX ANALYTICS VALUE
  // =========================================================

  const maxStudyValue =
    studyAnalytics.length > 0
      ? Math.max(
          ...studyAnalytics.map(item =>
            Number(
              item.hours ??
                item.studyHours ??
                item.value ??
                0
            )
          ),
          1
        )
      : 1

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <LearningShell title="Dashboard" showTopbar={false}>
      <div style={{ minHeight: '100vh', background: theme.page, color: theme.text }}>
      {/* ===================================================
          MAIN
      ==================================================== */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        {/* Header */}

        <header
          style={{
            height: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            background: theme.panel,
            borderBottom: `1px solid ${theme.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 750,
                }}
              >
                Dashboard
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: theme.muted,
                }}
              >
                Your learning progress at a glance
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <button
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              title="Refresh dashboard"
              style={{
                width: 38,
                height: 38,
                border: `1px solid ${theme.border}`,
                borderRadius: 9,
                background: theme.panel,
                color: theme.text,
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ↻
            </button>

            <button
              onClick={() =>
                navigate('/notifications')
              }
              title="Notifications"
              style={{
                width: 38,
                height: 38,
                border: `1px solid ${theme.border}`,
                borderRadius: 9,
                background: theme.panel,
                color: theme.text,
                cursor: 'pointer',
                fontSize: 17,
              }}
            >
              ♢
            </button>

            <button
              onClick={() =>
                setShowStudyModal(true)
              }
              style={{
                border: 'none',
                borderRadius: 9,
                padding: '10px 15px',
                background: theme.primary,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              + Log Study
            </button>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================== */}

        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '30px 28px 45px',
          }}
        >
          {/* Welcome */}

          <section style={{ marginBottom: 25 }}>
            <div
              style={{
                fontSize: 27,
                fontWeight: 780,
                letterSpacing: -0.5,
              }}
            >
              Good to see you, {getFirstName()} 👋
            </div>

            <div
              style={{
                marginTop: 7,
                color: theme.muted,
                fontSize: 14,
              }}
            >
              Keep building your learning momentum.
              Here's your current study overview.
            </div>
          </section>

          {/* =================================================
              STAT CARDS
          ================================================== */}

          <section
            className="smartlearn-dashboard-stats"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, minmax(0, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon="◷"
              label="Study Hours"
              value={formatHours(
                weeklyStudyHours
              )}
              subtitle={`Goal: ${formatHours(
                studyGoalHrs
              )}`}
              color={theme.primary}
              theme={theme}
            />

            <StatCard
              icon="♨"
              label="Study Streak"
              value={`${streak} ${
                streak === 1 ? 'day' : 'days'
              }`}
              subtitle={
                streak > 0
                  ? 'Keep the momentum going'
                  : 'Start your streak today'
              }
              color={theme.warning}
              theme={theme}
            />

            <StatCard
              icon="✓"
              label="Pending Tasks"
              value={pendingTasks}
              subtitle={`${inProgressTasks} in progress`}
              color={theme.primary}
              theme={theme}
            />

            <StatCard
              icon="★"
              label="Completed Tasks"
              value={completedTasks}
              subtitle="From your database"
              color={theme.success}
              theme={theme}
            />
          </section>

          {/* =================================================
              STUDY PROGRESS + QUICK ACTIONS
          ================================================== */}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1.6fr) minmax(280px, .8fr)',
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* Study Progress */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 15,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 750,
                    }}
                  >
                    Weekly Study Goal
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: theme.muted,
                      fontSize: 13,
                    }}
                  >
                    Track your actual study time against
                    your weekly target.
                  </div>
                </div>

                <button
                  onClick={() =>
                    setShowStudyModal(true)
                  }
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: theme.panelSoft,
                    color: theme.text,
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Log session
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  marginTop: 27,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 116,
                    height: 116,
                    minWidth: 116,
                    borderRadius: '50%',
                    background: `conic-gradient(
                      ${theme.primary} ${progress}%,
                      ${theme.border} ${progress}%
                    )`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      background: theme.panel,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      {progress}%
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: theme.muted,
                      }}
                    >
                      complete
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                    }}
                  >
                    {formatHours(
                      weeklyStudyHours
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: theme.muted,
                      fontSize: 13,
                    }}
                  >
                    studied this week
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 13,
                    }}
                  >
                    Target:{' '}
                    <strong>
                      {formatHours(
                        studyGoalHrs
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 750,
                }}
              >
                Quick Actions
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: theme.muted,
                  fontSize: 13,
                }}
              >
                Jump directly to your study tools.
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 9,
                  marginTop: 18,
                }}
              >
                <QuickAction
                  icon="✦"
                  label="AI Tutor"
                  onClick={() =>
                    navigate('/chat')
                  }
                  theme={theme}
                />

                <QuickAction
                  icon="✓"
                  label="Tasks"
                  onClick={() =>
                    navigate('/tasks')
                  }
                  theme={theme}
                />

                <QuickAction
                  icon="▣"
                  label="Planner"
                  onClick={() =>
                    navigate('/planner')
                  }
                  theme={theme}
                />

                <QuickAction
                  icon="▤"
                  label="Resources"
                  onClick={() =>
                    navigate('/resources')
                  }
                  theme={theme}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              ANALYTICS
          ================================================== */}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1.4fr) minmax(300px, .8fr)',
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* Study Analytics */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 750,
                    }}
                  >
                    Study Analytics
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: theme.muted,
                      fontSize: 12,
                    }}
                  >
                    Your actual study activity from the database.
                  </div>
                </div>

                <button
                  onClick={() =>
                    navigate('/analytics')
                  }
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: theme.primary,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Details →
                </button>
              </div>

              {studyAnalytics.length === 0 ? (
                <EmptyAnalytics
                  theme={theme}
                  text="No study analytics available yet."
                  subtext="Log study sessions to build your learning analytics."
                />
              ) : (
                <div
                  style={{
                    height: 230,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 12,
                    marginTop: 25,
                    padding:
                      '10px 5px 0',
                  }}
                >
                  {studyAnalytics.map(
                    (item, index) => {
                      const value = Number(
                        item.hours ??
                          item.studyHours ??
                          item.value ??
                          0
                      )

                      const height =
                        Math.max(
                          4,
                          (value /
                            maxStudyValue) *
                            170
                        )

                      const label =
                        item.label ||
                        item.day ||
                        item.date ||
                        `Day ${index + 1}`

                      return (
                        <div
                          key={`${label}-${index}`}
                          style={{
                            flex: 1,
                            height: '100%',
                            display: 'flex',
                            flexDirection:
                              'column',
                            alignItems:
                              'center',
                            justifyContent:
                              'flex-end',
                            minWidth: 25,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color:
                                theme.muted,
                              marginBottom: 5,
                            }}
                          >
                            {value}h
                          </div>

                          <div
                            title={`${label}: ${value} hours`}
                            style={{
                              width: '100%',
                              maxWidth: 42,
                              height,
                              borderRadius:
                                '7px 7px 3px 3px',
                              background:
                                theme.primary,
                              opacity:
                                .75 +
                                (value /
                                  maxStudyValue) *
                                  .25,
                              transition:
                                'height .3s ease',
                            }}
                          />

                          <div
                            style={{
                              marginTop: 7,
                              fontSize: 10,
                              color:
                                theme.muted,
                              whiteSpace:
                                'nowrap',
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              maxWidth: 55,
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              )}
            </div>

            {/* Task Analytics */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 750,
                }}
              >
                Task Analytics
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: theme.muted,
                  fontSize: 12,
                }}
              >
                Current task distribution.
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <ProgressRow
                  label="Completed"
                  value={completedTasks}
                  total={
                    completedTasks +
                    pendingTasks +
                    inProgressTasks +
                    cancelledTasks
                  }
                  color={theme.success}
                  theme={theme}
                />

                <ProgressRow
                  label="In Progress"
                  value={inProgressTasks}
                  total={
                    completedTasks +
                    pendingTasks +
                    inProgressTasks +
                    cancelledTasks
                  }
                  color={theme.primary}
                  theme={theme}
                />

                <ProgressRow
                  label="To Do"
                  value={pendingTasks}
                  total={
                    completedTasks +
                    pendingTasks +
                    inProgressTasks +
                    cancelledTasks
                  }
                  color={theme.warning}
                  theme={theme}
                />

                <ProgressRow
                  label="Cancelled"
                  value={cancelledTasks}
                  total={
                    completedTasks +
                    pendingTasks +
                    inProgressTasks +
                    cancelledTasks
                  }
                  color={theme.danger}
                  theme={theme}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              SUBJECT PROFICIENCY
          ================================================== */}

          <section
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: 15,
              padding: 22,
              marginBottom: 20,
              boxShadow: `0 4px 18px ${theme.shadow}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 750,
                  }}
                >
                  Subject Proficiency
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: theme.muted,
                    fontSize: 12,
                  }}
                >
                  Performance calculated from your actual learning data.
                </div>
              </div>

              <button
                onClick={() =>
                  navigate('/analytics')
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: theme.primary,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                View analytics →
              </button>
            </div>

            {subjectProficiency.length === 0 ? (
              <EmptyAnalytics
                theme={theme}
                text="No subject proficiency data available."
                subtext="Complete quizzes, tasks, or assessments to build subject performance data."
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                  marginTop: 20,
                }}
              >
                {subjectProficiency.map(
                  (subject, index) => {
                    const score = Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          subject.proficiency ??
                            subject.score ??
                            subject.percentage ??
                            0
                        )
                      )
                    )

                    const name =
                      subject.subjectName ||
                      subject.name ||
                      'Subject'

                    const color =
                      getSubjectColor(index)

                    return (
                      <div
                        key={
                          subject.id ||
                          `${name}-${index}`
                        }
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          background:
                            theme.panelSoft,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 650,
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {name}
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color,
                            }}
                          >
                            {score}%
                          </div>
                        </div>

                        <div
                          style={{
                            height: 7,
                            marginTop: 12,
                            borderRadius: 99,
                            background:
                              theme.border,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${score}%`,
                              height: '100%',
                              background: color,
                              borderRadius: 99,
                            }}
                          />
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </section>

          {/* =================================================
              UPCOMING TASKS + AI
          ================================================== */}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1.45fr) minmax(300px, .85fr)',
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* Upcoming Tasks */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                overflow: 'hidden',
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  padding: '19px 21px',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 750,
                    }}
                  >
                    Upcoming Tasks
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: theme.muted,
                      fontSize: 12,
                    }}
                  >
                    Your next academic priorities.
                  </div>
                </div>

                <button
                  onClick={() =>
                    navigate('/tasks')
                  }
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: theme.primary,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  View all →
                </button>
              </div>

              {upcomingTasks.length === 0 ? (
                <div
                  style={{
                    padding: 35,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28 }}>
                    ✓
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      fontSize: 14,
                      fontWeight: 650,
                    }}
                  >
                    You're all caught up!
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: theme.muted,
                      fontSize: 12,
                    }}
                  >
                    No upcoming tasks were found.
                  </div>
                </div>
              ) : (
                <div>
                  {upcomingTasks.map(
                    (task, index) => (
                      <button
                        key={
                          task.id || index
                        }
                        onClick={() =>
                          navigate('/tasks')
                        }
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 13,
                          padding:
                            '14px 21px',
                          border: 'none',
                          borderBottom:
                            index ===
                            upcomingTasks.length -
                              1
                              ? 'none'
                              : `1px solid ${theme.border}`,
                          background:
                            'transparent',
                          color: theme.text,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background =
                            theme.hover
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background =
                            'transparent'
                        }}
                      >
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            minWidth: 9,
                            borderRadius:
                              '50%',
                            background:
                              getTaskStatusColor(
                                task.status
                              ),
                          }}
                        />

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {task.title ||
                              'Untitled Task'}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems:
                                'center',
                              gap: 8,
                              marginTop: 5,
                              color:
                                theme.muted,
                              fontSize: 11,
                            }}
                          >
                            <span>
                              {task.subjectName ||
                                'General'}
                            </span>

                            <span>
                              •
                            </span>

                            <span
                              style={{
                                color:
                                  getTaskStatusColor(
                                    task.status
                                  ),
                              }}
                            >
                              {getTaskStatusLabel(
                                task.status
                              )}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: 'right',
                            minWidth: 65,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                theme.muted,
                            }}
                          >
                            Due
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              fontWeight: 650,
                            }}
                          >
                            {formatDate(
                              task.dueDate
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* AI Study Assistant */}

            <div
              style={{
                borderRadius: 15,
                padding: 22,
                background: dark
                  ? 'linear-gradient(145deg,#102c4b,#102b36)'
                  : 'linear-gradient(145deg,#eff6ff,#ecfeff)',
                border: `1px solid ${
                  dark
                    ? '#21405d'
                    : '#dbeafe'
                }`,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 43,
                    height: 43,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.primary,
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  ✦
                </div>

                <div
                  style={{
                    fontSize: 11,
                    padding:
                      '5px 8px',
                    borderRadius: 99,
                    background:
                      dark
                        ? '#173451'
                        : '#dbeafe',
                    color:
                      theme.primary,
                    fontWeight: 700,
                  }}
                >
                  GEMINI AI
                </div>
              </div>

              <div
                style={{
                  marginTop: 17,
                  fontSize: 17,
                  fontWeight: 780,
                }}
              >
                AI Study Assistant
              </div>

              <div
                style={{
                  marginTop: 7,
                  color: theme.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Get personalized learning insights
                based on your actual study activity,
                tasks, and performance.
              </div>

              {/* AI Insight */}

              {aiInsight && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 13,
                    borderRadius: 10,
                    background:
                      dark
                        ? 'rgba(15,23,42,.45)'
                        : 'rgba(255,255,255,.75)',
                    border: `1px solid ${theme.border}`,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: theme.primary,
                      marginBottom: 6,
                    }}
                  >
                    AI INSIGHT
                  </div>

                  {aiInsight}
                </div>
              )}

              {aiError && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 11,
                    borderRadius: 9,
                    background:
                      dark
                        ? '#321820'
                        : '#fef2f2',
                    color:
                      theme.danger,
                    fontSize: 12,
                  }}
                >
                  {aiError}
                </div>
              )}

              <button
                onClick={generateAIInsight}
                disabled={aiLoading}
                style={{
                  width: '100%',
                  marginTop: 15,
                  border: 'none',
                  borderRadius: 9,
                  background:
                    aiLoading
                      ? theme.border
                      : theme.primary,
                  color: '#fff',
                  padding: 11,
                  cursor: aiLoading
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {aiLoading
                  ? 'Analyzing your progress...'
                  : aiInsight
                    ? 'Refresh AI Insight'
                    : 'Analyze My Progress'}
              </button>

              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <AITutorButton
                  text="Explain a difficult concept"
                  onClick={() =>
                    openAIWithPrompt(
                      'Explain a difficult academic concept to me step by step.'
                    )
                  }
                  theme={theme}
                />

                <AITutorButton
                  text="Solve a problem step by step"
                  onClick={() =>
                    openAIWithPrompt(
                      'Help me solve an academic problem step by step.'
                    )
                  }
                  theme={theme}
                />

                <AITutorButton
                  text="Prepare for an exam"
                  onClick={() =>
                    openAIWithPrompt(
                      'Help me prepare for my upcoming exam.'
                    )
                  }
                  theme={theme}
                />
              </div>

              <button
                onClick={() =>
                  navigate('/chat')
                }
                style={{
                  width: '100%',
                  marginTop: 13,
                  border: `1px solid ${theme.primary}`,
                  borderRadius: 9,
                  background:
                    'transparent',
                  color: theme.primary,
                  padding: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Open AI Tutor →
              </button>
            </div>
          </section>

          {/* =================================================
              STUDY TOOLS
          ================================================== */}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 18,
            }}
          >
            {/* Task Overview */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 750,
                }}
              >
                Task Overview
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: theme.muted,
                  fontSize: 12,
                }}
              >
                Current task distribution from your database.
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <TaskMiniCard
                  label="To Do"
                  value={pendingTasks}
                  color={theme.warning}
                  theme={theme}
                />

                <TaskMiniCard
                  label="In Progress"
                  value={inProgressTasks}
                  color={theme.primary}
                  theme={theme}
                />

                <TaskMiniCard
                  label="Completed"
                  value={completedTasks}
                  color={theme.success}
                  theme={theme}
                />
              </div>

              <button
                onClick={() =>
                  navigate('/tasks')
                }
                style={{
                  width: '100%',
                  marginTop: 16,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 9,
                  background: theme.panelSoft,
                  color: theme.text,
                  padding: 10,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                Manage Tasks →
              </button>
            </div>

            {/* Study Tools */}

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 15,
                padding: 22,
                boxShadow: `0 4px 18px ${theme.shadow}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 750,
                }}
              >
                Study Tools
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: theme.muted,
                  fontSize: 12,
                }}
              >
                Continue learning from your workspace.
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr 1fr',
                  gap: 9,
                  marginTop: 19,
                }}
              >
                <ToolCard
                  icon="▱"
                  label="Notes"
                  onClick={() =>
                    navigate('/notes')
                  }
                  theme={theme}
                />

                <ToolCard
                  icon="▥"
                  label="Flashcards"
                  onClick={() =>
                    navigate('/flashcards')
                  }
                  theme={theme}
                />

                <ToolCard
                  icon="▤"
                  label="Resources"
                  onClick={() =>
                    navigate('/resources')
                  }
                  theme={theme}
                />
              </div>

              <button
                onClick={() =>
                  navigate('/analytics')
                }
                style={{
                  width: '100%',
                  marginTop: 16,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 9,
                  background: theme.panelSoft,
                  color: theme.text,
                  padding: 10,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                View Learning Analytics →
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* ===================================================
          STUDY LOG MODAL
      ==================================================== */}

      {showStudyModal && (
        <div
          onClick={() =>
            !studyLoading &&
            setShowStudyModal(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(0,0,0,.45)',
          }}
        >
          <div
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: 440,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              boxShadow:
                '0 25px 70px rgba(0,0,0,.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '19px 21px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 750,
                  }}
                >
                  Log Study Session
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: theme.muted,
                    fontSize: 12,
                  }}
                >
                  Record your study time.
                </div>
              </div>

              <button
                onClick={() =>
                  setShowStudyModal(false)
                }
                disabled={studyLoading}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 8,
                  background: theme.hover,
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleStudySubmit}
              style={{
                padding: 21,
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Study Duration
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={
                    studyForm.durationMin
                  }
                  onChange={e =>
                    setStudyForm(prev => ({
                      ...prev,
                      durationMin:
                        e.target.value,
                    }))
                  }
                  placeholder="60"
                  required
                  disabled={studyLoading}
                  style={{
                    flex: 1,
                    width: '100%',
                    boxSizing: 'border-box',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 9,
                    background: theme.input,
                    color: theme.text,
                    padding: '11px 12px',
                    outline: 'none',
                    fontSize: 14,
                  }}
                />

                <span
                  style={{
                    color: theme.muted,
                    fontSize: 13,
                  }}
                >
                  minutes
                </span>
              </div>

              <label
                style={{
                  display: 'block',
                  marginTop: 17,
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Notes
                <span
                  style={{
                    marginLeft: 5,
                    color: theme.subtle,
                    fontWeight: 400,
                  }}
                >
                  optional
                </span>
              </label>

              <textarea
                value={studyForm.notes}
                onChange={e =>
                  setStudyForm(prev => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="What did you study?"
                rows={4}
                disabled={studyLoading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 9,
                  background: theme.input,
                  color: theme.text,
                  padding: '11px 12px',
                  outline: 'none',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 19,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowStudyModal(false)
                  }
                  disabled={studyLoading}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 9,
                    background: theme.panel,
                    color: theme.text,
                    padding: '10px 15px',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={studyLoading}
                  style={{
                    border: 'none',
                    borderRadius: 9,
                    background:
                      studyLoading
                        ? theme.border
                        : theme.primary,
                    color: '#fff',
                    padding: '10px 17px',
                    cursor: studyLoading
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {studyLoading
                    ? 'Saving...'
                    : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          GLOBAL STYLES
      ==================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        button {
          transition:
            background .15s ease,
            border-color .15s ease,
            transform .1s ease;
        }

        button:active {
          transform: scale(.98);
        }

        input::placeholder,
        textarea::placeholder {
          color: ${theme.subtle};
        }

        @media (max-width: 1100px) {
          .smartlearn-dashboard-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 900px) {
          main section {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          aside {
            position: fixed !important;
            z-index: 80;
            left: 0;
            top: 0;
          }

          header {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }
        }

        @media (max-width: 600px) {
          .smartlearn-dashboard-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      </div>
    </LearningShell>
  )
}

// ===========================================================
// STAT CARD
// ===========================================================

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
  theme,
}) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 19,
        boxShadow: `0 4px 18px ${theme.shadow}`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `${color}18`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          marginTop: 17,
          color: theme.muted,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 25,
          fontWeight: 800,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 5,
          color: theme.subtle,
          fontSize: 11,
        }}
      >
        {subtitle}
      </div>
    </div>
  )
}

// ===========================================================
// QUICK ACTION
// ===========================================================

function QuickAction({
  icon,
  label,
  onClick,
  theme,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        border: `1px solid ${theme.border}`,
        background: theme.panelSoft,
        color: theme.text,
        borderRadius: 9,
        padding: '10px 9px',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background =
          theme.hover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background =
          theme.panelSoft
      }}
    >
      <span
        style={{
          color: theme.primary,
          fontSize: 15,
        }}
      >
        {icon}
      </span>

      {label}
    </button>
  )
}

// ===========================================================
// AI TUTOR BUTTON
// ===========================================================

function AITutorButton({
  text,
  onClick,
  theme,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        color: theme.text,
        borderRadius: 9,
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background =
          theme.hover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background =
          theme.panel
      }}
    >
      {text} →
    </button>
  )
}

// ===========================================================
// TASK MINI CARD
// ===========================================================

function TaskMiniCard({
  label,
  value,
  color,
  theme,
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: theme.panelSoft,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 4,
          color: theme.muted,
          fontSize: 11,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ===========================================================
// TOOL CARD
// ===========================================================

function ToolCard({
  icon,
  label,
  onClick,
  theme,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.panelSoft,
        color: theme.text,
        borderRadius: 10,
        padding: '15px 8px',
        cursor: 'pointer',
        textAlign: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background =
          theme.hover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background =
          theme.panelSoft
      }}
    >
      <div
        style={{
          color: theme.primary,
          fontSize: 19,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 650,
        }}
      >
        {label}
      </div>
    </button>
  )
}

// ===========================================================
// PROGRESS ROW
// ===========================================================

function ProgressRow({
  label,
  value,
  total,
  color,
  theme,
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 7,
          fontSize: 12,
        }}
      >
        <span>{label}</span>

        <span
          style={{
            color: theme.muted,
          }}
        >
          {value} ({percentage}%)
        </span>
      </div>

      <div
        style={{
          height: 7,
          borderRadius: 99,
          background: theme.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  )
}

// ===========================================================
// EMPTY ANALYTICS
// ===========================================================

function EmptyAnalytics({
  theme,
  text,
  subtext,
}) {
  return (
    <div
      style={{
        minHeight: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: 20,
        color: theme.muted,
      }}
    >
      <div
        style={{
          fontSize: 26,
          marginBottom: 8,
        }}
      >
        ◔
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 650,
          color: theme.text,
        }}
      >
        {text}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 11,
        }}
      >
        {subtext}
      </div>
    </div>
  )
}