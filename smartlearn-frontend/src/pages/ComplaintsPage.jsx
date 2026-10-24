import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";
import { useAuth } from "../context/AuthContext";

export default function ComplaintsPage(){
  const {user}=useAuth();
  const [items,setItems]=useState([]);
  const [f,setF]=useState({subject:"",category:"Academic",description:""});
  const [responses,setResponses]=useState({});
  const isAdmin=user?.role==='ADMIN';
  const load=()=>api.get(isAdmin?"/admin/complaints":"/communication/complaints").then(r=>setItems(r.data.complaints||[])).catch(()=>toast.error("Could not load complaints"));
  useEffect(()=>{load()},[isAdmin]);
  async function submit(e){e.preventDefault();try{await api.post('/communication/complaints',f);toast.success('Complaint submitted successfully');setF({subject:'',category:'Academic',description:''});load()}catch(e){toast.error(e.response?.data?.error||'Could not submit complaint')}}
  async function update(id,status){try{await api.patch(`/admin/complaints/${id}`,{status,adminResponse:responses[id]||''});toast.success('Complaint updated');setResponses(r=>({...r,[id]:''}));load()}catch(e){toast.error(e.response?.data?.error||'Could not update complaint')}}
  return <LearningShell title="Complaints & Support"><section className="sl-page">
    {!isAdmin&&<div className="sl-hero sl-complaint-hero"><div><span className="sl-eyebrow">Student support</span><h2>Tell us what needs attention.</h2><p>Submit a clear complaint and follow the status and administrator response from this page.</p></div><div className="sl-hero-icon">💬</div></div>}
    {!isAdmin&&<form className="sl-card sl-complaint-form" onSubmit={submit}><div className="sl-card-head"><div><span className="sl-eyebrow">New request</span><h3>Submit a complaint</h3></div><span className="sl-type">Tracked</span></div><div className="sl-grid-2"><input className="input" placeholder="Subject" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} required/><select className="input" value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option>Academic</option><option>Technical</option><option>Account</option><option>Other</option></select></div><textarea className="input" rows="5" placeholder="Describe the issue in detail…" value={f.description} onChange={e=>setF({...f,description:e.target.value})} required/><button className="sl-primary">Submit Complaint →</button></form>}
    <div className="sl-card"><div className="sl-card-head"><div><span className="sl-eyebrow">{isAdmin?'Support queue':'My support requests'}</span><h3>{isAdmin?'All complaints':'Complaint history'}</h3></div><span className="sl-type">{items.length} {items.length===1?'request':'requests'}</span></div>
      {items.length===0?<div className="sl-empty-state"><div>✓</div><strong>No complaints here</strong><p>{isAdmin?'The support queue is clear.':'Your submitted complaints will appear here.'}</p></div>:items.map(c=><article className="sl-complaint-item" key={c.id}>
        <div className="sl-complaint-top"><div><span className="sl-complaint-category">{c.category||'Support'}</span><h4>{c.subject}</h4></div><span className={`sl-status-pill status-${String(c.status).toLowerCase()}`}>{String(c.status).replace('_',' ')}</span></div>
        {isAdmin&&<p className="sl-complaint-from">From <b>{c.studentName}</b> · {c.studentEmail}</p>}
        <p>{c.description}</p>
        <small>Submitted {new Date(c.createdAt).toLocaleString()}</small>
        {c.adminResponse&&<div className="sl-admin-response"><strong>Admin response</strong><p>{c.adminResponse}</p></div>}
        {isAdmin&&<div className="sl-admin-response-box"><textarea className="input" rows="3" value={responses[c.id]??c.adminResponse??''} onChange={e=>setResponses(r=>({...r,[c.id]:e.target.value}))} placeholder="Write a response for the student…"/><div className="sl-complaint-actions"><button className="sl-outline" onClick={()=>update(c.id,'IN_REVIEW')}>Save & Review</button><button className="sl-primary" onClick={()=>update(c.id,'RESOLVED')}>Respond & Resolve</button><button className="sl-outline" onClick={()=>update(c.id,'REJECTED')}>Reject</button></div></div>}
      </article>)}
    </div>
  </section></LearningShell>
}
