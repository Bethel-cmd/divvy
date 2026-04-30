"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

type Profile = { full_name: string; email: string };
type Bill = {
  id: string;
  title: string;
  amount: number;
  category: string;
  created_at: string;
  is_paid?: boolean;
};

const categoryIcons: Record<string, string> = {
  electricity: "⚡",
  water: "💧",
  internet: "📡",
  rent: "🏠",
  groceries: "🛒",
  other: "📋",
};

function formatNaira(amount: number) {
  return "₦" + amount.toLocaleString("en-NG");
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [housemateCount, setHousemateCount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [housemates, setHousemates] = useState<{user_id: string, full_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHousehold, setHasHousehold] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      if (!user) return;
      const supabase = createClient();

      const { data: prof } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      setProfile({
        full_name: prof?.full_name || user.email?.split("@")[0] || "there",
        email: user.email || "",
      });

      const { data: hm } = await supabase
        .from("housemates").select("household_id").eq("user_id", user.id).maybeSingle();

      if (hm?.household_id) {
        setHasHousehold(true);
        const { count } = await supabase
          .from("housemates").select("*", { count: "exact", head: true })
          .eq("household_id", hm.household_id);
        setHousemateCount(count || 0);

        // Fetch housemate profiles for avatar row
        const { data: hmData } = await supabase
          .from("housemates")
          .select("user_id")
          .eq("household_id", hm.household_id);

        if (hmData && hmData.length > 0) {
          const ids = hmData.map(h => h.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", ids);

          setHousemates(
            (hmData || []).map(h => ({
              user_id: h.user_id,
              full_name: profilesData?.find(p => p.id === h.user_id)?.full_name || "?"
            }))
          );
        }

        const { data: billsData } = await supabase
          .from("bills").select("*")
          .eq("household_id", hm.household_id)
          .order("created_at", { ascending: false }).limit(8);
        setBills(billsData || []);

        const { data: allShares } = await supabase
          .from("bill_shares").select("amount_owed, status")
          .eq("user_id", user.id);
        
        const unpaid = (allShares || []).filter(s => 
          s.status === "unpaid" || s.status === "rejected" || s.status === "pending_verification"
        );
        setTotalBalance(unpaid.reduce((s, x) => s + Number(x.amount_owed), 0));

        const verified = (allShares || []).filter(s => s.status === "verified");
        setTotalPaid(verified.reduce((sum, s) => sum + Number(s.amount_owed), 0));
      }
      setLoading(false);
    }
    load();
  }, [router, user, authLoading]);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading || authLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, background: "var(--accent)", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", animation: "pulse 1.5s ease-in-out infinite",
          }}>
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
              <path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: "var(--text-muted)", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
            Loading your space...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .dash {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 24px 40px;
          min-height: 100vh;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ── Top bar ── */
        .dash-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
          position: relative;
          z-index: 50;
          animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }

        .dash-greeting { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }

        .dash-username {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.6px;
        }

        .notif-btn {
          width: 40px; height: 40px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; position: relative;
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .notif-btn:hover { background: var(--surface); }
        .notif-dot {
          position: absolute; top: 8px; right: 8px;
          width: 7px; height: 7px;
          background: var(--accent); border-radius: 50%;
          border: 2px solid var(--surface-2);
        }

        /* ── Desktop two-column grid ── */
        .dash-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .dash { padding: 48px 60px; }
          .dash-username { font-size: 30px; }
          .dash-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .balance-card { grid-column: 1 / -1; }
          .recent-section { grid-column: 1 / -1; }
        }

        /* ── Balance card ── */
        .balance-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          animation: fadeUp 0.45s 0.06s cubic-bezier(0.16,1,0.3,1) both;
        }

        .balance-card::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(200,241,53,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .balance-inner {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .balance-left {}

        .balance-label {
          font-size: 11px; color: var(--text-muted);
          letter-spacing: 0.8px; text-transform: uppercase;
          font-weight: 500; margin-bottom: 10px;
        }

        .balance-amount {
          font-family: 'Syne', sans-serif;
          font-size: 52px; font-weight: 800;
          color: var(--text); letter-spacing: -3px; line-height: 1;
          margin-bottom: 8px;
        }

        .balance-amount .currency {
          font-size: 28px; font-weight: 600;
          color: var(--text-muted); letter-spacing: -0.5px;
        }

        .balance-sub { font-size: 13px; color: var(--text-muted); }
        .balance-sub strong { color: var(--accent); font-weight: 500; }

        .balance-actions {
          display: flex; gap: 10px; flex-wrap: wrap;
        }

        .fund-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent); color: var(--bg);
          border: none; border-radius: 12px;
          padding: 13px 22px;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }

        .fund-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(200,241,53,0.25);
        }

        .fund-btn:active { transform: scale(0.97); }

        .outline-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: var(--text-muted);
          border: 1px solid var(--border); border-radius: 12px;
          padding: 13px 22px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .outline-btn:hover { border-color: var(--text-muted); color: var(--text); }

        /* ── Stat cards ── */
        .stat-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          animation: fadeUp 0.45s 0.12s cubic-bezier(0.16,1,0.3,1) both;
        }

        .stat-card.accent {
          background: rgba(200,241,53,0.03);
          border-color: rgba(200,241,53,0.15);
        }

        .stat-icon {
          width: 40px; height: 40px;
          background: var(--border); border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; margin-bottom: 16px;
        }

        .stat-card.accent .stat-icon {
          background: rgba(200,241,53,0.1);
        }

        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 34px; font-weight: 700;
          color: var(--text); letter-spacing: -1.5px;
          line-height: 1; margin-bottom: 4px;
        }

        .stat-card.accent .stat-value { color: var(--accent); }

        .stat-label { font-size: 12px; color: var(--text-muted); }

        .stat-trend {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(34,197,94,0.1);
          color: #22C55E;
          font-size: 11px; font-weight: 500;
          padding: 3px 8px; border-radius: 20px;
          margin-top: 8px;
        }

        /* ── Setup card ── */
        .setup-card {
          background: rgba(200,241,53,0.05);
          border: 1px solid rgba(200,241,53,0.15);
          border-radius: 20px; padding: 28px;
          animation: fadeUp 0.45s 0.12s cubic-bezier(0.16,1,0.3,1) both;
          grid-column: 1 / -1;
        }

        .setup-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 700;
          color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px;
        }

        .setup-sub {
          font-size: 13px; color: var(--text-muted);
          margin-bottom: 20px; line-height: 1.6;
        }

        .setup-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent); color: var(--bg);
          border: none; border-radius: 12px;
          padding: 13px 22px;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }

        .setup-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        /* ── Recent bills section ── */
        .recent-section {
          animation: fadeUp 0.45s 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }

        .section-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 16px; font-weight: 700;
          color: var(--text); letter-spacing: -0.3px;
        }

        .see-all {
          font-size: 13px; color: var(--accent);
          font-weight: 500; text-decoration: none;
          transition: opacity 0.15s;
        }

        .see-all:hover { opacity: 0.7; }

        /* Bill rows */
        .bill-list { display: flex; flex-direction: column; gap: 8px; }

        .bill-row {
          display: flex; align-items: center; gap: 14px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 16px; padding: 14px 16px;
          transition: all 0.15s; cursor: pointer;
        }

        .bill-row:hover { background: var(--surface); border-color: var(--text-muted); }
        .bill-row:active { transform: scale(0.99); }

        .bill-icon {
          width: 42px; height: 42px;
          background: var(--border); border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }

        .bill-info { flex: 1; min-width: 0; }

        .bill-title {
          font-size: 14px; font-weight: 500; color: var(--text);
          margin-bottom: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .bill-date { font-size: 12px; color: var(--text-muted); }

        .bill-amount {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          color: var(--danger); flex-shrink: 0;
          letter-spacing: -0.3px;
        }

        .bill-amount.paid { color: var(--success); }

        /* Empty state */
        .empty {
          text-align: center; padding: 56px 24px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 20px;
        }

        .empty-emoji { font-size: 36px; margin-bottom: 14px; }

        .empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 16px; font-weight: 700;
          color: var(--text); margin-bottom: 6px;
        }

        .empty-sub { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%,100% { opacity:1; transform: scale(1); }
          50% { opacity:.6; transform: scale(.95); }
        }
      `}</style>

      <div className="dash">

        {/* Top bar */}
        <div className="dash-topbar">
          <div>
            <p className="dash-greeting">{greeting},</p>
            <h1 className="dash-username">{firstName} 👋</h1>
          </div>
        </div>

        {/* Main grid */}
        <div className="dash-grid">

          {/* Balance card */}
          <div className="balance-card">
            <div className="balance-inner">
              <div className="balance-left">
                <p className="balance-label">Total balance owed</p>
                <div className="balance-amount">
                  <span className="currency">₦</span>
                  {totalBalance > 0
                    ? totalBalance.toLocaleString("en-NG")
                    : hasHousehold ? "0" : "—"}
                </div>
                <p className="balance-sub">
                  {totalBalance > 0
                    ? <><strong>{formatNaira(totalBalance)}</strong> outstanding across active bills</>
                    : hasHousehold
                    ? <>You&apos;re <strong>all settled up</strong> 🎉</>
                    : <>Set up your household to start tracking</>}
                </p>
              </div>
              <div className="balance-actions">
                <button className="fund-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Add Bill
                </button>
                {hasHousehold && (
                  <button className="outline-btn">
                    View all
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          {hasHousehold && (
            <>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-value">{bills.filter(b => !b.is_paid).length}</div>
                <div className="stat-label">Unpaid bills</div>
              </div>
              <div className="stat-card accent">
                <div className="stat-icon">💸</div>
                <div className="stat-value">{formatNaira(totalPaid)}</div>
                <div className="stat-label">Total paid this month</div>
              </div>
            </>
          )}

          {/* Housemate avatars row */}
          {hasHousehold && housemates.length > 0 && (
            <div style={{
              gridColumn: "1 / -1",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "22px 24px",
              animation: "fadeUp 0.4s 0.12s cubic-bezier(0.16,1,0.3,1) both",
            }}>
              {/* Header row */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 18,
              }}>
                <div>
                  <p style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 15, fontWeight: 700, color: "var(--text)",
                    letterSpacing: "-0.3px", marginBottom: 2,
                  }}>
                    Housemates
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {housemateCount} {housemateCount === 1 ? "person" : "people"} in your household
                  </p>
                </div>
                <a href="/dashboard/housemates" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, fontSize: 12, color: "var(--text-muted)",
                  fontWeight: 500, textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}>
                  Manage
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>

              {/* Avatar cards - horizontal scroll on mobile */}
              <div style={{
                display: "flex", gap: 10,
                overflowX: "auto", paddingBottom: 2,
              }}>
                {housemates.slice(0, 8).map((hm, i) => {
                  const name = hm.full_name || "?";
                  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  const bgColors = [
                    "rgba(200,241,53,0.08)", "rgba(99,102,241,0.1)",
                    "rgba(245,158,11,0.1)", "rgba(34,197,94,0.1)",
                    "rgba(239,68,68,0.1)", "rgba(59,130,246,0.1)",
                    "rgba(236,72,153,0.1)", "rgba(20,184,166,0.1)",
                  ];
                  const accentColors = [
                    "#C8F135", "#818CF8", "#F59E0B", "#22C55E",
                    "#EF4444", "#3B82F6", "#EC4899", "#14B8A6",
                  ];
                  const bg = bgColors[i % bgColors.length];
                  const accent = accentColors[i % accentColors.length];
                  const firstName = name.split(" ")[0];

                  return (
                    <div key={hm.user_id} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 8, flexShrink: 0,
                      padding: "14px 16px",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      minWidth: 80,
                      transition: "border-color 0.15s",
                    }}>
                      {/* Avatar circle */}
                      <div style={{
                        width: 44, height: 44,
                        borderRadius: "50%",
                        background: bg,
                        border: `2px solid ${accent}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14, fontWeight: 700,
                        color: accent,
                      }}>
                        {initials}
                      </div>
                      {/* Name */}
                      <span style={{
                        fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
                        fontFamily: "'DM Sans', sans-serif",
                        maxWidth: 64, textAlign: "center",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {firstName}
                      </span>
                    </div>
                  );
                })}

                {/* +N overflow card */}
                {housemates.length > 8 && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 8, flexShrink: 0,
                    padding: "14px 16px",
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 16, minWidth: 80,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
                      fontFamily: "'Syne', sans-serif",
                    }}>
                      +{housemates.length - 8}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasHousehold && (
            <div className="setup-card">
              <p className="setup-title">Set up your household</p>
              <p className="setup-sub">
                Create a household and invite your housemates to start splitting bills automatically.
                Each person gets their own share calculated instantly.
              </p>
              <button className="setup-btn">
                Create household
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}


          {/* Recent bills */}
          <div className="recent-section">
            <div className="section-header">
              <span className="section-title">Recent bills</span>
              <a href="/dashboard/bills" className="see-all">See all →</a>
            </div>

            {bills.length > 0 ? (
              <div className="bill-list">
                {bills.slice(0, 6).map((bill) => (
                  <div className="bill-row" key={bill.id}>
                    <div className="bill-icon">
                      {categoryIcons[bill.category] || "📋"}
                    </div>
                    <div className="bill-info">
                      <div className="bill-title">{bill.title}</div>
                      <div className="bill-date">{timeAgo(bill.created_at)}</div>
                    </div>
                    <div className={`bill-amount ${bill.is_paid ? "paid" : ""}`}>
                      {bill.is_paid ? "+" : "−"}{formatNaira(bill.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="empty-emoji">🧾</div>
                <p className="empty-title">No bills yet</p>
                <p className="empty-sub">
                  Add your first shared bill and Divvy<br />
                  will split it among your housemates automatically.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
