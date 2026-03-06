"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, getLeads, upsertLead, insertLead, deleteLead as dbDelete, subscribeToLeads } from "../lib/supabase";

// ── Constants ────────────────────────────────────────────────────────────────
// (Statuses, categories, packages, scoring, inventory, templates — identical
//  to the artifact version. Keeping them here so this file is self-contained.)

const STATUSES = ["New","Contacted","Qualified","Proposal Sent","Negotiation","Closed Won","Closed Lost","On Hold"];
const CATEGORIES = ["Sports Equipment","Restaurant","Healthcare","Financial Services","Automotive","Home Services","Education","Real Estate","Legal","Insurance","Fitness","Retail","Tech Services","Pet Services","Entertainment"];
const PACKAGES = ["Platinum","Gold","Silver","Community","Tournament","Custom"];
const SIZES = ["Small","Medium","Large"];

const STATUS_COLORS = {
  "New":{bg:"#EBF5FF",text:"#1E60A0",dot:"#3B82F6"},
  "Contacted":{bg:"#FFF7ED",text:"#9A5B13",dot:"#F59E0B"},
  "Qualified":{bg:"#F0FDF4",text:"#166534",dot:"#22C55E"},
  "Proposal Sent":{bg:"#F5F3FF",text:"#5B21B6",dot:"#8B5CF6"},
  "Negotiation":{bg:"#FFF1F2",text:"#9F1239",dot:"#F43F5E"},
  "Closed Won":{bg:"#DCFCE7",text:"#14532D",dot:"#16A34A"},
  "Closed Lost":{bg:"#FEE2E2",text:"#7F1D1D",dot:"#DC2626"},
  "On Hold":{bg:"#F3F4F6",text:"#374151",dot:"#6B7280"},
};

const CATEGORY_SCORES = { "Sports Equipment":10, "Restaurant":8, "Healthcare":9, "Financial Services":8, "Automotive":7, "Home Services":7, "Education":9, "Real Estate":7, "Legal":5, "Insurance":6, "Fitness":8, "Retail":6, "Tech Services":5, "Pet Services":6, "Entertainment":7 };

function scoreLead(lead) {
  let s = 0;
  s += (CATEGORY_SCORES[lead.category] || 5) * 3;
  s += lead.proximity <= 2 ? 25 : lead.proximity <= 5 ? 20 : lead.proximity <= 10 ? 15 : 10;
  s += lead.size === "Large" ? 20 : lead.size === "Medium" ? 15 : 10;
  s += lead.sponsor === "Yes" ? 15 : lead.sponsor === "Unknown" ? 7 : 0;
  if (["Sports Equipment","Healthcare","Education","Financial Services","Fitness"].includes(lead.category)) s += 10;
  return Math.min(s, 100);
}

