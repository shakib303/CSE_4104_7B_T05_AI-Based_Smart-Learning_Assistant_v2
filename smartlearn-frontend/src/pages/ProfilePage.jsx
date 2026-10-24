import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import LearningShell from "../components/LearningShell";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const Card = ({ title, children, className = "" }) => (
  <section className={`sl-card sl-profile-card ${className}`}>
    <div className="sl-profile-card-title">{title}</div>
    {children}
  </section>
);

const Field = ({ label, ...props }) => (
  <label className="sl-profile-field">
    <span>{label}</span>
    <input className="input" {...props} />
  </label>
);

function Initials({ name }) {
  return (
    <>{(name || "SmartLearn User").split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase()}</>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const role = user?.role || "STUDENT";
  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";

  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    department: "",
    academicLevel: "",
    timezone: "UTC",
    studyGoalHrs: 4,
  });
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get("/users/profile")
      .then((r) => {
        const u = r.data.user;
        setForm({
          name: u.name || "",
          bio: u.bio || "",
          phone: u.phone || "",
          department: u.department || "",
          academicLevel: u.academicLevel || "",
          timezone: u.timezone || "UTC",
          studyGoalHrs: u.studyGoalHrs ?? 4,
        });
        setAvatar(u.avatar || "");
        updateUser({ ...u });
      })
      .catch((e) => toast.error(e.response?.data?.error || "Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const pick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.error("Use PNG, JPG or WebP images only.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Profile image must be under 2 MB.");
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        bio: form.bio,
        phone: form.phone,
        department: form.department,
        timezone: form.timezone,
        avatar,
      };
      if (isStudent) {
        payload.academicLevel = form.academicLevel;
        payload.studyGoalHrs = Number(form.studyGoalHrs);
      }
      const response = await api.put("/users/profile", payload);
      updateUser(response.data.user);
      setAvatar(response.data.user.avatar || avatar);
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
    if (password.newPassword !== password.confirm) return toast.error("New passwords do not match.");
    setPasswordSaving(true);
    try {
      await api.put("/users/password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <LearningShell title="Profile">
        <section className="sl-page"><div className="sl-card sl-profile-loading">Loading your profile…</div></section>
      </LearningShell>
    );
  }

  const roleLabel = isAdmin ? "Administrator" : isTeacher ? "Teacher / Educator" : "Student";
  const roleDescription = isAdmin
    ? "Manage your administrator identity and secure account settings."
    : isTeacher
      ? "Manage your educator identity and communication details."
      : "Personalize your learning identity and study preferences.";

  return (
    <LearningShell title="Profile">
      <section className="sl-page">
        <div className="sl-profile-hero">
          <div className="sl-profile-hero-avatar">
            {avatar ? <img src={avatar} alt="Profile" /> : <Initials name={form.name} />}
          </div>
          <div className="sl-profile-hero-copy">
            <div className="sl-eyebrow">{roleLabel}</div>
            <h2>{form.name || "SmartLearn User"}</h2>
            <p>{roleDescription}</p>
          </div>
          <div className="sl-profile-hero-badge">● Account active</div>
        </div>

        <div className="sl-profile-layout">
          <form onSubmit={save} className="sl-profile-form">
            <Card title="Personal information">
              <div className="sl-profile-grid">
                <Field label="Full name" value={form.name} onChange={(e) => change("name", e.target.value)} required />
                <Field label="Phone" value={form.phone} onChange={(e) => change("phone", e.target.value)} />
                {(isStudent || isTeacher) && (
                  <Field label="Department" value={form.department} onChange={(e) => change("department", e.target.value)} />
                )}
                {isStudent && (
                  <Field label="Academic level" value={form.academicLevel} onChange={(e) => change("academicLevel", e.target.value)} />
                )}
                <Field label="Timezone" value={form.timezone} onChange={(e) => change("timezone", e.target.value)} />
                {isStudent && (
                  <Field label="Daily study goal (hours)" type="number" min="0.5" max="24" step="0.5" value={form.studyGoalHrs} onChange={(e) => change("studyGoalHrs", e.target.value)} />
                )}
              </div>
              <label className="sl-profile-field sl-profile-bio">
                <span>Bio</span>
                <textarea className="input" rows="5" value={form.bio} onChange={(e) => change("bio", e.target.value)} placeholder={isStudent ? "Tell SmartLearn about your learning goals…" : "Tell others a little about your role…"} />
              </label>
            </Card>

            {isStudent && (
              <Card title="Learning profile">
                <div className="sl-profile-learning-note">
                  <span>🎯</span>
                  <div>
                    <strong>Your study goal is student-only.</strong>
                    <p>Use the dashboard, planner and analytics to turn this goal into measurable study progress.</p>
                  </div>
                </div>
              </Card>
            )}

            {isTeacher && (
              <Card title="Educator information">
                <div className="sl-profile-info-grid">
                  <div><span>Role</span><strong>Teacher / Educator</strong></div>
                  <div><span>Workspace</span><strong>Assigned students & resources</strong></div>
                  <div><span>Student analysis</span><strong>Assigned students only</strong></div>
                </div>
              </Card>
            )}

            {isAdmin && (
              <Card title="Administrator information">
                <div className="sl-profile-info-grid">
                  <div><span>Role</span><strong>Administrator</strong></div>
                  <div><span>Access</span><strong>Platform management</strong></div>
                  <div><span>Security</span><strong>Protected account</strong></div>
                </div>
              </Card>
            )}

            <button className="sl-primary" disabled={saving}>{saving ? "Saving…" : "Save profile changes"}</button>
          </form>

          <div className="sl-profile-side">
            <Card title="Profile picture">
              <div className="sl-profile-picture-box">
                <div className="sl-profile-picture">
                  {avatar ? <img src={avatar} alt="Profile" /> : <Initials name={form.name} />}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} hidden />
                <button type="button" className="sl-outline" onClick={() => fileRef.current?.click()}>Choose photo</button>
                <span className="sl-muted">PNG, JPG or WebP · max 2 MB</span>
              </div>
            </Card>

            <Card title="Account">
              <div className="sl-profile-account">
                <div><span>Email</span><strong>{user?.email || "—"}</strong></div>
                <div><span>Role</span><strong>{roleLabel}</strong></div>
                <div><span>Status</span><strong className="sl-status-active">Active</strong></div>
              </div>
            </Card>

            <Card title="Security">
              <form onSubmit={changePassword} className="sl-profile-security">
                <Field label="Current password" type="password" value={password.currentPassword} onChange={(e) => setPassword((x) => ({ ...x, currentPassword: e.target.value }))} required />
                <Field label="New password" type="password" minLength="8" value={password.newPassword} onChange={(e) => setPassword((x) => ({ ...x, newPassword: e.target.value }))} required />
                <Field label="Confirm new password" type="password" minLength="8" value={password.confirm} onChange={(e) => setPassword((x) => ({ ...x, confirm: e.target.value }))} required />
                <button className="sl-outline" disabled={passwordSaving}>{passwordSaving ? "Updating…" : "Change password"}</button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </LearningShell>
  );
}
