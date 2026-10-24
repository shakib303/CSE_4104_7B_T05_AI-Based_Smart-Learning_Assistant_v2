import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import LearningShell from "../components/LearningShell";

export default function DocumentsPage(){
  const [docs,setDocs]=useState([]),[selected,setSelected]=useState(null),[loading,setLoading]=useState(false),[selectedFile,setSelectedFile]=useState(null);
  const [instruction,setInstruction]=useState("Explain this material simply, summarize key ideas, give examples, and list likely exam points.");
  async function load(){try{const r=await api.get("/documents");setDocs(r.data.documents||[])}catch(e){toast.error("Could not load documents")}}
  useEffect(()=>{load()},[]);
  function choose(file){
    if(!file)return;
    if(file.size>6*1024*1024)return toast.error("Keep files under 6 MB");
    const allowed=["application/pdf","image/png","image/jpeg","image/webp","text/plain"];
    if(!allowed.includes(file.type))return toast.error("Use PDF, PNG, JPG, WEBP or TXT files");
    setSelectedFile(file);
  }
  async function submit(){
    if(!selectedFile)return toast.error("Choose a document first");
    const file=selectedFile; const reader=new FileReader();
    reader.onload=async()=>{setLoading(true);try{const r=await api.post("/documents/analyze",{name:file.name,mimeType:file.type,data:reader.result,instruction});setSelected(r.data.document);setDocs(d=>[r.data.document,...d]);setSelectedFile(null);toast.success("Document submitted and analyzed")}catch(e){toast.error(e.response?.data?.error||"Submission failed")}finally{setLoading(false)}};
    reader.readAsDataURL(file);
  }
  return <LearningShell title="PDF & Document Explainer"><section className="sl-page">
    <div className="sl-hero"><div><span className="sl-eyebrow">Smart document understanding</span><h2>Upload study material. Submit it for AI analysis.</h2><p>Choose your lecture notes, PDF, assignment or image, review the file, then press Submit Document.</p></div><div className="sl-hero-icon">▤</div></div>
    <div className="sl-grid-2">
      <div className="sl-card sl-upload"><div className="sl-card-head"><div><span className="sl-eyebrow">Step 1</span><h3>Select document</h3></div>{selectedFile&&<span className="sl-upload-ready">Ready</span>}</div>
        <label className="sl-drop">{selectedFile?<><b>{selectedFile.name}</b><small>{(selectedFile.size/1024/1024).toFixed(2)} MB · Ready to submit</small></>:<>Choose a file<small>PDF, PNG, JPG, WEBP or TXT · max 6 MB</small></>}<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain" disabled={loading} onChange={e=>choose(e.target.files?.[0])}/></label>
        <label>What should AI do?<textarea value={instruction} onChange={e=>setInstruction(e.target.value)} rows="4"/></label>
        <button className="sl-primary sl-submit-document" disabled={!selectedFile||loading} onClick={submit}>{loading?"Submitting & analyzing…":"Submit Document →"}</button>
      </div>
      <div className="sl-card"><h3>Previous analyses</h3>{docs.length?docs.map(d=><button className="sl-doc-row" key={d.id} onClick={()=>setSelected(d)}><span>▤</span><div><b>{d.name}</b><small>{new Date(d.created_at||d.createdAt).toLocaleString()}</small></div></button>):<p className="sl-muted">No documents submitted yet.</p>}</div>
    </div>
    {selected&&<div className="sl-card"><div className="sl-card-head"><div><span className="sl-eyebrow">AI explanation</span><h3>{selected.name}</h3></div><button className="sl-outline" onClick={()=>setSelected(null)}>Close</button></div><div className="sl-markdown">{selected.summary}</div></div>}
  </section></LearningShell>
}