const INVENTORY = {
  scoreboard: [
    { name:"Full-Screen Takeover", desc:"Full scoreboard during intermissions & timeouts", season:"$3,000–$5,000", tournament:"$750–$1,500/event", slots:3, tier:"Platinum/Gold" },
    { name:"Premium Rotation", desc:"High-frequency rotation during play", season:"$2,000–$3,500", tournament:"$500–$1,000/event", slots:5, tier:"Gold/Silver" },
    { name:"Standard Rotation", desc:"Regular rotation cycle", season:"$1,500–$2,500", tournament:"$400–$750/event", slots:8, tier:"Silver" },
    { name:"Scoring Play Sponsor", desc:"Logo on every goal/assist graphic", season:"$2,000–$3,000", tournament:"Included", slots:2, tier:"Platinum/Gold" },
    { name:"Clock Sponsor", desc:"Logo permanently beside game clock", season:"$3,500–$5,000", tournament:"N/A", slots:1, tier:"Platinum" },
    { name:"Community Ticker", desc:"Scrolling logo/text bar", season:"$500–$1,000", tournament:"$200–$400/event", slots:12, tier:"Community" },
  ],
  physical: [
    { name:"Dasher Boards — Center Ice", desc:"Premium panel at center ice, camera-facing", season:"$4,000–$6,000", tournament:"$1,500–$2,500/event", slots:2, tier:"Platinum" },
    { name:"Dasher Boards — Blue Line", desc:"Panels at blue line positions", season:"$2,500–$4,000", tournament:"$800–$1,500/event", slots:4, tier:"Gold" },
    { name:"Dasher Boards — End Zone", desc:"Panels behind goal areas", season:"$1,500–$2,500", tournament:"$500–$1,000/event", slots:4, tier:"Silver" },
    { name:"Zamboni Wrap", desc:"Full or partial vehicle wrap", season:"$3,000–$5,000", tournament:"N/A", slots:1, tier:"Platinum/Gold" },
    { name:"Penalty Box Panels", desc:"Branded panels on penalty box", season:"$1,000–$2,000", tournament:"$300–$600/event", slots:2, tier:"Silver" },
    { name:"Lobby Banner", desc:"Large banner in arena entrance", season:"$1,500–$2,500", tournament:"$500–$1,000/event", slots:3, tier:"Gold/Silver" },
    { name:"Concession Area", desc:"Signage near concession stand", season:"$1,000–$2,000", tournament:"$300–$600/event", slots:4, tier:"Silver/Community" },
  ],
  digital: [
    { name:"Live Stream Presenting Sponsor", desc:"\"Broadcast brought to you by...\"", season:"$2,000–$4,000", tournament:"$750–$1,500/event", slots:1, tier:"Platinum" },
    { name:"Stream Overlay Ads", desc:"Rotating logo in stream overlay", season:"$500–$1,500", tournament:"$200–$500/event", slots:6, tier:"All tiers" },
    { name:"Highlight Reel Sponsor", desc:"\"Highlights brought to you by...\"", season:"$1,000–$2,500", tournament:"Included", slots:2, tier:"Platinum/Gold" },
    { name:"Branded Social Posts", desc:"Sponsored content on social channels", season:"$200–$500/post", tournament:"$200–$500/post", slots:20, tier:"All tiers" },
    { name:"Player Feature Series", desc:"\"Senior Spotlight by [Sponsor]\"", season:"$1,500–$3,000", tournament:"N/A", slots:1, tier:"Platinum" },
  ],
  naming: [
    { name:"Arena Presenting Sponsor", desc:"\"North Shore Ice Arena presented by [Brand]\"", season:"$15,000–$25,000", tournament:"Included", slots:1, tier:"Exclusive" },
    { name:"Rink Naming Rights", desc:"\"The [Brand] Rink\"", season:"$20,000–$35,000", tournament:"Included", slots:1, tier:"Exclusive" },
    { name:"Tournament Title Sponsor", desc:"\"The [Brand] Chi Town Shuffle\"", season:"N/A", tournament:"$5,000–$10,000/event", slots:1, tier:"Exclusive" },
    { name:"Season Presenting Sponsor", desc:"\"[Brand] presents NT Hockey\"", season:"$8,000–$15,000", tournament:"Included", slots:1, tier:"Exclusive" },
  ],
};

const TIER_INFO = {
  Platinum:{price:"$7,500–$10,000/season", gradient:"linear-gradient(135deg, #667eea 0%, #4A5568 100%)"},
  Gold:{price:"$4,000–$6,000/season", gradient:"linear-gradient(135deg, #f6d365 0%, #92751A 100%)"},
  Silver:{price:"$2,000–$3,500/season", gradient:"linear-gradient(135deg, #a8c0d6 0%, #607080 100%)"},
  Community:{price:"$750–$1,500/season", gradient:"linear-gradient(135deg, #74b9ff 0%, #2E75B6 100%)"},
};

