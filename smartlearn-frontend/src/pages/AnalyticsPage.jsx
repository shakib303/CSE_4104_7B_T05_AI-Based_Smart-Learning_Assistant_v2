import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .get("/analytics")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load progress"));
  }, []);
  if (!data)
    return (
      <LearningShell title="Progress & Weakness">
        <section className="sl-page">
          <div className="sl-card">Loading progress…</div>
        </section>
      </LearningShell>
    );
  return (
    <LearningShell title="Progress & Weakness">
      <section className="sl-page">
        <div className="sl-hero">
          <div>
            <span className="sl-eyebrow">Learning intelligence</span>
            <h2>Understand your progress, not just your activity.</h2>
            <p>
              SmartLearn combines study time, task completion, quiz performance
              and subject data.
            </p>
          </div>
        </div>
        <div className="sl-stat-grid">
          <div>
            <b>{data.quiz.averageScore}%</b>
            <span>Average quiz score</span>
          </div>
          <div>
            <b>{Math.round((data.study.minutes / 60) * 10) / 10}h</b>
            <span>Total study time</span>
          </div>
          <div>
            <b>{data.tasks.done}</b>
            <span>Tasks completed</span>
          </div>
          <div>
            <b>{data.quiz.attempts}</b>
            <span>Quiz attempts</span>
          </div>
        </div>
        <div className="sl-grid-2">
          <div className="sl-card">
            <h3>Subject performance</h3>
            {data.subjects.map((s) => (
              <div className="sl-progress-row" key={s.id}>
                <div>
                  <b>{s.name}</b>
                  <span>
                    {s.proficiency}% proficiency ·{" "}
                    {Math.round((s.study_minutes / 60) * 10) / 10}h study
                  </span>
                </div>
                <div className="sl-bar">
                  <i style={{ width: `${Math.min(100, s.proficiency)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="sl-card">
            <h3>Weakness Detection</h3>
            <p className="sl-muted">
              Subjects with lower recorded proficiency deserve extra practice.
              This is an activity-based indicator, not a formal grade.
            </p>
            {data.weaknesses.length ? (
              data.weaknesses.map((s) => (
                <div className="sl-weak" key={s.id}>
                  <span>!</span>
                  <div>
                    <b>{s.name}</b>
                    <small>
                      {s.proficiency}% recorded proficiency. Consider a quiz,
                      practice set, and focused revision.
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p>Not enough data to identify a weak area yet.</p>
            )}
          </div>
        </div>
      </section>
    </LearningShell>
  );
}
