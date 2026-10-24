import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import LearningShell from "../components/LearningShell";
import api from "../utils/api";

const types = [
  "ASSIGNMENT",
  "STUDY",
  "EXAM_PREPARATION",
  "PROJECT",
  "READING",
  "PRACTICE",
  "REVISION",
  "PERSONAL_LEARNING",
];
const StatBox = ({ label, value }) => (
  <div className="sl-card" style={{ padding: 16 }}>
    <div className="sl-muted" style={{ fontSize: 12 }}>
      {label}
    </div>
    <div style={{ fontSize: 25, fontWeight: 800, marginTop: 5 }}>{value}</div>
  </div>
);
const Badge = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "var(--surface-2,#eef2f7)",
      fontSize: 11,
      fontWeight: 700,
    }}
  >
    {children}
  </span>
);

function TaskCard({ task, onProgress, onComplete, onDelete }) {
  return (
    <article className="sl-card" style={{ padding: 18 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              aria-label="Complete task"
              onClick={() =>
                onComplete(task.id, task.status === "DONE" ? "TODO" : "DONE")
              }
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "1px solid var(--border,#cbd5e1)",
                background:
                  task.status === "DONE"
                    ? "var(--primary,#2563eb)"
                    : "transparent",
                color: "#fff",
              }}
            >
              {task.status === "DONE" ? "✓" : ""}
            </button>
            <h3 style={{ margin: 0 }}>{task.title}</h3>
          </div>
          <p className="sl-muted" style={{ margin: "8px 0 12px" }}>
            {task.description || "No description"}
          </p>
        </div>
        <button className="sl-outline" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Badge>{task.priority}</Badge>
        <Badge>{task.difficulty}</Badge>
        <Badge>{task.taskType?.replaceAll("_", " ")}</Badge>
        {task.subject?.name && <Badge>{task.subject.name}</Badge>}
        {task.dueDate && (
          <Badge>Due {new Date(task.dueDate).toLocaleDateString()}</Badge>
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
          }}
        >
          <span className="sl-muted">Progress</span>
          <b>{task.progress || 0}%</b>
        </div>
        <input
          aria-label="Task progress"
          type="range"
          min="0"
          max="100"
          value={task.progress || 0}
          onChange={(e) => onProgress(task.id, Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </article>
  );
}

function CreateTask({ close, created }) {
  const [f, setF] = useState({
      title: "",
      description: "",
      priority: "MEDIUM",
      taskType: "STUDY",
      difficulty: "MEDIUM",
      dueDate: "",
      estimatedMin: "",
      tags: "",
    }),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/tasks", {
        ...f,
        estimatedMin: f.estimatedMin ? Number(f.estimatedMin) : null,
        tags: f.tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      toast.success("Task created");
      created(r.data.task);
      close();
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not create task");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 18,
      }}
    >
      <form
        onSubmit={submit}
        className="sl-card"
        style={{
          padding: 24,
          width: "min(680px,100%)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ marginTop: 0 }}>Create task</h2>
          <button type="button" className="sl-outline" onClick={close}>
            Close
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="input"
            placeholder="Task title"
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
          <textarea
            className="input"
            rows="3"
            placeholder="Description"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <div className="grid-2">
            <select
              className="input"
              value={f.taskType}
              onChange={(e) => set("taskType", e.target.value)}
            >
              {types.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className="input"
              value={f.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className="input"
              value={f.difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
            >
              {["EASY", "MEDIUM", "HARD"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              className="input"
              type="datetime-local"
              value={f.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Estimated minutes"
              value={f.estimatedMin}
              onChange={(e) => set("estimatedMin", e.target.value)}
            />
            <input
              className="input"
              placeholder="Tags, comma separated"
              value={f.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          </div>
          <button className="sl-primary" disabled={busy}>
            {busy ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AIForm({ close, created }) {
  const [prompt, setPrompt] = useState(""),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false);
  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const r = await api.post("/tasks/ai/create-plan", { prompt });
      setPlan(r.data.plan);
      toast.success("AI plan generated");
    } catch (e) {
      toast.error(e.response?.data?.error || "AI plan unavailable");
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    try {
      for (const t of plan.tasks || []) await api.post("/tasks", t);
      toast.success(`${plan.tasks?.length || 0} tasks created`);
      created();
      close();
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not save plan");
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 18,
      }}
    >
      <div
        className="sl-card"
        style={{
          padding: 24,
          width: "min(760px,100%)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <span className="sl-muted">SmartLearn AI</span>
            <h2 style={{ margin: "4px 0" }}>Create with AI</h2>
          </div>
          <button className="sl-outline" onClick={close}>
            Close
          </button>
        </div>
        <textarea
          className="input"
          rows="5"
          placeholder="Example: I have a database assignment due next Monday. I need to learn SQL joins and complete 20 practice problems."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ marginTop: 14 }}
        />
        <button className="sl-primary" onClick={generate} disabled={busy}>
          {busy ? "Thinking…" : "Generate learning plan"}
        </button>
        {plan && (
          <div style={{ marginTop: 18 }}>
            <h3>{plan.title}</h3>
            <p className="sl-muted">{plan.description}</p>
            {plan.tasks?.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  border: "1px solid var(--border,#e5e7eb)",
                  borderRadius: 12,
                  margin: "8px 0",
                }}
              >
                <b>
                  {i + 1}. {t.title}
                </b>
                <div className="sl-muted">
                  {t.priority} · {t.difficulty} · {t.estimatedMin} min
                </div>
                <p style={{ margin: "5px 0" }}>{t.description || ""}</p>
              </div>
            ))}
            <button className="sl-primary" onClick={save}>
              Save generated tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]),
    [stats, setStats] = useState(null),
    [tab, setTab] = useState("all"),
    [search, setSearch] = useState(""),
    [loading, setLoading] = useState(true),
    [modal, setModal] = useState(null),
    [next, setNext] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        api.get("/tasks"),
        api.get("/tasks/stats"),
      ]);
      setTasks(t.data.tasks || []);
      setStats(s.data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not load tasks");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          `${t.title} ${t.description || ""} ${(t.tags || []).join(" ")}`
            .toLowerCase()
            .includes(q);
        const status = t.status;
        let match = tab === "all";
        if (tab === "today")
          match =
            t.dueDate &&
            new Date(t.dueDate).toDateString() === new Date().toDateString();
        if (tab === "upcoming")
          match =
            t.dueDate && new Date(t.dueDate) >= new Date() && status !== "DONE";
        if (tab === "overdue")
          match =
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            !["DONE", "CANCELLED"].includes(status);
        if (tab === "completed") match = status === "DONE";
        if (tab === "high") match = ["HIGH", "URGENT"].includes(t.priority);
        return matchSearch && match;
      }),
    [tasks, search, tab],
  );
  const complete = async (id, status) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };
  const progress = async (id, value) => {
    try {
      await api.patch(`/tasks/${id}/progress`, { progress: value });
      setTasks((x) =>
        x.map((t) => (t.id === id ? { ...t, progress: value } : t)),
      );
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };
  const del = async (id) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Delete failed");
    }
  };
  const recommend = async () => {
    try {
      const r = await api.post("/tasks/ai/recommendation");
      setNext(r.data.recommendation);
    } catch (e) {
      toast.error(e.response?.data?.error || "AI recommendation unavailable");
    }
  };
  return (
    <LearningShell title="Tasks">
      <section className="sl-page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          <div>
            <span className="sl-muted">My Tasks</span>
            <h2 style={{ margin: "4px 0" }}>
              Turn learning goals into progress
            </h2>
            <p className="sl-muted">
              Organize deadlines, track progress and let AI help decide what to
              do next.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sl-outline" onClick={() => setModal("ai")}>
              ✦ Create with AI
            </button>
            <button className="sl-primary" onClick={() => setModal("create")}>
              + Create Task
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
            margin: "18px 0",
          }}
        >
          <StatBox label="Total" value={stats?.total || 0} />
          <StatBox label="Pending" value={stats?.pending || 0} />
          <StatBox label="In progress" value={stats?.inProgress || 0} />
          <StatBox label="Completed" value={stats?.done || 0} />
          <StatBox label="Overdue" value={stats?.overdue || 0} />
          <StatBox label="Due today" value={stats?.dueToday || 0} />
        </div>
        <div
          className="sl-card"
          style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            className="input"
            style={{ flex: "1 1 220px" }}
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {[
            ["all", "All"],
            ["today", "Today"],
            ["upcoming", "Upcoming"],
            ["overdue", "Overdue"],
            ["high", "High priority"],
            ["completed", "Completed"],
          ].map(([id, l]) => (
            <button
              key={id}
              className={tab === id ? "sl-primary" : "sl-outline"}
              onClick={() => setTab(id)}
            >
              {l}
            </button>
          ))}
          <button className="sl-outline" onClick={recommend}>
            ✦ What should I do next?
          </button>
        </div>
        {next && (
          <div className="sl-card" style={{ padding: 16, marginTop: 12 }}>
            <b>Smart Task Assistant</b>
            <p style={{ marginBottom: 0 }}>{next}</p>
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          {loading ? (
            <div
              className="sl-card"
              style={{ padding: 40, textAlign: "center" }}
            >
              Loading tasks…
            </div>
          ) : filtered.length ? (
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onProgress={progress}
                onComplete={complete}
                onDelete={del}
              />
            ))
          ) : (
            <div
              className="sl-card"
              style={{ padding: 40, textAlign: "center", gridColumn: "1/-1" }}
            >
              <h3>No tasks here</h3>
              <p className="sl-muted">
                Create a task manually or let AI turn a learning goal into a
                plan.
              </p>
              <button className="sl-primary" onClick={() => setModal("create")}>
                Create your first task
              </button>
            </div>
          )}
        </div>
      </section>
      {modal === "create" && (
        <CreateTask close={() => setModal(null)} created={load} />
      )}{" "}
      {modal === "ai" && <AIForm close={() => setModal(null)} created={load} />}
    </LearningShell>
  );
}
