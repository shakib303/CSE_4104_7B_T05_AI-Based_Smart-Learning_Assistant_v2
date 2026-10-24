import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./RoleLoginPage.css";

const ROLE_CONFIG = {
  STUDENT: {
    title: "Student Login",
    heading: "Welcome back, Student",
    subtitle:
      "Sign in to access your learning resources, track your progress, and stay connected with your educators.",
    label: "STUDENT PORTAL",
    icon: "🎓",
    emailPlaceholder: "student@university.edu",
    dashboard: "/dashboard",

    brandTitle: "Learn smarter.",
    brandHighlight: "Grow stronger.",
    brandText:
      "Your personalized academic workspace for learning, communication, resources, and progress tracking.",

    features: ["Learning Resources", "Progress Tracking", "Educator Messages"],
  },

  TEACHER: {
    title: "Teacher Login",
    heading: "Welcome back, Educator",
    subtitle:
      "Sign in to manage your students, share learning resources, send messages, and support academic growth.",
    label: "EDUCATOR PORTAL",
    icon: "👨‍🏫",
    emailPlaceholder: "teacher@university.edu",
    dashboard: "/teacher-dashboard",

    brandTitle: "Teach smarter.",
    brandHighlight: "Inspire more.",
    brandText:
      "A focused educator workspace for managing students, sharing resources, communicating, and supporting learning.",

    features: ["Student Management", "Learning Resources", "Communication"],
  },

  ADMIN: {
    title: "Admin Login",
    heading: "Welcome back, Administrator",
    subtitle:
      "Sign in to manage users, educator access, approvals, resources, and the SmartLearn platform.",
    label: "ADMINISTRATION PORTAL",
    icon: "🛡️",
    emailPlaceholder: "admin@smartlearn.com",
    dashboard: "/admin-dashboard",

    brandTitle: "Manage smarter.",
    brandHighlight: "Lead better.",
    brandText:
      "A centralized administration workspace for secure management, approvals, user control, and system oversight.",

    features: ["User Management", "Access Approvals", "System Analytics"],
  },
};

