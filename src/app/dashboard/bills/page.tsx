"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  requestVerification,
  verifyPayment,
  rejectPayment,
} from "@/lib/verification";

type Bill = {
  id: string;
  title: string;
  amount: number;
  category: string;
  created_at: string;
  due_date: string | null;
  is_recurring: boolean;
  created_by: string;
  household_id: string;
  shares?: BillShare[];
};

type BillShare = {
  id: string;
  bill_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  paid_at: string | null;
  status: "unpaid" | "pending_verification" | "verified" | "rejected";
  rejection_reason: string | null;
  payment_note: string | null;
  profile?: { full_name: string; email: string };
};

type Housemate = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
};

const CATEGORIES = [
  { value: "electricity", label: "Electricity", icon: "⚡" },
  { value: "water",       label: "Water",       icon: "💧" },
  { value: "internet",    label: "Internet",    icon: "📡" },
  { value: "rent",        label: "Rent",        icon: "🏠" },
  { value: "groceries",   label: "Groceries",   icon: "🛒" },
  { value: "other",       label: "Other",       icon: "📋" },
];

const CAT_COLORS: Record<string, string> = {
  electricity: "rgba(245,158,11,0.12)",
  water:       "rgba(59,130,246,0.12)",
  internet:    "rgba(99,102,241,0.12)",
  rent:        "rgba(200,241,53,0.1)",
  groceries:   "rgba(34,197,94,0.12)",
  other:       "rgba(255,255,255,0.06)",
};

