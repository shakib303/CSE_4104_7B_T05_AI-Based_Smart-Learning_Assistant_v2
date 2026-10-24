import { useEffect, useState } from "react";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";
export default function AdminActivityPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api.get("/admin/activity").then((r) => setLogs(r.data.logs || []));
  }, []);
  return (
    <LearningShell title="System Activity">
      <section className="sl-page">
        <div className="sl-card">
          <h3>Recent activity</h3>
          {logs.map((l) => (
            <div className="sl-progress-row" key={l.id}>
              <div>
                <b>{l.action}</b>
                <span>
                  {l.name || "System"} · {l.details || ""} ·{" "}
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </LearningShell>
  );
}
