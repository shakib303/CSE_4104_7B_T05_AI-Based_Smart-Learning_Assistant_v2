import { useEffect, useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import LearningShell from "../components/LearningShell";
export default function TeacherRemindersPage() {
  const [students, setStudents] = useState([]),
    [f, setF] = useState({
      studentId: "",
      title: "",
      description: "",
      date: "",
    });
  useEffect(() => {
    api
      .get("/teacher/students")
      .then((r) => setStudents(r.data.students || []));
  }, []);
  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/teacher/reminders", f);
      toast.success("Reminder sent");
      setF({ studentId: "", title: "", description: "", date: "" });
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not send reminder");
    }
  }
  return (
    <LearningShell title="Educator Reminders">
      <section className="sl-page">
        <form className="sl-card" onSubmit={submit}>
          <h3>Create reminder</h3>
          <select
            className="input"
            value={f.studentId}
            onChange={(e) => setF({ ...f, studentId: e.target.value })}
            required
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Reminder title"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            required
          />
          <textarea
            className="input"
            placeholder="Description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
          <input
            className="input"
            type="datetime-local"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
            required
          />
          <button className="sl-primary">Send reminder</button>
        </form>
      </section>
    </LearningShell>
  );
}
