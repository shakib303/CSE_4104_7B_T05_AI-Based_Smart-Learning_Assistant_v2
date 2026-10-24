import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";
import { useAuth } from "../context/AuthContext";

export default function MessagesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const isTeacher = user?.role === "TEACHER";

  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedId) || contacts[0], [contacts, selectedId]);

  const load = async () => {
    try {
      setLoading(true);
      const [messagesRes, contactsRes] = await Promise.all([
        api.get("/communication/messages"),
        isTeacher ? api.get("/teacher/students") : api.get("/communication/educator"),
      ]);
      setItems(messagesRes.data.messages || []);
      const nextContacts = isTeacher
        ? (contactsRes.data.students || []).map(s => ({ id: s.userId || s.user_id || s.id, name: s.name, email: s.email, avatar: s.avatar }))
        : (contactsRes.data.educator ? [contactsRes.data.educator] : []);
      setContacts(nextContacts);
      setSelectedId(current => nextContacts.some(c => c.id === current) ? current : nextContacts[0]?.id || "");
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not load messages");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [isTeacher]);

  const conversation = items.filter(m =>
    selectedContact && ((m.senderId === selectedContact.id || m.receiverId === selectedContact.id))
  );

  async function send() {
    if (!selectedContact?.id || !text.trim()) return;
    try {
      await api.post("/communication/messages", { receiverId: selectedContact.id, message: text.trim() });
      setText("");
      await load();
    } catch (e) { toast.error(e.response?.data?.error || "Message failed"); }
  }

  return (
    <LearningShell title="Messages">
      <section className="sl-page">
        <div className="sl-message-layout">
          <aside className="sl-card sl-message-contacts">
            <div className="sl-card-head"><div><span className="sl-eyebrow">Communication</span><h3>{isTeacher ? "My students" : "My educator"}</h3></div></div>
            {contacts.length === 0 ? <p className="sl-muted">{isTeacher ? "No students are assigned to you yet." : "No educator has been assigned to your account yet."}</p> : contacts.map(c => (
              <button key={c.id} className={`sl-contact ${selectedContact?.id === c.id ? "active" : ""}`} onClick={() => setSelectedId(c.id)}>
                <div className="sl-avatar" style={{width:40,height:40}}>{c.avatar ? <img src={c.avatar} alt=""/> : (c.name || "U").split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</div>
                <div><strong>{c.name}</strong><span>{isTeacher ? "Student" : "Assigned educator"}</span></div>
              </button>
            ))}
          </aside>

          <section className="sl-card sl-message-panel">
            <div className="sl-message-header">
              <div><span className="sl-eyebrow">Private conversation</span><h2>{selectedContact?.name || "Messages"}</h2><p>{selectedContact?.email || "Secure student–educator communication"}</p></div>
              <span className="sl-message-status">● Connected</span>
            </div>
            <div className="sl-message-list">
              {loading ? <p className="sl-muted">Loading conversation…</p> : conversation.length === 0 ? <div className="sl-message-empty"><div>💬</div><strong>Start the conversation</strong><p>Send a message to {selectedContact?.name || "your contact"}.</p></div> : conversation.map(m => {
                const mine = m.senderId === user?.id;
                return <div key={m.id} className={`sl-message-bubble-row ${mine ? "mine" : "theirs"}`}><div className="sl-message-bubble"><strong>{mine ? "You" : m.senderName}</strong><p>{m.message}</p><small>{new Date(m.createdAt).toLocaleString()}</small></div></div>;
              })}
            </div>
            {selectedContact && <div className="sl-message-composer"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={`Message ${selectedContact.name}…`} rows="2"/><button className="sl-primary" onClick={send} disabled={!text.trim()}>Send ↑</button></div>}
          </section>
        </div>
      </section>
    </LearningShell>
  );
}