const EMAIL_TEMPLATES = {
  initial:(l)=>({subject:`Advertising Opportunity — North Shore Ice Arena LED Scoreboard`,body:`Dear ${l.contact},\n\nI'm reaching out from North Shore Ice Arena in Wilmette about an exciting advertising opportunity on our giant LED scoreboard and multi-platform media network.\n\nOur arena is home to the Wilmette Jr Trevians, Winnetka Warriors, and New Trier Hockey Club. Every week, thousands of families are in our building — and ${l.company} could be front and center.\n\nHere's what makes this unique:\n• 2,000–4,000 weekly in-arena visitors\n• 10,000–50,000+ multi-platform impressions (scoreboard + live stream + social + video)\n• Affluent North Shore demographic (HHI $150K+)\n• Families from Wilmette, Winnetka, Kenilworth, Glencoe, Northfield, Glenview, Evanston\n\nWe have packages ranging from $750 to $10,000/season. I'd love to schedule a brief call or arena tour.\n\nWould you have 15 minutes this week or next?\n\nBest regards,\n[Your Name]\nNorth Shore Ice Arena\n[Phone] | [Email]`}),
  followUp:(l)=>({subject:`Following Up — North Shore Ice Arena Advertising`,body:`Dear ${l.contact},\n\nI wanted to follow up on my earlier message about advertising at North Shore Ice Arena.\n\nWith tournament season approaching, this is a great time to get ${l.company} in front of thousands of hockey families. Several businesses in the community have already secured their spots.\n\nI'm happy to put together a custom proposal. Could we find 15 minutes to connect?\n\nBest regards,\n[Your Name]\nNorth Shore Ice Arena\n[Phone] | [Email]`}),
  tournament:(l)=>({subject:`Limited Availability — Tournament Advertising at North Shore Ice Arena`,body:`Dear ${l.contact},\n\nWe have limited tournament advertising spots remaining for the upcoming Chi Town Shuffle and World Invite Hockey Tournament.\n\nThese events draw 5,000–10,000 visitors from across the region. Tournament families are often exploring the North Shore for the first time — perfect for introducing ${l.company}.\n\nTournament packages start at $750/event. Spots fill quickly.\n\nBest regards,\n[Your Name]\nNorth Shore Ice Arena\n[Phone] | [Email]`}),
  alumni:(l)=>({subject:`Fellow NT Alum — Advertising Opportunity at North Shore Ice Arena`,body:`Hi ${l.contact},\n\nFellow Trevian here. I wanted to reach out because I think there's a great fit between ${l.company} and what we're building at North Shore Ice Arena.\n\nWe've launched a multi-platform advertising program — scoreboard, live streams, social media, and highlight videos. The audience is exactly the affluent North Shore families your business serves.\n\nQuick numbers:\n• 2,000–4,000 weekly in-arena visitors\n• 10,000–50,000+ weekly multi-platform impressions\n• Average HHI of $150K+\n• Packages from $750 to $10,000/season\n\nThe production is run by a New Trier student broadcast club, so your ad dollars also support student education.\n\nWould you have 15 minutes for a quick call?\n\nGo Trevians,\n[Your Name]\nNorth Shore Ice Arena\n[Phone] | [Email]`}),
};

