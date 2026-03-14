import { useState, useEffect, useMemo, createContext, useContext } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Project = {
  name: string; dept: string; health: "Green"|"Yellow"|"Red";
  priority: "High"|"Medium"|"Low"; phase: string; budget: number;
  pm: string; risk: string; rgt: string; vp: string; bp: string;
  start: string; end: string;
};

type Role = "executive" | "pm" | "viewer";

type User = {
  email: string;
  name: string;
  role: Role;
  password: string;
  dept?: string; // PMs only see their dept
};

// ─── ACCESS CONTROL CONFIG ───────────────────────────────────────────────────
// To add/remove users, edit this list. In production, replace with a real auth service.
const USERS: User[] = [
  { email: "admin@pharma.com",       name: "Admin User",        role: "executive", password: "admin123" },
  { email: "executive@pharma.com",   name: "VP Leadership",     role: "executive", password: "exec2026" },
  { email: "sarah@pharma.com",       name: "Sarah O'Neill",     role: "pm",        password: "pm2026", dept: "Enterprise PMO" },
  { email: "mark@pharma.com",        name: "Mark Thompson",     role: "pm",        password: "pm2026", dept: "CMC / Manufacturing" },
  { email: "viewer@pharma.com",      name: "Guest Viewer",      role: "viewer",    password: "view2026" },
];