const STATUS_CONFIG = {
  unpaid:               { label: "Unpaid",    color: "#FF5555", bg: "rgba(255,85,85,0.1)",    icon: "○" },
  pending_verification: { label: "Pending",   color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   icon: "⏳" },
  verified:             { label: "Verified",  color: "#22C55E", bg: "rgba(34,197,94,0.1)",    icon: "✓" },
  rejected:             { label: "Rejected",  color: "#FF5555", bg: "rgba(255,85,85,0.1)",    icon: "✕" },
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

function formatNaira(n: number) { return "₦" + Number(n).toLocaleString("en-NG"); }
function getInitials(name: string) { return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }
function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function formatNairaFull(n: number) {
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "₦" + (n / 1_000).toFixed(0) + "k";
  return "₦" + Number(n).toLocaleString("en-NG");
}

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

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [housemates, setHousemates] = useState<Housemate[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [myName, setMyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<"all" | "unpaid" | "pending" | "verified">("all");
  const [submitting, setSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<"bills" | "analytics">("bills");

  // Add bill form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("electricity");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState("");

  // Verification modals
  const [payModal, setPayModal] = useState<BillShare | null>(null);
  const [payNote, setPayNote] = useState("");
  const [rejectModal, setRejectModal] = useState<BillShare | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [verifying, setVerifying] = useState(false);

  const router = useRouter();

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id);

    const { data: hm } = await supabase
      .from("housemates").select("household_id, role").eq("user_id", user.id).single();
    if (!hm) { router.push("/onboarding"); return; }
    setHouseholdId(hm.household_id);
    setIsAdmin(hm.role === "admin");

    // Load all housemates
    const { data: hmData } = await supabase
      .from("housemates").select("user_id, role").eq("household_id", hm.household_id);

    if (hmData?.length) {
      const ids = hmData.map(h => h.user_id);
      const { data: profData } = await supabase
        .from("profiles").select("id, full_name, email").in("id", ids);

      const enriched = hmData.map(h => {
        const p = profData?.find(p => p.id === h.user_id);
        return { user_id: h.user_id, role: h.role, full_name: p?.full_name || p?.email?.split("@")[0] || "Unknown", email: p?.email || "" };
      });
      setHousemates(enriched);

      const admin = enriched.find(h => h.role === "admin");
      const me = enriched.find(h => h.user_id === user.id);
      if (admin) { setAdminUserId(admin.user_id); setAdminName(admin.full_name); }
      if (me) setMyName(me.full_name);
    }

    // Load bills
    const { data: billsData } = await supabase
      .from("bills").select("*").eq("household_id", hm.household_id)
      .order("created_at", { ascending: false });

    if (billsData?.length) {
      const billIds = billsData.map(b => b.id);
      const { data: sharesData } = await supabase
        .from("bill_shares").select("*").in("bill_id", billIds);
      const allUserIds = [...new Set((sharesData || []).map(s => s.user_id))];
      const { data: shareProfiles } = await supabase
        .from("profiles").select("id, full_name, email").in("id", allUserIds);

      setBills(billsData.map(bill => ({
        ...bill,
        shares: (sharesData || []).filter(s => s.bill_id === bill.id).map(s => ({
          ...s,
          status: s.status || "unpaid",
          profile: shareProfiles?.find(p => p.id === s.user_id) || { full_name: "Unknown", email: "" },
        })),
      })));
    } else { setBills([]); }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleAddBill() {
    if (!title.trim()) { setFormError("Please enter a bill title."); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setFormError("Please enter a valid amount."); return; }
    if (housemates.length === 0) { setFormError("No housemates found."); return; }
    setSubmitting(true); setFormError("");
    const supabase = createClient();

    const { data: bill, error: billErr } = await supabase.from("bills").insert({
      household_id: householdId, title: title.trim(), amount: Number(amount),
      category, due_date: dueDate || null, is_recurring: isRecurring,
      split_type: "equal", created_by: currentUserId,
    }).select().single();

    if (billErr || !bill) { setFormError(billErr?.message || "Failed to create bill."); setSubmitting(false); return; }

    const shareAmount = Math.round((Number(amount) / housemates.length) * 100) / 100;
    const { error: sharesErr } = await supabase.from("bill_shares").insert(
      housemates.map(hm => ({
        bill_id: bill.id, user_id: hm.user_id,
        amount_owed: shareAmount, is_paid: false, status: "unpaid",
      }))
    );

    if (sharesErr) { setFormError(sharesErr.message); setSubmitting(false); return; }

    // Notify all housemates about new bill
    const otherHousemates = housemates.filter(h => h.user_id !== currentUserId);
    if (otherHousemates.length > 0) {
      await supabase.from("notifications").insert(
        otherHousemates.map(h => ({
          household_id: householdId,
          user_id: h.user_id,
          type: "bill_added",
          title: "New bill added",
          message: `${myName} added "${title.trim()}" — your share is ${formatNaira(shareAmount)}.`,
          metadata: { bill_id: bill.id, amount: shareAmount },
        }))
      );
    }

    setTitle(""); setAmount(""); setCategory("electricity"); setDueDate(""); setIsRecurring(false);
    setPanelOpen(false);
    await loadData();
    setSubmitting(false);
  }

  async function handleRequestVerification() {
    if (!payModal) return;
    setVerifying(true);
    try {
      const bill = bills.find(b => b.shares?.some(s => s.id === payModal.id));
      await requestVerification(
        payModal.id, payModal.bill_id, householdId,
        payNote, adminUserId, bill?.title || "Bill",
        myName, payModal.amount_owed
      );
      setPayModal(null); setPayNote("");
      await loadData();
      if (selectedBill) {
        const updated = bills.find(b => b.id === selectedBill.id);
        if (updated) setSelectedBill({ ...updated });
      }
    } catch (e: any) { alert(e.message); }
    setVerifying(false);
  }

  async function handleVerify(share: BillShare) {
    if (!selectedBill) return;
    setVerifying(true);
    try {
      await verifyPayment(
        share.id, share.bill_id, householdId,
        share.user_id, selectedBill.title,
        myName, currentUserId, share.amount_owed
      );
      await loadData();
    } catch (e: any) { alert(e.message); }
    setVerifying(false);
  }

  async function handleReject() {
    if (!rejectModal || !selectedBill) return;
    setVerifying(true);
    try {
      await rejectPayment(
        rejectModal.id, rejectModal.bill_id, householdId,
        rejectModal.user_id, selectedBill.title,
        myName, rejectReason, rejectModal.amount_owed
      );
      setRejectModal(null); setRejectReason("");
      await loadData();
    } catch (e: any) { alert(e.message); }
    setVerifying(false);
  }

  async function handleDeleteBill(billId: string) {
    const supabase = createClient();
    await supabase.from("bill_shares").delete().eq("bill_id", billId);
    await supabase.from("bills").delete().eq("id", billId);
    setSelectedBill(null);
    await loadData();
  }

  const pendingVerifications = bills.flatMap(b =>
    (b.shares || []).filter(s => s.status === "pending_verification")
  ).length;

  const filteredBills = bills.filter(b => {
    if (filter === "all") return true;

    const myShare = b.shares?.find(s => s.user_id === currentUserId);

    if (filter === "unpaid") {
      if (myShare?.status === "unpaid" || myShare?.status === "rejected") return true;
      if (isAdmin) return b.shares?.some(s => s.status === "unpaid" || s.status === "rejected");
      return false;
    }
    
    if (filter === "verified") {
      if (myShare?.status === "verified") return true;
      if (isAdmin) return b.shares?.some(s => s.status === "verified");
      return false;
    }
    
    if (filter === "pending") {
      if (myShare?.status === "pending_verification") return true;
      if (isAdmin) return b.shares?.some(s => s.status === "pending_verification");
      return false;
    }

    return true;
  });

  const totalOwed = bills.reduce((sum, b) => {
    const s = b.shares?.find(s => s.user_id === currentUserId && s.status === "unpaid");
    return sum + (s ? Number(s.amount_owed) : 0);
  }, 0);

  const totalPaid = bills.reduce((sum, b) => {
    const s = b.shares?.find(s => s.user_id === currentUserId && s.status === "verified");
    return sum + (s ? Number(s.amount_owed) : 0);
  }, 0);

  const AVATAR_COLORS = ["#C8F135","#818CF8","#F59E0B","#22C55E","#EF4444","#3B82F6"];
  const AVATAR_BGS = ["rgba(200,241,53,.1)","rgba(99,102,241,.1)","rgba(245,158,11,.1)","rgba(34,197,94,.1)","rgba(239,68,68,.1)","rgba(59,130,246,.1)"];

  if (loading) return (
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
        .br{min-height:100vh;background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--text)}
        .btb{padding:20px 40px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:20px}
        .btt{font-family:'Syne',sans-serif;font-size:26px;font-weight:700;color:var(--text);letter-spacing:-.6px;margin-bottom:4px}
        .bts{font-size:13px;color:var(--text-muted)}
        .add-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:var(--accent);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--bg);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s cubic-bezier(.16,1,.3,1)}
        .add-btn:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,241,53,.25)}
        .add-btn:active{transform:scale(.97)}
        /* Pending admin banner */
        .pending-banner{margin:16px 40px 0;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .pending-banner-icon{font-size:18px;flex-shrink:0}
        .pending-banner-text{flex:1;font-size:13px;color:var(--text-muted)}
        .pending-banner-text strong{color:#F59E0B}
        .pending-banner-btn{padding:7px 14px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:9px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#F59E0B;cursor:pointer;transition:all .15s;white-space:nowrap}
        .pending-banner-btn:hover{background:rgba(245,158,11,.18)}
        /* Summary */
        .sr{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:28px 40px 0}
        .sc{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px 22px;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .sl{font-size:11px;color:var(--text-muted);letter-spacing:.7px;text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .sv{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;letter-spacing:-1px;line-height:1}
        .sv.d{color:#FF5555}.sv.s{color:#22C55E}.sv.n{color:var(--text)}.sv.w{color:#F59E0B}
        /* Filters */
        .fr{display:flex;align-items:center;gap:8px;padding:24px 40px 0}
        .ft{padding:7px 16px;background:transparent;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .15s}
        .ft:hover{border-color:var(--text-muted);color:var(--text)}
        .ft.a{background:rgba(200,241,53,.08);border-color:rgba(200,241,53,.25);color:var(--accent)}
        .ft.pending-tab.a{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.25);color:#F59E0B}
        /* Bills list */
        .bl{padding:20px 40px 40px;display:flex;flex-direction:column;gap:10px}
        .bc{display:flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 20px;cursor:pointer;transition:all .15s;animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both}
        .bc:hover{background:var(--surface-2);border-color:var(--text-muted);transform:translateX(2px)}
        .bc.sel{border-color:rgba(200,241,53,.3);background:rgba(200,241,53,.03)}
        .bci{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .bi{flex:1;min-width:0}
        .bn{font-size:14px;font-weight:500;color:var(--text);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bm{font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px}
        .bright{text-align:right;flex-shrink:0}
        .ba{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;letter-spacing:-.3px;margin-bottom:4px}
        .bsb{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:.3px}
        /* Empty */
        .es{text-align:center;padding:80px 24px;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .ei{width:64px;height:64px;background:var(--surface-2);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px}
        .et{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--text);margin-bottom:6px}
        .esub{font-size:13px;color:var(--text-muted);line-height:1.7}
        /* Slide panel */
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:150;animation:fadeIn .2s ease both}
        .sp{position:fixed;top:0;right:0;bottom:0;width:440px;max-width:100vw;background:var(--surface);border-left:1px solid var(--border);z-index:151;display:flex;flex-direction:column;animation:slideIn .35s cubic-bezier(.16,1,.3,1) both;overflow:hidden}
        .ph{padding:24px 28px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .pt{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);letter-spacing:-.4px}
        .pc{width:34px;height:34px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .pc:hover{background:var(--border)}
        .pb{flex:1;overflow-y:auto;padding:24px 28px}
        .flab{display:block;font-size:11px;font-weight:500;color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
        .fi{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:13px 14px;font-family:'DM Sans',sans-serif;font-size:15px;color:var(--text);outline:none;transition:border-color .15s;margin-bottom:16px}
        .fi::placeholder{color:var(--text-muted)}
        .fi:focus{border-color:var(--accent)}
        .cg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .cb{padding:10px 8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s}
        .cb:hover{border-color:var(--text-muted)}
        .cb.cs{background:rgba(200,241,53,.07);border-color:rgba(200,241,53,.3)}
        .cbi{font-size:18px}
        .cbl{font-size:11px;color:var(--text-muted);font-weight:500;font-family:'DM Sans',sans-serif}
        .cb.cs .cbl{color:var(--accent)}
        .sprev{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:4px}
        .sprevl{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;font-weight:500;margin-bottom:12px}
        .spr{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
        .spr:last-child{border-bottom:none}
        .sprn{font-size:13px;color:var(--text-muted)}
        .spra{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent)}
        .tr{display:flex;align-items:center;justify-content:space-between;padding:4px 0}
        .tl{font-size:14px;color:var(--text-muted)}
        .tog{width:44px;height:24px;border-radius:12px;background:var(--border);border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
        .tog.on{background:var(--accent)}
        .tt{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:9px;background:#fff;transition:transform .2s cubic-bezier(.16,1,.3,1)}
        .tog.on .tt{transform:translateX(20px);background:var(--bg)}
        .fe{background:rgba(255,85,85,.08);border:1px solid rgba(255,85,85,.2);color:#FF6B6B;font-size:13px;padding:11px 14px;border-radius:10px;margin-bottom:16px}
        .subbtn{width:100%;padding:15px;background:var(--accent);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--bg);cursor:pointer;transition:all .2s cubic-bezier(.16,1,.3,1);margin-top:8px}
        .subbtn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
        .subbtn:disabled{opacity:.45;cursor:not-allowed}
        .spn{display:inline-block;width:14px;height:14px;border:2px solid rgba(var(--bg-rgb),.3);border-top-color:var(--bg);border-radius:50%;animation:spin .65s linear infinite;vertical-align:middle;margin-right:8px}
        /* Detail panel shares */
        .ds{margin-bottom:24px}
        .dst{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px;font-weight:500;margin-bottom:12px}
        .dsr{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}
        .dsr:last-child{border-bottom:none}
        .dsrl{font-size:13px;color:var(--text-muted)}
        .dsrv{font-size:13px;color:var(--text);font-weight:500}
        .srow{display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:13px;margin-bottom:8px;transition:border-color .15s}
        .srow:last-child{margin-bottom:0}
        .sav{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;flex-shrink:0}
        .si{flex:1;min-width:0}
        .sn{font-size:13px;color:var(--text);font-weight:500;margin-bottom:2px}
        .ss{font-size:11px;color:var(--text-muted)}
        .sac{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
        .sam{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:-.3px}
        /* Verification action buttons */
        .verify-actions{display:flex;gap:6px;margin-top:4px}
        .verify-btn{padding:5px 11px;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;transition:all .15s;white-space:nowrap;border:1px solid}
        .verify-btn.confirm{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.2);color:#22C55E}
        .verify-btn.confirm:hover{background:rgba(34,197,94,.16)}
        .verify-btn.reject{background:rgba(255,85,85,.08);border-color:rgba(255,85,85,.2);color:#FF5555}
        .verify-btn.reject:hover{background:rgba(255,85,85,.16)}
        .verify-btn.request{background:rgba(200,241,53,.08);border-color:rgba(200,241,53,.2);color:var(--accent)}
        .verify-btn.request:hover{background:rgba(200,241,53,.16)}
        /* Rejection note */
        .reject-note{background:rgba(255,85,85,.06);border:1px solid rgba(255,85,85,.15);border-radius:9px;padding:8px 12px;font-size:11px;color:#FF6B6B;margin-top:4px}
        /* Delete */
        .delbtn{width:100%;padding:12px;background:rgba(255,85,85,.07);border:1px solid rgba(255,85,85,.15);border-radius:11px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#FF5555;transition:all .15s;margin-top:8px}
        .delbtn:hover{background:rgba(255,85,85,.12)}
        /* Pay modal */
        .modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:300;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease both}
        .modal-card{background:var(--surface-2);border:1px solid var(--border);border-radius:24px;padding:32px;width:100%;max-width:400px;margin:24px;animation:scaleIn .25s cubic-bezier(.16,1,.3,1) both}
        @keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
        .modal-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
        .modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);letter-spacing:-.4px;margin-bottom:8px}
        .modal-sub{font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:20px}
        .modal-actions{display:flex;gap:10px;margin-top:8px}
        .modal-cancel{flex:1;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:var(--text-muted);transition:all .15s}
        .modal-cancel:hover{background:var(--surface-2);color:var(--text)}
        .modal-confirm{flex:1;padding:12px;background:var(--accent);border:none;border-radius:12px;cursor:pointer;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--bg);transition:all .15s}
        .modal-confirm:hover{filter:brightness(1.1)}
        .modal-confirm:disabled{opacity:.45;cursor:not-allowed}
        .modal-confirm.danger{background:rgba(255,85,85,.1);border:1px solid rgba(255,85,85,.25);color:#FF5555}
        .modal-confirm.danger:hover{background:rgba(255,85,85,.18)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        /* Tabs */
        .tabs-container{display:none}
        .tabs{display:flex;gap:8px;padding:0 20px 16px;border-bottom:1px solid var(--border)}
        .tab-btn{padding:10px 16px;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .2s;white-space:nowrap}
        .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
        .tab-btn:hover{color:var(--text)}
        @media(max-width:768px) {
          .tabs-container{display:block}
          .btb{padding:28px 20px 20px; flex-direction:column; align-items:flex-start; gap:16px}
          .sr{grid-template-columns:1fr;padding:20px 20px 0}
          .fr{padding:16px 20px 0;flex-wrap:wrap}
          .bl{padding:16px 20px 40px}
          .sp{width:100vw}
          .ph{padding:16px 20px}
          .pb{padding:16px 20px}
          .pending-banner{margin:12px 20px 0; flex-direction:column; align-items:stretch}
          .pending-banner-btn{width:100%; text-align:center; margin-top:8px}
          .bc{padding:14px 16px; gap:12px}
          .bci{width:36px; height:36px; font-size:16px}
          .ba{font-size:14px}
          .modal-card{padding:24px; margin:16px}
          .srow{padding:12px; gap:8px; flex-wrap:wrap}
          .si{min-width:120px}
        }
      `}</style>

      <div className="br">
        {/* Top bar */}
        <div className="btb">
          <div>
            <h1 className="btt">Manage Bills</h1>
            <p className="bts">{bills.length} total · split equally among {housemates.length} housemates</p>
          </div>
          <button className="add-btn" onClick={() => { setPanelOpen(true); setSelectedBill(null); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#161616" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Add Bill
          </button>
        </div>

        {/* Mobile tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button className={`tab-btn ${currentTab === "bills" ? "active" : ""}`} onClick={() => setCurrentTab("bills")}>
              Bills
            </button>
            <button className={`tab-btn ${currentTab === "analytics" ? "active" : ""}`} onClick={() => setCurrentTab("analytics")}>
              📊 Analytics
            </button>
          </div>
        </div>

        {/* Admin pending verification banner */}
        {isAdmin && pendingVerifications > 0 && (
          <div className="pending-banner">
            <span className="pending-banner-icon">🕐</span>
            <span className="pending-banner-text">
              <strong>{pendingVerifications} payment{pendingVerifications > 1 ? "s" : ""}</strong> waiting for your verification
            </span>
            <button className="pending-banner-btn" onClick={() => setFilter("pending")}>
              Review now
            </button>
          </div>
        )}

          </div>
        </div>

        {/* ANALYTICS VIEW */}
        {currentTab === "analytics" && bills.length > 0 && (
          <div style={{ padding: "28px 40px 40px" }}>
            {(() => {
              // Category data
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

              // Monthly data
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

              // Settlement stats
              const totalBillAmount = bills.reduce((s, b) => s + Number(b.amount), 0);
              const myShares = bills.flatMap(b => b.shares || []).filter(s => s.user_id === currentUserId);
              const myTotalOwed = myShares.reduce((s, sh) => s + Number(sh.amount_owed), 0);
              const myTotalPaid = myShares.filter(s => s.status === "verified").reduce((s, sh) => s + Number(sh.amount_owed), 0);
              const mySettlementRate = myTotalOwed > 0 ? Math.round((myTotalPaid / myTotalOwed) * 100) : 100;
              const allShares = bills.flatMap(b => b.shares || []);
              const overallPaid = allShares.filter(s => s.status === "verified").reduce((s, sh) => s + Number(sh.amount_owed), 0);
              const overallOwed = allShares.reduce((s, sh) => s + Number(sh.amount_owed), 0);
              const overallSettlementRate = overallOwed > 0 ? Math.round((overallPaid / overallOwed) * 100) : 100;

              return (
                <>
                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
                    {[
                      { label: "Total spend", value: formatNaira(totalBillAmount), sub: `${bills.length} bills`, color: "var(--text)" },
                      { label: "You owe", value: formatNaira(Math.max(myTotalOwed - myTotalPaid, 0)), sub: myTotalOwed - myTotalPaid > 0 ? "outstanding" : "all settled ✓", color: myTotalOwed - myTotalPaid > 0 ? "var(--danger)" : "var(--success)" },
                      { label: "Your settlement", value: `${mySettlementRate}%`, sub: `${formatNaira(myTotalPaid)} paid`, color: "var(--accent)" },
                      { label: "Household rate", value: `${overallSettlementRate}%`, sub: "overall settled", color: "var(--success)" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 20 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: ".7px", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-1px", lineHeight: 1, marginBottom: 4, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                    {/* Monthly bar chart */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 4 }}>Monthly spending</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Total bills added per month</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false}/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#555", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}/>
                          <YAxis axisLine={false} tickLine={false} tickFormatter={v => formatNaira(v)} tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Sans',sans-serif" }} width={60}/>
                          <Tooltip content={<CustomTooltip/>} cursor={{ fill: "rgba(255,255,255,0.03)" }}/>
                          <Bar dataKey="total" fill="#C8F135" radius={[6,6,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category pie */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 4 }}>Spending by category</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Where your money goes</div>
                      {categoryData.length > 0 ? (
                        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
                          <div style={{ flexShrink: 0 }}>
                            <PieChart width={120} height={120}>
                              <Pie data={categoryData} cx={60} cy={60} innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value">
                                {categoryData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} stroke="transparent"/>
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip/>}/>
                            </PieChart>
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                            {categoryData.slice(0, 4).map(cat => (
                              <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                                  <span style={{ color: "var(--text-muted)" }}>{cat.icon} {cat.name}</span>
                                </div>
                                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "var(--text)" }}>{cat.percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 13 }}>No category data</div>
                      )}
                    </div>
                  </div>

                  {/* Settlement overview */}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 4 }}>Settlement overview</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>How much has been paid vs outstanding</div>
                    <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
                      <div style={{ position: "relative", flexShrink: 0, width: 140, height: 140 }}>
                        <PieChart width={140} height={140}>
                          <Pie data={[
                            { name: "Paid", value: overallPaid },
                            { name: "Owed", value: Math.max(overallOwed - overallPaid, 0) },
                          ]} cx={65} cy={65} innerRadius={44} outerRadius={65} startAngle={90} endAngle={-270} paddingAngle={2} dataKey="value">
                            <Cell fill="#22C55E" stroke="transparent"/>
                            <Cell fill="#1E1E1E" stroke="#2A2A2A"/>
                          </Pie>
                        </PieChart>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--accent)", letterSpacing: "-1px", lineHeight: 1 }}>{overallSettlementRate}%</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>settled</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          { label: "Total billed", value: formatNairaFull(overallOwed), color: "#fff" },
                          { label: "Paid", value: formatNairaFull(overallPaid), color: "#22C55E" },
                          { label: "Outstanding", value: formatNairaFull(Math.max(overallOwed - overallPaid, 0)), color: "#FF5555" },
                          { label: "Your rate", value: `${mySettlementRate}%`, color: "#C8F135" },
                        ].map(s => (
                          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 11 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
                            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {currentTab === "analytics" && bills.length === 0 && (
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>📊</div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>No data yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
              Add your first shared bill on the Bills tab and come back here to see spending breakdowns and settlement rates across your household.
            </p>
          </div>
        )}
      </div>

      {/* Only show bills list if on bills tab */}
      {currentTab === "bills" && (
        <>
          {/* Admin pending verification banner */}
          {isAdmin && pendingVerifications > 0 && (
            <div className="pending-banner">
              <span className="pending-banner-icon">🕐</span>
              <span className="pending-banner-text">
                <strong>{pendingVerifications} payment{pendingVerifications > 1 ? "s" : ""}</strong> waiting for your verification
              </span>
              <button className="pending-banner-btn" onClick={() => setFilter("pending")}>
                Review now
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="sr">
            {[
              { label: "You owe", value: totalOwed > 0 ? formatNaira(totalOwed) : "Settled ✓", cls: totalOwed > 0 ? "d" : "s", delay: "0s" },
              { label: "Verified paid", value: formatNaira(totalPaid), cls: "s", delay: "0.05s" },
              { label: "Pending", value: String(bills.filter(b => b.shares?.find(s => s.user_id === currentUserId && s.status === "pending_verification")).length), cls: "w", delay: "0.1s" },
            ].map(c => (
              <div className="sc" key={c.label} style={{ animationDelay: c.delay }}>
                <div className="sl">{c.label}</div>
                <div className={`sv ${c.cls}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="fr">
            {([
              { id: "all", label: "All" },
              { id: "unpaid", label: "Unpaid" },
              { id: "pending", label: `Pending${pendingVerifications > 0 && isAdmin ? ` (${pendingVerifications})` : ""}` },
              { id: "verified", label: "Verified" },
            ] as const).map(f => (
              <button
                key={f.id}
                className={`ft ${filter === f.id ? "a" : ""} ${f.id === "pending" ? "pending-tab" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bills list */}
          <div className="bl">
            {filteredBills.length === 0 ? (
              <div className="es">
                <div className="ei">🧾</div>
                <p className="et">{filter === "all" ? "No bills yet" : `No ${filter} bills`}</p>
                <p className="esub">{filter === "all" ? "Add your first shared bill and Divvy will split it equally." : `No ${filter} bills right now.`}</p>
              </div>
            ) : filteredBills.map((bill, i) => {
              const myShare = bill.shares?.find(s => s.user_id === currentUserId);
              const status = myShare?.status || "unpaid";
              const statusCfg = STATUS_CONFIG[status];
              const catInfo = CATEGORIES.find(c => c.value === bill.category);
              const pendingCount = bill.shares?.filter(s => s.status === "pending_verification").length || 0;

              return (
                <div
                  key={bill.id}
                  className={`bc ${selectedBill?.id === bill.id ? "sel" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => { setSelectedBill(bill); setPanelOpen(false); }}
                >
                  <div className="bci" style={{ background: CAT_COLORS[bill.category] || "rgba(255,255,255,.06)" }}>
                    {catInfo?.icon || "📋"}
                  </div>
                  <div className="bi">
                    <div className="bn">
                      {bill.title}
                      {isAdmin && pendingCount > 0 && (
                        <span style={{ marginLeft: 8, padding: "2px 7px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#F59E0B" }}>
                          {pendingCount} pending
                        </span>
                      )}
                    </div>
                    <div className="bm">
                      <span>{timeAgo(bill.created_at)}</span>
                      {bill.due_date && <><span>·</span><span>Due {new Date(bill.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span></>}
                      {bill.is_recurring && <><span>·</span><span style={{ color: "#C8F135" }}>Recurring</span></>}
                    </div>
                  </div>
                  <div className="bright">
                    <div className="ba" style={{ color: statusCfg.color }}>
                      {myShare ? formatNaira(myShare.amount_owed) : formatNaira(bill.amount)}
                    </div>
                    <span className="bsb" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── ADD BILL PANEL ── */}
      {panelOpen && (
        <>
          <div className="ov" onClick={() => setPanelOpen(false)} />
          <div className="sp">
            <div className="ph">
              <span className="pt">Add new bill</span>
              <button className="pc" onClick={() => setPanelOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="pb">
              {formError && <div className="fe">{formError}</div>}
              
              <div style={{ marginBottom: 18 }}>
                <label className="flab">Bill title</label>
                <input className="fi" type="text" placeholder="e.g. Electricity — June" value={title} onChange={e => setTitle(e.target.value)} autoFocus/>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="flab">Amount (₦)</label>
                <input className="fi" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}/>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="flab">Category</label>
                <div className="cg">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} className={`cb ${category === cat.value ? "cs" : ""}`} onClick={() => setCategory(cat.value)}>
                      <span className="cbi">{cat.icon}</span>
                      <span className="cbl">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="flab">Due date (optional)</label>
                <input className="fi" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ colorScheme: "dark" }}/>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div className="tr">
                  <span className="tl">Recurring monthly</span>
                  <button className={`tog ${isRecurring ? "on" : ""}`} onClick={() => setIsRecurring(!isRecurring)}><div className="tt"/></button>
                </div>
              </div>
              {amount && Number(amount) > 0 && housemates.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div className="sprev">
                    <div className="sprevl">Equal split preview</div>
                    {housemates.map(hm => (
                      <div className="spr" key={hm.user_id}>
                        <span className="sprn">{hm.full_name}{hm.user_id === currentUserId && <span style={{ color: "#555", fontSize: 11 }}> (you)</span>}</span>
                        <span className="spra">{formatNaira(Math.round((Number(amount) / housemates.length) * 100) / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="subbtn" onClick={handleAddBill} disabled={submitting}>
                {submitting && <span className="spn"/>}
                {submitting ? "Adding bill…" : `Add bill · ${amount ? formatNaira(Number(amount)) : "₦0"}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── BILL DETAIL PANEL ── */}
      {selectedBill && !panelOpen && (
        <>
          <div className="ov" onClick={() => setSelectedBill(null)} />
          <div className="sp">
            <div className="ph">
              <div>
                <span className="pt">{selectedBill.title}</span>
                <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                  {CATEGORIES.find(c => c.value === selectedBill.category)?.icon}{" "}
                  {CATEGORIES.find(c => c.value === selectedBill.category)?.label} · {timeAgo(selectedBill.created_at)}
                </div>
              </div>
              <button className="pc" onClick={() => setSelectedBill(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="pb">
              {/* Bill details */}
              <div className="ds">
                <div className="dst">Bill details</div>
                {[
                  { label: "Total amount", value: formatNaira(selectedBill.amount), style: { fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 } },
                  { label: "Split type", value: "Equal split" },
                  ...(selectedBill.due_date ? [{ label: "Due date", value: new Date(selectedBill.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) }] : []),
                  { label: "Recurring", value: selectedBill.is_recurring ? "Yes, monthly" : "One-time" },
                  {
                    label: "Verified",
                    value: `${selectedBill.shares?.filter(s => s.status === "verified").length || 0} / ${selectedBill.shares?.length || 0}`,
                    style: { color: "#22C55E" }
                  },
                ].map(r => (
                  <div className="dsr" key={r.label}>
                    <span className="dsrl">{r.label}</span>
                    <span className="dsrv" style={r.style}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Shares with verification */}
              <div className="ds">
                <div className="dst">Payment status per person</div>
                {selectedBill.shares?.map((share, i) => {
                  const name = share.profile?.full_name || "Unknown";
                  const isMe = share.user_id === currentUserId;
                  const statusCfg = STATUS_CONFIG[share.status || "unpaid"];

                  return (
                    <div className="srow" key={share.id} style={{ borderColor: share.status === "verified" ? "rgba(34,197,94,.15)" : share.status === "pending_verification" ? "rgba(245,158,11,.15)" : "#1E1E1E" }}>
                      <div className="sav" style={{ background: AVATAR_BGS[i % AVATAR_BGS.length], color: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {getInitials(name)}
                      </div>
                      <div className="si">
                        <div className="sn">
                          {name}
                          {isMe && <span style={{ color: "#555", fontWeight: 400, fontSize: 11, marginLeft: 4 }}>(you)</span>}
                        </div>
                        <div className="ss" style={{ color: statusCfg.color }}>
                          {statusCfg.icon} {statusCfg.label}
                          {share.status === "pending_verification" && " · awaiting verification"}
                          {share.status === "verified" && share.paid_at && ` · ${timeAgo(share.paid_at)}`}
                        </div>
                        {share.status === "rejected" && share.rejection_reason && (
                          <div className="reject-note">Reason: {share.rejection_reason}</div>
                        )}
                        {share.payment_note && share.status === "pending_verification" && (
                          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Note: {share.payment_note}</div>
                        )}
                      </div>
                      <div className="sac">
                        <div className="sam" style={{ color: statusCfg.color }}>
                          {formatNaira(share.amount_owed)}
                        </div>

                        {/* My own share — request verification or instant verify for admin */}
                        {isMe && (share.status === "unpaid" || share.status === "rejected") && (
                          <button className="verify-btn request" onClick={() => {
                            if (isAdmin) {
                              handleVerify(share);
                            } else {
                              setPayModal(share);
                            }
                          }} disabled={verifying}>
                            {verifying ? "…" : "Mark paid"}
                          </button>
                        )}

                        {/* Admin seeing pending share — verify or reject */}
                        {isAdmin && !isMe && share.status === "pending_verification" && (
                          <div className="verify-actions">
                            <button className="verify-btn confirm" onClick={() => handleVerify(share)} disabled={verifying}>
                              {verifying ? "…" : "Verify"}
                            </button>
                            <button className="verify-btn reject" onClick={() => setRejectModal(share)}>
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedBill.created_by === currentUserId && (
                <button className="delbtn" onClick={() => handleDeleteBill(selectedBill.id)}>
                  Delete this bill
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── PAY REQUEST MODAL ── */}
      {payModal && (
        <div className="modal-ov" onClick={() => setPayModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: "rgba(200,241,53,.1)" }}>💸</div>
            <div className="modal-title">Request payment verification</div>
            <div className="modal-sub">
              You're marking <strong style={{ color: "#fff" }}>{formatNaira(payModal.amount_owed)}</strong> as paid.
              The room owner will be notified and must confirm before it's officially verified.
            </div>
            <label className="flab">Add a note (optional)</label>
            <textarea
              className="fi"
              placeholder="e.g. Paid via bank transfer on 12 June"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              rows={3}
              style={{ resize: "none", marginBottom: 16 }}
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="modal-confirm" onClick={handleRequestVerification} disabled={verifying}>
                {verifying && <span className="spn"/>}
                {verifying ? "Sending…" : "Request verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectModal && (
        <div className="modal-ov" onClick={() => setRejectModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: "rgba(255,85,85,.1)" }}>❌</div>
            <div className="modal-title">Reject payment?</div>
            <div className="modal-sub">
              Tell <strong style={{ color: "#fff" }}>{rejectModal.profile?.full_name}</strong> why their payment of{" "}
              <strong style={{ color: "#fff" }}>{formatNaira(rejectModal.amount_owed)}</strong> couldn't be verified.
            </div>
            <label className="flab">Reason</label>
            <textarea
              className="fi"
              placeholder="e.g. Payment not received in account yet"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{ resize: "none", marginBottom: 16 }}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="modal-confirm danger" onClick={handleReject} disabled={verifying}>
                {verifying ? "Rejecting…" : "Reject payment"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
