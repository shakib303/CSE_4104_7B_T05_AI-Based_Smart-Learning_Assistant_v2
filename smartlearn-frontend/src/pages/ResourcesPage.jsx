import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";
import { useAuth } from "../context/AuthContext";

const initial = { title:"", description:"", type:"LINK", url:"", content:"", fileName:"", studentIds:[] };

export default function ResourcesPage(){
  const { user } = useAuth();
  const [items,setItems]=useState([]); const [students,setStudents]=useState([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [f,setF]=useState(initial);
  const canPublish=user?.role==="TEACHER"||user?.role==="ADMIN";
  const endpoint=user?.role==="TEACHER"?"/teacher/resources":user?.role==="ADMIN"?"/admin/resources":"/communication/resources";
  const studentEndpoint=user?.role==="TEACHER"?"/teacher/students":"/admin/students";
  const load=async()=>{setLoading(true);try{const r=await api.get(endpoint);setItems(r.data.resources||[])}catch(e){toast.error("Could not load resources")}finally{setLoading(false)}};
  useEffect(()=>{load(); if(canPublish) api.get(studentEndpoint).then(r=>setStudents(r.data.students||[])).catch(()=>toast.error("Could not load students"));},[user?.role]);
  const selectedCount=f.studentIds.length;
  const studentOptions=useMemo(()=>students.map(s=>({id:s.userId||s.id,name:s.name,email:s.email})),[students]);
  const change=(k,v)=>setF(x=>({...x,[k]:v}));
  async function attachFile(file){
    if(!file)return;
    const allowed=/\.(pdf|doc|docx|ppt|pptx|txt|rtf|odt|xls|xlsx)$/i.test(file.name);
    if(!allowed)return toast.error("Choose a PDF or document file (PDF, DOCX, PPTX, TXT, XLSX…)");
    if(file.size>6*1024*1024)return toast.error("File must be 6 MB or smaller for this demo.");
    try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});setF(x=>({...x,type:/\.pdf$/i.test(file.name)?"PDF":"DOCUMENT",url:data,fileName:file.name}));toast.success("File attached")}catch{toast.error("Could not read this file")}
  }
  const toggleStudent=(id)=>setF(x=>({...x,studentIds:x.studentIds.includes(id)?x.studentIds.filter(v=>v!==id):[...x.studentIds,id]}));
  async function create(e){e.preventDefault();if(!f.title.trim())return toast.error("Enter a resource title");if(!selectedCount)return toast.error("Select at least one student");setSaving(true);try{await api.post(endpoint,f);toast.success(`Resource sent to ${selectedCount} student${selectedCount>1?"s":""}`);setF(initial);load()}catch(e){toast.error(e.response?.data?.error||"Could not create resource")}finally{setSaving(false)}}
  async function del(id){if(!confirm("Delete this resource?"))return;try{await api.delete(`${endpoint}/${id}`);toast.success("Resource deleted");load()}catch(e){toast.error(e.response?.data?.error||"Delete failed")}}
  return <LearningShell title="Learning Resources"><section className="sl-page">
    <div className="sl-hero"><div><span className="sl-eyebrow">Resource hub</span><h2>Share the right material with the right learner.</h2><p>Create study resources and send them directly to one or multiple students.</p></div><div className="sl-hero-icon">▤</div></div>
    {canPublish&&<form className="sl-card sl-resource-composer" onSubmit={create}><div className="sl-card-head"><div><h3>Create & assign resource</h3><p className="sl-muted">Students you select will receive the material in their Resources area.</p></div><span className="sl-upload-ready">{selectedCount} selected</span></div>
      <div className="sl-form-grid"><label>Title<input value={f.title} onChange={e=>change("title",e.target.value)} placeholder="e.g. Database Normalization Notes" required/></label><label>Type<select value={f.type} onChange={e=>change("type",e.target.value)}><option>LINK</option><option>TEXT</option><option>PDF</option><option>DOCUMENT</option><option>VIDEO</option><option>ARTICLE</option><option>EXERCISE</option><option>COURSE</option></select></label></div>
      <label>Description<textarea rows="2" value={f.description} onChange={e=>change("description",e.target.value)} placeholder="Briefly describe what students will learn..."/></label>
      {f.type==="LINK"?<label>Resource URL<input type="url" value={f.url} onChange={e=>change("url",e.target.value)} placeholder="https://..."/></label>:<><label>Upload PDF / document<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.odt,.xls,.xlsx" onChange={e=>attachFile(e.target.files?.[0])}/><small className="sl-muted">Up to 6 MB. {f.fileName?`Attached: ${f.fileName}`:"Or paste text below."}</small></label><label>Content / instructions<textarea rows="5" value={f.content} onChange={e=>change("content",e.target.value)} placeholder="Paste the study material or instructions..."/></label></>}
      <div className="sl-student-picker"><div className="sl-card-head"><div><strong>Send to students</strong><p className="sl-muted">Choose one or more {user?.role==="ADMIN"?"students":"assigned students"}.</p></div><button type="button" className="sl-outline" onClick={()=>change("studentIds",studentOptions.map(s=>s.id))}>Select all</button></div>
        {students.length?<div className="sl-student-check-grid">{studentOptions.map(s=><label key={s.id} className={`sl-student-check ${f.studentIds.includes(s.id)?"selected":""}`}><input type="checkbox" checked={f.studentIds.includes(s.id)} onChange={()=>toggleStudent(s.id)}/><span className="sl-student-check-avatar">{(s.name||"S").slice(0,1).toUpperCase()}</span><span><strong>{s.name}</strong><small>{s.email||"Student"}</small></span></label>)}</div>:<div className="sl-empty-state"><div>👥</div><strong>No students available</strong><p>There are no selectable students for this account yet.</p></div>}
      </div><button className="sl-primary" disabled={saving||!selectedCount}>{saving?"Sending…":`Send resource${selectedCount?` to ${selectedCount} student${selectedCount>1?"s":""}`:""}`}</button>
    </form>}
    <section className="sl-card"><div className="sl-card-head"><div><h3>{user?.role==="STUDENT"?"Available resources":"Published resources"}</h3><p className="sl-muted">{items.length} resource{items.length===1?"":"s"}</p></div></div>
      {loading?<div className="sl-empty-state"><div>⏳</div><strong>Loading resources…</strong></div>:items.length?<div className="sl-resource-list">{items.map(x=><article className="sl-resource-row" key={x.id}><div className="sl-resource-icon">{x.type==="VIDEO"?"▶":"▤"}</div><div className="sl-resource-copy"><span className="sl-type">{x.type}</span><h4>{x.title}</h4><p>{x.description||"Study material shared through SmartLearn."}</p>{x.url&&<a href={x.url} download={x.fileName||undefined} target="_blank" rel="noreferrer">{x.url.startsWith("data:")?`Open attached file${x.fileName?`: ${x.fileName}`:""} →`:"Open resource →"}</a>}{x.content&&<details><summary>View content / instructions</summary><p style={{whiteSpace:"pre-wrap"}}>{x.content}</p></details>}</div>{canPublish&&<button className="sl-outline" onClick={()=>del(x.id)}>Delete</button>}</article>)}</div>:<div className="sl-empty-state"><div>▤</div><strong>No resources yet</strong><p>Published materials will appear here.</p></div>}
    </section>
  </section></LearningShell>
}
