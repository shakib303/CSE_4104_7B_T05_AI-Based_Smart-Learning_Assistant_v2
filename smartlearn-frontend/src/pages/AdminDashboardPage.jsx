import { useEffect, useState } from "react";
import LearningShell from "../components/LearningShell";
import api from "../utils/api";
import toast from "react-hot-toast";

const Stat = ({ label, value, icon, sub }) => (
  <div className="sl-card" style={{ padding: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <div className="sl-muted" style={{ fontSize: 13 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 5 }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: 24 }}>{icon}</div>
    </div>
    {sub && (
      <div className="sl-muted" style={{ fontSize: 12, marginTop: 7 }}>
        {sub}
      </div>
    )}
  </div>
);

function Analysis({ data, onClose }) {
  const weak = (data.subjects || []).filter((x) => Number(x.proficiency) < 60);
  return (
    <div className="sl-card" style={{ padding: 22, marginTop: 16 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <span className="sl-muted">Student analysis</span>
          <h2 style={{ margin: "4px 0" }}>{data.student.name}</h2>
          <span className="sl-muted">
            {data.student.email} · {data.student.studentId || "Student"}
          </span>
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
          marginTop: 18,
        }}
      >
        <Stat
          label="Quiz average"
          value={`${data.quiz.averageScore}%`}
          icon="🧠"
        />
        <Stat
          label="Study time"
          value={`${Math.round(data.study.minutes / 60)}h`}
          icon="⏱"
        />
        <Stat
          label="Task completion"
          value={`${data.tasks.total ? Math.round((data.tasks.done / data.tasks.total) * 100) : 0}%`}
          icon="✓"
        />
        <Stat label="Overdue" value={data.tasks.overdue} icon="⚠" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div>
          <h3>Subject health</h3>
          {data.subjects?.length ? (
            data.subjects.map((s) => (
              <div key={s.id} style={{ marginBottom: 10 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>{s.name}</span>
                  <b>{s.proficiency}%</b>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 99,
                    background: "var(--surface-2,#e5e7eb)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, s.proficiency))}%`,
                      height: "100%",
                      background: s.color || "var(--primary,#2563eb)",
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="sl-muted">No subject data.</p>
          )}
        </div>
        <div>
          <h3>Support signals</h3>
          {weak.length ? (
            <ul>
              {weak.map((s) => (
                <li key={s.id}>
                  Needs support in <b>{s.name}</b> ({s.proficiency}%).
                </li>
              ))}
            </ul>
          ) : (
            <p className="sl-muted">No major weak subjects detected.</p>
          )}
          <p className="sl-muted">
            This is a data-based learning overview, not a disciplinary decision.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState("overview"),
    [overview, setOverview] = useState(null),
    [students, setStudents] = useState([]),
    [teachers, setTeachers] = useState([]),
    [complaints, setComplaints] = useState([]),
    [activity, setActivity] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [search, setSearch] = useState("");
  const [showTeacherForm,setShowTeacherForm] = useState(false);
  const [teacherSaving,setTeacherSaving] = useState(false);
  const [teacherForm,setTeacherForm] = useState({name:"",email:"",password:"",teacherId:"",designation:"",department:"",phone:""});
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [o, s, t, c, a] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/students"),
        api.get("/admin/teachers"),
        api.get("/admin/complaints"),
        api.get("/admin/activity"),
      ]);
      setOverview(o.data);
      setStudents(s.data.students || []);
      setTeachers(t.data.teachers || []);
      setComplaints(c.data.complaints || []);
      setActivity(a.data.logs || []);
    } catch (e) {
      setError(
        e.response?.data?.error || "Could not load administrator workspace.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const action = async (id, status) => {
    try {
      await api.patch(`/admin/students/${id}/status`, { status });
      toast.success(`Student marked ${status.toLowerCase()}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Action failed");
    }
  };
  const analyze = async (id) => {
    try {
      const r = await api.get(`/admin/students/${id}/analysis`);
      setSelected(r.data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Analysis failed");
    }
  };
  const filtered = students.filter((s) =>
    `${s.name} ${s.email} ${s.studentId}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <LearningShell title="Admin Control Center">
      <section className="sl-page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <span className="sl-muted">Administration</span>
            <h2 style={{ margin: "4px 0" }}>SmartLearn platform overview</h2>
            <p className="sl-muted">
              Monitor learners, educators, activity and support issues from one
              place.
            </p>
          </div>
          <button className="sl-primary" onClick={load}>
            ↻ Refresh
          </button>
        </div>
        {error && (
          <div
            className="sl-card"
            style={{ padding: 14, marginBottom: 16, color: "#b91c1c" }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div className="sl-card" style={{ padding: 40, textAlign: "center" }}>
            Loading admin data…
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
                label="Students"
                value={overview?.students?.total || 0}
                icon="🎓"
                sub={`${overview?.students?.pending || 0} pending`}
              />
              <Stat
                label="Approved"
                value={overview?.students?.approved || 0}
                icon="✓"
              />
              <Stat
                label="Suspended"
                value={overview?.students?.suspended || 0}
                icon="⛔"
              />
              <Stat
                label="Teachers"
                value={overview?.teachers?.total || 0}
                icon="👨‍🏫"
              />
              <Stat label="Tasks" value={overview?.tasks || 0} icon="✓" />
              <Stat
                label="Open complaints"
                value={overview?.complaints || 0}
                icon="⚑"
              />
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
                ["teachers", "Teachers"],
                ["complaints", "Complaints"],
                ["activity", "Activity"],
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
                  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                <div className="sl-card" style={{ padding: 22 }}>
                  <h3>Platform health</h3>
                  <p className="sl-muted">
                    {overview?.activity || 0} activity events in the last 7
                    days.
                  </p>
                  <p>
                    {overview?.resources || 0} learning resources are available.
                  </p>
                  <p>{overview?.activeUsers || 0} active user accounts.</p>
                  <p>
                    {overview?.completedTasks || 0} tasks have been completed.
                  </p>
                </div>
                <div className="sl-card" style={{ padding: 22 }}>
                  <h3>Recommended actions</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    <button
                      className="sl-outline"
                      onClick={() => setTab("students")}
                    >
                      Review students
                    </button>
                    <button
                      className="sl-outline"
                      onClick={() => setTab("teachers")}
                    >
                      Review educators
                    </button>
                    <button
                      className="sl-outline"
                      onClick={() => setTab("complaints")}
                    >
                      Review support queue
                    </button>
                  </div>
                </div>
              </div>
            )}
            {tab === "students" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Student management & analysis</h3>
                  <input
                    className="input"
                    style={{ maxWidth: 300 }}
                    placeholder="Search students…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Student", "Status", "Educator", "Actions"].map(
                          (x) => (
                            <th
                              key={x}
                              style={{ textAlign: "left", padding: 10 }}
                            >
                              {x}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => {
                        const id = s.userId || s.id;
                        const status = String(
                          s.approvalStatus || "",
                        ).toUpperCase();
                        return (
                          <tr
                            key={s.id}
                            style={{
                              borderTop: "1px solid var(--border,#e5e7eb)",
                            }}
                          >
                            <td style={{ padding: 10 }}>
                              <b>{s.name}</b>
                              <div
                                className="sl-muted"
                                style={{ fontSize: 12 }}
                              >
                                {s.email} · {s.studentId}
                              </div>
                            </td>
                            <td style={{ padding: 10 }}>{s.approvalStatus}</td>
                            <td style={{ padding: 10 }}>
                              {s.teacherName || "Unassigned"}
                            </td>
                            <td
                              style={{
                                padding: 10,
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                className="sl-outline"
                                onClick={() => analyze(id)}
                              >
                                Analyze
                              </button>
                              {status === "PENDING" && (
                                <button
                                  className="sl-primary"
                                  onClick={() => action(id, "APPROVED")}
                                >
                                  Approve
                                </button>
                              )}
                              {!["SUSPENDED", "REJECTED"].includes(status) && (
                                <button
                                  className="sl-outline"
                                  onClick={() => action(id, "SUSPENDED")}
                                >
                                  Suspend
                                </button>
                              )}
                              {status === "SUSPENDED" && (
                                <button
                                  className="sl-primary"
                                  onClick={() => action(id, "APPROVED")}
                                >
                                  Reactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {selected && (
                  <Analysis data={selected} onClose={() => setSelected(null)} />
                )}
              </div>
            )}
            {tab === "teachers" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h3>Teacher management</h3><p className="sl-muted">Register new teachers and manage educator coverage.</p></div><button className="sl-primary" onClick={()=>setShowTeacherForm(v=>!v)}>{showTeacherForm?"Cancel":"+ Add / Register Teacher"}</button></div>
                {showTeacherForm && <form className="sl-form-grid" style={{margin:"18px 0",padding:16,border:"1px solid var(--border,#e5e7eb)",borderRadius:12}} onSubmit={async e=>{e.preventDefault();setTeacherSaving(true);try{await api.post("/admin/teachers",teacherForm);toast.success("Teacher registered successfully");setTeacherForm({name:"",email:"",password:"",teacherId:"",designation:"",department:"",phone:""});setShowTeacherForm(false);load()}catch(err){toast.error(err.response?.data?.error||"Could not register teacher")}finally{setTeacherSaving(false)}}}>
                  <label>Full name<input required value={teacherForm.name} onChange={e=>setTeacherForm(v=>({...v,name:e.target.value}))}/></label>
                  <label>Email<input required type="email" value={teacherForm.email} onChange={e=>setTeacherForm(v=>({...v,email:e.target.value}))}/></label>
                  <label>Temporary password<input required minLength={8} type="password" value={teacherForm.password} onChange={e=>setTeacherForm(v=>({...v,password:e.target.value}))} placeholder="At least 8 characters"/></label>
                  <label>Teacher ID<input required value={teacherForm.teacherId} onChange={e=>setTeacherForm(v=>({...v,teacherId:e.target.value}))}/></label>
                  <label>Designation<input value={teacherForm.designation} onChange={e=>setTeacherForm(v=>({...v,designation:e.target.value}))} placeholder="Lecturer / Instructor"/></label>
                  <label>Department<input value={teacherForm.department} onChange={e=>setTeacherForm(v=>({...v,department:e.target.value}))}/></label>
                  <label>Phone<input value={teacherForm.phone} onChange={e=>setTeacherForm(v=>({...v,phone:e.target.value}))}/></label>
                  <div style={{display:"flex",alignItems:"end"}}><button className="sl-primary" disabled={teacherSaving}>{teacherSaving?"Registering…":"Register teacher"}</button></div>
                </form>}
                <h3>Educator coverage</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {teachers.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: 14,
                        border: "1px solid var(--border,#e5e7eb)",
                        borderRadius: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <b>{t.name}</b>
                        <div className="sl-muted">
                          {t.designation || "Educator"} · {t.department || "—"}
                        </div>
                      </div>
                      <span>{t.assignedStudents || 0} assigned students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "complaints" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <h3>Support queue</h3>
                {complaints.length ? (
                  complaints.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: 14,
                        borderBottom: "1px solid var(--border,#e5e7eb)",
                      }}
                    >
                      <b>{c.subject}</b>
                      <div className="sl-muted">
                        {c.studentName} · {c.status}
                      </div>
                      <p>{c.description}</p>
                      {c.status !== "RESOLVED" && (
                        <button
                          className="sl-primary"
                          onClick={async () => {
                            await api.patch(`/admin/complaints/${c.id}`, {
                              status: "RESOLVED",
                              adminResponse: "Resolved by administrator",
                            });
                            load();
                          }}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="sl-muted">No complaints.</p>
                )}
              </div>
            )}
            {tab === "activity" && (
              <div className="sl-card" style={{ padding: 22 }}>
                <h3>Recent system activity</h3>
                {activity.map((a, i) => (
                  <div
                    key={a.id || i}
                    style={{
                      padding: 10,
                      borderBottom: "1px solid var(--border,#e5e7eb)",
                    }}
                  >
                    <b>{a.action}</b>
                    <div className="sl-muted">
                      {a.name || "System"} · {a.details || ""} ·{" "}
                      {a.createdAt || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </LearningShell>
  );
}
