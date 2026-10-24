import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import LearningShell from "../components/LearningShell";
import api from "../utils/api";

const Stat = ({ label, value, icon }) => (
  <div className="sl-card" style={{ padding: 18 }}>
    <div className="sl-muted" style={{ fontSize: 13 }}>
      {label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 5 }}>
      {icon} {value}
    </div>
  </div>
);
function Analysis({ data, onClose }) {
  const weak = (data.subjects || []).filter((s) => Number(s.proficiency) < 60);
  return (
    <div className="sl-card" style={{ padding: 22, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span className="sl-muted">Learner analysis</span>
          <h2 style={{ margin: "4px 0" }}>{data.student.name}</h2>
        </div>
        <button className="sl-outline" onClick={onClose}>
          Close
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <Stat
          label="Quiz average"
          value={`${data.quiz.averageScore}%`}
          icon="🧠"
        />
        <Stat
          label="Study hours"
          value={`${Math.round(data.study.minutes / 60)}h`}
          icon="⏱"
        />
        <Stat label="Tasks done" value={data.tasks.done} icon="✓" />
        <Stat label="Overdue" value={data.tasks.overdue} icon="⚠" />
      </div>
      <h3>Learning health</h3>
      {data.subjects?.length ? (
        data.subjects.map((s) => (
          <div key={s.id} style={{ margin: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{s.name}</span>
              <b>{s.proficiency}%</b>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "var(--surface-2,#e5e7eb)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(0, Math.min(100, s.proficiency))}%`,
                  background: s.color || "var(--primary,#2563eb)",
                  borderRadius: 99,
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="sl-muted">No subject data yet.</p>
      )}
      {weak.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface-2,#f8fafc)",
          }}
        >
          Consider extra support for:{" "}
          <b>{weak.map((s) => s.name).join(", ")}</b>.
        </div>
      )}
    </div>
  );
}
export default function TeacherDashboardPage() {
  const [data, setData] = useState({
      teacher: null,
      students: [],
      resources: [],
      messages: [],
      reminders: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("overview");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/teacher/dashboard");
      setData({
        teacher: r.data.teacher,
        students: r.data.students || [],
        resources: r.data.resources || [],
        messages: r.data.messages || [],
        reminders: r.data.reminders || [],
      });
    } catch (e) {
      setError(e.response?.data?.error || "Could not load educator workspace.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const analyze = async (id) => {
    try {
      const r = await api.get(`/teacher/students/${id}/analysis`);
      setSelected(r.data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Analysis failed");
    }
  };
  const active = data.students.filter(
    (s) => String(s.approvalStatus).toUpperCase() === "APPROVED",
  ).length;
  return (
    <LearningShell title="Educator Workspace">
      <section className="sl-page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <div>
            <span className="sl-muted">Teacher dashboard</span>
            <h2 style={{ margin: "4px 0" }}>
              Support your learners intelligently
            </h2>
            <p className="sl-muted">
              Analyze assigned students, communicate, publish resources and
              create reminders.
            </p>
          </div>
          <button className="sl-primary" onClick={load}>
            ↻ Refresh
          </button>
        </div>
        {error && (
          <div
            className="sl-card"
            style={{ padding: 14, color: "#b91c1c", marginBottom: 16 }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div className="sl-card" style={{ padding: 40, textAlign: "center" }}>
            Loading educator workspace…
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                gap: 13,
              }}
            >
              <Stat
                label="Assigned students"
                value={data.students.length}
                icon="🎓"
              />
              <Stat label="Active learners" value={active} icon="✓" />
              <Stat label="Resources" value={data.resources.length} icon="📚" />
              <Stat label="Messages" value={data.messages.length} icon="💬" />
              <Stat label="Reminders" value={data.reminders.length} icon="⏰" />
            </div>
            <div
              className="sl-card"
              style={{
                padding: 6,
                display: "flex",
                gap: 6,
                overflowX: "auto",
                margin: "18px 0",
              }}
            >
              {[
                ["overview", "Overview"],
                ["students", "Students"],
                ["resources", "Resources"],
                ["messages", "Messages"],
              ].map(([id, l]) => (
                <button
                  key={id}
                  className={tab === id ? "sl-primary" : "sl-outline"}
                  onClick={() => setTab(id)}
                >
                  {l}
                </button>
              ))}
            </div>
            {tab === "overview" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,2fr) minmax(280px,1fr)",
                  gap: 16,
                }}
              >
                <div className="sl-card" style={{ padding: 22 }}>
                  <h3>Students needing attention</h3>
                  {data.students.length ? (
                    data.students.slice(0, 6).map((s) => (
                      <div
                        key={s.userId || s.id}
                        style={{
                          padding: 12,
                          borderBottom: "1px solid var(--border,#e5e7eb)",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div>
                          <b>{s.name}</b>
                          <div className="sl-muted">{s.email}</div>
                        </div>
                        <button
                          className="sl-outline"
                          onClick={() => analyze(s.userId || s.id)}
                        >
                          Analyze
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="sl-muted">No assigned students yet.</p>
                  )}
                </div>
                <div className="sl-card" style={{ padding: 22 }}>
                  <h3>Quick actions</h3>
                  <div style={{ display: "grid", gap: 9 }}>
                    <button
                      className="sl-outline"
                      onClick={() => setTab("students")}
                    >
                      Analyze students
                    </button>
                    <button
                      className="sl-outline"
                      onClick={() =>
                        (window.location.href = "/teacher-resources")
                      }
                    >
                      Publish resource
                    </button>
                    <button
                      className="sl-outline"
                      onClick={() =>
                        (window.location.href = "/teacher-reminders")
                      }
                    >
                      Create reminder
                    </button>
                    <button
                      className="sl-outline"
                      onClick={() => (window.location.href = "/messages")}
                    >
                      Open messages
                    </button>
                  </div>
                </div>
              </div>
            )}
            {tab === "students" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <h3>Assigned learners</h3>
                {data.students.map((s) => (
                  <div
                    key={s.userId || s.id}
                    style={{
                      padding: 14,
                      borderBottom: "1px solid var(--border,#e5e7eb)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <b>{s.name}</b>
                      <div className="sl-muted">
                        {s.email} · {s.studentId || ""}
                      </div>
                    </div>
                    <button
                      className="sl-primary"
                      onClick={() => analyze(s.userId || s.id)}
                    >
                      View analysis
                    </button>
                  </div>
                ))}
                {selected && (
                  <Analysis data={selected} onClose={() => setSelected(null)} />
                )}
              </div>
            )}
            {tab === "resources" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <h3>Published resources</h3>
                {data.resources.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid var(--border,#e5e7eb)",
                    }}
                  >
                    <b>{r.title}</b>
                    <div className="sl-muted">
                      {r.type} · {r.description || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === "messages" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <h3>Recent messages</h3>
                {data.messages.length ? (
                  data.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--border,#e5e7eb)",
                      }}
                    >
                      <b>{m.senderName || "Student"}</b>
                      <p style={{ margin: "5px 0" }}>{m.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="sl-muted">No messages yet.</p>
                )}
              </div>
            )}
            {selected && tab !== "students" && (
              <Analysis data={selected} onClose={() => setSelected(null)} />
            )}
          </>
        )}
      </section>
    </LearningShell>
  );
}
