import { Link } from "react-router-dom";
import "../styles/auth.css";

const roles = [
  {
    path: "/student-login",
    icon: "🎓",
    label: "Student",
    title: "Learn smarter",
    description:
      "Manage your learning, tasks, AI tutor, study plans and academic progress.",
    features: ["AI Tutor", "Smart Tasks", "Progress Tracking"],
    type: "student",
  },
  {
    path: "/teacher-login",
    icon: "👨‍🏫",
    label: "Teacher",
    title: "Guide learners",
    description:
      "Manage students, learning resources, assignments, progress and reminders.",
    features: ["Student Management", "Resources", "Progress"],
    type: "teacher",
  },
  {
    path: "/admin-login",
    icon: "🛡️",
    label: "Administrator",
    title: "Manage platform",
    description:
      "Manage users, roles, approvals and the overall Smart AI Learnet platform.",
    features: ["Users", "Approvals", "Platform Control"],
    type: "admin",
  },
];

export default function AccountLoginChooser() {
  return (
    <div className="role-selection-page role-selection-light">
      {/* Background decoration */}
      <div className="role-bg role-bg-one" />
      <div className="role-bg role-bg-two" />

      {/* Header */}
      <header className="role-header">
        <Link to="/" className="role-brand">
          <div className="role-logo">S</div>

          <div>
            <strong>Smart AI Learnet</strong>
            <span>Intelligent learning platform</span>
          </div>
        </Link>

        <div className="role-header-right">
          <span className="role-secure">🔒 Secure workspace access</span>
        </div>
      </header>

      {/* Main */}
      <main className="role-main">
        <section className="role-intro">
          <div className="role-badge">✨ AI-powered learning platform</div>

          <h1>
            Welcome to
            <span> Smart AI Learner</span>
          </h1>

          <p>
            Choose the workspace that matches your role and continue to your
            personalized learning environment.
          </p>
        </section>

        {/* Role cards */}
        <section className="role-grid">
          {roles.map((role) => (
            <Link
              key={role.path}
              to={role.path}
              className={`role-card role-card-${role.type}`}
            >
              <div className="role-card-top">
                <div className="role-icon">{role.icon}</div>

                <span className="role-arrow">→</span>
              </div>

              <div className="role-card-content">
                <div className="role-label">{role.label}</div>

                <h2>{role.title}</h2>

                <p>{role.description}</p>
              </div>

              <div className="role-features">
                {role.features.map((feature) => (
                  <span key={feature}>✓ {feature}</span>
                ))}
              </div>

              <div className="role-continue">
                Continue as {role.label}
                <span>→</span>
              </div>
            </Link>
          ))}
        </section>

        {/* Registration */}
        <section className="role-register">
          <div>
            <strong >New to Smart AI Learnet?</strong>
            <span>
              Create a student account and start your learning journey.
            </span>
          </div>

          <Link to="/student-register">Create Student Account →</Link>
        </section>

        {/* Bottom features */}
        <div className="role-platform-features">
          <span>🤖 AI-powered assistance</span>
          <span>📚 Personalized learning</span>
          <span>📊 Progress insights</span>
          <span>⚡ Smart productivity</span>
        </div>
      </main>

      <footer className="role-footer">
        © {new Date().getFullYear()} Smart AI Learnet
      </footer>
    </div>
  );
}
