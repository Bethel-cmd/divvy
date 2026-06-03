"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

type Housemate = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  total_owed: number;
  total_paid: number;
};

type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    "rgba(200,241,53,0.15)", "rgba(99,102,241,0.15)",
    "rgba(245,158,11,0.15)", "rgba(34,197,94,0.15)",
    "rgba(239,68,68,0.15)",  "rgba(59,130,246,0.15)",
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

function getInitialsBorder(name: string) {
  const borders = [
    "#C8F135", "#6366F1", "#F59E0B", "#22C55E", "#EF4444", "#3B82F6",
  ];
  const i = name.charCodeAt(0) % borders.length;
  return borders[i];
}

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default function HousematesPage() {
  const [housemates, setHousemates] = useState<Housemate[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Housemate | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  async function loadData() {
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id);

    const supabase = createClient();

    const { data: myHm } = await supabase
      .from("housemates")
      .select("household_id, role")
      .eq("user_id", user.id)
      .single();

    if (!myHm) { router.push("/onboarding"); return; }
    setIsAdmin(myHm.role === "admin");

    const { data: houseData } = await supabase
      .from("households")
      .select("id, name, invite_code, created_by")
      .eq("id", myHm.household_id)
      .single();
    setHousehold(houseData);

    // Get housemates
    const { data: membersData } = await supabase
      .from("housemates")
      .select("id, user_id, role, joined_at")
      .eq("household_id", myHm.household_id);

    if (!membersData || membersData.length === 0) { setLoading(false); return; }

    // Get profiles using the exact user_ids from membersData
    const userIds = membersData.map(m => m.user_id.trim());

    const { data: profilesData, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    console.log("userIds:", userIds);
    console.log("profilesData:", profilesData);
    console.log("profErr:", profErr);

    // Build a lookup map by id for O(1) access
    const profileMap: Record<string, { full_name: string; email: string }> = {};
    (profilesData || []).forEach(p => {
      profileMap[p.id.trim()] = {
        full_name: p.full_name || p.email?.split("@")[0] || "Unknown",
        email: p.email || "",
      };
    });

    // Get bill shares
    const { data: billShares } = await supabase
      .from("bill_shares")
      .select("user_id, amount_owed, is_paid")
      .in("user_id", userIds);

    const enriched: Housemate[] = membersData.map(m => {
      const profile = profileMap[m.user_id.trim()] || { full_name: "Unknown", email: "" };
      const shares = (billShares || []).filter(s => s.user_id === m.user_id);
      const total_paid = shares.filter(s => s.is_paid).reduce((sum, s) => sum + Number(s.amount_owed), 0);
      const total_owed = shares.filter(s => !s.is_paid).reduce((sum, s) => sum + Number(s.amount_owed), 0);
      return { ...m, profiles: profile, total_paid, total_owed };
    });

    enriched.sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0));
    setHousemates(enriched);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  async function handleRemove(housemate: Housemate) {
    setRemovingId(housemate.id);
    const supabase = createClient();
    await supabase.from("housemates").delete().eq("id", housemate.id);
    setConfirmRemove(null);
    setRemovingId(null);
    await loadData();
  }

  async function copyCode() {
    if (!household) return;
    await navigator.clipboard.writeText(household.invite_code.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || authLoading) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        width: 40, height: 40, background: "var(--accent)", borderRadius: 12,
        animation: "pulse 1.4s ease-in-out infinite",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .hm-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
        }

        /* Top bar */
        .hm-topbar {
          padding: 20px 40px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 28px;
        }

        .hm-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px; font-weight: 700;
          color: var(--text); letter-spacing: -0.6px;
          margin-bottom: 4px;
        }

        .hm-subtitle {
          font-size: 13px; color: var(--text-muted);
        }

        /* Invite code card */
        .invite-card {
          background: rgba(200,241,53,0.05);
          border: 1px solid rgba(200,241,53,0.12);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .invite-label {
          font-size: 10px; color: var(--text-muted);
          letter-spacing: 0.8px; text-transform: uppercase;
          font-weight: 500; margin-bottom: 4px;
        }

        .invite-code {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800;
          color: var(--accent); letter-spacing: 4px;
        }

        .copy-btn {
          padding: 8px 14px;
          background: var(--border); border: 1px solid var(--border);
          border-radius: 9px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500;
          color: var(--text-muted); transition: all 0.15s;
          white-space: nowrap;
        }
        .copy-btn:hover { background: var(--surface); color: var(--text); }
        .copy-btn.copied {
          background: rgba(200,241,53,0.08);
          color: var(--accent); border-color: rgba(200,241,53,0.2);
        }

        /* Content grid */
        .hm-content {
          padding: 32px 40px;
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          align-items: start;
        }

        /* Members list */
        .members-panel {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
        }

        .panel-header {
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          color: var(--text); letter-spacing: -0.2px;
        }

        .member-count {
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 3px 10px;
          font-size: 12px; color: var(--text-muted);
          font-weight: 500;
        }

        /* Member row */
        .member-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
          animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }

        .member-row:last-child { border-bottom: none; }
        .member-row:hover { background: var(--surface); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Avatar */
        .member-avatar {
          width: 44px; height: 44px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          flex-shrink: 0;
          border: 1.5px solid transparent;
        }

        /* Info */
        .member-info { flex: 1; min-width: 0; }

        .member-name {
          font-size: 14px; font-weight: 500; color: var(--text);
          margin-bottom: 2px;
          display: flex; align-items: center; gap: 8px;
        }

        .member-email {
          font-size: 12px; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Badges */
        .badge {
          padding: 2px 8px; border-radius: 6px;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.3px; flex-shrink: 0;
        }

        .badge-admin {
          background: rgba(200,241,53,0.1);
          color: #C8F135;
          border: 1px solid rgba(200,241,53,0.2);
        }

        .badge-you {
          background: rgba(99,102,241,0.1);
          color: #818CF8;
          border: 1px solid rgba(99,102,241,0.2);
        }

        /* Payment info */
        .member-payment {
          text-align: right; flex-shrink: 0;
        }

        .payment-owed {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          letter-spacing: -0.3px; margin-bottom: 2px;
        }
        .payment-owed.has-debt { color: var(--danger); }
        .payment-owed.settled  { color: var(--success); }

        .payment-label { font-size: 11px; color: var(--text-muted); }

        /* Remove button */
        .remove-btn {
          width: 32px; height: 32px;
          background: none; border: 1px solid var(--border);
          border-radius: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; flex-shrink: 0;
          margin-left: 8px;
        }
        .remove-btn:hover {
          background: rgba(255,85,85,0.08);
          border-color: rgba(255,85,85,0.3);
        }

        /* Right sidebar panel */
        .sidebar-panels {
          display: flex; flex-direction: column; gap: 16px;
        }

        .info-panel {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          animation: fadeUp 0.4s 0.1s cubic-bezier(0.16,1,0.3,1) both;
        }

        .info-panel-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--text);
          margin-bottom: 16px; letter-spacing: -0.2px;
        }

        /* Stats */
        .stat-row {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .stat-row:last-child { border-bottom: none; }

        .stat-row-label { font-size: 12px; color: var(--text-muted); }
        .stat-row-value {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700; color: var(--text);
          letter-spacing: -0.3px;
        }
        .stat-row-value.accent { color: var(--accent); }
        .stat-row-value.danger { color: var(--danger); }
        .stat-row-value.success { color: var(--success); }

        /* Confirm remove modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease both;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px;
          width: 100%; max-width: 380px;
          margin: 24px;
          animation: scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }

        .modal-icon {
          width: 52px; height: 52px;
          background: rgba(255,85,85,0.1);
          border: 1px solid rgba(255,85,85,0.2);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 20px;
        }

        .modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 700; color: var(--text);
          letter-spacing: -0.4px; margin-bottom: 8px;
        }

        .modal-sub {
          font-size: 13px; color: var(--text-muted);
          line-height: 1.6; margin-bottom: 24px;
        }

        .modal-sub strong { color: var(--text); }

        .modal-actions { display: flex; gap: 10px; }

        .modal-cancel {
          flex: 1; padding: 12px;
          background: var(--border); border: 1px solid var(--border);
          border-radius: 12px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: var(--text-muted);
          transition: all 0.15s;
        }
        .modal-cancel:hover { background: var(--surface); color: var(--text); }

        .modal-confirm {
          flex: 1; padding: 12px;
          background: rgba(255,85,85,0.1);
          border: 1px solid rgba(255,85,85,0.25);
          border-radius: 12px; cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700; color: var(--danger);
          transition: all 0.15s;
        }
        .modal-confirm:hover { background: rgba(255,85,85,0.18); }
        .modal-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 1024px) {
          .hm-topbar { padding: 32px 32px; gap: 16px; }
          .hm-content { padding: 24px 32px; gap: 20px; }
          .invite-card { padding: 16px 20px; }
          .invite-label { font-size: 11px; }
          .invite-code { font-size: 18px; }
          .hm-title { font-size: 24px; }
          .member-row { padding: 13px 14px; }
          .modal-card { padding: 26px; }
        }

        @media (max-width: 900px) {
          .hm-content { grid-template-columns: 1fr; gap: 16px; }
          .sidebar-panels { order: -1; }
          .hm-topbar { padding: 24px 24px; flex-direction: column; gap: 16px; }
          .hm-content { padding: 20px 24px; }
          .hm-title { font-size: 22px; margin-bottom: 2px; }
          .hm-subtitle { font-size: 12px; }
          .invite-card { width: 100%; padding: 14px 16px; border-radius: 12px; }
          .invite-label { font-size: 10px; margin-bottom: 4px; }
          .invite-code { font-size: 16px; letter-spacing: 1px; }
          .copy-btn { padding: 7px 12px; font-size: 11px; border-radius: 8px; }
          .panel-header { padding: 12px 0; }
          .panel-title { font-size: 14px; }
          .member-count { font-size: 11px; }
          .member-row { padding: 11px 12px; gap: 10px; border-radius: 12px; }
          .member-avatar { width: 36px; height: 36px; font-size: 13px; border-radius: 10px; }
          .member-name { font-size: 12px; margin-bottom: 1px; }
          .member-sub { font-size: 10px; }
          .member-btn { width: 28px; height: 28px; min-width: 28px; }
          .member-btn svg { width: 14px; height: 14px; }
          .modal-card { padding: 22px; margin: 16px; border-radius: 18px; }
          .modal-title { font-size: 16px; margin-bottom: 6px; }
          .modal-sub { font-size: 12px; }
          .modal-input { padding: 11px 11px; font-size: 13px; }
          .modal-actions { gap: 8px; margin-top: 6px; }
          .modal-btn { padding: 10px; font-size: 12px; }
        }

        @media (max-width: 640px) {
          .hm-root { min-height: 100vh; }
          .hm-topbar { padding: 18px 16px; gap: 12px; align-items: stretch; }
          .hm-content { padding: 12px 16px; gap: 12px; }
          .hm-title { font-size: 20px; letter-spacing: -0.3px; }
          .hm-subtitle { font-size: 11px; margin-bottom: 8px; }
          .invite-card { padding: 12px 14px; gap: 10px; flex-wrap: wrap; }
          .invite-label { font-size: 9px; letter-spacing: 0.3px; margin-bottom: 2px; }
          .invite-code { font-size: 14px; letter-spacing: 0; }
          .copy-btn { padding: 6px 10px; font-size: 10px; border-radius: 7px; }
          .panel-header { padding: 10px 0; }
          .panel-title { font-size: 13px; }
          .member-count { font-size: 10px; }
          .member-row { padding: 10px 11px; gap: 8px; border-radius: 10px; }
          .member-avatar { width: 32px; height: 32px; font-size: 11px; border-radius: 8px; }
          .member-name { font-size: 11px; }
          .member-sub { font-size: 9px; }
          .member-btn { width: 24px; height: 24px; }
          .member-btn svg { width: 12px; height: 12px; }
          .remove-card { padding: 12px 0; }
          .remove-label { font-size: 12px; }
          .remove-sub { font-size: 10px; margin-bottom: 8px; }
          .remove-btn { padding: 8px 12px; font-size: 11px; border-radius: 8px; }
          .modal-card { padding: 18px; margin: 12px; border-radius: 16px; max-width: 85vw; }
          .modal-title { font-size: 14px; margin-bottom: 4px; }
          .modal-sub { font-size: 11px; margin-bottom: 12px; }
          .modal-label { font-size: 9px; margin-bottom: 3px; }
          .modal-input { padding: 10px 10px; font-size: 12px; border-radius: 8px; }
          .modal-actions { gap: 6px; }
          .modal-btn { padding: 9px; font-size: 11px; }
        }

        @media (max-width: 480px) {
          .hm-topbar { padding: 14px 12px; }
          .hm-content { padding: 10px 12px; gap: 10px; }
          .hm-title { font-size: 18px; }
          .hm-subtitle { font-size: 10px; }
          .invite-card { padding: 10px 12px; gap: 8px; border-radius: 10px; }
          .invite-label { font-size: 8px; margin-bottom: 1px; }
          .invite-code { font-size: 12px; letter-spacing: -0.5px; }
          .copy-btn { padding: 5px 8px; font-size: 9px; border-radius: 6px; }
          .panel-header { padding: 8px 0; }
          .panel-title { font-size: 12px; }
          .member-count { font-size: 9px; }
          .member-row { padding: 8px 10px; gap: 6px; border-radius: 9px; }
          .member-avatar { width: 28px; height: 28px; font-size: 10px; }
          .member-name { font-size: 10px; }
          .member-sub { font-size: 8px; }
          .member-btn { width: 20px; height: 20px; }
          .member-btn svg { width: 10px; height: 10px; }
          .remove-card { padding: 10px 0; }
          .remove-label { font-size: 11px; }
          .remove-sub { font-size: 9px; }
          .remove-btn { padding: 7px 10px; font-size: 10px; }
          .modal-card { padding: 16px; margin: 10px; border-radius: 14px; }
          .modal-title { font-size: 13px; }
          .modal-sub { font-size: 10px; }
          .modal-input { padding: 9px; font-size: 11px; }
          .modal-btn { padding: 8px; font-size: 10px; }
        }
      `}</style>

      <div className="hm-root">

        {/* Top bar */}
        <div className="hm-topbar">
          <div>
            <h1 className="hm-title">
              {household?.name || "Your Household"}
            </h1>
            <p className="hm-subtitle">
              {housemates.length} {housemates.length === 1 ? "member" : "members"} · Manage your shared space
            </p>
          </div>

          {/* Invite code */}
          <div className="invite-card">
            <div>
              <div className="invite-label">Invite code</div>
              <div className="invite-code">
                {household?.invite_code?.toUpperCase()}
              </div>
            </div>
            <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyCode}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="hm-content">

          {/* Members list */}
          <div className="members-panel">
            <div className="panel-header">
              <span className="panel-title">Members</span>
              <span className="member-count">{housemates.length} people</span>
            </div>

            {housemates.map((hm, i) => {
              const name = hm.profiles?.full_name || "Unknown";
              const email = hm.profiles?.email || "";
              const isMe = hm.user_id === currentUserId;
              const isHmAdmin = hm.role === "admin";

              return (
                <div
                  className="member-row"
                  key={hm.id}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Avatar */}
                  <div
                    className="member-avatar"
                    style={{
                      background: getAvatarColor(name),
                      borderColor: getInitialsBorder(name),
                      color: getInitialsBorder(name),
                    }}
                  >
                    {getInitials(name)}
                  </div>

                  {/* Info */}
                  <div className="member-info">
                    <div className="member-name">
                      {name}
                      {isHmAdmin && <span className="badge badge-admin">Room owner</span>}
                      {isMe && <span className="badge badge-you">You</span>}
                    </div>
                    <div className="member-email">{email}</div>
                  </div>

                  {/* Payment status */}
                  <div className="member-payment">
                    <div className={`payment-owed ${hm.total_owed > 0 ? "has-debt" : "settled"}`}>
                      {hm.total_owed > 0 ? `−${formatNaira(hm.total_owed)}` : "Settled"}
                    </div>
                    <div className="payment-label">
                      {hm.total_owed > 0 ? "still owes" : formatNaira(hm.total_paid) + " paid"}
                    </div>
                  </div>

                  {/* Remove button — admin only, can't remove self or other admin */}
                  {isAdmin && !isMe && !isHmAdmin && (
                    <button
                      className="remove-btn"
                      onClick={() => setConfirmRemove(hm)}
                      title={`Remove ${name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#FF5555" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right sidebar */}
          <div className="sidebar-panels">

            {/* Household summary */}
            <div className="info-panel">
              <div className="info-panel-title">Household summary</div>
              <div className="stat-row">
                <span className="stat-row-label">Total members</span>
                <span className="stat-row-value">{housemates.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Total paid (all)</span>
                <span className="stat-row-value success">
                  {formatNaira(housemates.reduce((s, h) => s + h.total_paid, 0))}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Total outstanding</span>
                <span className="stat-row-value danger">
                  {formatNaira(housemates.reduce((s, h) => s + h.total_owed, 0))}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Settled up</span>
                <span className="stat-row-value accent">
                  {housemates.filter(h => h.total_owed === 0).length} / {housemates.length}
                </span>
              </div>
            </div>

            {/* How to invite */}
            <div className="info-panel">
              <div className="info-panel-title">Invite a housemate</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 14 }}>
                Share your invite code with anyone you want to add. They sign up for Divvy, choose <strong style={{ color: "var(--text)" }}>"Join existing household"</strong>, and enter the code below.
              </p>
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
              }}>
                <span style={{
                  fontFamily: "'Syne', sans-serif", fontSize: 18,
                  fontWeight: 800, color: "var(--accent)", letterSpacing: 4
                }}>
                  {household?.invite_code?.toUpperCase()}
                </span>
                <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyCode}>
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Your status */}
            <div className="info-panel">
              <div className="info-panel-title">Your status</div>
              {(() => {
                const me = housemates.find(h => h.user_id === currentUserId);
                if (!me) return null;
                return (
                  <>
                    <div className="stat-row">
                      <span className="stat-row-label">Role</span>
                      <span className="stat-row-value accent">{me.role === "admin" ? "Room owner" : "Member"}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-row-label">You owe</span>
                      <span className={`stat-row-value ${me.total_owed > 0 ? "danger" : "success"}`}>
                        {me.total_owed > 0 ? formatNaira(me.total_owed) : "All clear ✓"}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-row-label">You've paid</span>
                      <span className="stat-row-value success">{formatNaira(me.total_paid)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-row-label">Joined</span>
                      <span className="stat-row-value">
                        {new Date(me.joined_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      </div>

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <div className="modal-title">Remove housemate?</div>
            <div className="modal-sub">
              <strong>{confirmRemove.profiles?.full_name}</strong> will lose access to the household and all shared bills. This cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirmRemove(null)}>
                Cancel
              </button>
              <button
                className="modal-confirm"
                disabled={removingId === confirmRemove.id}
                onClick={() => handleRemove(confirmRemove)}
              >
                {removingId === confirmRemove.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
