import { useTheme } from "../context/ThemeContext";
import LearningShell from "../components/LearningShell";

const sizes = [
  { key: "small", label: "Small", description: "Compact text", icon: "A−" },
  { key: "medium", label: "Medium", description: "Recommended", icon: "A" },
  { key: "large", label: "Large", description: "Easier to read", icon: "A+" },
];

export default function SettingsPage() {
  const { dark, toggleDark, fontScale, setFontScale } = useTheme();
  return (
    <LearningShell title="Settings">
      <section className="sl-page">
        <div className="sl-settings-grid">
          <section className="sl-card sl-settings-card">
            <div className="sl-eyebrow">Appearance</div>
            <h2>Make SmartLearn comfortable for you</h2>
            <p className="sl-muted">Your preferences are saved automatically and apply across the dashboard, sidebar and pages.</p>

            <div className="sl-setting-row">
              <div><strong>Theme</strong><span>{dark ? "Dark mode is active" : "Light mode is active"}</span></div>
              <button className="sl-outline" onClick={toggleDark}>{dark ? "☀ Light mode" : "☾ Dark mode"}</button>
            </div>

            <div className="sl-setting-section">
              <div className="sl-setting-heading"><div><strong>Font size</strong><span>Increase or decrease text throughout the app.</span></div><b>{fontScale === "small" ? "90%" : fontScale === "large" ? "115%" : "100%"}</b></div>
              <div className="sl-font-options" role="group" aria-label="Font size">
                {sizes.map(size => (
                  <button key={size.key} className={`sl-font-option ${fontScale === size.key ? "active" : ""}`} aria-pressed={fontScale === size.key} onClick={() => setFontScale(size.key)}>
                    <span>{size.icon}</span><strong>{size.label}</strong><small>{size.description}</small>
                  </button>
                ))}
              </div>
              <p className="sl-muted" style={{ marginTop: 10, fontSize: 12 }}>
                Changes apply immediately. Choose Medium to restore the default size.
              </p>
            </div>
          </section>
        </div>
      </section>
    </LearningShell>
  );
}
