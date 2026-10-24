import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";

export default function QuizPage() {
  const [topic, setTopic] = useState(""),
    [difficulty, setDifficulty] = useState("MEDIUM"),
    [count, setCount] = useState(5),
    [quiz, setQuiz] = useState(null),
    [answers, setAnswers] = useState([]),
    [result, setResult] = useState(null),
    [loading, setLoading] = useState(false),
    [history, setHistory] = useState([]);
  useEffect(() => {
    api
      .get("/quiz/history")
      .then((r) => setHistory(r.data.attempts || []))
      .catch(() => {});
  }, []);
  async function generate() {
    if (!topic.trim()) return toast.error("Enter a topic first");
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post("/quiz/generate", { topic, difficulty, count });
      setQuiz(r.data.quiz);
      setAnswers(Array(r.data.quiz.questions.length).fill(null));
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not generate quiz");
    } finally {
      setLoading(false);
    }
  }
  async function submit() {
    if (answers.some((a) => a === null))
      return toast.error("Answer every question");
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (Number(answers[i]) === Number(q.answerIndex)) correct++;
    });
    const score = Math.round((correct / quiz.questions.length) * 100);
    setResult({ correct, score });
    try {
      await api.post("/quiz/submit", {
        title: quiz.title,
        topic: quiz.topic || topic,
        questions: quiz.questions,
        answers,
        score,
      });
      const h = await api.get("/quiz/history");
      setHistory(h.data.attempts || []);
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <LearningShell title="Smart Quiz Generator">
      <section className="sl-page">
        <div className="sl-hero">
          <div>
            <span className="sl-eyebrow">AI learning module</span>
            <h2>Turn any topic into a practice session.</h2>
            <p>
              Generate questions automatically, answer them, and get instant
              feedback.
            </p>
          </div>
          <div className="sl-hero-icon">?</div>
        </div>
        <div className="sl-grid-2">
          <div className="sl-card">
            <h3>Create a Quiz</h3>
            <label>
              Topic
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. SQL joins, calculus limits, data structures"
              />
            </label>
            <div className="sl-form-grid">
              <label>
                Difficulty
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option>EASY</option>
                  <option>MEDIUM</option>
                  <option>HARD</option>
                </select>
              </label>
              <label>
                Questions
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                >
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                </select>
              </label>
            </div>
            <button
              className="sl-primary"
              onClick={generate}
              disabled={loading}
            >
              {loading ? "Generating…" : "✦ Generate Quiz"}
            </button>
          </div>
          <div className="sl-card">
            <h3>How it helps</h3>
            <div className="sl-benefit">
              <b>Instant feedback</b>
              <span>See your score and explanations after submission.</span>
            </div>
            <div className="sl-benefit">
              <b>Adaptive difficulty</b>
              <span>Choose easy, medium or hard practice.</span>
            </div>
            <div className="sl-benefit">
              <b>Progress evidence</b>
              <span>
                Attempts are saved for your analytics and weakness detection.
              </span>
            </div>
          </div>
        </div>
        {quiz && (
          <div className="sl-card sl-quiz">
            <div className="sl-card-head">
              <div>
                <span className="sl-eyebrow">Generated quiz</span>
                <h3>{quiz.title || topic}</h3>
              </div>
              {result && <strong className="sl-score">{result.score}%</strong>}
            </div>
            {quiz.questions.map((q, i) => (
              <div className="sl-question" key={i}>
                <b>
                  {i + 1}. {q.question}
                </b>
                {q.options.map((o, j) => (
                  <label key={j} className={answers[i] === j ? "selected" : ""}>
                    <input
                      type="radio"
                      name={"q" + i}
                      checked={answers[i] === j}
                      onChange={() =>
                        setAnswers((a) => a.map((x, k) => (k === i ? j : x)))
                      }
                    />
                    {o}
                  </label>
                ))}
                {result && (
                  <div className="sl-explain">
                    {answers[i] === q.answerIndex
                      ? "✓ Correct"
                      : "✗ Correct answer: " + q.options[q.answerIndex]}{" "}
                    — {q.explanation}
                  </div>
                )}
              </div>
            ))}
            {!result && (
              <button className="sl-primary" onClick={submit}>
                Submit Quiz
              </button>
            )}
          </div>
        )}
        <div className="sl-card">
          <h3>Recent Attempts</h3>
          {history.length ? (
            <div className="sl-history">
              {history.map((x) => (
                <div key={x.id}>
                  <b>{x.title}</b>
                  <span>{x.topic}</span>
                  <strong>{Math.round(x.score)}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="sl-muted">
              Your saved quiz attempts will appear here.
            </p>
          )}
        </div>
      </section>
    </LearningShell>
  );
}
