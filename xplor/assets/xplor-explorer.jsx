import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────── palette ──────────────────────────── */
const C = {
  bg:          "#07070e",
  panel:       "#0d0d1e",
  panel2:      "#101028",
  border:      "#1e1e3a",
  borderHi:    "#3a3a60",
  text:        "#e2ddd6",
  muted:       "#8899aa",
  dim:         "#3a4a5a",
  accent:      "#5ee7df",
  accent2:     "#8b9fff",
  warn:        "#ff6b6b",
  ok:          "#4ade80",
};

/* source-file accent colors — each uploaded file gets one */
const FILE_ACCENTS = [
  "#5ee7df","#7b8fff","#ffa75e","#ff6b9d","#a3e635",
  "#f59e0b","#c084fc","#38bdf8","#fb7185","#34d399",
];

const TYPE_COLORS = {
  person:"#FF6B6B", organization:"#4ECDC4", location:"#45B7D1",
  concept:"#82E0AA", document:"#F0B27A", event:"#AED6F1",
  obligation:"#C39BD3", condition:"#F9E79F",
  function:"#61AFEF", class:"#C678DD", variable:"#E5C07B",
  import:"#56B6C2", module:"#98C379",
  skill:"#FF9F43", moc:"#EE5A24", claim:"#A3CB38",
  technique:"#FDA7DF", framework:"#9AECDB", file:"#ABB2BF", default:"#636e72",
};

const EDGE_COLORS = {
  REFERENCES:"#6677aa", OBLIGATED_TO:"#C39BD3", CALLS:"#61AFEF",
  EXTENDS:"#98C379", CONTRADICTS:"#FF6B6B", CLUSTERS:"#F0B27A",
  IMPORTS:"#56B6C2", DEFINES:"#4ECDC4", RELATED_TO:"#5566aa",
  CROSS_DOMAIN:"#FDA7DF", TRIGGERS:"#F9E79F", CONFLICTS_WITH:"#FF9966",
  CROSS_FILE:"#8b9fff",
};

/* ─────────────────────────── force sim ────────────────────────── */
function useForceSimulation(nodes, edges, w, h) {
  const [pos, setPos] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (!nodes.length) { setPos({}); return; }
    if (ref.current) cancelAnimationFrame(ref.current);
    const p = {};
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(w, h) * 0.15;
      p[n.id] = { x: w/2 + r*Math.cos(a) + (Math.random()-.5)*20,
                  y: h/2 + r*Math.sin(a) + (Math.random()-.5)*20, vx:0, vy:0 };
    });
    let it = 0; const MAX = 500;
    const tick = () => {
      if (it++ > MAX) return;
      // Tight k keeps graph compact and fully visible
      const k = Math.sqrt((w * h) / Math.max(nodes.length, 1)) * 0.30;
      const f = {}; nodes.forEach(n => { f[n.id]={fx:0,fy:0}; });
      // Repulsion
      for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
        const a=p[nodes[i].id],b=p[nodes[j].id]; if(!a||!b) continue;
        const dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        const force=(k*k)/d;
        f[nodes[i].id].fx+=(dx/d)*force; f[nodes[i].id].fy+=(dy/d)*force;
        f[nodes[j].id].fx-=(dx/d)*force; f[nodes[j].id].fy-=(dy/d)*force;
      }
      // Attraction along edges
      edges.forEach(e => {
        const a=p[e.source],b=p[e.target]; if(!a||!b) return;
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        const idealLen = e.type==="CROSS_FILE" ? k*3 : k*2.2;
        const force=(d-idealLen)*0.07;
        f[e.source].fx+=(dx/d)*force; f[e.source].fy+=(dy/d)*force;
        f[e.target].fx-=(dx/d)*force; f[e.target].fy-=(dy/d)*force;
      });
      // Strong center gravity
      nodes.forEach(n => {
        const q=p[n.id];
        f[n.id].fx+=(w/2-q.x)*0.05; f[n.id].fy+=(h/2-q.y)*0.05;
      });
      const cool=1-(it/MAX)*0.9;
      nodes.forEach(n => {
        const q=p[n.id];
        q.vx=(q.vx+f[n.id].fx)*0.5; q.vy=(q.vy+f[n.id].fy)*0.5;
        q.x=Math.max(100,Math.min(w-100,q.x+q.vx*cool));
        q.y=Math.max(100,Math.min(h-100,q.y+q.vy*cool));
      });
      setPos({...p});
      if (it<MAX) ref.current=requestAnimationFrame(tick);
    };
    ref.current=requestAnimationFrame(tick);
    return ()=>{ if(ref.current) cancelAnimationFrame(ref.current); };
  }, [nodes, edges, w, h]);
  return pos;
}

/* ─────────────────────────── file reading ──────────────────────── */
function readFileAsEntry(file) {
  return new Promise((resolve) => {
    const isPdf = file.type === "application/pdf";
    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();
    if (isPdf || isImg) {
      reader.onload = () => resolve({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: isPdf ? "pdf" : "image",
        mimeType: file.type,
        data: reader.result.split(",")[1],
        status: "pending", // pending | extracting | done | error
        graph: null,
      });
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => resolve({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: "text",
        mimeType: "text/plain",
        data: reader.result,
        status: "pending",
        graph: null,
      });
      reader.readAsText(file);
    }
  });
}