export default function RoleLoginPage({ role = "STUDENT" }) {
  const { login } = useAuth();
  const { dark, toggleDark } = useTheme();
  const navigate = useNavigate();

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.STUDENT;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password, role);

      toast.success(`${config.title} successful!`);

      navigate(config.dashboard);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Invalid email or password";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`role-login-page ${dark ? "role-login-dark" : ""}`}>
      {/* Background */}
      <div className="role-login-background">
        <div className="role-bg-orb role-bg-orb-one"></div>
        <div className="role-bg-orb role-bg-orb-two"></div>
        <div className="role-bg-orb role-bg-orb-three"></div>
        <div className="role-bg-grid"></div>
      </div>

      {/* Main Layout */}
      <div className="role-login-container">
        {/* ==========================================
            LEFT SIDE
        ========================================== */}

        <section className="role-login-left">
          {/* Logo */}
          <div className="role-brand">
            <div className="role-brand-logo">S</div>

            <div>
              <div className="role-brand-name">SmartLearn</div>

              <div className="role-brand-tagline">
                Smart learning. Better future.
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="role-hero">
            <div className="role-eyebrow">
              <span></span>
              {config.label}
            </div>

            <h1>
              {config.brandTitle}
              <br />
              <strong>{config.brandHighlight}</strong>
            </h1>

            <p>{config.brandText}</p>

            {/* Role Card */}
            <div className={`role-profile role-profile-${role.toLowerCase()}`}>
              <div className="role-profile-icon">{config.icon}</div>

              <div className="role-profile-content">
                <strong>
                  {role === "ADMIN"
                    ? "Administrator Workspace"
                    : role === "TEACHER"
                      ? "Educator Workspace"
                      : "Student Workspace"}
                </strong>

                <span>Secure access to your SmartLearn account</span>
              </div>

              <div className="role-status">
                <span></span>
                Secure
              </div>
            </div>

            {/* Feature Cards */}
            <div className="role-feature-list">
              {config.features.map((feature, index) => (
                <div className="role-feature" key={feature}>
                  <div className="role-feature-icon">
                    {index === 0 ? "✦" : index === 1 ? "◈" : "↗"}
                  </div>

                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Left Footer */}
          <div className="role-left-footer">
            <span>© {new Date().getFullYear()} SmartLearn</span>

            <button
              type="button"
              className="role-theme-button"
              onClick={toggleDark}
            >
              <span>{dark ? "☀" : "☾"}</span>

              {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </section>

        {/* ==========================================
            RIGHT SIDE
        ========================================== */}

        <section className="role-login-right">
          <div className="role-login-card">
            {/* Mobile Brand */}
            <div className="role-mobile-brand">
              <div className="role-brand-logo">S</div>

              <span>SmartLearn</span>
            </div>

            {/* Role Badge */}
            <div
              className={`role-login-badge role-badge-${role.toLowerCase()}`}
            >
              <span>{config.icon}</span>
              {config.title}
            </div>

            {/* Heading */}
            <div className="role-form-heading">
              <div className="role-welcome">
                <span>👋</span>
                Welcome back
              </div>

              <h2>{config.heading}</h2>

              <p>{config.subtitle}</p>
            </div>

            {/* Login Form */}
            <form className="role-login-form" onSubmit={submit}>
              {/* Email */}
              <div className="role-field">
                <label htmlFor="role-email">Email address</label>

                <div className="role-input-wrapper">
                  <span className="role-input-icon">@</span>

                  <input
                    id="role-email"
                    type="email"
                    placeholder={config.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="role-field">
                <div className="role-password-header">
                  <label htmlFor="role-password">Password</label>

                  <Link to="/forgot-password">Forgot password?</Link>
                </div>

                <div className="role-input-wrapper">
                  <span className="role-input-icon">●</span>

                  <input
                    id="role-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="role-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="role-form-options">
                <label>
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>

                <span className="role-secure-label">🔒 Secure login</span>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className={`role-login-button role-button-${role.toLowerCase()}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="role-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in as{" "}
                    {role === "ADMIN"
                      ? "Administrator"
                      : role === "TEACHER"
                        ? "Teacher"
                        : "Student"}
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Role Information */}
            <div className={`role-info-box role-info-${role.toLowerCase()}`}>
              <div className="role-info-icon">{config.icon}</div>

              <div>
                <strong>
                  {role === "ADMIN"
                    ? "Administrator access"
                    : role === "TEACHER"
                      ? "Educator access"
                      : "Student access"}
                </strong>

                <p>
                  {role === "ADMIN"
                    ? "Manage users, approvals, educators, resources and system activities."
                    : role === "TEACHER"
                      ? "Manage students, resources, communication and learning activities."
                      : "Access learning resources, messages, progress and your personal dashboard."}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="role-divider">
              <span>SMARTLEARN ACCOUNT</span>
            </div>

            {/* Switch Login */}
            <div className="role-switch">
              <span>Sign in as</span>

              <div>
                {role !== "STUDENT" && (
                  <Link to="/student-login">🎓 Student</Link>
                )}

                {role !== "TEACHER" && (
                  <Link to="/teacher-login">👨‍🏫 Teacher</Link>
                )}

                {role !== "ADMIN" && <Link to="/admin-login">🛡️ Admin</Link>}
              </div>
            </div>

            {/* Student Registration */}
            {role === "STUDENT" && (
              <div className="role-register">
                <span>New student?</span>

                <Link to="/student-register">Create an account →</Link>
              </div>
            )}

            {/* Admin / Teacher Notice */}
            {role !== "STUDENT" && (
              <div className="role-access-note">
                {role === "ADMIN"
                  ? "Administrator accounts are managed securely by the system."
                  : "Teacher accounts are created or approved by the administrator."}
              </div>
            )}

            {/* Security */}
            <div className="role-security">
              <span>✓</span>

              <div>
                <strong>Secure & private</strong>

                <small>Your account information is protected.</small>
              </div>
            </div>

            {/* Back */}
            <div className="role-back">
              <Link to="/login">← Back to account selection</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