const ROLE_PERMISSIONS: Record<Role, { pages: string[]; label: string; color: string }> = {
  executive: { pages: ["executive","department","pm","bp","budget","projects"], label: "Executive",     color: "#1e40af" },
  pm:        { pages: ["executive","department","projects"],                    label: "Project Manager", color: "#7c3aed" },
  viewer:    { pages: ["executive","projects"],                                 label: "Viewer",          color: "#0891b2" },
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext<{
  user: User|null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}>({ user: null, login: () => false, logout: () => {} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(() => {
    const saved = sessionStorage.getItem("it_dashboard_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, password: string): boolean => {
    const found = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (found) {
      setUser(found);
      sessionStorage.setItem("it_dashboard_user", JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("it_dashboard_user");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ─── GOOGLE SHEETS CONFIG ─────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Upload your CSV data to Google Sheets
// 2. File → Share → Publish to web → Sheet1 → CSV format → Publish
// 3. Copy the URL and paste it below as SHEET_CSV_URL
// 4. The dashboard will fetch live data from Google Sheets on every load
const SHEET_CSV_URL = import.meta.env.VITE_SHEET_URL || "";
// In your .env file add: VITE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/pub?output=csv

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HEALTH_COLOR: Record<string,string> = { Green:"#22c55e", Yellow:"#f59e0b", Red:"#ef4444" };
const HEALTH_BG:    Record<string,string> = { Green:"#dcfce7", Yellow:"#fef9c3", Red:"#fee2e2" };
const HEALTH_TEXT:  Record<string,string> = { Green:"#166534", Yellow:"#713f12", Red:"#7f1d1d" };
const PRI_COLOR:    Record<string,string> = { High:"#7c3aed", Medium:"#2563eb", Low:"#0891b2" };
const RGT_COLOR:    Record<string,string> = { Run:"#6366f1", Grow:"#10b981", Transform:"#f97316" };
const RISK_COLOR:   Record<string,string> = { High:"#dc2626", Medium:"#d97706", Low:"#16a34a" };

const PHASE_ORDER = ["Discovery","Planning","Execution","Validation","Closeout"];

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text: string): Project[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g,""));
    const row: any = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return {
      name:     row["Project Name"]           || "",
      dept:     row["Department"]             || "",
      health:   row["Health Status"]          || "Green",
      priority: row["Priority"]               || "Low",
      phase:    row["Project Phase"]          || "",
      budget:   parseFloat(row["High Level Budget ($M)"] || "0"),
      pm:       row["Project Manager"]        || "",
      risk:     row["Risk Level"]             || "",
      rgt:      row["Run/Grow/Transform"]     || "",
      vp:       row["VP Sponsor"]             || "",
      bp:       row["IT Business Partner"]    || "",
      start:    row["Estimated Start Date"]   || "",
      end:      row["Estimated End Date"]     || "",
    } as Project;
  }).filter(p => p.name);
}

// ─── FALLBACK DATA (your original CSV data) ───────────────────────────────────
const FALLBACK_DATA: Project[] = [
  {name:"siRNA Liver Targeting Platform Expansion",dept:"Enterprise PMO",health:"Green",priority:"Low",phase:"Validation",budget:37.7,pm:"Sarah O'Neill",risk:"High",rgt:"Transform",vp:"Laura Donovan",bp:"Soojin Lee",start:"2025-10-04",end:"2027-12-16"},
  {name:"Neuromuscular Rare Disease IND-Enabling Program",dept:"Research",health:"Green",priority:"Low",phase:"Validation",budget:26.9,pm:"Amit Patel",risk:"Medium",rgt:"Transform",vp:"Sanjay Grant",bp:"Nicole Foster",start:"2025-12-29",end:"2026-09-02"},
  {name:"First-in-Human Safety Study – Rare Genetic Disorder",dept:"CMC / Manufacturing",health:"Red",priority:"Medium",phase:"Validation",budget:99.8,pm:"Hannah Lewis",risk:"High",rgt:"Run",vp:"Sophia Stein",bp:"David Park",start:"2025-03-05",end:"2027-05-28"},
  {name:"Dose Optimization Study for RNA Therapeutic",dept:"Preclinical Development",health:"Yellow",priority:"Medium",phase:"Planning",budget:50.7,pm:"Mark Thompson",risk:"Medium",rgt:"Grow",vp:"James Martinez",bp:"Soojin Lee",start:"2025-01-02",end:"2027-04-19"},
  {name:"Global Pivotal Trial – Orphan Indication",dept:"Regulatory Affairs",health:"Yellow",priority:"High",phase:"Execution",budget:85.9,pm:"Amit Patel",risk:"Medium",rgt:"Transform",vp:"Matthew Porter",bp:"Arjun Mehta",start:"2025-04-20",end:"2027-08-06"},
  {name:"NDA Submission Readiness Program",dept:"Enterprise PMO",health:"Red",priority:"Medium",phase:"Validation",budget:97.3,pm:"Mark Thompson",risk:"Low",rgt:"Transform",vp:"Maya Donovan",bp:"David Park",start:"2025-03-21",end:"2027-07-02"},
  {name:"Electronic Lab Notebook Global Rollout",dept:"IT & Digital",health:"Red",priority:"High",phase:"Closeout",budget:107.6,pm:"Sarah O'Neill",risk:"Medium",rgt:"Grow",vp:"Alexandra Rosen",bp:"Paul Donovan",start:"2025-11-15",end:"2028-03-13"},
  {name:"Clinical Data Standards Harmonization Program",dept:"Enterprise PMO",health:"Yellow",priority:"Medium",phase:"Execution",budget:116.1,pm:"Emily Chen",risk:"Low",rgt:"Transform",vp:"Andrew Patel",bp:"Anjali Rao",start:"2025-07-16",end:"2027-11-15"},
  {name:"IT Disaster Recovery & Business Continuity Validation",dept:"Supply Chain",health:"Green",priority:"High",phase:"Validation",budget:115.4,pm:"Hannah Lewis",risk:"Medium",rgt:"Grow",vp:"Sanjay Mukherjee",bp:"Kenji Tanaka",start:"2025-08-27",end:"2027-11-30"},
  {name:"Manufacturing Capacity Optimization – Near-Term Demand",dept:"CMC / Manufacturing",health:"Red",priority:"High",phase:"Execution",budget:99.5,pm:"Priyanka Shah",risk:"High",rgt:"Run",vp:"Elena Nguyen",bp:"Monica Reyes",start:"2026-05-21",end:"2026-11-23"},
  {name:"GxP Data Integrity Remediation Program",dept:"Enterprise PMO",health:"Yellow",priority:"Medium",phase:"Discovery",budget:118.9,pm:"Hannah Lewis",risk:"Low",rgt:"Grow",vp:"Elena Mukherjee",bp:"David Park",start:"2026-04-28",end:"2028-06-21"},
  {name:"R&D Advanced Analytics Data Platform",dept:"Preclinical Development",health:"Green",priority:"Low",phase:"Execution",budget:65.6,pm:"Robert Kim",risk:"Medium",rgt:"Grow",vp:"Daniel Rosen",bp:"Victor Gomez",start:"2025-01-16",end:"2025-08-04"},
  {name:"Digital Biomarker Validation Study",dept:"Preclinical Development",health:"Green",priority:"Medium",phase:"Validation",budget:64.7,pm:"Mark Thompson",risk:"Medium",rgt:"Transform",vp:"James Bennett",bp:"Arjun Mehta",start:"2026-02-23",end:"2027-09-08"},
  {name:"Commercial Manufacturing Tech Transfer to CMO",dept:"Supply Chain",health:"Yellow",priority:"High",phase:"Execution",budget:37.3,pm:"Sarah O'Neill",risk:"Medium",rgt:"Transform",vp:"Michael Alvarez",bp:"Anjali Rao",start:"2025-03-25",end:"2027-04-29"},
  {name:"Global Serialization Compliance Program",dept:"Clinical Development",health:"Green",priority:"Low",phase:"Closeout",budget:48.8,pm:"Carlos Ramirez",risk:"High",rgt:"Transform",vp:"Christopher Choi",bp:"Soojin Lee",start:"2026-01-19",end:"2028-05-07"},
  {name:"Vendor Risk Management Framework Implementation",dept:"Commercial",health:"Green",priority:"Medium",phase:"Validation",budget:69.6,pm:"Lina Alvarez",risk:"Medium",rgt:"Grow",vp:"Kavita Alvarez",bp:"Fatima Hassan",start:"2026-03-21",end:"2028-03-15"},
  {name:"Enterprise Quality Event Management Modernization",dept:"CMC / Manufacturing",health:"Yellow",priority:"High",phase:"Planning",budget:49.6,pm:"Lina Alvarez",risk:"Medium",rgt:"Grow",vp:"Lena Shah",bp:"Brian McCarthy",start:"2026-04-09",end:"2027-08-23"},
  {name:"Enterprise Portfolio & Capacity Management Implementation",dept:"CMC / Manufacturing",health:"Green",priority:"Medium",phase:"Validation",budget:66.8,pm:"Jason Wu",risk:"High",rgt:"Grow",vp:"Thomas Morales",bp:"David Park",start:"2026-03-04",end:"2027-05-23"},
  {name:"Commercial Forecasting & Demand Planning Refresh",dept:"IT & Digital",health:"Red",priority:"High",phase:"Execution",budget:24.9,pm:"Carlos Ramirez",risk:"High",rgt:"Transform",vp:"Rahul Grant",bp:"Soojin Lee",start:"2026-03-16",end:"2027-01-07"},
  {name:"Longitudinal Patient Registry – Rare Disease",dept:"Clinical Development",health:"Yellow",priority:"Low",phase:"Planning",budget:32.0,pm:"Carlos Ramirez",risk:"High",rgt:"Transform",vp:"Christopher Patel",bp:"Victor Gomez",start:"2025-11-21",end:"2028-05-09"},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pct   = (n:number,d:number) => d===0 ? 0 : Math.round((n/d)*100);
const fmt$  = (v:number) => `$${v.toFixed(1)}M`;
const count = (arr:Project[], key:keyof Project, val:string) => arr.filter(p=>p[key]===val).length;
const sumBudget = (arr:Project[]) => arr.reduce((s,p)=>s+p.budget,0);
function groupBy<T>(arr:T[], fn:(x:T)=>string): Record<string,T[]> {
  return arr.reduce((acc,x)=>{ const k=fn(x); (acc[k]??=[]).push(x); return acc; },{} as Record<string,T[]>);
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Badge = ({label,color,bg,text}:{label:string;color:string;bg:string;text:string}) => (
  <span style={{background:bg,color:text,border:`1px solid ${color}`}}
    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold">{label}</span>
);

const KpiCard = ({label,value,sub,accent}:{label:string;value:string|number;sub?:string;accent:string}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-1 hover:shadow-md transition-shadow">
    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
    <div className="text-3xl font-black" style={{color:accent}}>{value}</div>
    {sub && <div className="text-xs text-slate-500">{sub}</div>}
  </div>
);

const ChartTip = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-sm">
      <div className="font-bold text-slate-700 mb-1">{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{color:p.color}} className="flex gap-2">
          <span>{p.name}:</span>
          <span className="font-semibold">{typeof p.value==='number'&&p.value>50?fmt$(p.value):p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const ok = login(email, password);
      if (!ok) setError("Invalid email or password. Please try again.");
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center mb-4 shadow-xl">
            <span className="text-white text-2xl font-black">IT</span>
          </div>
          <h1 className="text-2xl font-black text-white">IT Portfolio Dashboard</h1>
          <p className="text-blue-300 text-sm mt-1">InsightBridge · Pharma · Capstone 2026</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder="you@pharma.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-sm" />
            </div>
            <div>
              <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider block mb-1.5">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-sm" />
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg mt-2">
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-blue-300 text-xs font-semibold mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs text-white/60">
              <div className="flex justify-between"><span>admin@pharma.com</span><span className="text-white/40">admin123 · Executive</span></div>
              <div className="flex justify-between"><span>sarah@pharma.com</span><span className="text-white/40">pm2026 · PM View</span></div>
              <div className="flex justify-between"><span>viewer@pharma.com</span><span className="text-white/40">view2026 · Read Only</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EXECUTIVE VIEW ───────────────────────────────────────────────────────────
function ExecutiveView({data}:{data:Project[]}) {
  const total   = data.length;
  const red     = count(data,"health","Red");
  const high    = count(data,"priority","High");
  const budget  = sumBudget(data);
  const closeout= count(data,"phase","Closeout");

  const healthData = ["Green","Yellow","Red"].map(h=>({name:h,value:count(data,"health",h)}));
  const rgtData    = ["Run","Grow","Transform"].map(r=>({name:r,value:count(data,"rgt",r)}));
  const phaseData  = PHASE_ORDER.map(ph=>({name:ph,count:count(data,"phase",ph)}));
  const deptBudget = Object.entries(groupBy(data,p=>p.dept))
    .map(([dept,ps])=>({dept,budget:Math.round(sumBudget(ps))}))
    .sort((a,b)=>b.budget-a.budget);
  const riskData   = ["High","Medium","Low"].map(r=>({name:r,value:count(data,"risk",r)}));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Projects"  value={total}        sub="Active portfolio"               accent="#1e40af"/>
        <KpiCard label="Total Budget"    value={fmt$(budget)} sub="Portfolio investment"            accent="#0891b2"/>
        <KpiCard label="At Risk (Red)"   value={red}          sub={`${pct(red,total)}% of portfolio`}  accent="#dc2626"/>
        <KpiCard label="High Priority"   value={high}         sub={`${pct(high,total)}% of portfolio`} accent="#7c3aed"/>
        <KpiCard label="Completed"       value={closeout}     sub="Closeout phase"                 accent="#16a34a"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {title:"Portfolio Health (RAG)", data:healthData, colors:["#22c55e","#f59e0b","#ef4444"]},
          {title:"Strategic Mix (Run/Grow/Transform)", data:rgtData, colors:["#6366f1","#10b981","#f97316"]},
          {title:"Risk Distribution", data:riskData, colors:["#dc2626","#d97706","#16a34a"]},
        ].map(({title,data:d,colors})=>(
          <div key={title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={d} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {d.map((e,i)=><Cell key={e.name} fill={colors[i]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Budget by Department ($M)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptBudget} layout="vertical" margin={{left:10,right:20}}>
              <XAxis type="number" tickFormatter={v=>`$${v}M`} tick={{fontSize:10}}/>
              <YAxis type="category" dataKey="dept" width={130} tick={{fontSize:10}}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Projects by Phase</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={phaseData}>
              <XAxis dataKey="name" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip/>
              <Bar dataKey="count" name="Projects" radius={[4,4,0,0]}>
                {phaseData.map((_,i)=><Cell key={i} fill={["#6366f1","#8b5cf6","#a855f7","#c084fc","#e879f9"][i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT TABLE ────────────────────────────────────────────────────────────
function ProjectTable({projects,title}:{projects:Project[];title:string}) {
  const [search, setSearch]   = useState("");
  const [hf, setHf]           = useState("All");
  const [pf, setPf]           = useState("All");

  const filtered = useMemo(()=>projects.filter(p=>{
    const s = search.toLowerCase();
    return (!s||p.name.toLowerCase().includes(s)||p.pm.toLowerCase().includes(s)||p.dept.toLowerCase().includes(s))
        && (hf==="All"||p.health===hf)
        && (pf==="All"||p.priority===pf);
  }),[projects,search,hf,pf]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <span className="font-bold text-slate-700 flex-1">{title}</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400"/>
        <select value={hf} onChange={e=>setHf(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
          {["All","Green","Yellow","Red"].map(h=><option key={h}>{h}</option>)}
        </select>
        <select value={pf} onChange={e=>setPf(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
          {["All","High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            {["Project","Department","Health","Priority","Phase","Budget","PM","Risk","RGT"].map(h=>(
              <th key={h} className="text-left p-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((p,i)=>(
              <tr key={i} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i%2===0?"bg-white":"bg-slate-50/20"}`}>
                <td className="p-3 font-medium text-slate-800 max-w-48 truncate" title={p.name}>{p.name}</td>
                <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{p.dept}</td>
                <td className="p-3"><Badge label={p.health} color={HEALTH_COLOR[p.health]} bg={HEALTH_BG[p.health]} text={HEALTH_TEXT[p.health]}/></td>
                <td className="p-3"><span className="text-xs font-semibold" style={{color:PRI_COLOR[p.priority]}}>{p.priority}</span></td>
                <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{p.phase}</td>
                <td className="p-3 text-slate-700 font-mono text-xs whitespace-nowrap">{fmt$(p.budget)}</td>
                <td className="p-3 text-slate-600 text-xs whitespace-nowrap">{p.pm}</td>
                <td className="p-3"><span className="text-xs font-semibold" style={{color:RISK_COLOR[p.risk]}}>{p.risk}</span></td>
                <td className="p-3"><span className="text-xs font-semibold" style={{color:RGT_COLOR[p.rgt]}}>{p.rgt}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div className="p-10 text-center text-slate-400 text-sm">No projects match your filters.</div>}
      </div>
    </div>
  );
}

// ─── DEPARTMENT VIEW ──────────────────────────────────────────────────────────
function DepartmentView({data}:{data:Project[]}) {
  const [selected, setSelected] = useState("All");
  const depts = ["All",...Array.from(new Set(data.map(p=>p.dept))).sort()];
  const filtered = selected==="All" ? data : data.filter(p=>p.dept===selected);
  const deptStats = Object.entries(groupBy(data,p=>p.dept))
    .map(([dept,ps])=>({dept,total:ps.length,red:count(ps,"health","Red"),green:count(ps,"health","Green"),yellow:count(ps,"health","Yellow"),budget:sumBudget(ps)}))
    .sort((a,b)=>b.total-a.total);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {depts.map(d=>(
          <button key={d} onClick={()=>setSelected(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selected===d?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
            {d}
          </button>
        ))}
      </div>
      {selected==="All" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deptStats.map(d=>(
            <div key={d.dept} onClick={()=>setSelected(d.dept)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-slate-800">{d.dept}</div>
                  <div className="text-xs text-slate-400">{d.total} projects · {fmt$(d.budget)}</div>
                </div>
                <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{d.total}</div>
              </div>
              <div className="flex gap-3 mb-2">
                {[["Green",d.green],["Yellow",d.yellow],["Red",d.red]].map(([h,v])=>(
                  <div key={h} className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full inline-block" style={{background:HEALTH_COLOR[h as string]}}/>
                    <span className="text-slate-600">{v}</span>
                  </div>
                ))}
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                <div style={{width:`${pct(d.green,d.total)}%`,background:HEALTH_COLOR.Green}}/>
                <div style={{width:`${pct(d.yellow,d.total)}%`,background:HEALTH_COLOR.Yellow}}/>
                <div style={{width:`${pct(d.red,d.total)}%`,background:HEALTH_COLOR.Red}}/>
              </div>
            </div>
          ))}
        </div>
      ) : <ProjectTable projects={filtered} title={`${selected} — ${filtered.length} Projects`}/>}
    </div>
  );
}

// ─── PM VIEW ─────────────────────────────────────────────────────────────────
function PMView({data}:{data:Project[]}) {
  const [selected, setSelected] = useState("All");
  const pms = ["All",...Array.from(new Set(data.map(p=>p.pm))).sort()];
  const filtered = selected==="All" ? data : data.filter(p=>p.pm===selected);
  const pmStats = Object.entries(groupBy(data,p=>p.pm))
    .map(([pm,ps])=>({pm,total:ps.length,red:count(ps,"health","Red"),green:count(ps,"health","Green"),yellow:count(ps,"health","Yellow"),budget:sumBudget(ps)}))
    .sort((a,b)=>b.total-a.total);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {pms.map(pm=>(
          <button key={pm} onClick={()=>setSelected(pm)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selected===pm?"bg-purple-600 text-white border-purple-600":"bg-white text-slate-600 border-slate-200 hover:border-purple-300"}`}>
            {pm}
          </button>
        ))}
      </div>
      {selected==="All" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["PM","Projects","🟢","🟡","🔴","Budget","Health"].map(h=>(
                <th key={h} className="text-left p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pmStats.map((pm,i)=>(
                <tr key={pm.pm} onClick={()=>setSelected(pm.pm)}
                  className={`border-b border-slate-50 cursor-pointer hover:bg-purple-50 ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                  <td className="p-3 font-semibold text-slate-700">{pm.pm}</td>
                  <td className="p-3 text-center font-bold">{pm.total}</td>
                  <td className="p-3 text-center text-green-600 font-semibold">{pm.green}</td>
                  <td className="p-3 text-center text-yellow-600 font-semibold">{pm.yellow}</td>
                  <td className="p-3 text-center text-red-600 font-semibold">{pm.red}</td>
                  <td className="p-3 text-slate-600">{fmt$(pm.budget)}</td>
                  <td className="p-3 w-32">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{width:`${pct(pm.green,pm.total)}%`,background:HEALTH_COLOR.Green}}/>
                      <div style={{width:`${pct(pm.yellow,pm.total)}%`,background:HEALTH_COLOR.Yellow}}/>
                      <div style={{width:`${pct(pm.red,pm.total)}%`,background:HEALTH_COLOR.Red}}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <ProjectTable projects={filtered} title={`${selected} — ${filtered.length} Projects`}/>}
    </div>
  );
}

// ─── BUDGET VIEW ──────────────────────────────────────────────────────────────
function BudgetView({data}:{data:Project[]}) {
  const total = sumBudget(data);
  const byDept = Object.entries(groupBy(data,p=>p.dept))
    .map(([name,ps])=>({name,budget:Math.round(sumBudget(ps))})).sort((a,b)=>b.budget-a.budget);
  const byPriority = ["High","Medium","Low"].map(p=>({name:p,budget:Math.round(sumBudget(data.filter(d=>d.priority===p)))}));
  const byRGT      = ["Run","Grow","Transform"].map(r=>({name:r,budget:Math.round(sumBudget(data.filter(d=>d.rgt===r)))}));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Portfolio Budget" value={fmt$(total)} sub={`${data.length} projects`} accent="#0891b2"/>
        <KpiCard label="Avg Budget/Project" value={fmt$(total/data.length)} sub="mean investment" accent="#7c3aed"/>
        <KpiCard label="Largest Dept" value={fmt$(byDept[0]?.budget||0)} sub={byDept[0]?.name} accent="#f97316"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Budget by Department ($M)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDept} layout="vertical">
              <XAxis type="number" tickFormatter={v=>`$${v}M`} tick={{fontSize:10}}/>
              <YAxis type="category" dataKey="name" width={130} tick={{fontSize:10}}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          {[{title:"Budget by Priority",data:byPriority,colors:Object.values(PRI_COLOR)},
            {title:"Budget by Run/Grow/Transform",data:byRGT,colors:Object.values(RGT_COLOR)}].map(({title,data:d,colors})=>(
            <div key={title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={d}>
                  <XAxis dataKey="name" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="budget" name="Budget" radius={[4,4,0,0]}>
                    {d.map((_,i)=><Cell key={i} fill={colors[i]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const ALL_PAGES = [
  {id:"executive",  label:"Executive View",       icon:"◎", roles:["executive","pm","viewer"]},
  {id:"department", label:"Department Drill-Down", icon:"⬡", roles:["executive","pm"]},
  {id:"pm",         label:"Project Manager",       icon:"👤", roles:["executive"]},
  {id:"budget",     label:"Financial Summary",     icon:"💰", roles:["executive"]},
  {id:"projects",   label:"All Projects",          icon:"≡", roles:["executive","pm","viewer"]},
];

function Dashboard({allData}:{allData:Project[]}) {
  const { user, logout } = useAuth();
  const [page, setPage]           = useState("executive");
  const [deptF, setDeptF]         = useState("All");
  const [priF,  setPriF]          = useState("All");
  const [healthF, setHealthF]     = useState("All");
  const [dataSource, setDataSource] = useState<"live"|"fallback">("fallback");

  const role = user!.role;
  const perms = ROLE_PERMISSIONS[role];
  const visiblePages = ALL_PAGES.filter(p => perms.pages.includes(p.id));

  // Auto-scope PM users to their department
  const baseData = useMemo(() => {
    if (role === "pm" && user?.dept) return allData.filter(p => p.dept === user.dept);
    return allData;
  }, [allData, role, user]);

  const data = useMemo(() => baseData.filter(p =>
    (deptF==="All"||p.dept===deptF) &&
    (priF==="All"||p.priority===priF) &&
    (healthF==="All"||p.health===healthF)
  ), [baseData, deptF, priF, healthF]);

  const depts = ["All", ...Array.from(new Set(baseData.map(p=>p.dept))).sort()];
  const atRisk = count(data,"health","Red");

  // Ensure page is visible for this role
  if (!perms.pages.includes(page)) setPage("executive");

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white text-xs font-black">IT</span>
            </div>
            <div>
              <div className="font-black text-slate-800 text-sm leading-none">IT Portfolio Dashboard</div>
              <div className="text-xs text-slate-400 mt-0.5">Pharma · InsightBridge Team 2</div>
            </div>
          </div>
          <div className="flex-1"/>
          {/* Global Filters */}
          <div className="hidden md:flex items-center gap-2">
            <select value={deptF} onChange={e=>setDeptF(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white">
              {depts.map(d=><option key={d}>{d}</option>)}
            </select>
            <select value={priF} onChange={e=>setPriF(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white">
              {["All","High","Medium","Low"].map(p=><option key={p}>Priority: {p}</option>)}
            </select>
            <select value={healthF} onChange={e=>setHealthF(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white">
              {["All","Green","Yellow","Red"].map(h=><option key={h}>Health: {h}</option>)}
            </select>
            {(deptF!=="All"||priF!=="All"||healthF!=="All")&&(
              <button onClick={()=>{setDeptF("All");setPriF("All");setHealthF("All");}}
                className="text-red-500 hover:text-red-700 font-semibold px-2 py-1.5 border border-red-200 rounded-lg text-xs">✕</button>
            )}
          </div>
          {/* Status + user */}
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${atRisk>0?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>
            {atRisk>0?`⚠ ${atRisk} At Risk`:"✓ Healthy"}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-700">{user!.name}</div>
              <div className="text-xs px-1.5 rounded font-semibold" style={{color:perms.color}}>{perms.label}</div>
            </div>
            <button onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
              Sign Out
            </button>
          </div>
        </div>
        {/* Nav tabs */}
        <div className="max-w-screen-xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {visiblePages.map(pg=>(
            <button key={pg.id} onClick={()=>setPage(pg.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                page===pg.id?"border-blue-600 text-blue-700 bg-blue-50/50":"border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
              <span className="mr-1.5">{pg.icon}</span>{pg.label}
            </button>
          ))}
          {dataSource==="live"&&(
            <div className="ml-auto flex items-center text-xs text-green-600 font-semibold px-3 py-2.5">
              ● Live from Google Sheets
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {page==="executive"  && <ExecutiveView  data={data}/>}
        {page==="department" && <DepartmentView data={data}/>}
        {page==="pm"         && <PMView         data={data}/>}
        {page==="budget"     && <BudgetView     data={data}/>}
        {page==="projects"   && <ProjectTable   projects={data} title={`All Projects — ${data.length} total`}/>}
      </main>

      <footer className="text-center text-xs text-slate-300 py-6">
        IT Portfolio Dashboard · InsightBridge Team 2 · Capstone 2025–2026
      </footer>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function AppInner() {
  const { user } = useAuth();
  const [data, setData]       = useState<Project[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(false);
  const [sheetError, setSheetError] = useState("");

  useEffect(() => {
    if (!SHEET_CSV_URL) return;
    setLoading(true);
    fetch(SHEET_CSV_URL)
      .then(r => { if (!r.ok) throw new Error("Failed to fetch"); return r.text(); })
      .then(csv => { setData(parseCSV(csv)); setLoading(false); })
      .catch(() => { setSheetError("Could not load Google Sheets. Using local data."); setLoading(false); });
  }, []);

  if (!user) return <LoginPage/>;
  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-blue-300 text-sm">Loading live data…</p>
      </div>
    </div>
  );

  return (
    <>
      {sheetError && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs text-center py-2 px-4">
          ⚠ {sheetError}
        </div>
      )}
      <Dashboard allData={data}/>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppInner/></AuthProvider>;
}
