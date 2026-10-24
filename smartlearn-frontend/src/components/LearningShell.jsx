import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Avatar({ user, size = 38 }) {
  const name = user?.name || "Student";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

  return (
    <div className="sl-avatar" style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={user.avatar} alt={`${name} profile`} />
      ) : (
        initials
      )}
    </div>
  );
}

export default function LearningShell({
  children,
  title = "SmartLearn",
  showTopbar = true,
  sidebarExtra = null,
}) {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const scrollKey = `sla-sidebar-scroll-${user?.role || "guest"}`;

  // Preserve the workspace navigation position when React Router swaps pages.
  // This prevents the long sidebar from jumping back to its first item.
  useLayoutEffect(() => {
    const node = navRef.current;
    if (!node) return;
    const saved = Number(sessionStorage.getItem(scrollKey) || 0);
    node.scrollTop = saved;
    return () => sessionStorage.setItem(scrollKey, String(node.scrollTop));
  }, [scrollKey, loc.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  const student = [
    ["/dashboard", "⌂", "Dashboard"],
    ["/chat", "✦", "AI Tutor"],
    ["/tasks", "✓", "Tasks"],
    ["/planner", "▦", "Study Planner"],
    ["/focus", "◷", "Focus Tools"],
    ["/quiz", "?", "Smart Quiz"],
    ["/documents", "▤", "Documents"],
    ["/recommendations", "★", "Recommendations"],
    ["/analytics", "◔", "Progress"],
    ["/voice", "◉", "Voice Tutor"],
    ["/resources", "▤", "Resources"],
    ["/messages", "✉", "Messages"],
    ["/notifications", "●", "Notifications"],
    ["/educator", "👨‍🏫", "My Educator"],
    ["/complaints", "!", "Complaints"],
  ];
  const teacher = [
    ["/teacher-dashboard", "⌂", "Dashboard"],
    ["/teacher-resources", "▤", "Resources"],
    ["/messages", "✉", "Messages"],
    ["/teacher-reminders", "●", "Reminders"],
  ];
  const admin = [
    ["/admin-dashboard", "⌂", "Dashboard"],
    ["/resources", "▤", "Resources"],
    ["/complaints", "!", "Complaints"],
    ["/admin-activity", "◔", "System Activity"],
  ];

  const links =
    user?.role === "ADMIN"
      ? admin
      : user?.role === "TEACHER"
        ? teacher
        : student;

  const homePath =
    user?.role === "ADMIN"
      ? "/admin-dashboard"
      : user?.role === "TEACHER"
        ? "/teacher-dashboard"
        : "/dashboard";

  const closeMobile = () => setMobileOpen(false);

  // Always return the user to the login page that matches their role.
  // This handler is shared by every page that uses LearningShell.
  const handleLogout = async () => {
    const role = user?.role;
    const loginPath =
      role === "ADMIN"
        ? "/admin-login"
        : role === "TEACHER"
          ? "/teacher-login"
          : "/student-login";

    closeMobile();
    await logout();
    nav(loginPath, { replace: true });
  };

  return (
    <div className="sl-app-shell">
      {mobileOpen && (
        <button
          type="button"
          className="sl-sidebar-overlay"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      <aside className={`sl-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sl-brand">
          <Link to={homePath} className="sl-brand-link" onClick={closeMobile}>
            <div className="sl-brand-mark">S</div>
            <div>
              <b>Smart AI Learnet</b>
              <small>
                {user?.role === "TEACHER"
                  ? "Educator workspace"
                  : user?.role === "ADMIN"
                    ? "Administration"
                    : "AI learning companion"}
              </small>
            </div>
          </Link>
          <button
            className="sl-mobile-close"
            onClick={closeMobile}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="sl-sidebar-user">
          <Avatar user={user} size={40} />
          <div className="sl-sidebar-user-info">
            <strong>{user?.name || "SmartLearn User"}</strong>
            <span>{user?.role || "Learning"}</span>
          </div>
          <span className="sl-online-dot" title="Account active" />
        </div>

        <nav ref={navRef} className="sl-sidebar-nav" aria-label="Main navigation">
          <div className="sl-nav-label">Workspace</div>
          {links.map(([path, icon, label]) => (
            <Link
              key={path}
              className={loc.pathname === path ? "active" : ""}
              to={path}
              onClick={closeMobile}
            >
              <span className="sl-nav-icon">{icon}</span>
              <span>{label}</span>
              {loc.pathname === path && <span className="sl-nav-active-dot" />}
            </Link>
          ))}

          <div className="sl-nav-divider" />
          <div className="sl-nav-label">Account</div>
          <Link
            className={loc.pathname === "/profile" ? "active" : ""}
            to="/profile"
            onClick={closeMobile}
          >
            <span className="sl-nav-icon">◯</span>
            <span>Profile</span>
            {loc.pathname === "/profile" && (
              <span className="sl-nav-active-dot" />
            )}
          </Link>
          <Link
            className={loc.pathname === "/settings" ? "active" : ""}
            to="/settings"
            onClick={closeMobile}
          >
            <span className="sl-nav-icon">⚙</span>
            <span>Settings</span>
            {loc.pathname === "/settings" && (
              <span className="sl-nav-active-dot" />
            )}
          </Link>

          {sidebarExtra}
        </nav>

        <div className="sl-side-bottom">
          <button className="sl-side-action" onClick={toggleDark}>
            <span>{dark ? "☀" : "☾"}</span>
            <span>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
          <button className="sl-side-action" onClick={() => nav("/profile")}>
            <Avatar user={user} size={28} />
            <span>My account</span>
          </button>
          <button className="sl-signout" onClick={handleLogout}>
            <span>↪</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {!showTopbar && (
        <button
          className="sl-floating-menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
      )}

      <main className="sl-main">
        {showTopbar && (
          <header className="sl-topbar">
            <button
              className="sl-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="sl-topbar-title">
              <small>{user?.role || "Smart AI Learnet"}</small>
              <h1>{title}</h1>
            </div>
            <div className="sl-topbar-actions">
              <button
                className="sl-topbar-profile"
                onClick={() => nav("/profile")}
                title="Open profile"
              >
                <Avatar user={user} size={34} />
                <span>{user?.name?.split(" ")[0] || "Account"}</span>
              </button>
              <button
                className="sl-outline sl-dashboard-button"
                onClick={() => nav(homePath)}
              >
                Dashboard
              </button>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