/* ─────────────────────────── API call ──────────────────────────── */
async function extractGraphFromEntry(entry) {
  let messages;
  if (entry.type === "pdf") {
    messages = [{ role:"user", content:[
      { type:"document", source:{ type:"base64", media_type:"application/pdf", data:entry.data } },
      { type:"text", text:`Extract a knowledge graph from this document named "${entry.name}".` }
    ]}];
  } else if (entry.type === "image") {
    messages = [{ role:"user", content:[
      { type:"image", source:{ type:"base64", media_type:entry.mimeType, data:entry.data } },
      { type:"text", text:`Extract a knowledge graph from this image named "${entry.name}".` }
    ]}];
  } else {
    messages = [{ role:"user", content:`Extract a knowledge graph from this content (file: "${entry.name}"):\n\n${entry.data.slice(0,12000)}` }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:4000,
      system:`PRIVACY RULE — STRICTLY ENFORCED:
You are Xplor, a knowledge graph extraction engine.
You ONLY analyze content provided directly in this message.
You MUST NOT use memory, prior conversations, background context, user history, or any assumed knowledge about the user or their work.
Every session is completely isolated. Make zero assumptions.
If no content is provided, return an error — never invent or fill in data.

Extract a knowledge graph from ONLY the attached content. Return ONLY valid JSON — no markdown, no backticks, no preamble:
{
  "title": "short descriptive title derived from the source content",
  "nodes": [
    { "id": "namespaced-unique-id", "type": "person|organization|location|concept|document|obligation|condition|event|claim|framework|function|class|module", "name": "string", "description": "one sentence extracted verbatim or closely paraphrased from source", "domain": "string", "tags": ["string"] }
  ],
  "edges": [
    { "source": "node_id", "target": "node_id", "type": "REFERENCES|OBLIGATED_TO|CONTRADICTS|EXTENDS|CLUSTERS|RELATED_TO|TRIGGERS|CONFLICTS_WITH|CALLS|DEFINES|IMPORTS", "label": "human-readable relationship from source", "strength": 3 }
  ],
  "insights": ["2-4 key structural observations derived only from the provided content"]
}
Rules: 5-15 nodes. All entities MUST exist in the source content — no invented entities. Strength 1-5. Return only JSON.`,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const raw = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "";
  // More robust JSON extraction — find the first { ... } block
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

/* ─────────────────────────── graph fusion ──────────────────────── */
function fuseGraphs(fileEntries) {
  const allNodes = [];
  const allEdges = [];
  const insights = [];

  // Namespace each file's nodes with its fileId, collect all
  fileEntries.forEach((entry, fi) => {
    if (!entry.graph) return;
    const prefix = `f${fi}`;
    const idMap = {}; // original id → namespaced id

    entry.graph.nodes.forEach(n => {
      const newId = `${prefix}:${n.id}`;
      idMap[n.id] = newId;
      allNodes.push({ ...n, id: newId, fileId: entry.id, fileIndex: fi, fileName: entry.name });
    });

    entry.graph.edges.forEach(e => {
      const src = idMap[e.source], tgt = idMap[e.target];
      if (src && tgt) allEdges.push({ ...e, source: src, target: tgt, fileId: entry.id, fileIndex: fi });
    });

    if (entry.graph.insights) insights.push(...entry.graph.insights.map(i=>`[${entry.name}] ${i}`));
  });

  // Cross-file deduplication: find nodes with same name (case-insensitive) across files
  // and add CROSS_FILE edges between them + mark duplicates
  const nameIndex = {}; // lowercase name → [node]
  allNodes.forEach(n => {
    const key = n.name.toLowerCase().trim();
    if (!nameIndex[key]) nameIndex[key] = [];
    nameIndex[key].push(n);
  });

  const crossFileEdges = [];
  const crossFileNodeIds = new Set();
  Object.values(nameIndex).forEach(group => {
    if (group.length < 2) return;
    // Mark them all as cross-file, link pairs
    group.forEach(n => crossFileNodeIds.add(n.id));
    for (let i=0;i<group.length;i++) for (let j=i+1;j<group.length;j++) {
      if (group[i].fileIndex !== group[j].fileIndex) {
        crossFileEdges.push({
          source: group[i].id, target: group[j].id,
          type: "CROSS_FILE", label: "same entity",
          strength: 4, crossFile: true,
        });
      }
    }
  });

  return {
    title: fileEntries.map(f=>f.graph?.title||f.name).join(" · "),
    nodes: allNodes.map(n=>({ ...n, crossFile: crossFileNodeIds.has(n.id) })),
    edges: [...allEdges, ...crossFileEdges],
    insights,
    fileCount: fileEntries.length,
  };
}

/* ══════════════════════════════════════════════
   INPUT SCREEN
══════════════════════════════════════════════ */
function InputScreen({ onReady }) {
  const [mode, setMode] = useState(null);        // 'files' | 'text' | 'url'
  const [files, setFiles] = useState([]);         // FileEntry[]
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const addFiles = async (rawFiles) => {
    setMode("files");
    const entries = await Promise.all(Array.from(rawFiles).map(readFileAsEntry));
    setFiles(prev => {
      const existingNames = new Set(prev.map(f=>f.name));
      return [...prev, ...entries.filter(e=>!existingNames.has(e.name))];
    });
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f=>f.id!==id));

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const fetchUrl = async () => {
    if (!url.trim()) return;
    setFetchingUrl(true); setUrlError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`Extract the main readable text from the provided URL. Return ONLY the plain text content extracted from that URL — no commentary, no additions, no context from prior knowledge. If the URL is inaccessible or returns no content, return exactly: FETCH_FAILED`,
          tools:[{ type:"web_search_20250305", name:"web_search" }],
          messages:[{ role:"user", content:`Extract text from: ${url}` }],
        }),
      });
      const data = await res.json();
      const extracted = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("\n")||"";
      if (!extracted||extracted.includes("FETCH_FAILED")) {
        setUrlError("Could not fetch. Try pasting the text directly.");
      } else {
        setText(extracted.slice(0,10000));
        setMode("text");
        setUrl("");
      }
    } catch { setUrlError("Fetch failed. Try pasting the text instead."); }
    finally { setFetchingUrl(false); }
  };

  const canBuild = () => {
    if (mode==="files") return files.length>0;
    if (mode==="text") return text.trim().length>20;
    return false;
  };

  const handleBuild = () => {
    if (mode==="text") onReady({ type:"text", content:text });
    else if (mode==="files") onReady({ type:"files", files });
  };

  const MODES = [
    { id:"files", icon:"⬡", label:"Upload Files", desc:"PDF · TXT · MD · Images · Code — multiple allowed" },
    { id:"text",  icon:"✦", label:"Paste Text",   desc:"Contracts, reports, notes, code" },
    { id:"url",   icon:"◎", label:"From URL",     desc:"Fetch a web page or article" },
  ];

  const FILE_ICONS = { pdf:"▣", image:"▨", text:"▤" };

  return (
    <div
      style={{ position:"relative", minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", overflow:"hidden" }}
      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* bg grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize:"52px 52px", opacity:0.35, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 80% 60% at 50% 38%,#0d0d2228 0%,transparent 70%)`, pointerEvents:"none" }}/>

      {/* drop overlay */}
      {dragOver && (
        <div style={{ position:"fixed", inset:0, background:"#07070ef0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:200, border:`2px dashed ${C.accent}`, borderRadius:12 }}>
          <div style={{ fontSize:36, color:C.accent, marginBottom:14 }}>⬡</div>
          <div style={{ fontSize:13, color:C.accent, letterSpacing:"0.18em", fontFamily:"monospace" }}>DROP FILES TO ADD</div>
          <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", marginTop:8 }}>Multiple files supported</div>
        </div>
      )}

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:620 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:14, marginBottom:14 }}>
            <div style={{ width:46, height:46, borderRadius:10, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:C.bg, fontFamily:"monospace" }}>X</div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:"0.18em", color:C.text, fontFamily:"monospace" }}>XPLOR</div>
              <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.28em", marginTop:2, fontFamily:"monospace" }}>STRUCTURED COGNITION ENGINE</div>
            </div>
          </div>
          <p style={{ fontSize:12, color:C.muted, lineHeight:1.8, maxWidth:440, margin:"0 auto", fontFamily:"monospace" }}>
            Upload multiple documents to build a unified cross-document knowledge graph — entities, relationships, and cross-file connections all mapped together.
          </p>
          {/* Privacy notice */}
          <div style={{ marginTop:16, padding:"8px 14px", background:`${C.accent2}08`, border:`1px solid ${C.accent2}25`, borderRadius:8, maxWidth:440, margin:"14px auto 0", display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ color:C.accent2, fontSize:11, flexShrink:0 }}>🔒</span>
            <span style={{ fontSize:9, color:C.muted, fontFamily:"monospace", lineHeight:1.8, textAlign:"left" }}>
              <span style={{ color:C.accent2 }}>Privacy guaranteed.</span> Xplor only analyzes content you provide in this session — files you upload, text you paste, or URLs you share. No memory, no background context, no assumptions about your work.
            </span>
          </div>
        </div>

        {/* Mode pills */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>{ setMode(m.id); if(m.id!=="files") setFiles([]); }} style={{
              flex:1, padding:"15px 10px",
              background:mode===m.id?`${C.accent}10`:C.panel,
              border:`1px solid ${mode===m.id?C.accent:C.border}`,
              borderRadius:10, cursor:"pointer", textAlign:"center", transition:"all 0.18s",
            }}>
              <div style={{ fontSize:18, marginBottom:5, color:mode===m.id?C.accent:C.muted }}>{m.icon}</div>
              <div style={{ fontSize:11, fontWeight:"bold", letterSpacing:"0.1em", color:mode===m.id?C.accent:C.text, fontFamily:"monospace", marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", lineHeight:1.5 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* ── FILES mode ── */}
        {mode==="files" && (
          <div>
            {/* Drop zone */}
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
              style={{
                border:`2px dashed ${files.length>0?C.accent:C.border}`,
                borderRadius:10, padding:"24px 20px",
                background:files.length>0?`${C.accent}06`:"#050510",
                display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                cursor:"pointer", marginBottom:14, transition:"all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" multiple style={{ display:"none" }}
                accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.xml,.yaml,.yml,image/*"
                onChange={e=>addFiles(e.target.files)}
              />
              <div style={{ fontSize:26, color:files.length>0?C.accent:C.dim }}>⬡</div>
              <div style={{ fontSize:11, color:files.length>0?C.accent:C.muted, fontFamily:"monospace", fontWeight:"bold" }}>
                {files.length>0?"ADD MORE FILES":"CLICK OR DROP FILES HERE"}
              </div>
              <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace" }}>PDF · TXT · MD · CSV · JSON · Images · Code files · Multiple at once</div>
            </div>

            {/* File queue */}
            {files.length>0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:8, letterSpacing:"0.2em", color:C.dim, marginBottom:8, fontFamily:"monospace" }}>
                  QUEUED FILES — {files.length} DOCUMENT{files.length!==1?"S":""}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {files.map((f,fi)=>(
                    <div key={f.id} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"10px 12px", background:C.panel,
                      border:`1px solid ${C.border}`, borderRadius:8,
                      borderLeft:`3px solid ${FILE_ACCENTS[fi%FILE_ACCENTS.length]}`,
                    }}>
                      <div style={{ fontSize:14, color:FILE_ACCENTS[fi%FILE_ACCENTS.length], flexShrink:0 }}>{FILE_ICONS[f.type]||"▤"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:C.text, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                        <div style={{ fontSize:8, color:C.muted, fontFamily:"monospace", marginTop:2 }}>{f.type.toUpperCase()}</div>
                      </div>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:FILE_ACCENTS[fi%FILE_ACCENTS.length], flexShrink:0, opacity:0.6 }}/>
                      <button onClick={()=>removeFile(f.id)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1, flexShrink:0 }}>×</button>
                    </div>
                  ))}
                </div>

                {files.length>1 && (
                  <div style={{ marginTop:10, padding:"9px 12px", background:`${C.accent2}0a`, border:`1px solid ${C.accent2}30`, borderRadius:7, fontFamily:"monospace" }}>
                    <div style={{ fontSize:9, color:C.accent2, letterSpacing:"0.1em", marginBottom:3 }}>MULTI-FILE FUSION</div>
                    <div style={{ fontSize:9, color:C.muted, lineHeight:1.7 }}>
                      Each file is extracted independently, then fused into one unified graph. Shared entities across files are linked with <span style={{ color:C.accent2 }}>CROSS_FILE</span> edges.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TEXT mode ── */}
        {mode==="text" && (
          <div style={{ marginBottom:16 }}>
            <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus
              style={{ width:"100%", height:200, resize:"vertical", background:"#050510", border:`1px solid ${text.trim()?C.borderHi:C.border}`, borderRadius:10, color:"#8899bb", fontSize:12, lineHeight:1.7, padding:"14px 16px", fontFamily:"monospace", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }}
              placeholder="Paste your contract, report, research notes, code, or any structured text here..."
            />
            <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", marginTop:5, textAlign:"right" }}>{text.length} chars</div>
          </div>
        )}

        {/* ── URL mode ── */}
        {mode==="url" && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchUrl()} autoFocus
                style={{ flex:1, background:"#050510", border:`1px solid ${url.trim()?C.borderHi:C.border}`, borderRadius:8, color:"#8899bb", fontSize:12, padding:"12px 14px", fontFamily:"monospace", outline:"none", transition:"border-color 0.2s" }}
                placeholder="https://example.com/document-or-article"
              />
              <button onClick={fetchUrl} disabled={fetchingUrl||!url.trim()} style={{ padding:"12px 18px", borderRadius:8, fontFamily:"monospace", fontSize:11, fontWeight:"bold", letterSpacing:"0.1em", background:(!url.trim()||fetchingUrl)?C.panel:`${C.accent}20`, border:`1px solid ${(!url.trim()||fetchingUrl)?C.border:C.accent}`, color:(!url.trim()||fetchingUrl)?C.muted:C.accent, cursor:(!url.trim()||fetchingUrl)?"not-allowed":"pointer", whiteSpace:"nowrap", transition:"all 0.2s" }}>
                {fetchingUrl?"◌ FETCHING":"FETCH →"}
              </button>
            </div>
            {urlError && <div style={{ padding:"9px 12px", background:"#130808", border:`1px solid ${C.warn}33`, borderRadius:7, color:C.warn, fontSize:11, fontFamily:"monospace", marginBottom:10 }}>{urlError}</div>}
            <div style={{ padding:"11px 13px", background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, fontSize:9, color:C.muted, fontFamily:"monospace", lineHeight:1.9 }}>
              ◎ Fetches main text from any public URL · articles, docs, wikis, READMEs<br/>
              ◎ Content becomes a text input you can then build the graph from<br/>
              ◎ Private or auth-protected pages cannot be accessed
            </div>
          </div>
        )}

        {/* No mode */}
        {!mode && (
          <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:11, color:C.dim, fontFamily:"monospace", textAlign:"center", lineHeight:2.2 }}>
              ↑ Choose an input method above<br/>
              <span style={{ fontSize:9, color:"#16162a" }}>or drag & drop files anywhere on the page</span>
            </div>
          </div>
        )}

        {/* Build button */}
        {mode && mode!=="url" && (
          <button onClick={handleBuild} disabled={!canBuild()} style={{
            width:"100%", padding:"14px 0",
            background:canBuild()?`linear-gradient(135deg,${C.accent},${C.accent2})`:C.panel,
            border:`1px solid ${canBuild()?"transparent":C.border}`,
            borderRadius:10, fontFamily:"monospace", fontSize:12, fontWeight:"bold", letterSpacing:"0.16em",
            color:canBuild()?C.bg:C.dim, cursor:canBuild()?"pointer":"not-allowed", transition:"all 0.2s",
          }}>
            {canBuild()
              ? mode==="files"
                ? `▶  BUILD KNOWLEDGE GRAPH — ${files.length} FILE${files.length!==1?"S":""}`
                : "▶  BUILD KNOWLEDGE GRAPH"
              : mode==="files"?"ADD AT LEAST ONE FILE":"ADD CONTENT ABOVE"
            }
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   GRAPH SCREEN
══════════════════════════════════════════════ */
function GraphScreen({ input, onReset }) {
  const [graph, setGraph]             = useState(null);
  const [fileEntries, setFileEntries] = useState([]);   // tracks per-file extraction state
  const [phase, setPhase]             = useState("extracting"); // extracting | fusing | done | error
  const [phaseMsg, setPhaseMsg]       = useState("");
  const [error, setError]             = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode]   = useState(null);
  const [svgSize, setSvgSize]   = useState({ w:800, h:520 });
  const [dragState, setDragState] = useState(null);
  const [manualPos, setManualPos] = useState({});
  const [filter, setFilter]     = useState(null);        // type filter
  const [fileFilter, setFileFilter] = useState(null);    // file filter
  const [showCrossFile, setShowCrossFile] = useState(true);
  // Pan + zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x:0, y:0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // AI Query panel state
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [showQueryPanel, setShowQueryPanel] = useState(false);

  const handleQuery = async () => {
    if (!queryText.trim() || !graph || queryLoading) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const graphSummary = JSON.stringify({
        nodes: graph.nodes.map(n => ({ id:n.id, type:n.type, name:n.name, description:n.description, domain:n.domain })),
        edges: graph.edges.slice(0,200).map(e => ({ source:e.source, target:e.target, type:e.type, label:e.label, strength:e.strength })),
        insights: graph.insights,
        title: graph.title,
      });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`You are Xplor, a knowledge graph reasoning engine. Answer the user's question by reasoning over the provided graph structure — tracing paths, identifying hubs, surfacing obligation chains, or summarizing clusters. Be specific: reference actual node names and edge types from the graph. PRIVACY: Only use what's in the graph provided. Keep your answer concise (3-8 sentences) and graph-grounded.`,
          messages:[{ role:"user", content:`Graph:\n${graphSummary.slice(0,6000)}\n\nQuestion: ${queryText}` }],
        }),
      });
      const data = await res.json();
      const answer = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "No response.";
      setQueryResult(answer);
    } catch(err) {
      setQueryResult("Query failed: " + (err.message || "Unknown error"));
    } finally {
      setQueryLoading(false);
    }
  };

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      setSvgSize({ w:e.contentRect.width, h:Math.max(460,e.contentRect.width*0.56) });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return ()=>ro.disconnect();
  }, []);

  const simPos = useForceSimulation(graph?.nodes||[], graph?.edges||[], svgSize.w, svgSize.h);
  const positions = { ...simPos, ...manualPos };

  /* ── extraction pipeline ── */
  useEffect(() => {
    const run = async () => {
      if (input.type === "text") {
        setPhaseMsg("Extracting knowledge graph from text…");
        try {
          const g = await extractGraphFromEntry({ id:"text", name:"Input Text", type:"text", data:input.content });
          setGraph({ ...g, nodes: g.nodes.map(n=>({...n, fileIndex:0, fileId:"text", fileName:"Input Text"})), fileCount:1 });
          setPhase("done");
        } catch { setError("Could not extract graph from this content."); setPhase("error"); }
        return;
      }

      // Multi-file pipeline
      const entries = input.files.map((f,i)=>({ ...f, fileIndex:i }));
      setFileEntries(entries.map(e=>({...e, status:"pending", graph:null})));

      const updated = [...entries];
      for (let i=0; i<entries.length; i++) {
        setPhaseMsg(`Extracting ${i+1}/${entries.length}: ${entries[i].name}`);
        setFileEntries(prev => prev.map((e,ei)=> ei===i?{...e,status:"extracting"}:e));
        try {
          const g = await extractGraphFromEntry(entries[i]);
          updated[i] = { ...entries[i], graph: g, status:"done" };
          setFileEntries(prev => prev.map((e,ei)=> ei===i?{...updated[i]}:e));
        } catch(err) {
          updated[i] = { ...entries[i], graph:null, status:"error", errorMsg: err.message || "Parse failed" };
          setFileEntries(prev => prev.map((e,ei)=> ei===i?{...updated[i]}:e));
        }
      }

      setPhase("fusing");
      setPhaseMsg("Fusing graphs across documents…");
      await new Promise(r=>setTimeout(r,300));
      const successfulEntries = updated.filter(e=>e.graph);
      if (successfulEntries.length === 0) {
        setError("All files failed to extract. Check that your PDFs contain readable text and try again.");
        setPhase("error");
        return;
      }
      const fused = fuseGraphs(successfulEntries);
      setGraph(fused);
      setPhase("done");
    };
    run();
  }, []);

  const handleMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    setDragState({ nodeId });
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (dragState && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top  - pan.y) / zoom;
      setManualPos(prev=>({...prev,[dragState.nodeId]:{x,y,vx:0,vy:0}}));
    } else if (isPanning && panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [dragState, isPanning, pan, zoom]);

  const handleMouseUp = useCallback(()=>{ setDragState(null); setIsPanning(false); },[]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    setZoom(z => Math.min(4, Math.max(0.15, z * factor)));
  }, []);

  // Filtering
  let visibleNodes = graph?.nodes || [];
  if (filter) visibleNodes = visibleNodes.filter(n=>n.type===filter);
  if (fileFilter) visibleNodes = visibleNodes.filter(n=>n.fileId===fileFilter);
  const visibleIds = new Set(visibleNodes.map(n=>n.id));
  let visibleEdges = (graph?.edges||[]).filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target));
  if (!showCrossFile) visibleEdges = visibleEdges.filter(e=>e.type!=="CROSS_FILE");

  const typeCounts = graph?.nodes.reduce((a,n)=>{ a[n.type]=(a[n.type]||0)+1; return a; },{});

  const getNeighbors = (id) => {
    const ids=new Set();
    graph?.edges.forEach(e=>{ if(e.source===id) ids.add(e.target); if(e.target===id) ids.add(e.source); });
    return ids;
  };
  const neighbors = selectedNode ? getNeighbors(selectedNode.id) : null;

  const statusIcon = { pending:"○", extracting:"◌", done:"●", error:"✕" };
  const statusColor = { pending:C.muted, extracting:C.accent, done:C.ok, error:C.warn };

  const crossFileCount = graph?.edges.filter(e=>e.type==="CROSS_FILE").length || 0;

  return (
    <div style={{ fontFamily:"monospace", background:C.bg, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Topbar */}
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ width:30,height:30,borderRadius:6,background:`linear-gradient(135deg,${C.accent},${C.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:C.bg }}>X</div>
        <div>
          <div style={{ fontSize:13,fontWeight:"bold",letterSpacing:"0.14em",color:C.text }}>XPLOR</div>
          {graph?.title && <div style={{ fontSize:8,color:C.muted,letterSpacing:"0.08em",marginTop:1,maxWidth:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{graph.title.toUpperCase()}</div>}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {graph && (
            <div style={{ display:"flex", gap:14, fontSize:9, color:C.muted }}>
              <span>{graph.nodes.length} NODES</span>
              <span>{graph.edges.length} EDGES</span>
              {crossFileCount>0 && <span style={{ color:C.accent2 }}>{crossFileCount} CROSS-FILE</span>}
            </div>
          )}
          <button onClick={onReset} style={{ padding:"5px 13px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.muted, fontSize:9, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"monospace", transition:"all 0.15s" }}>← NEW INPUT</button>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:295, background:C.panel, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>

          {/* File extraction status (multi-file only) */}
          {fileEntries.length>0 && (
            <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:8,letterSpacing:"0.2em",color:C.dim,marginBottom:7 }}>
                {phase==="fusing"?"FUSING GRAPHS…":phase==="done"?"EXTRACTION COMPLETE":"EXTRACTING FILES…"}
              </div>
              {fileEntries.map((e,fi)=>(
                <div key={e.id} style={{ padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:7,height:7,borderRadius:"50%",background:FILE_ACCENTS[fi%FILE_ACCENTS.length],flexShrink:0 }}/>
                    <div style={{ flex:1,fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name}</div>
                    <div style={{ fontSize:10,color:statusColor[e.status]||C.muted,flexShrink:0,fontWeight:"bold" }}>
                      {e.status==="extracting"
                        ? <span style={{ animation:"pulse 1s infinite" }}>{statusIcon[e.status]}</span>
                        : statusIcon[e.status]
                      }
                    </div>
                  </div>
                  {e.status==="error" && e.errorMsg && (
                    <div style={{ fontSize:9,color:C.warn,marginTop:3,marginLeft:15,lineHeight:1.4 }}>{e.errorMsg}</div>
                  )}
                </div>
              ))}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
              {phase==="fusing" && <div style={{ marginTop:6,fontSize:8,color:C.accent2 }}>Linking shared entities across documents…</div>}
            </div>
          )}

          {/* Filters */}
          {graph && phase==="done" && (
            <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
              {/* Type filter */}
              <div style={{ fontSize:8,letterSpacing:"0.18em",color:C.dim,marginBottom:6 }}>FILTER BY TYPE</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:10 }}>
                <button onClick={()=>setFilter(null)} style={{ background:!filter?`${C.accent}14`:"transparent", border:`1px solid ${!filter?C.accent:C.border}`, borderRadius:4, padding:"2px 7px", color:!filter?C.accent:C.muted, fontSize:8, cursor:"pointer", fontFamily:"monospace" }}>ALL</button>
                {Object.entries(typeCounts||{}).map(([type,count])=>(
                  <button key={type} onClick={()=>setFilter(filter===type?null:type)} style={{ background:filter===type?`${TYPE_COLORS[type]||TYPE_COLORS.default}14`:"transparent", border:`1px solid ${filter===type?(TYPE_COLORS[type]||TYPE_COLORS.default):C.border}`, borderRadius:4, padding:"2px 7px", color:filter===type?(TYPE_COLORS[type]||TYPE_COLORS.default):C.muted, fontSize:8, cursor:"pointer", fontFamily:"monospace" }}>{type.toUpperCase()} {count}</button>
                ))}
              </div>

              {/* File filter */}
              {fileEntries.length>1 && (
                <>
                  <div style={{ fontSize:8,letterSpacing:"0.18em",color:C.dim,marginBottom:6 }}>FILTER BY SOURCE FILE</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:8 }}>
                    <button onClick={()=>setFileFilter(null)} style={{ background:!fileFilter?`${C.accent}14`:"transparent", border:`1px solid ${!fileFilter?C.accent:C.border}`, borderRadius:4, padding:"2px 7px", color:!fileFilter?C.accent:C.muted, fontSize:8, cursor:"pointer", fontFamily:"monospace" }}>ALL</button>
                    {fileEntries.filter(e=>e.status==="done").map((e,fi)=>(
                      <button key={e.id} onClick={()=>setFileFilter(fileFilter===e.id?null:e.id)} style={{ background:fileFilter===e.id?`${FILE_ACCENTS[fi%FILE_ACCENTS.length]}14`:"transparent", border:`1px solid ${fileFilter===e.id?FILE_ACCENTS[fi%FILE_ACCENTS.length]:C.border}`, borderRadius:4, padding:"2px 7px", color:fileFilter===e.id?FILE_ACCENTS[fi%FILE_ACCENTS.length]:C.muted, fontSize:8, cursor:"pointer", fontFamily:"monospace", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name.split(".")[0]}</button>
                    ))}
                  </div>
                  {crossFileCount>0 && (
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <div onClick={()=>setShowCrossFile(v=>!v)} style={{ width:28,height:14,borderRadius:7,background:showCrossFile?C.accent2:C.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0 }}>
                        <div style={{ position:"absolute",top:2,left:showCrossFile?14:2,width:10,height:10,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }}/>
                      </div>
                      <div style={{ fontSize:8,color:showCrossFile?C.accent2:C.muted }}>CROSS-FILE EDGES ({crossFileCount})</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Detail pane */}
          <div style={{ flex:1,overflowY:"auto",padding:"11px 12px" }}>
            {phase==="extracting"&&!graph&&fileEntries.length===0 && (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:180,gap:14 }}>
                <div style={{ width:34,height:34,borderRadius:"50%",border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,animation:"spin 0.9s linear infinite" }}/>
                <div style={{ fontSize:9,color:C.muted,letterSpacing:"0.15em" }}>EXTRACTING…</div>
              </div>
            )}

            {error && <div style={{ padding:"10px 12px",background:"#130808",border:`1px solid ${C.warn}33`,borderRadius:6,color:C.warn,fontSize:11,marginBottom:10 }}>{error}</div>}

            {selectedNode && phase==="done" && (
              <div>
                <div style={{ fontSize:8,letterSpacing:"0.2em",color:C.dim,marginBottom:8 }}>SELECTED NODE</div>
                <div style={{ background:C.bg, border:`1px solid ${TYPE_COLORS[selectedNode.type]||TYPE_COLORS.default}`, borderRadius:8, padding:"12px", marginBottom:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:7 }}>
                    <div style={{ background:`${TYPE_COLORS[selectedNode.type]||TYPE_COLORS.default}18`,color:TYPE_COLORS[selectedNode.type]||TYPE_COLORS.default,fontSize:7,letterSpacing:"0.15em",padding:"2px 7px",borderRadius:3 }}>{selectedNode.type?.toUpperCase()}</div>
                    {selectedNode.fileName && (
                      <div style={{ background:`${FILE_ACCENTS[selectedNode.fileIndex%FILE_ACCENTS.length]}15`,color:FILE_ACCENTS[selectedNode.fileIndex%FILE_ACCENTS.length],fontSize:7,letterSpacing:"0.1em",padding:"2px 7px",borderRadius:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110 }}>{selectedNode.fileName}</div>
                    )}
                  </div>
                  <div style={{ fontSize:13,fontWeight:"bold",color:C.text,marginBottom:5 }}>{selectedNode.name}</div>
                  <div style={{ fontSize:11,color:C.muted,lineHeight:1.65,marginBottom:8 }}>{selectedNode.description}</div>
                  {selectedNode.domain && <div style={{ fontSize:8,color:C.dim }}>DOMAIN: <span style={{ color:C.accent }}>{selectedNode.domain}</span></div>}
                  {selectedNode.tags?.length>0 && (
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:7 }}>
                      {selectedNode.tags.map(t=>(
                        <span key={t} style={{ background:C.panel,border:`1px solid ${C.border}`,borderRadius:3,padding:"2px 6px",fontSize:8,color:C.muted }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize:8,letterSpacing:"0.2em",color:C.dim,marginBottom:7 }}>CONNECTIONS</div>
                {graph?.edges.filter(e=>e.source===selectedNode.id||e.target===selectedNode.id).map((e,i)=>{
                  const otherId=e.source===selectedNode.id?e.target:e.source;
                  const other=graph.nodes.find(n=>n.id===otherId);
                  const dir=e.source===selectedNode.id?"→":"←";
                  return (
                    <div key={i} onClick={()=>setSelectedNode(other)} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 8px",marginBottom:4,background:C.bg,borderRadius:5,border:`1px solid ${e.type==="CROSS_FILE"?C.accent2+"44":C.border}`,cursor:"pointer" }}>
                      <span style={{ color:EDGE_COLORS[e.type]||"#445",fontSize:10 }}>{dir}</span>
                      <span style={{ fontSize:10,color:C.muted,flex:1 }}>{other?.name}</span>
                      <span style={{ fontSize:7,color:EDGE_COLORS[e.type]||"#445",background:`${EDGE_COLORS[e.type]||"#445"}18`,padding:"1px 5px",borderRadius:3,whiteSpace:"nowrap" }}>{e.type}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!selectedNode && graph?.insights && phase==="done" && (
              <div>
                <div style={{ fontSize:8,letterSpacing:"0.2em",color:C.dim,marginBottom:8 }}>KEY INSIGHTS</div>
                {graph.insights.slice(0,8).map((ins,i)=>(
                  <div key={i} style={{ padding:"8px 10px",marginBottom:6,background:C.bg,borderLeft:`3px solid ${C.accent}`,border:`1px solid ${C.border}`,borderRadius:"0 6px 6px 0",fontSize:10,color:C.muted,lineHeight:1.65 }}>
                    <span style={{ color:"#1e4a4a",marginRight:6 }}>{String(i+1).padStart(2,"0")}</span>{ins}
                  </div>
                ))}
                <div style={{ marginTop:8,fontSize:9,color:C.dim }}>← Click any node to explore</div>
              </div>
            )}

            {/* AI Query Panel */}
            {graph && phase==="done" && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                <button onClick={()=>setShowQueryPanel(v=>!v)} style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:`1px solid ${showQueryPanel?C.accent:C.border}`,borderRadius:6,padding:"7px 10px",cursor:"pointer",fontFamily:"monospace" }}>
                  <span style={{ fontSize:8,letterSpacing:"0.18em",color:showQueryPanel?C.accent:C.muted }}>✦ ASK THE GRAPH</span>
                  <span style={{ fontSize:9,color:C.dim }}>{showQueryPanel?"▲":"▼"}</span>
                </button>
                {showQueryPanel && (
                  <div style={{ marginTop:8 }}>
                    <textarea
                      value={queryText}
                      onChange={e=>setQueryText(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); handleQuery(); } }}
                      placeholder="Ask anything about the graph… e.g. 'Who are the key parties?' or 'What obligations does X have?'"
                      style={{ width:"100%",height:70,resize:"none",background:"#050510",border:`1px solid ${C.borderHi}`,borderRadius:6,color:"#8899bb",fontSize:10,lineHeight:1.6,padding:"8px 10px",fontFamily:"monospace",outline:"none",boxSizing:"border-box" }}
                    />
                    <button onClick={handleQuery} disabled={queryLoading||!queryText.trim()} style={{ width:"100%",marginTop:5,padding:"7px 0",background:(queryLoading||!queryText.trim())?C.panel:`${C.accent}20`,border:`1px solid ${(queryLoading||!queryText.trim())?C.border:C.accent}`,borderRadius:6,color:(queryLoading||!queryText.trim())?C.dim:C.accent,fontSize:9,fontFamily:"monospace",letterSpacing:"0.12em",cursor:(queryLoading||!queryText.trim())?"not-allowed":"pointer" }}>
                      {queryLoading?"◌ THINKING…":"▶ QUERY GRAPH  ↵"}
                    </button>
                    {queryResult && (
                      <div style={{ marginTop:8,padding:"10px 11px",background:`${C.accent}06`,border:`1px solid ${C.accent}33`,borderRadius:6,fontSize:10,color:C.muted,lineHeight:1.75,whiteSpace:"pre-wrap" }}>
                        <div style={{ fontSize:7,letterSpacing:"0.15em",color:C.accent,marginBottom:6 }}>GRAPH ANSWER</div>
                        {queryResult}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef}
          style={{ flex:1,position:"relative",overflow:"hidden",background:C.bg, cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Grid background */}
          <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(${C.border}88 1px,transparent 1px),linear-gradient(90deg,${C.border}88 1px,transparent 1px)`,backgroundSize:"42px 42px",opacity:0.3,pointerEvents:"none" }}/>

          {(phase==="extracting"||phase==="fusing") && (
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18,zIndex:2 }}>
              <div style={{ width:48,height:48,borderRadius:"50%",border:`2px solid ${C.border}`,borderTop:`2px solid ${phase==="fusing"?C.accent2:C.accent}`,animation:"spin 0.9s linear infinite" }}/>
              <div style={{ fontSize:10,color:C.muted,letterSpacing:"0.18em" }}>{phaseMsg||"PROCESSING…"}</div>
            </div>
          )}

          {graph && (
            <svg ref={svgRef} width={svgSize.w} height={svgSize.h}
              style={{ position:"absolute",inset:0,zIndex:1,userSelect:"none" }}
            >
              <defs>
                {Object.entries(EDGE_COLORS).map(([type,color])=>(
                  <marker key={type} id={`arr-${type}`} markerWidth="6" markerHeight="6" refX="14" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={color} opacity="0.8"/>
                  </marker>
                ))}
              </defs>

              {/* All graph elements inside a pan/zoom group */}
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {visibleEdges.map((edge,i)=>{
                  const s=positions[edge.source],t=positions[edge.target];
                  if(!s||!t) return null;
                  const color=EDGE_COLORS[edge.type]||"#6677aa";
                  const isHl=selectedNode&&(edge.source===selectedNode.id||edge.target===selectedNode.id);
                  const isDim=selectedNode&&!isHl;
                  const isCross=edge.type==="CROSS_FILE";
                  return (
                    <g key={i}>
                      <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke={color}
                        strokeWidth={isHl ? Math.max(1.5,(edge.strength||2)*0.8) : isCross ? 1.5 : 1}
                        strokeOpacity={isDim ? 0.06 : isHl ? 1 : isCross ? 0.6 : 0.55}
                        strokeDasharray={isCross?"6,4":undefined}
                        markerEnd={`url(#arr-${edge.type})`}
                      />
                      {isHl && (
                        <text x={(s.x+t.x)/2} y={(s.y+t.y)/2-6}
                          fill={color} fontSize={10/zoom} textAnchor="middle" opacity="0.9"
                          style={{ pointerEvents:"none" }}
                        >{edge.label||edge.type}</text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map(node=>{
                  const p=positions[node.id]; if(!p) return null;
                  const color=TYPE_COLORS[node.type]||TYPE_COLORS.default;
                  const fileColor=FILE_ACCENTS[(node.fileIndex||0)%FILE_ACCENTS.length];
                  const isSel=selectedNode?.id===node.id;
                  const isHov=hoveredNode===node.id;
                  const isDim=selectedNode&&!isSel&&!neighbors?.has(node.id);
                  const isNeighbor=selectedNode&&neighbors?.has(node.id);
                  const isCross=node.crossFile;
                  // Hub nodes (more connections) get bigger
                  const connCount = (graph?.edges||[]).filter(e=>e.source===node.id||e.target===node.id).length;
                  const r = isSel ? 22 : isNeighbor ? 18 : Math.min(18, 11 + connCount * 0.8);
                  const labelSize = Math.max(8, Math.min(11, 9/zoom + 2));
                  return (
                    <g key={node.id} transform={`translate(${p.x},${p.y})`}
                      style={{ cursor: dragState?.nodeId===node.id ? "grabbing" : "pointer" }}
                      onMouseDown={e=>{ e.stopPropagation(); handleMouseDown(e,node.id); }}
                      onClick={e=>{ e.stopPropagation(); setSelectedNode(isSel?null:node); }}
                      onMouseEnter={()=>setHoveredNode(node.id)}
                      onMouseLeave={()=>setHoveredNode(null)}
                    >
                      {/* Glow ring */}
                      {(isSel||isHov)&&<circle r={r+12} fill={color} opacity="0.08"/>}
                      {/* File color outer ring */}
                      {fileEntries.length>1&&<circle r={r+3} fill="none" stroke={fileColor} strokeWidth="1.8"
                        opacity={isDim?0.08:isCross?0.95:0.5} strokeDasharray={isCross?undefined:"4,3"}/>}
                      {/* Main circle */}
                      <circle r={r}
                        fill={isDim ? C.panel : color+(isSel?"ff":"dd")}
                        stroke={isSel?color:isDim?C.border:color+"77"}
                        strokeWidth={isSel?2.5:1.2}
                        opacity={isDim?0.18:1}
                        style={{ transition:"opacity 0.15s" }}
                      />
                      {/* Initial letter */}
                      <text dy="0.35em" textAnchor="middle"
                        fontSize={isSel?13:Math.max(9,r*0.65)} fontWeight="bold"
                        fill={C.bg} opacity={isDim?0.15:1}
                        style={{ userSelect:"none",pointerEvents:"none" }}
                      >{node.name?.[0]?.toUpperCase()||"?"}</text>
                      {/* Full name label below node — scales with zoom so it's always readable */}
                      <text dy={r+14/zoom} textAnchor="middle"
                        fontSize={Math.max(7, 10/zoom)}
                        fontWeight={isSel?"bold":"normal"}
                        fill={isDim?C.border:isSel?color:C.text}
                        opacity={isDim?0.2:1}
                        style={{ userSelect:"none",pointerEvents:"none" }}
                      >{node.name?.length>22?node.name.slice(0,21)+"…":node.name}</text>
                      {/* Type label on hover */}
                      {isHov&&!isSel&&(
                        <text dy={-r-8/zoom} textAnchor="middle"
                          fontSize={Math.max(6,8/zoom)}
                          fill={color} letterSpacing="0.08em"
                          style={{ userSelect:"none",pointerEvents:"none" }}
                        >{node.type?.toUpperCase()}</text>
                      )}
                      {/* Cross-file badge */}
                      {isCross&&!isSel&&<circle r={4} cx={r} cy={-r} fill={C.accent2} opacity={isDim?0.1:0.95}/>}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Zoom controls */}
          {graph && phase==="done" && (
            <div style={{ position:"absolute",bottom:14,left:14,display:"flex",flexDirection:"column",gap:4 }}>
              <button onClick={()=>setZoom(z=>Math.min(4,z*1.2))} style={{ width:30,height:30,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.text,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace" }}>+</button>
              <button onClick={()=>setZoom(1)} style={{ width:30,height:22,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.muted,fontSize:8,cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.05em" }}>{Math.round(zoom*100)}%</button>
              <button onClick={()=>setZoom(z=>Math.max(0.15,z*0.83))} style={{ width:30,height:30,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.text,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace" }}>−</button>
              <button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} style={{ width:30,height:30,borderRadius:6,background:C.panel,border:`1px solid ${C.border}`,color:C.muted,fontSize:9,cursor:"pointer",fontFamily:"monospace",marginTop:4 }} title="Reset view">⌖</button>
            </div>
          )}

          {/* Hint */}
          {graph && phase==="done" && (
            <div style={{ position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",background:`${C.panel}cc`,border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 12px",fontSize:9,color:C.muted,fontFamily:"monospace",pointerEvents:"none",backdropFilter:"blur(4px)" }}>
              scroll to zoom · drag canvas to pan · drag nodes to reposition
            </div>
          )}

          {/* Legend */}
          {graph && phase==="done" && (
            <div style={{ position:"absolute",bottom:14,right:14,background:`${C.panel}ee`,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 13px",backdropFilter:"blur(8px)",maxWidth:165 }}>
              <div style={{ fontSize:7,color:C.muted,letterSpacing:"0.15em",marginBottom:7 }}>EDGE TYPES</div>
              {Object.entries(EDGE_COLORS).slice(0,6).map(([type,color])=>(
                <div key={type} style={{ display:"flex",alignItems:"center",gap:7,marginBottom:4 }}>
                  <div style={{ width:14,height:1.5,background:color,opacity:0.85 }}/>
                  <span style={{ fontSize:7,color:type==="CROSS_FILE"?C.accent2:C.muted,letterSpacing:"0.07em" }}>{type}</span>
                </div>
              ))}
              {fileEntries.length>1 && (
                <>
                  <div style={{ fontSize:7,color:C.muted,letterSpacing:"0.15em",margin:"8px 0 6px" }}>SOURCE FILES</div>
                  {fileEntries.filter(e=>e.status==="done").slice(0,5).map((e,fi)=>(
                    <div key={e.id} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:FILE_ACCENTS[fi%FILE_ACCENTS.length],flexShrink:0 }}/>
                      <span style={{ fontSize:7,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name.length>16?e.name.slice(0,15)+"…":e.name}</span>
                    </div>
                  ))}
                  {fileEntries.length>5 && <div style={{ fontSize:7,color:C.muted }}>+{fileEntries.length-5} more</div>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT
   Privacy guarantee: App always initializes with null input and empty state.
   No context, memory, or prior session data is ever loaded.
   The InputScreen starts empty — the user must explicitly provide all content.
══════════════════════════════════════════════ */
export default function App() {
  // PRIVACY: input is always null at init — never pre-populated
  const [input, setInput] = useState(null);

  const handleReset = () => {
    // Full state wipe on reset — ensures no data bleeds between sessions
    setInput(null);
  };

  return input
    ? <GraphScreen input={input} onReset={handleReset} />
    : <InputScreen onReady={setInput} />;
}