// ── Shared Styles ────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-md text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors";
const selectCls = inputCls + " cursor-pointer";
const labelCls = "block text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1";

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [tab, setTab] = useState("pipeline");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLead, setEditingLead] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [sortField, setSortField] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedLead, setSelectedLead] = useState(null);
  const [templateType, setTemplateType] = useState("initial");
  const [copied, setCopied] = useState("");
  const [roi, setRoi] = useState({ investment:7500, inArena:14000, stream:6000, social:27000, youtube:4600, newsletter:7500, cpm:15 });
  const [inventoryFilter, setInventoryFilter] = useState("all");

  // ── Load data + real-time subscription ──
  useEffect(() => {
    loadLeads();
    const unsubscribe = subscribeToLeads(() => loadLeads());
    return unsubscribe;
  }, []);

  async function loadLeads() {
    try {
      const data = await getLeads();
      // Map snake_case DB columns to camelCase used by the UI
      setLeads(data.map(r => ({
        id: r.id, company: r.company, category: r.category, contact: r.contact,
        email: r.email, phone: r.phone, city: r.city, proximity: r.proximity,
        size: r.size, sponsor: r.sponsor, status: r.status, package: r.package || "",
        dealValue: r.deal_value, probability: r.probability, notes: r.notes,
        outreachDate: r.outreach_date, followUp: r.follow_up, nextSteps: r.next_steps,
        leadScore: r.lead_score,
      })));
    } catch (e) {
      console.error("Failed to load leads:", e);
    } finally {
      setLoading(false);
    }
  }

  // Convert camelCase back to snake_case for DB writes
  function toDbRow(lead) {
    return {
      ...(lead.id ? { id: lead.id } : {}),
      company: lead.company, category: lead.category, contact: lead.contact,
      email: lead.email, phone: lead.phone, city: lead.city, proximity: lead.proximity,
      size: lead.size, sponsor: lead.sponsor, status: lead.status, package: lead.package,
      deal_value: lead.dealValue || 0, probability: lead.probability || 0,
      lead_score: scoreLead(lead), notes: lead.notes,
      outreach_date: lead.outreachDate, follow_up: lead.followUp, next_steps: lead.nextSteps,
    };
  }

  async function handleUpdate(id, updates) {
    const current = leads.find(l => l.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };
    merged.leadScore = scoreLead(merged);
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? merged : l));
    try { await upsertLead(toDbRow(merged)); } catch (e) { console.error(e); loadLeads(); }
  }

  async function handleAdd(lead) {
    try {
      lead.leadScore = scoreLead(lead);
      await insertLead(toDbRow(lead));
      setShowAdd(false);
      loadLeads();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this lead?")) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    try { await dbDelete(id); } catch (e) { console.error(e); loadLeads(); }
  }

  // ── Computed ──
  const scoredLeads = useMemo(() => leads.map(l => ({ ...l, score: scoreLead(l) })), [leads]);
  const filtered = useMemo(() => {
    let f = [...scoredLeads];
    if (filterStatus !== "All") f = f.filter(l => l.status === filterStatus);
    if (filterCat !== "All") f = f.filter(l => l.category === filterCat);
    f.sort((a, b) => {
      const av = a[sortField] ?? a.score; const bv = b[sortField] ?? b.score;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return f;
  }, [scoredLeads, filterStatus, filterCat, sortField, sortDir]);

  const stats = useMemo(() => {
    const s = { total:scoredLeads.length, hot:0, warm:0, cool:0, pipeline:0, won:0, wonValue:0, weighted:0 };
    scoredLeads.forEach(l => {
      if (l.score >= 80) s.hot++; else if (l.score >= 60) s.warm++; else s.cool++;
      if (l.status === "Closed Won") { s.won++; s.wonValue += l.dealValue || 0; }
      if (!["Closed Won","Closed Lost","On Hold","New"].includes(l.status)) {
        s.pipeline++; s.weighted += (l.dealValue||0) * (l.probability||0) / 100;
      }
    });
    return s;
  }, [scoredLeads]);

  const roiCalc = useMemo(() => {
    const total = roi.inArena + roi.stream + roi.social + roi.youtube + roi.newsletter;
    const cpmCost = (total/1000)*roi.cpm;
    const roiPct = roi.investment > 0 ? ((cpmCost - roi.investment)/roi.investment)*100 : 0;
    const mult = roi.investment > 0 ? cpmCost/roi.investment : 0;
    const myCpm = total > 0 ? roi.investment/(total/1000) : 0;
    return { total, cpmCost, roiPct, mult, myCpm };
  }, [roi]);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(""), 2000); });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0F1729] text-gray-400">
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">Loading dashboard...</div>
        <div className="text-sm text-gray-500">Connecting to database</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0F1729]">
      {/* ── Header ── */}
      <header className="border-b border-[#1E3A5F] px-6 py-4" style={{ background: "linear-gradient(135deg, #0F1729 0%, #1B2A4A 50%, #0F1729 100%)" }}>
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              <span className="text-blue-400">NSIA</span> Sales Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">North Shore Ice Arena — LED Scoreboard & Digital Media Advertising</p>
          </div>
          <nav className="flex gap-0.5 bg-[#1E293B] rounded-lg p-1">
            {[["pipeline","Pipeline"],["inventory","Rate Card"],["roi","ROI Calculator"],["outreach","Outreach"]].map(([k,label]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === k ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"}`}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-5">

        {/* ═══════════════ PIPELINE ═══════════════ */}
        {tab === "pipeline" && (
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-6 gap-3 mb-5">
              {[
                {l:"Total Leads",v:stats.total,c:"text-blue-400"},
                {l:"Hot (80+)",v:stats.hot,c:"text-red-400"},
                {l:"Warm (60-79)",v:stats.warm,c:"text-amber-400"},
                {l:"Active Pipeline",v:stats.pipeline,c:"text-purple-400"},
                {l:"Closed Won",v:`${stats.won} ($${stats.wonValue.toLocaleString()})`,c:"text-green-400"},
                {l:"Weighted Pipeline",v:`$${Math.round(stats.weighted).toLocaleString()}`,c:"text-cyan-400"},
              ].map(k => (
                <div key={k.l} className="bg-[#1E293B] rounded-xl p-4 border border-[#334155]">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{k.l}</div>
                  <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex gap-2">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls + " w-40"}>
                  <option value="All">All Statuses</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls + " w-44"}>
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={`${sortField}-${sortDir}`} onChange={e => {const[f,d]=e.target.value.split("-");setSortField(f);setSortDir(d);}} className={selectCls + " w-44"}>
                  <option value="score-desc">Score: High → Low</option>
                  <option value="score-asc">Score: Low → High</option>
                  <option value="company-asc">Company: A → Z</option>
                  <option value="dealValue-desc">Deal Value: High → Low</option>
                </select>
              </div>
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600 transition-colors">+ Add Lead</button>
            </div>

            {/* Add Form */}
            {showAdd && <AddForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />}

            {/* Table */}
            <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0F1729]">
                    {["Score","Company","Category","City","Size","Status","Package","Deal Value","Prob %","Actions"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider border-b border-[#334155]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr key={lead.id} className="border-b border-[#1E3A5F] hover:bg-[#253046] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${lead.score >= 80 ? "bg-red-500/15 text-red-400" : lead.score >= 60 ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/15 text-gray-400"}`}>
                          {lead.score}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-100">{lead.company}</div>
                        <div className="text-[11px] text-gray-500">{lead.contact} · {lead.phone}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-400">{lead.category}</td>
                      <td className="px-3 py-2.5 text-gray-400">{lead.city}</td>
                      <td className="px-3 py-2.5 text-gray-400">{lead.size}</td>
                      <td className="px-3 py-2.5">
                        <select value={lead.status} onChange={e => handleUpdate(lead.id, {status:e.target.value})} className="px-2 py-1 rounded text-xs font-semibold border-none cursor-pointer" style={{background:STATUS_COLORS[lead.status]?.bg, color:STATUS_COLORS[lead.status]?.text}}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={lead.package} onChange={e => handleUpdate(lead.id, {package:e.target.value})} className={selectCls + " w-24 !py-1 !text-xs"}>
                          <option value="">—</option>
                          {PACKAGES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" value={lead.dealValue||""} onBlur={e => handleUpdate(lead.id, {dealValue:Number(e.target.value)||0})} onChange={e => {/* local only */}} placeholder="$0" className={inputCls + " w-20 !py-1 !text-xs"} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" value={lead.probability||""} onBlur={e => handleUpdate(lead.id, {probability:Math.min(100,Number(e.target.value)||0)})} onChange={e => {/* local only */}} placeholder="0%" className={inputCls + " w-14 !py-1 !text-xs"} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => {setSelectedLead(lead);setTab("outreach");}} className="px-2 py-1 bg-[#334155] text-gray-400 rounded text-xs hover:bg-[#475569]" title="Email">✉</button>
                          <button onClick={() => setEditingLead(lead)} className="px-2 py-1 bg-[#334155] text-gray-400 rounded text-xs hover:bg-[#475569]" title="Edit">✎</button>
                          <button onClick={() => handleDelete(lead.id)} className="px-2 py-1 bg-[#334155] text-red-400 rounded text-xs hover:bg-[#475569]" title="Delete">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No leads match your filters.</div>}
            </div>

            {/* Edit Modal */}
            {editingLead && <EditModal lead={editingLead} onSave={u => {handleUpdate(editingLead.id, u);setEditingLead(null);}} onClose={() => setEditingLead(null)} />}
          </div>
        )}

        {/* ═══════════════ RATE CARD ═══════════════ */}
        {tab === "inventory" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-[22px] font-bold text-white">Advertising Rate Card</h2>
                <p className="text-sm text-gray-500 mt-1">Complete inventory — use during prospect meetings</p>
              </div>
              <div className="flex gap-0.5 bg-[#1E293B] rounded-lg p-1">
                {[["all","All"],["scoreboard","Scoreboard"],["physical","Physical"],["digital","Digital"],["naming","Naming Rights"]].map(([k,l])=>(
                  <button key={k} onClick={() => setInventoryFilter(k)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${inventoryFilter===k?"bg-blue-500 text-white":"text-gray-400 hover:text-gray-200"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {Object.entries(TIER_INFO).map(([tier,info]) => (
                <div key={tier} className="rounded-xl p-5 relative overflow-hidden" style={{background:info.gradient}}>
                  <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/5" />
                  <div className="text-lg font-bold text-white">{tier}</div>
                  <div className="text-sm text-white/70 mt-1">{info.price}</div>
                </div>
              ))}
            </div>
            {Object.entries(INVENTORY).filter(([k])=>inventoryFilter==="all"||inventoryFilter===k).map(([key,items])=>(
              <div key={key} className="mb-6">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">
                  {key==="scoreboard"?"LED Scoreboard — Digital":key==="physical"?"Physical — Rinkside & Arena":key==="digital"?"Digital — Stream, Social & Video":"Naming Rights & Exclusives"}
                </h3>
                <div className="space-y-2">
                  {items.map(item=>(
                    <div key={item.name} className="bg-[#1E293B] rounded-lg border border-[#334155] px-4 py-3 grid grid-cols-[1fr_1fr_120px_120px_60px_100px] items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-100 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Season</div>
                        <div className="font-semibold text-green-400 text-sm">{item.season}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Tournament</div>
                        <div className="text-sm">{item.tournament}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Slots</div>
                        <div className={`text-sm ${item.slots<=2?"text-red-400 font-bold":""}`}>{item.slots} {item.slots<=2?"⚡":""}</div>
                      </div>
                      <div className="text-[10px] text-gray-500">{item.slots<=2?"Limited":"Open"}</div>
                      <div className="text-right">
                        <span className="text-[10px] px-2 py-1 rounded bg-blue-500/15 text-blue-400 font-semibold">{item.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════ ROI CALCULATOR ═══════════════ */}
        {tab === "roi" && (
          <div>
            <h2 className="text-[22px] font-bold text-white mb-1">Advertiser ROI Calculator</h2>
            <p className="text-sm text-gray-500 mb-5">Plug in real numbers — screenshare this with sponsors</p>
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-5">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Inputs</h3>
                <div className="space-y-3">
                  <div><label className={labelCls}>Advertiser's Investment</label><input type="number" value={roi.investment} onChange={e=>setRoi({...roi,investment:+e.target.value||0})} className={inputCls}/></div>
                  <div className="border-t border-[#334155] pt-3"><label className={labelCls+" !text-blue-400"}>Season Impressions by Channel</label></div>
                  {[["inArena","In-Arena"],["stream","Live Stream"],["social","Social Media"],["youtube","YouTube / VOD"],["newsletter","Newsletter"]].map(([k,l])=>(
                    <div key={k}><label className={labelCls}>{l}</label><input type="number" value={roi[k]} onChange={e=>setRoi({...roi,[k]:+e.target.value||0})} className={inputCls}/></div>
                  ))}
                  <div className="border-t border-[#334155] pt-3">
                    <label className={labelCls}>Industry Benchmark CPM ($)</label>
                    <input type="number" value={roi.cpm} onChange={e=>setRoi({...roi,cpm:+e.target.value||0})} className={inputCls}/>
                    <p className="text-[11px] text-gray-500 mt-1">Typical local sports: $12–$25 CPM</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="rounded-xl p-6 mb-4 relative overflow-hidden" style={{background:"linear-gradient(135deg, #065F46 0%, #064E3B 100%)"}}>
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5"/>
                  <div className="text-xs text-white/50 uppercase tracking-widest">Return on Investment</div>
                  <div className="text-5xl font-bold text-white my-2">{roiCalc.mult.toFixed(1)}x</div>
                  <div className="text-emerald-300">Every $1 invested = ${roiCalc.mult.toFixed(2)} in impression value</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {l:"Total Impressions",v:roiCalc.total.toLocaleString(),c:"text-blue-400"},
                    {l:"Market Value",v:`$${Math.round(roiCalc.cpmCost).toLocaleString()}`,c:"text-green-400"},
                    {l:"Their CPM",v:`$${roiCalc.myCpm.toFixed(2)}`,c:roiCalc.myCpm<roi.cpm?"text-green-400":"text-red-400"},
                    {l:"ROI %",v:`${roiCalc.roiPct>0?"+":""}${Math.round(roiCalc.roiPct)}%`,c:roiCalc.roiPct>0?"text-green-400":"text-red-400"},
                  ].map(m=>(
                    <div key={m.l} className="bg-[#1E293B] rounded-lg border border-[#334155] p-4">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">{m.l}</div>
                      <div className={`text-2xl font-bold mt-1 ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-5 mt-4">
                  <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Channel Breakdown</h4>
                  {[{l:"In-Arena",v:roi.inArena,c:"#3B82F6"},{l:"Live Stream",v:roi.stream,c:"#8B5CF6"},{l:"Social Media",v:roi.social,c:"#F59E0B"},{l:"YouTube",v:roi.youtube,c:"#EF4444"},{l:"Newsletter",v:roi.newsletter,c:"#22C55E"}].map(ch=>{
                    const pct = roiCalc.total>0?(ch.v/roiCalc.total)*100:0;
                    return(
                      <div key={ch.l} className="mb-2.5">
                        <div className="flex justify-between text-xs mb-1"><span>{ch.l}</span><span className="text-gray-500">{ch.v.toLocaleString()} ({pct.toFixed(0)}%)</span></div>
                        <div className="h-1.5 rounded-full bg-[#0F1729]"><div className="h-full rounded-full transition-all duration-500" style={{background:ch.c,width:`${pct}%`}}/></div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-[#1E293B] rounded-xl border-l-[3px] border-blue-500 border border-[#334155] p-4 mt-4">
                  <div className="text-xs font-bold text-blue-400 uppercase mb-2">Talking Point</div>
                  <p className="text-sm leading-relaxed">
                    "Your ${roi.investment.toLocaleString()} investment generated {roiCalc.total.toLocaleString()} impressions — a {roiCalc.mult.toFixed(1)}x return. At industry CPM rates, these impressions are worth ${Math.round(roiCalc.cpmCost).toLocaleString()}. Your CPM of ${roiCalc.myCpm.toFixed(2)} is {roiCalc.myCpm<roi.cpm?"well below":"competitive with"} the $${roi.cpm} industry average."
                  </p>
                  <button onClick={()=>copyText(`Your $${roi.investment.toLocaleString()} investment generated ${roiCalc.total.toLocaleString()} impressions — a ${roiCalc.mult.toFixed(1)}x return. At industry CPM rates, these impressions are worth $${Math.round(roiCalc.cpmCost).toLocaleString()}. Your CPM of $${roiCalc.myCpm.toFixed(2)} is ${roiCalc.myCpm<roi.cpm?"well below":"competitive with"} the $${roi.cpm} industry average.`,"tp")} className="mt-3 px-3 py-1.5 bg-[#334155] text-gray-300 rounded text-xs font-semibold hover:bg-[#475569]">
                    {copied==="tp"?"✓ Copied!":"Copy to Clipboard"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ OUTREACH ═══════════════ */}
        {tab === "outreach" && (
          <div>
            <h2 className="text-[22px] font-bold text-white mb-1">Outreach Templates</h2>
            <p className="text-sm text-gray-500 mb-5">Select a lead and template — customize and copy</p>
            <div className="grid grid-cols-[300px_1fr] gap-5">
              <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-4 max-h-[70vh] overflow-y-auto">
                <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Select Lead</h3>
                {scoredLeads.sort((a,b)=>b.score-a.score).map(lead=>(
                  <div key={lead.id} onClick={()=>setSelectedLead(lead)} className={`px-3 py-2.5 rounded-md mb-1 cursor-pointer transition-all ${selectedLead?.id===lead.id?"bg-[#334155] border border-blue-500":"border border-transparent hover:bg-[#253046]"}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-gray-100 text-sm truncate mr-2">{lead.company}</div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${lead.score>=80?"bg-red-500/15 text-red-400":"bg-amber-500/15 text-amber-400"}`}>{lead.score}</div>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{lead.category} · {lead.city}</div>
                  </div>
                ))}
              </div>
              <div>
                {selectedLead ? (
                  <div>
                    <div className="flex gap-0.5 bg-[#1E293B] rounded-lg p-1 mb-4 w-fit">
                      {[["initial","Initial Outreach"],["followUp","Follow-Up"],["tournament","Tournament"],["alumni","Alumni Angle"]].map(([k,l])=>(
                        <button key={k} onClick={()=>setTemplateType(k)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${templateType===k?"bg-blue-500 text-white":"text-gray-400 hover:text-gray-200"}`}>{l}</button>
                      ))}
                    </div>
                    {(()=>{
                      const t = EMAIL_TEMPLATES[templateType](selectedLead);
                      return(
                        <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden">
                          <div className="bg-[#0F1729] px-5 py-3 border-b border-[#334155]">
                            <div className="text-[11px] text-gray-500 mb-1">SUBJECT</div>
                            <div className="text-sm font-semibold text-gray-100">{t.subject}</div>
                          </div>
                          <div className="p-5">
                            <div className="text-[11px] text-gray-500 mb-2">TO: {selectedLead.contact} &lt;{selectedLead.email}&gt;</div>
                            <pre className="font-sans text-sm text-gray-200 leading-relaxed whitespace-pre-wrap bg-[#0F1729] p-4 rounded-lg max-h-[45vh] overflow-y-auto">{t.body}</pre>
                          </div>
                          <div className="px-5 py-3 border-t border-[#334155] flex gap-2">
                            <button onClick={()=>copyText(`Subject: ${t.subject}\n\n${t.body}`,"email")} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600">
                              {copied==="email"?"✓ Copied!":"Copy Email"}
                            </button>
                            <button onClick={()=>copyText(t.body,"body")} className="px-4 py-2 bg-[#334155] text-gray-300 rounded-md text-sm font-semibold hover:bg-[#475569]">
                              {copied==="body"?"✓ Copied!":"Copy Body Only"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-72 bg-[#1E293B] rounded-xl border border-[#334155] text-gray-500">
                    Select a lead to generate outreach templates
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Add Form Component ───────────────────────────────────────────────────────
function AddForm({ onSave, onCancel }) {
  const [f, setF] = useState({ company:"", category:"Restaurant", contact:"", email:"", phone:"", city:"", proximity:5, size:"Medium", sponsor:"Unknown", status:"New", package:"", dealValue:0, probability:0, notes:"", outreachDate:"", followUp:"", nextSteps:"" });
  const set = (k,v) => setF({...f,[k]:v});
  return (
    <div className="bg-[#1E293B] rounded-xl border border-blue-500 p-5 mb-4">
      <h3 className="text-sm font-bold text-white mb-4">Add New Lead</h3>
      <div className="grid grid-cols-4 gap-3">
        <div><label className={labelCls}>Company *</label><input value={f.company} onChange={e=>set("company",e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>Category</label><select value={f.category} onChange={e=>set("category",e.target.value)} className={selectCls}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className={labelCls}>Contact</label><input value={f.contact} onChange={e=>set("contact",e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>Email</label><input value={f.email} onChange={e=>set("email",e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>Phone</label><input value={f.phone} onChange={e=>set("phone",e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>City</label><input value={f.city} onChange={e=>set("city",e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>Proximity (mi)</label><input type="number" value={f.proximity} onChange={e=>set("proximity",+e.target.value)} className={inputCls}/></div>
        <div><label className={labelCls}>Size</label><select value={f.size} onChange={e=>set("size",e.target.value)} className={selectCls}>{SIZES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="col-span-4"><label className={labelCls}>Notes</label><input value={f.notes} onChange={e=>set("notes",e.target.value)} className={inputCls}/></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={()=>{if(f.company.trim())onSave(f);}} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Lead</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#334155] text-gray-300 rounded-md text-sm font-semibold hover:bg-[#475569]">Cancel</button>
      </div>
    </div>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ lead, onSave, onClose }) {
  const [f, setF] = useState({...lead});
  const set = (k,v) => setF({...f,[k]:v});
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="bg-[#1E293B] rounded-xl border border-[#334155] p-6 w-[700px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-5">Edit: {lead.company}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Company</label><input value={f.company} onChange={e=>set("company",e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Category</label><select value={f.category} onChange={e=>set("category",e.target.value)} className={selectCls}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className={labelCls}>Contact</label><input value={f.contact} onChange={e=>set("contact",e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Email</label><input value={f.email} onChange={e=>set("email",e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Phone</label><input value={f.phone} onChange={e=>set("phone",e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>City</label><input value={f.city} onChange={e=>set("city",e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Proximity</label><input type="number" value={f.proximity} onChange={e=>set("proximity",+e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Size</label><select value={f.size} onChange={e=>set("size",e.target.value)} className={selectCls}>{SIZES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label className={labelCls}>Status</label><select value={f.status} onChange={e=>set("status",e.target.value)} className={selectCls}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label className={labelCls}>Package</label><select value={f.package} onChange={e=>set("package",e.target.value)} className={selectCls}><option value="">—</option>{PACKAGES.map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label className={labelCls}>Deal Value ($)</label><input type="number" value={f.dealValue} onChange={e=>set("dealValue",+e.target.value||0)} className={inputCls}/></div>
          <div><label className={labelCls}>Probability (%)</label><input type="number" value={f.probability} onChange={e=>set("probability",+e.target.value||0)} className={inputCls}/></div>
          <div><label className={labelCls}>Existing Sponsor?</label><select value={f.sponsor} onChange={e=>set("sponsor",e.target.value)} className={selectCls}>{["Yes","No","Unknown"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label className={labelCls}>Follow-Up Date</label><input type="date" value={f.followUp} onChange={e=>set("followUp",e.target.value)} className={inputCls}/></div>
          <div className="col-span-2"><label className={labelCls}>Notes</label><input value={f.notes} onChange={e=>set("notes",e.target.value)} className={inputCls}/></div>
          <div className="col-span-2"><label className={labelCls}>Next Steps</label><input value={f.nextSteps} onChange={e=>set("nextSteps",e.target.value)} className={inputCls}/></div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={()=>onSave(f)} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Changes</button>
          <button onClick={onClose} className="px-4 py-2 bg-[#334155] text-gray-300 rounded-md text-sm font-semibold hover:bg-[#475569]">Cancel</button>
        </div>
      </div>
    </div>
  );
}
