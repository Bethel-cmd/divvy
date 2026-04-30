"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type Bill = {
  id: string;
  title: string;
  amount: number;
  category: string;
  created_at: string;
};

type BillShare = {
  id: string;
  bill_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  paid_at: string | null;
};

type HousemateProfile = {
  user_id: string;
  full_name: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  electricity: "#F59E0B",
  water: "#3B82F6",
  internet: "#818CF8",
  rent: "#C8F135",
  groceries: "#22C55E",
  other: "#888",
};

const CATEGORY_ICONS: Record<string, string> = {
  electricity: "⚡", water: "💧", internet: "📡",
  rent: "🏠", groceries: "🛒", other: "📋",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatNaira(n: number) {
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "₦" + (n / 1_000).toFixed(0) + "k";
  return "₦" + Number(n).toLocaleString("en-NG");
}

function formatNairaFull(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

// Custom tooltip for bar/line charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1E1E1E", border: "1px solid #2A2A2A",
      borderRadius: 10, padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 14, fontWeight: 600, color: p.color || "#C8F135" }}>
          {formatNairaFull(p.value)}
        </p>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "#1E1E1E", border: "1px solid #2A2A2A",
      borderRadius: 10, padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{d.name}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: d.payload.color }}>{formatNairaFull(d.value)}</p>
      <p style={{ fontSize: 11, color: "#555" }}>{d.payload.percent}% of total</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [shares, setShares] = useState<BillShare[]>([]);
  const [housemates, setHousemates] = useState<HousemateProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth());
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id);

    async function load() {
      if (!user) return;
      const supabase = createClient();

      const { data: hm } = await supabase
        .from("housemates").select("household_id").eq("user_id", user.id).single();
      if (!hm) { router.push("/onboarding"); return; }

      // Load all bills for household
      const { data: billsData } = await supabase
        .from("bills").select("*").eq("household_id", hm.household_id)
        .order("created_at", { ascending: true });
      setBills(billsData || []);

      // Load all shares
      if (billsData?.length) {
        const { data: sharesData } = await supabase
          .from("bill_shares").select("*")
          .in("bill_id", billsData.map(b => b.id));
        setShares(sharesData || []);
      }

      // Load housemates
      const { data: hmData } = await supabase
        .from("housemates").select("user_id").eq("household_id", hm.household_id);
      if (hmData?.length) {
        const ids = hmData.map(h => h.user_id);
        const { data: profData } = await supabase
          .from("profiles").select("id, full_name, email").in("id", ids);
        setHousemates(hmData.map(h => {
          const p = profData?.find(p => p.id === h.user_id);
          return { user_id: h.user_id, full_name: p?.full_name || p?.email?.split("@")[0] || "Unknown" };
        }));
      }
      setLoading(false);
    }
    load();
  }, [router, user, authLoading]);

  // ── Derived data ──

  // 1. Spending by category
  const categoryData = Object.entries(
    bills.reduce((acc, bill) => {
      acc[bill.category] = (acc[bill.category] || 0) + Number(bill.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([cat, total]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: total,
    color: CATEGORY_COLORS[cat] || "#888",
    icon: CATEGORY_ICONS[cat] || "📋",
    percent: bills.length ? Math.round((total / bills.reduce((s, b) => s + Number(b.amount), 0)) * 100) : 0,
  })).sort((a, b) => b.value - a.value);

  // 2. Monthly spending trend (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const total = bills
      .filter(b => {
        const bd = new Date(b.created_at);
        return bd.getMonth() === month && bd.getFullYear() === year;
      })
      .reduce((s, b) => s + Number(b.amount), 0);
    return { name: MONTHS[month], total, month, year };
  });

  // 3. Settlement stats
  const totalBillAmount = bills.reduce((s, b) => s + Number(b.amount), 0);
  const myShares = shares.filter(s => s.user_id === currentUserId);
  const myTotalOwed = myShares.reduce((s, sh) => s + Number(sh.amount_owed), 0);
  const myTotalPaid = myShares.filter(s => s.is_paid).reduce((s, sh) => s + Number(sh.amount_owed), 0);
  const mySettlementRate = myTotalOwed > 0 ? Math.round((myTotalPaid / myTotalOwed) * 100) : 100;
  const overallPaid = shares.filter(s => s.is_paid).reduce((s, sh) => s + Number(sh.amount_owed), 0);
  const overallOwed = shares.reduce((s, sh) => s + Number(sh.amount_owed), 0);
  const overallSettlementRate = overallOwed > 0 ? Math.round((overallPaid / overallOwed) * 100) : 100;

  // 4. Per-person breakdown
  const personData = housemates.map(hm => {
    const hmShares = shares.filter(s => s.user_id === hm.user_id);
    const paid = hmShares.filter(s => s.is_paid).reduce((s, sh) => s + Number(sh.amount_owed), 0);
    const owed = hmShares.reduce((s, sh) => s + Number(sh.amount_owed), 0);
    const outstanding = owed - paid;
    return { name: hm.full_name.split(" ")[0], fullName: hm.full_name, paid, owed, outstanding, isMe: hm.user_id === currentUserId };
  }).sort((a, b) => b.owed - a.owed);

  // 5. Category breakdown for selected month
  const selectedMonthBills = bills.filter(b => {
    const bd = new Date(b.created_at);
    return bd.getMonth() === activeMonth && bd.getFullYear() === now.getFullYear();
  });
  const selectedMonthTotal = selectedMonthBills.reduce((s, b) => s + Number(b.amount), 0);

  const hasData = bills.length > 0;

  if (loading || authLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, background: "var(--accent)", borderRadius: 12, animation: "pulse 1.4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .an-root { min-height:100vh; background:var(--bg); font-family:'DM Sans',sans-serif; color:var(--text); }

        .an-topbar {
          padding:36px 40px 28px;
          border-bottom:1px solid var(--border);
          display:flex; align-items:flex-start;
          justify-content:space-between; gap:20px;
        }

        .an-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:700; color:var(--text); letter-spacing:-.6px; margin-bottom:4px; }
        .an-sub { font-size:13px; color:var(--text-muted); }

        .an-period {
          display:flex; align-items:center; gap:6px;
          background:var(--surface-2); border:1px solid var(--border);
          border-radius:12px; padding:4px;
        }

        .period-btn {
          padding:7px 14px; border:none; border-radius:9px;
          font-family:'DM Sans',sans-serif; font-size:12px;
          font-weight:500; cursor:pointer; transition:all .15s;
          background:transparent; color:var(--text-muted);
        }
        .period-btn.active { background:var(--surface); color:var(--text); }

        /* Grid */
        .an-grid { padding:28px 40px 40px; display:flex; flex-direction:column; gap:20px; }

        /* Stat cards row */
        .stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }

        .an-stat {
          background:var(--surface-2); border:1px solid var(--border);
          border-radius:18px; padding:20px;
          animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;
        }

        .an-stat-label { font-size:11px; color:var(--text-muted); letter-spacing:.7px; text-transform:uppercase; font-weight:500; margin-bottom:8px; }
        .an-stat-value { font-family:'Syne',sans-serif; font-size:22px; font-weight:700; letter-spacing:-1px; line-height:1; margin-bottom:4px; }
        .an-stat-sub { font-size:11px; color:var(--text-muted); }

        /* Chart panels */
        .chart-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .chart-row-full { display:grid; grid-template-columns:1fr; gap:20px; }

        .chart-panel {
          background:var(--surface-2); border:1px solid var(--border);
          border-radius:20px; padding:24px;
          animation:fadeUp .4s .08s cubic-bezier(.16,1,.3,1) both;
        }

        .chart-panel-title {
          font-family:'Syne',sans-serif; font-size:15px;
          font-weight:700; color:var(--text); letter-spacing:-.3px; margin-bottom:4px;
        }

        .chart-panel-sub { font-size:12px; color:var(--text-muted); margin-bottom:24px; }

        /* Category legend */
        .cat-legend { display:flex; flex-direction:column; gap:10px; margin-top:8px; }

        .cat-legend-row {
          display:flex; align-items:center; gap:12px;
          padding:10px 12px; background:var(--bg);
          border:1px solid var(--border); border-radius:11px;
          transition:border-color .15s;
        }
        .cat-legend-row:hover { border-color:var(--text-muted); }

        .cat-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }

        .cat-name { font-size:13px; color:var(--text-muted); flex:1; }

        .cat-amount {
          font-family:'Syne',sans-serif; font-size:13px;
          font-weight:700; color:var(--text); letter-spacing:-.3px;
        }

        .cat-pct { font-size:11px; color:var(--text-muted); margin-left:6px; }

        /* Settlement ring */
        .settlement-wrap { display:flex; align-items:center; gap:28px; }

        .ring-wrap { position:relative; flex-shrink:0; }

        .ring-center {
          position:absolute; inset:0;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          pointer-events:none;
        }

        .ring-pct {
          font-family:'Syne',sans-serif; font-size:28px;
          font-weight:800; color:var(--accent); letter-spacing:-1px; line-height:1;
        }

        .ring-label { font-size:10px; color:var(--text-muted); margin-top:2px; }

        .settlement-stats { flex:1; display:flex; flex-direction:column; gap:10px; }

        .sstat-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px; background:var(--bg);
          border:1px solid var(--border); border-radius:11px;
        }

        .sstat-label { font-size:12px; color:var(--text-muted); }
        .sstat-value { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; }

        /* Person bars */
        .person-rows { display:flex; flex-direction:column; gap:10px; }

        .person-row {
          display:flex; align-items:center; gap:14px;
          padding:14px 16px; background:var(--bg);
          border:1px solid var(--border); border-radius:13px;
          transition:border-color .15s;
        }
        .person-row:hover { border-color:var(--text-muted); }
        .person-row.me { border-color:rgba(200,241,53,.15); }

        .person-avatar {
          width:36px; height:36px; border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          font-family:'Syne',sans-serif; font-size:12px; font-weight:700;
          flex-shrink:0;
        }

        .person-info { flex:1; min-width:0; }

        .person-name {
          font-size:13px; font-weight:500; color:var(--text);
          margin-bottom:6px; display:flex; align-items:center; gap:6px;
        }

        .you-badge {
          padding:1px 6px; background:rgba(99,102,241,.1);
          border:1px solid rgba(99,102,241,.2); border-radius:5px;
          font-size:9px; font-weight:600; color:#818CF8;
        }

        .person-bar-wrap { height:4px; background:var(--border); border-radius:2px; overflow:hidden; }

        .person-bar {
          height:100%; border-radius:2px;
          transition:width .6s cubic-bezier(.16,1,.3,1);
        }

        .person-amounts { text-align:right; flex-shrink:0; }
        .person-paid { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:var(--success); }
        .person-owed { font-size:11px; color:var(--text-muted); margin-top:2px; }

        /* Empty state */
        .an-empty {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:80px 24px; text-align:center;
          animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;
        }
        .an-empty-icon {
          width:72px; height:72px; background:var(--surface-2);
          border:1px solid var(--border); border-radius:22px;
          display:flex; align-items:center; justify-content:center;
          font-size:28px; margin-bottom:20px;
        }
        .an-empty-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--text); margin-bottom:8px; }
        .an-empty-sub { font-size:13px; color:var(--text-muted); line-height:1.7; max-width:320px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:900px) {
          .stat-row { grid-template-columns:repeat(2,1fr); }
          .chart-row { grid-template-columns:1fr; }
        }
        @media(max-width:768px) {
          .an-topbar { padding:28px 20px 20px; flex-direction:column; }
          .an-grid { padding:20px 20px 40px; }
          .stat-row { grid-template-columns:1fr 1fr; }
          .chart-panel { padding:16px; }
          .settlement-wrap { flex-direction:column; align-items:center; gap:20px; }
          .settlement-stats { width:100%; }
          .person-row { padding:12px 14px; gap:10px; }
          .cat-legend-row { padding:8px 10px; }
        }
      `}</style>

      <div className="an-root">

        {/* Top bar */}
        <div className="an-topbar">
          <div>
            <h1 className="an-title">Analytics</h1>
            <p className="an-sub">
              {hasData
                ? `Insights across ${bills.length} bill${bills.length > 1 ? "s" : ""} · ${formatNairaFull(totalBillAmount)} total`
                : "Your spending insights will appear here"}
            </p>
          </div>
        </div>

        <div className="an-grid">

          {!hasData ? (
            /* ── EMPTY STATE ── */
            <div className="chart-panel">
              <div className="an-empty">
                <div className="an-empty-icon">📊</div>
                <p className="an-empty-title">No data yet</p>
                <p className="an-empty-sub">
                  Add your first shared bill on the Bills page and come back here to see spending breakdowns, monthly trends, and settlement rates across your household.
                </p>
                <a href="/dashboard/bills" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  marginTop: 24, padding: "12px 20px",
                  background: "var(--accent)", border: "none", borderRadius: 12,
                  fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
                  color: "var(--bg)", textDecoration: "none",
                  transition: "all .2s",
                }}>
                  Go add bills →
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* ── STAT CARDS ── */}
              <div className="stat-row">
                {[
                  { label: "Total spend", value: formatNaira(totalBillAmount), sub: `${bills.length} bills`, color: "var(--text)", delay: "0s" },
                  { label: "You owe", value: formatNaira(myTotalOwed - myTotalPaid > 0 ? myTotalOwed - myTotalPaid : 0), sub: myTotalOwed - myTotalPaid > 0 ? "outstanding" : "all settled ✓", color: myTotalOwed - myTotalPaid > 0 ? "var(--danger)" : "var(--success)", delay: "0.04s" },
                  { label: "Your settlement", value: `${mySettlementRate}%`, sub: `${formatNaira(myTotalPaid)} paid`, color: "var(--accent)", delay: "0.08s" },
                  { label: "Household rate", value: `${overallSettlementRate}%`, sub: "overall settled", color: "var(--success)", delay: "0.12s" },
                ].map(s => (
                  <div className="an-stat" key={s.label} style={{ animationDelay: s.delay }}>
                    <div className="an-stat-label">{s.label}</div>
                    <div className="an-stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="an-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── MONTHLY TREND + CATEGORY PIE ── */}
              <div className="chart-row">

                {/* Monthly bar chart */}
                <div className="chart-panel">
                  <div className="chart-panel-title">Monthly spending</div>
                  <div className="chart-panel-sub">Total bills added per month</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false}/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#555", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}/>
                      <YAxis axisLine={false} tickLine={false} tickFormatter={v => formatNaira(v)} tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Sans',sans-serif" }} width={60}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill: "rgba(255,255,255,0.03)" }}/>
                      <Bar dataKey="total" fill="#C8F135" radius={[6,6,0,0]}
                        label={false}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category donut + legend */}
                <div className="chart-panel">
                  <div className="chart-panel-title">Spending by category</div>
                  <div className="chart-panel-sub">Where your money goes</div>
                  {categoryData.length > 0 ? (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ flexShrink: 0 }}>
                        <PieChart width={140} height={140}>
                          <Pie
                            data={categoryData} cx={65} cy={65}
                            innerRadius={44} outerRadius={65}
                            paddingAngle={3} dataKey="value"
                          >
                            {categoryData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent"/>
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip/>}/>
                        </PieChart>
                      </div>
                      <div className="cat-legend" style={{ flex: 1 }}>
                        {categoryData.slice(0, 5).map(cat => (
                          <div className="cat-legend-row" key={cat.name}>
                            <div className="cat-dot" style={{ background: cat.color }}/>
                            <span className="cat-name">{cat.icon} {cat.name}</span>
                            <span className="cat-amount">{formatNaira(cat.value)}</span>
                            <span className="cat-pct">{cat.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 13 }}>No category data</div>
                  )}
                </div>
              </div>

              {/* ── SETTLEMENT + PER PERSON ── */}
              <div className="chart-row">

                {/* Settlement ring */}
                <div className="chart-panel">
                  <div className="chart-panel-title">Settlement overview</div>
                  <div className="chart-panel-sub">How much has been paid vs outstanding</div>
                  <div className="settlement-wrap">
                    <div className="ring-wrap">
                      <PieChart width={140} height={140}>
                        <Pie
                          data={[
                            { name: "Paid", value: overallPaid },
                            { name: "Owed", value: Math.max(overallOwed - overallPaid, 0) },
                          ]}
                          cx={65} cy={65}
                          innerRadius={44} outerRadius={65}
                          startAngle={90} endAngle={-270}
                          paddingAngle={2} dataKey="value"
                        >
                          <Cell fill="#22C55E" stroke="transparent"/>
                          <Cell fill="#1E1E1E" stroke="#2A2A2A"/>
                        </Pie>
                      </PieChart>
                      <div className="ring-center">
                        <span className="ring-pct">{overallSettlementRate}%</span>
                        <span className="ring-label">settled</span>
                      </div>
                    </div>
                    <div className="settlement-stats">
                      {[
                        { label: "Total billed", value: formatNairaFull(overallOwed), color: "#fff" },
                        { label: "Paid", value: formatNairaFull(overallPaid), color: "#22C55E" },
                        { label: "Outstanding", value: formatNairaFull(Math.max(overallOwed - overallPaid, 0)), color: "#FF5555" },
                        { label: "Your rate", value: `${mySettlementRate}%`, color: "#C8F135" },
                      ].map(s => (
                        <div className="sstat-row" key={s.label}>
                          <span className="sstat-label">{s.label}</span>
                          <span className="sstat-value" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Per-person breakdown */}
                <div className="chart-panel">
                  <div className="chart-panel-title">Per-person breakdown</div>
                  <div className="chart-panel-sub">Individual payment progress</div>
                  <div className="person-rows">
                    {personData.map((person, i) => {
                      const pct = person.owed > 0 ? Math.round((person.paid / person.owed) * 100) : 100;
                      const avatarColors = ["#C8F135","#818CF8","#F59E0B","#22C55E","#EF4444","#3B82F6"];
                      const avatarBgs = ["rgba(200,241,53,.1)","rgba(99,102,241,.1)","rgba(245,158,11,.1)","rgba(34,197,94,.1)","rgba(239,68,68,.1)","rgba(59,130,246,.1)"];
                      const initials = person.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div className={`person-row ${person.isMe ? "me" : ""}`} key={person.name}>
                          <div className="person-avatar" style={{ background: avatarBgs[i % avatarBgs.length], color: avatarColors[i % avatarColors.length] }}>
                            {initials}
                          </div>
                          <div className="person-info">
                            <div className="person-name">
                              {person.fullName.split(" ")[0]}
                              {person.isMe && <span className="you-badge">you</span>}
                            </div>
                            <div className="person-bar-wrap">
                              <div className="person-bar" style={{
                                width: `${pct}%`,
                                background: pct === 100 ? "var(--success)" : pct > 50 ? "var(--accent)" : "var(--danger)",
                              }}/>
                            </div>
                          </div>
                          <div className="person-amounts">
                            <div className="person-paid">{formatNaira(person.paid)}</div>
                            <div className="person-owed">of {formatNaira(person.owed)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── SPENDING TREND LINE ── */}
              <div className="chart-panel">
                <div className="chart-panel-title">Cumulative spending trend</div>
                <div className="chart-panel-sub">How your household's total bills have grown over the last 6 months</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false}/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#555", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}/>
                    <YAxis axisLine={false} tickLine={false} tickFormatter={v => formatNaira(v)} tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Sans',sans-serif" }} width={60}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Line type="monotone" dataKey="total" stroke="#C8F135" strokeWidth={2.5} dot={{ fill: "#C8F135", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#C8F135" }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
