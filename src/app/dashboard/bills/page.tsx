"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

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
  profile?: { full_name: string; email: string };
};

type Housemate = {
  user_id: string;
  full_name: string;
  email: string;
};

const CATEGORIES = [
  { value: "electricity", label: "Electricity", icon: "⚡" },
  { value: "water", label: "Water", icon: "💧" },
  { value: "internet", label: "Internet", icon: "📡" },
  { value: "rent", label: "Rent", icon: "🏠" },
  { value: "groceries", label: "Groceries", icon: "🛒" },
  { value: "other", label: "Other", icon: "📋" },
];

const categoryColors: Record<string, string> = {
  electricity: "rgba(245,158,11,0.12)",
  water: "rgba(59,130,246,0.12)",
  internet: "rgba(99,102,241,0.12)",
  rent: "rgba(200,241,53,0.1)",
  groceries: "rgba(34,197,94,0.12)",
  other: "rgba(255,255,255,0.06)",
};

function formatNaira(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [housemates, setHousemates] = useState<Housemate[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("electricity");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  async function loadData() {
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id);

    const supabase = createClient();

    const { data: hm } = await supabase
      .from("housemates").select("household_id").eq("user_id", user.id).single();
    if (!hm) { router.push("/onboarding"); return; }
    setHouseholdId(hm.household_id);

    const { data: hmData } = await supabase
      .from("housemates").select("user_id").eq("household_id", hm.household_id);

    if (hmData?.length) {
      const ids = hmData.map(h => h.user_id);
      const { data: profData } = await supabase
        .from("profiles").select("id, full_name, email").in("id", ids);
      setHousemates(hmData.map(h => {
        const p = profData?.find(p => p.id === h.user_id);
        return { user_id: h.user_id, full_name: p?.full_name || p?.email?.split("@")[0] || "Unknown", email: p?.email || "" };
      }));
    }

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
          profile: shareProfiles?.find(p => p.id === s.user_id) || { full_name: "Unknown", email: "" },
        })),
      })));
    } else { setBills([]); }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

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
      housemates.map(hm => ({ bill_id: bill.id, user_id: hm.user_id, amount_owed: shareAmount, is_paid: false }))
    );
    if (sharesErr) { setFormError(sharesErr.message); setSubmitting(false); return; }

    setTitle(""); setAmount(""); setCategory("electricity"); setDueDate(""); setIsRecurring(false);
    setPanelOpen(false);
    await loadData();
    setSubmitting(false);
  }

  async function handleMarkPaid(shareId: string) {
    const supabase = createClient();
    await supabase.from("bill_shares").update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq("id", shareId).eq("user_id", currentUserId);
    await loadData();
    if (selectedBill) {
      setBills(prev => {
        const updated = prev.find(b => b.id === selectedBill.id);
        if (updated) setSelectedBill(updated);
        return prev;
      });
    }
  }

  async function handleDeleteBill(billId: string) {
    const supabase = createClient();
    await supabase.from("bill_shares").delete().eq("bill_id", billId);
    await supabase.from("bills").delete().eq("id", billId);
    setSelectedBill(null);
    await loadData();
  }

  const filteredBills = bills.filter(b => {
    const s = b.shares?.find(s => s.user_id === currentUserId);
    if (filter === "paid") return s?.is_paid;
    if (filter === "unpaid") return !s?.is_paid;
    return true;
  });

  const totalOwed = bills.reduce((sum, b) => {
    const s = b.shares?.find(s => s.user_id === currentUserId && !s.is_paid);
    return sum + (s ? Number(s.amount_owed) : 0);
  }, 0);

  const totalPaid = bills.reduce((sum, b) => {
    const s = b.shares?.find(s => s.user_id === currentUserId && s.is_paid);
    return sum + (s ? Number(s.amount_owed) : 0);
  }, 0);

  if (loading || authLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, background: "var(--accent)", borderRadius: 12, animation: "pulse 1.4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}`}</style>
    </div>
  );

  const colors = ["#C8F135","#818CF8","#F59E0B","#22C55E","#EF4444","#3B82F6"];
  const bgs = ["rgba(200,241,53,0.1)","rgba(99,102,241,0.1)","rgba(245,158,11,0.1)","rgba(34,197,94,0.1)","rgba(239,68,68,0.1)","rgba(59,130,246,0.1)"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .br{min-height:100vh;background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--text)}
        .btb{padding:36px 40px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:20px}
        .btt{font-family:'Syne',sans-serif;font-size:26px;font-weight:700;color:var(--text);letter-spacing:-.6px;margin-bottom:4px}
        .bts{font-size:13px;color:var(--text-muted)}
        .add-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:var(--accent);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--bg);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s cubic-bezier(.16,1,.3,1)}
        .add-btn:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,241,53,.25)}
        .add-btn:active{transform:scale(.97)}
        .sr{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:28px 40px 0}
        .sc{background:var(--surface-2);border:1px solid var(--border);border-radius:18px;padding:20px 22px;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .sl{font-size:11px;color:var(--text-muted);letter-spacing:.7px;text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .sv{font-family:'Syne',sans-serif;font-size:24px;font-weight:700;letter-spacing:-1px;line-height:1}
        .sv.d{color:var(--danger)}.sv.s{color:var(--success)}.sv.n{color:var(--text)}
        .fr{display:flex;align-items:center;gap:8px;padding:24px 40px 0}
        .ft{padding:7px 16px;background:transparent;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--text-muted);transition:all .15s}
        .ft:hover{border-color:var(--text-muted);color:var(--text)}
        .ft.a{background:rgba(200,241,53,.08);border-color:rgba(200,241,53,.25);color:var(--accent)}
        .bl{padding:20px 40px 40px;display:flex;flex-direction:column;gap:10px}
        .bc{display:flex;align-items:center;gap:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:16px;padding:16px 20px;cursor:pointer;transition:all .15s;animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both}
        .bc:hover{background:var(--surface);border-color:var(--text-muted);transform:translateX(2px)}
        .bc.sel{border-color:rgba(200,241,53,.3);background:rgba(200,241,53,.03)}
        .bci{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .bi{flex:1;min-width:0}
        .bn{font-size:14px;font-weight:500;color:var(--text);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bm{font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px}
        .bright{text-align:right;flex-shrink:0}
        .ba{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;letter-spacing:-.3px;margin-bottom:4px}
        .ba.u{color:var(--danger)}.ba.p{color:var(--success)}
        .bsb{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:.3px}
        .bp{background:rgba(34,197,94,.1);color:var(--success)}.bu{background:rgba(255,85,85,.1);color:var(--danger)}
        .es{text-align:center;padding:80px 24px;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .ei{width:64px;height:64px;background:var(--border);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px}
        .et{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--text);margin-bottom:6px}
        .esub{font-size:13px;color:var(--text-muted);line-height:1.7}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:150;animation:fadeIn .2s ease both}
        .sp{position:fixed;top:0;right:0;bottom:0;width:440px;max-width:100vw;background:var(--surface-2);border-left:1px solid var(--border);z-index:151;display:flex;flex-direction:column;animation:slideIn .35s cubic-bezier(.16,1,.3,1) both;overflow:hidden}
        .ph{padding:28px 28px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .pt{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);letter-spacing:-.4px}
        .pc{width:34px;height:34px;background:var(--border);border:1px solid var(--border);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .pc:hover{background:var(--surface)}
        .pb{flex:1;overflow-y:auto;padding:24px 28px}
        .fl{margin-bottom:18px}
        .flab{display:block;font-size:11px;font-weight:500;color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
        .fi{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:13px 14px;font-family:'DM Sans',sans-serif;font-size:15px;color:var(--text);outline:none;transition:border-color .15s}
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
        .fe{background:rgba(255,85,85,.08);border:1px solid rgba(255,85,85,.2);color:var(--danger);font-size:13px;padding:11px 14px;border-radius:10px;margin-bottom:16px}
        .subbtn{width:100%;padding:15px;background:var(--accent);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--bg);cursor:pointer;transition:all .2s cubic-bezier(.16,1,.3,1);margin-top:8px}
        .subbtn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
        .subbtn:disabled{opacity:.45;cursor:not-allowed}
        .spn{display:inline-block;width:14px;height:14px;border:2px solid rgba(22,22,22,.3);border-top-color:var(--bg);border-radius:50%;animation:spin .65s linear infinite;vertical-align:middle;margin-right:8px}
        .ds{margin-bottom:24px}
        .dst{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px;font-weight:500;margin-bottom:12px}
        .dsr{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}
        .dsr:last-child{border-bottom:none}
        .dsrl{font-size:13px;color:var(--text-muted)}
        .dsrv{font-size:13px;color:var(--text);font-weight:500}
        .srow{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border:1px solid var(--border);border-radius:12px;margin-bottom:8px;transition:border-color .15s}
        .srow:last-child{margin-bottom:0}
        .sav{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;flex-shrink:0}
        .si{flex:1;min-width:0}
        .sn{font-size:13px;color:var(--text);font-weight:500;margin-bottom:2px}
        .ss{font-size:11px;color:var(--text-muted)}
        .sac{text-align:right;flex-shrink:0}
        .sam{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:-.3px;margin-bottom:4px}
        .sam.u{color:var(--danger)}.sam.p{color:var(--success)}
        .mpb{padding:5px 11px;background:rgba(200,241,53,.08);border:1px solid rgba(200,241,53,.2);border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:var(--accent);transition:all .15s;white-space:nowrap}
        .mpb:hover{background:rgba(200,241,53,.15)}
        .delbtn{width:100%;padding:12px;background:rgba(255,85,85,.07);border:1px solid rgba(255,85,85,.15);border-radius:11px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--danger);transition:all .15s;margin-top:8px}
        .delbtn:hover{background:rgba(255,85,85,.12)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.btb{padding:28px 20px 20px}.sr{grid-template-columns:1fr 1fr;padding:20px 20px 0}.fr{padding:16px 20px 0}.bl{padding:16px 20px 40px}.sp{width:100vw}}
      `}</style>

      <div className="br">
        <div className="btb">
          <div>
            <h1 className="btt">Manage Bills</h1>
            <p className="bts">{bills.length} total · split equally among {housemates.length} housemates</p>
          </div>
          <button className="add-btn" onClick={() => { setPanelOpen(true); setSelectedBill(null); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Add Bill
          </button>
        </div>

        <div className="sr">
          {[
            { label: "You owe", value: totalOwed > 0 ? formatNaira(totalOwed) : "Settled ✓", cls: totalOwed > 0 ? "d" : "s", delay: "0s" },
            { label: "You've paid", value: formatNaira(totalPaid), cls: "s", delay: "0.05s" },
            { label: "Total bills", value: String(bills.length), cls: "n", delay: "0.1s" },
          ].map(c => (
            <div className="sc" key={c.label} style={{ animationDelay: c.delay }}>
              <div className="sl">{c.label}</div>
              <div className={`sv ${c.cls}`}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="fr">
          {(["all","unpaid","paid"] as const).map(f => (
            <button key={f} className={`ft ${filter === f ? "a" : ""}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && <span style={{ marginLeft: 6, opacity: 0.6 }}>({bills.filter(b => { const s = b.shares?.find(s => s.user_id === currentUserId); return f === "paid" ? s?.is_paid : !s?.is_paid; }).length})</span>}
            </button>
          ))}
        </div>

        <div className="bl">
          {filteredBills.length === 0 ? (
            <div className="es">
              <div className="ei">🧾</div>
              <p className="et">{filter === "all" ? "No bills yet" : `No ${filter} bills`}</p>
              <p className="esub">{filter === "all" ? "Add your first shared bill and Divvy will split it equally among all housemates." : `You have no ${filter} bills right now.`}</p>
            </div>
          ) : filteredBills.map((bill, i) => {
            const myShare = bill.shares?.find(s => s.user_id === currentUserId);
            const catInfo = CATEGORIES.find(c => c.value === bill.category);
            return (
              <div key={bill.id} className={`bc ${selectedBill?.id === bill.id ? "sel" : ""}`} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => { setSelectedBill(bill); setPanelOpen(false); }}>
                <div className="bci" style={{ background: categoryColors[bill.category] || "rgba(255,255,255,0.06)" }}>{catInfo?.icon || "📋"}</div>
                <div className="bi">
                  <div className="bn">{bill.title}</div>
                  <div className="bm">
                    <span>{timeAgo(bill.created_at)}</span>
                    {bill.due_date && <><span>·</span><span>Due {new Date(bill.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span></>}
                    {bill.is_recurring && <><span>·</span><span style={{ color: "var(--accent)" }}>Recurring</span></>}
                  </div>
                </div>
                <div className="bright">
                  <div className={`ba ${myShare?.is_paid ? "p" : "u"}`}>{myShare ? formatNaira(myShare.amount_owed) : formatNaira(bill.amount)}</div>
                  <span className={`bsb ${myShare?.is_paid ? "bp" : "bu"}`}>{myShare?.is_paid ? "Paid" : "Unpaid"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add bill panel */}
      {panelOpen && (
        <>
          <div className="ov" onClick={() => setPanelOpen(false)} />
          <div className="sp">
            <div className="ph">
              <span className="pt">Add new bill</span>
              <button className="pc" onClick={() => setPanelOpen(false)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>
            <div className="pb">
              {formError && <div className="fe">{formError}</div>}
              <div className="fl">
                <label className="flab">Bill title</label>
                <input className="fi" type="text" placeholder="e.g. Electricity — June" value={title} onChange={e => setTitle(e.target.value)} autoFocus/>
              </div>
              <div className="fl">
                <label className="flab">Amount (₦)</label>
                <input className="fi" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}/>
              </div>
              <div className="fl">
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
              <div className="fl">
                <label className="flab">Due date (optional)</label>
                <input className="fi" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ colorScheme: "dark" }}/>
              </div>
              <div className="fl">
                <div className="tr">
                  <span className="tl">Recurring monthly</span>
                  <button className={`tog ${isRecurring ? "on" : ""}`} onClick={() => setIsRecurring(!isRecurring)}><div className="tt"/></button>
                </div>
              </div>
              {amount && Number(amount) > 0 && housemates.length > 0 && (
                <div className="fl">
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

      {/* Bill detail panel */}
      {selectedBill && !panelOpen && (
        <>
          <div className="ov" onClick={() => setSelectedBill(null)} />
          <div className="sp">
            <div className="ph">
              <div>
                <span className="pt">{selectedBill.title}</span>
                <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{CATEGORIES.find(c => c.value === selectedBill.category)?.icon} {CATEGORIES.find(c => c.value === selectedBill.category)?.label} · {timeAgo(selectedBill.created_at)}</div>
              </div>
              <button className="pc" onClick={() => setSelectedBill(null)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>
            <div className="pb">
              <div className="ds">
                <div className="dst">Bill details</div>
                {[
                  { label: "Total amount", value: formatNaira(selectedBill.amount), style: { fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 } },
                  { label: "Split type", value: "Equal split" },
                  ...(selectedBill.due_date ? [{ label: "Due date", value: new Date(selectedBill.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) }] : []),
                  { label: "Recurring", value: selectedBill.is_recurring ? "Yes, monthly" : "One-time" },
                  { label: "Settled", value: `${selectedBill.shares?.filter(s => s.is_paid).length || 0} / ${selectedBill.shares?.length || 0} housemates`, style: { color: "#22C55E" } },
                ].map(r => (
                  <div className="dsr" key={r.label}>
                    <span className="dsrl">{r.label}</span>
                    <span className="dsrv" style={r.style}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="ds">
                <div className="dst">Who pays what</div>
                {selectedBill.shares?.map((share, i) => {
                  const name = share.profile?.full_name || "Unknown";
                  const isMe = share.user_id === currentUserId;
                  return (
                    <div className="srow" key={share.id} style={{ borderColor: share.is_paid ? "rgba(34,197,94,.15)" : "var(--border)" }}>
                      <div className="sav" style={{ background: bgs[i % bgs.length], color: colors[i % colors.length] }}>{getInitials(name)}</div>
                      <div className="si">
                        <div className="sn">{name}{isMe && <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11, marginLeft: 4 }}>(you)</span>}</div>
                        <div className="ss">{share.is_paid ? `Paid ${share.paid_at ? timeAgo(share.paid_at) : ""}` : "Not paid yet"}</div>
                      </div>
                      <div className="sac">
                        <div className={`sam ${share.is_paid ? "p" : "u"}`}>{formatNaira(share.amount_owed)}</div>
                        {isMe && !share.is_paid && <button className="mpb" onClick={() => handleMarkPaid(share.id)}>Mark paid</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedBill.created_by === currentUserId && (
                <button className="delbtn" onClick={() => handleDeleteBill(selectedBill.id)}>Delete this bill</button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
