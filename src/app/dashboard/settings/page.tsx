"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/components/providers/AuthProvider";

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type Section = "profile" | "appearance" | "notifications" | "security" | "help";

const NAV_ITEMS: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: "profile",       label: "Profile settings",  icon: "👤", desc: "Name, email, avatar" },
  { id: "appearance",    label: "Appearance",         icon: "🎨", desc: "Theme, display" },
  { id: "notifications", label: "Notifications",      icon: "🔔", desc: "Alerts, reminders" },
  { id: "security",      label: "Security",           icon: "🔒", desc: "Password, sessions" },
  { id: "help",          label: "Help & Support",     icon: "💬", desc: "FAQs, contact us" },
];

const THEMES = [
  { id: "dark",     label: "Dark",     desc: "Easy on the eyes",     bg: "#161616", accent: "#C8F135" },
  { id: "darker",   label: "Midnight", desc: "Pure black",           bg: "#0A0A0A", accent: "#C8F135" },
  { id: "light",    label: "Light",    desc: "Bright & clean",       bg: "#F5F5F5", accent: "#1A1A1A" },
  { id: "green",    label: "Forest",   label2: "Coming soon",        bg: "#0D1F0F", accent: "#4ADE80" },
];

const FAQS = [
  { q: "How does bill splitting work?", a: "When you add a bill, Divvy automatically divides it equally among all housemates in your household. Each person gets notified and can mark their share as paid." },
  { q: "How do I invite someone to my household?", a: "Go to the Housemates page and copy your invite code. Share it with your housemate — they sign up for Divvy and enter the code to join." },
  { q: "Can I leave a household?", a: "Currently you can be removed by the room owner. Self-removal is coming in a future update. Contact support if you need to leave urgently." },
  { q: "What happens if I delete a bill?", a: "The bill and all its shares are permanently deleted. This cannot be undone. Only the person who created the bill can delete it." },
  { q: "Is my data secure?", a: "Yes. Divvy uses Supabase which is built on PostgreSQL with row-level security. Your data is only visible to members of your household." },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Appearance
  const { theme, setTheme } = useTheme();
  const [compactMode, setCompactMode] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    newBill: true,
    paymentReminder: true,
    housemateJoined: true,
    billPaid: false,
    weeklyDigest: true,
  });

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Help
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      const supabase = createClient();

      const { data: prof } = await supabase
        .from("profiles").select("id, full_name, email").eq("id", user.id).single();

      const p = { id: user.id, full_name: prof?.full_name || "", email: prof?.email || user.email || "" };
      setProfile(p);
      setFullName(p.full_name);
      setLoading(false);
    }
    load();
  }, [router, user, authLoading]);

  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true); setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);
    setSaving(false);
    setSaveMsg(error ? "Failed to save." : "Profile updated ✓");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleChangePassword() {
    if (!newPw || !confirmPw) { setPwError("Please fill in all fields."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setChangingPw(true); setPwError(""); setPwMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);
    if (error) { setPwError(error.message); return; }
    setPwMsg("Password updated successfully ✓");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwMsg(""), 4000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  }

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

        .st-root { min-height:100vh; background:var(--bg); font-family:'DM Sans',sans-serif; color:var(--text); display:flex; flex-direction:column; }

        .st-topbar { padding:36px 40px 28px; border-bottom:1px solid var(--border); }
        .st-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:700; color:var(--text); letter-spacing:-.6px; margin-bottom:4px; }
        .st-sub { font-size:13px; color:var(--text-muted); }

        .st-body { display:flex; flex:1; }

        /* Left nav */
        .st-nav { width:260px; min-width:260px; border-right:1px solid var(--border); padding:24px 16px; display:flex; flex-direction:column; gap:4px; }

        .st-nav-item {
          display:flex; align-items:center; gap:12px;
          padding:12px 14px; border-radius:13px; cursor:pointer;
          transition:all .15s; border:1px solid transparent;
          text-decoration:none;
        }
        .st-nav-item:hover { background:var(--surface-2); }
        .st-nav-item.active { background:rgba(200,241,53,.07); border-color:rgba(200,241,53,.15); }

        .st-nav-icon { font-size:18px; flex-shrink:0; width:32px; height:32px; background:var(--surface-2); border-radius:9px; display:flex; align-items:center; justify-content:center; }
        .st-nav-item.active .st-nav-icon { background:rgba(200,241,53,.1); }

        .st-nav-text {}
        .st-nav-label { font-size:13px; font-weight:500; color:var(--text-muted); line-height:1.2; margin-bottom:1px; }
        .st-nav-item.active .st-nav-label { color:var(--text); }
        .st-nav-desc { font-size:11px; color:var(--text-muted); }

        /* Content area */
        .st-content { flex:1; padding:32px 40px; max-width:640px; animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .st-section-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:-.4px; margin-bottom:4px; }
        .st-section-sub { font-size:13px; color:var(--text-muted); margin-bottom:28px; line-height:1.6; }

        /* Cards */
        .st-card { background:var(--surface-2); border:1px solid var(--border); border-radius:18px; overflow:hidden; margin-bottom:16px; }
        .st-card-header { padding:18px 22px; border-bottom:1px solid var(--border); }
        .st-card-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:var(--text); letter-spacing:-.2px; }
        .st-card-body { padding:22px; }

        /* Form */
        .flab { display:block; font-size:11px; font-weight:500; color:var(--text-muted); letter-spacing:.6px; text-transform:uppercase; margin-bottom:6px; }
        .fi { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:11px; padding:13px 14px; font-family:'DM Sans',sans-serif; font-size:14px; color:var(--text); outline:none; transition:border-color .15s; margin-bottom:16px; }
        .fi::placeholder { color:var(--text-muted); }
        .fi:focus { border-color:var(--accent); }
        .fi:disabled { opacity:.4; cursor:not-allowed; }

        /* Avatar */
        .avatar-row { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
        .avatar-circle {
          width:64px; height:64px; border-radius:20px;
          background:rgba(200,241,53,.1); border:2px solid rgba(200,241,53,.3);
          display:flex; align-items:center; justify-content:center;
          font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:var(--accent);
          flex-shrink:0;
        }
        .avatar-info {}
        .avatar-name { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:var(--text); margin-bottom:2px; }
        .avatar-email { font-size:12px; color:var(--text-muted); }

        /* Save btn */
        .save-btn { padding:12px 24px; background:var(--accent); border:none; border-radius:11px; font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:var(--bg); cursor:pointer; transition:all .2s; }
        .save-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
        .save-btn:disabled { opacity:.45; cursor:not-allowed; }

        /* Save message */
        .save-msg { display:inline-block; margin-left:12px; font-size:13px; color:var(--success); animation:fadeUp .3s both; }
        .save-msg.err { color:var(--danger); }

        /* Theme grid */
        .theme-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .theme-card {
          padding:16px; border-radius:14px; cursor:pointer;
          border:2px solid transparent; transition:all .15s;
          position:relative; overflow:hidden;
        }
        .theme-card.selected { border-color:var(--accent); }
        .theme-card:not(.selected) { border-color:var(--border); }
        .theme-card:hover:not(.selected) { border-color:var(--text-muted); }
        .theme-preview { width:100%; height:48px; border-radius:8px; margin-bottom:10px; display:flex; gap:4px; align-items:flex-end; padding:8px; }
        .theme-bar { width:8px; border-radius:2px 2px 0 0; }
        .theme-name { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:var(--text); margin-bottom:2px; }
        .theme-desc { font-size:11px; color:var(--text-muted); }
        .coming-soon { position:absolute; top:8px; right:8px; padding:2px 7px; background:var(--surface); border:1px solid var(--border); border-radius:6px; font-size:10px; color:var(--text-muted); font-weight:500; }
        .theme-check { position:absolute; top:8px; right:8px; width:20px; height:20px; background:var(--accent); border-radius:6px; display:flex; align-items:center; justify-content:center; }

        /* Toggle rows */
        .toggle-section { display:flex; flex-direction:column; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); gap:16px; }
        .toggle-row:last-child { border-bottom:none; }
        .toggle-left {}
        .toggle-label { font-size:14px; color:var(--text); font-weight:500; margin-bottom:2px; }
        .toggle-desc { font-size:12px; color:var(--text-muted); }
        .tog { width:44px; height:24px; border-radius:12px; background:var(--border); border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
        .tog.on { background:var(--accent); }
        .tt { position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:9px; background:#fff; transition:transform .2s cubic-bezier(.16,1,.3,1); }
        .tog.on .tt { transform:translateX(20px); background:var(--bg); }

        /* Security */
        .pw-msg { padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; animation:fadeUp .25s both; }
        .pw-msg.ok { background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.2); color:var(--success); }
        .pw-msg.err { background:rgba(255,85,85,.08); border:1px solid rgba(255,85,85,.2); color:var(--danger); }

        .danger-zone { background:rgba(255,85,85,.05); border:1px solid rgba(255,85,85,.12); border-radius:14px; padding:20px; margin-top:8px; }
        .danger-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:var(--danger); margin-bottom:6px; }
        .danger-sub { font-size:12px; color:var(--text-muted); margin-bottom:14px; line-height:1.6; }
        .danger-btn { padding:10px 18px; background:transparent; border:1px solid rgba(255,85,85,.25); border-radius:10px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:var(--danger); cursor:pointer; transition:all .15s; }
        .danger-btn:hover { background:rgba(255,85,85,.08); }

        /* Help */
        .faq-item { border-bottom:1px solid var(--border); }
        .faq-item:last-child { border-bottom:none; }
        .faq-q { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 0; cursor:pointer; }
        .faq-q-text { font-size:14px; font-weight:500; color:var(--text); }
        .faq-chevron { flex-shrink:0; transition:transform .2s; color:var(--text-muted); }
        .faq-chevron.open { transform:rotate(180deg); }
        .faq-a { font-size:13px; color:var(--text-muted); line-height:1.7; padding-bottom:16px; }

        .contact-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:4px; }
        .contact-card { background:var(--surface-2); border:1px solid var(--border); border-radius:13px; padding:16px; display:flex; align-items:center; gap:12px; cursor:pointer; transition:border-color .15s; }
        .contact-card:hover { border-color:var(--text-muted); }
        .contact-icon { font-size:20px; }
        .contact-label { font-size:13px; font-weight:500; color:var(--text); margin-bottom:1px; }
        .contact-sub { font-size:11px; color:var(--text-muted); }

        /* Compact toggle */
        .compact-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; }
        .compact-label { font-size:14px; color:var(--text); font-weight:500; }
        .compact-sub { font-size:12px; color:var(--text-muted); }

        /* Signout */
        .signout-card { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; background:var(--surface-2); border:1px solid var(--border); border-radius:16px; margin-top:8px; }
        .signout-info {}
        .signout-title { font-size:14px; font-weight:500; color:var(--text); margin-bottom:2px; }
        .signout-sub { font-size:12px; color:var(--text-muted); }
        .signout-btn { padding:9px 18px; background:transparent; border:1px solid var(--border); border-radius:10px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:var(--text-muted); cursor:pointer; transition:all .15s; }
        .signout-btn:hover { border-color:var(--danger); color:var(--danger); }

        .spn { display:inline-block; width:14px; height:14px; border:2px solid rgba(22,22,22,.3); border-top-color:var(--bg); border-radius:50%; animation:spin .65s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform:rotate(360deg); } }

        @media(max-width:900px) {
          .st-body { flex-direction:column; }
          .st-nav { width:100%; border-right:none; border-bottom:1px solid var(--border); flex-direction:row; overflow-x:auto; padding:12px; gap:6px; }
          .st-nav-desc { display:none; }
          .st-content { padding:24px 20px; }
        }
        @media(max-width:768px) {
          .st-topbar { padding:28px 20px 20px; }
          .theme-grid { grid-template-columns:1fr 1fr; }
          .contact-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="st-root">
        <div className="st-topbar">
          <h1 className="st-title">Settings</h1>
          <p className="st-sub">Manage your profile, preferences and account</p>
        </div>

        <div className="st-body">

          {/* Left nav */}
          <nav className="st-nav">
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`st-nav-item ${activeSection === item.id ? "active" : ""}`}
                onClick={() => setActiveSection(item.id)}
              >
                <div className="st-nav-icon">{item.icon}</div>
                <div className="st-nav-text">
                  <div className="st-nav-label">{item.label}</div>
                  <div className="st-nav-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </nav>

          {/* Content */}
          <div className="st-content" key={activeSection}>

            {/* ── PROFILE ── */}
            {activeSection === "profile" && (
              <>
                <h2 className="st-section-title">Profile settings</h2>
                <p className="st-section-sub">Update your name and view your account information.</p>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Your profile</div></div>
                  <div className="st-card-body">
                    <div className="avatar-row">
                      <div className="avatar-circle">{getInitials(fullName || profile?.email || "?")}</div>
                      <div className="avatar-info">
                        <div className="avatar-name">{fullName || "Your name"}</div>
                        <div className="avatar-email">{profile?.email}</div>
                      </div>
                    </div>

                    <label className="flab">Full name</label>
                    <input className="fi" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)}/>

                    <label className="flab">Email address</label>
                    <input className="fi" type="email" value={profile?.email || ""} disabled/>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 20 }}>Email cannot be changed. Contact support if needed.</p>

                    <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                      {saving && <span className="spn"/>}
                      {saving ? "Saving…" : "Update profile"}
                    </button>
                    {saveMsg && <span className={`save-msg ${saveMsg.includes("Failed") ? "err" : ""}`}>{saveMsg}</span>}
                  </div>
                </div>

                <div className="signout-card">
                  <div className="signout-info">
                    <div className="signout-title">Sign out</div>
                    <div className="signout-sub">You'll be returned to the login screen</div>
                  </div>
                  <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
                </div>
              </>
            )}

            {/* ── APPEARANCE ── */}
            {activeSection === "appearance" && (
              <>
                <h2 className="st-section-title">Appearance</h2>
                <p className="st-section-sub">Choose how Divvy looks and feels for you.</p>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Theme</div></div>
                  <div className="st-card-body">
                    <div className="theme-grid">
                      {THEMES.map(t => {
                        const isComingSoon = !!t.label2;
                        const isSelected = theme === t.id && !isComingSoon;
                        return (
                          <div
                            key={t.id}
                            className={`theme-card ${isSelected ? "selected" : ""}`}
                            style={{ background: t.bg, opacity: isComingSoon ? 0.5 : 1, cursor: isComingSoon ? "default" : "pointer" }}
                            onClick={() => !isComingSoon && setTheme(t.id)}
                          >
                            <div className="theme-preview" style={{ background: isComingSoon ? t.bg : `${t.bg}cc` }}>
                              {[40, 60, 80, 55, 70].map((h, i) => (
                                <div key={i} className="theme-bar" style={{ height: h, background: i === 2 ? t.accent : `${t.accent}44` }}/>
                              ))}
                            </div>
                            <div className="theme-name" style={{ color: t.accent }}>{t.label}</div>
                            <div className="theme-desc">{t.desc}</div>
                            {isComingSoon && <span className="coming-soon">Soon</span>}
                            {isSelected && (
                              <div className="theme-check">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 12, color: "#444", marginTop: 14 }}>
                      Theme switching is visual-only in this build. Full persistence coming with the next update.
                    </p>
                  </div>
                </div>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Display</div></div>
                  <div className="st-card-body">
                    <div className="compact-row">
                      <div>
                        <div className="compact-label">Compact mode</div>
                        <div className="compact-sub">Reduce spacing for more content on screen</div>
                      </div>
                      <button className={`tog ${compactMode ? "on" : ""}`} onClick={() => setCompactMode(!compactMode)}>
                        <div className="tt"/>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeSection === "notifications" && (
              <>
                <h2 className="st-section-title">Notifications</h2>
                <p className="st-section-sub">Control what alerts you receive from Divvy.</p>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Activity</div></div>
                  <div className="st-card-body">
                    <div className="toggle-section">
                      {[
                        { key: "newBill",          label: "New bill added",        desc: "When a housemate adds a new shared bill" },
                        { key: "paymentReminder",  label: "Payment reminders",     desc: "Reminders when your bill share is due" },
                        { key: "housemateJoined",  label: "Housemate joined",      desc: "When someone joins your household" },
                        { key: "billPaid",         label: "Bill paid",             desc: "When a housemate marks their share as paid" },
                        { key: "weeklyDigest",     label: "Weekly digest",         desc: "A weekly summary of your household activity" },
                      ].map(n => (
                        <div className="toggle-row" key={n.key}>
                          <div className="toggle-left">
                            <div className="toggle-label">{n.label}</div>
                            <div className="toggle-desc">{n.desc}</div>
                          </div>
                          <button
                            className={`tog ${notifs[n.key as keyof typeof notifs] ? "on" : ""}`}
                            onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifs] }))}
                          >
                            <div className="tt"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: "#444", lineHeight: 1.7 }}>
                  In-app notifications are active. Email notifications require email confirmation and will be enabled in a future update.
                </p>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeSection === "security" && (
              <>
                <h2 className="st-section-title">Security</h2>
                <p className="st-section-sub">Manage your password and account security.</p>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Change password</div></div>
                  <div className="st-card-body">
                    {pwMsg && <div className="pw-msg ok">{pwMsg}</div>}
                    {pwError && <div className="pw-msg err">{pwError}</div>}

                    <label className="flab">New password</label>
                    <input className="fi" type="password" placeholder="Min. 6 characters" value={newPw} onChange={e => setNewPw(e.target.value)}/>

                    <label className="flab">Confirm new password</label>
                    <input className="fi" type="password" placeholder="Repeat new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}/>

                    <button className="save-btn" onClick={handleChangePassword} disabled={changingPw}>
                      {changingPw && <span className="spn"/>}
                      {changingPw ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </div>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Active sessions</div></div>
                  <div className="st-card-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
                      <div style={{ width: 40, height: 40, background: "rgba(200,241,53,.1)", border: "1px solid rgba(200,241,53,.2)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💻</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 2 }}>Current device</div>
                        <div style={{ fontSize: 11, color: "#555" }}>Active now · {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <div style={{ padding: "4px 10px", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 7, fontSize: 11, fontWeight: 600, color: "#22C55E" }}>Active</div>
                    </div>
                  </div>
                </div>

                <div className="danger-zone">
                  <div className="danger-title">⚠️ Danger zone</div>
                  <div className="danger-sub">
                    Signing out will end your current session. You'll need your email and password to sign back in.
                  </div>
                  <button className="danger-btn" onClick={handleSignOut}>Sign out of all devices</button>
                </div>
              </>
            )}

            {/* ── HELP ── */}
            {activeSection === "help" && (
              <>
                <h2 className="st-section-title">Help & Support</h2>
                <p className="st-section-sub">Find answers to common questions or reach out to us.</p>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Frequently asked questions</div></div>
                  <div className="st-card-body" style={{ padding: "8px 22px" }}>
                    {FAQS.map((faq, i) => (
                      <div className="faq-item" key={i}>
                        <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                          <span className="faq-q-text">{faq.q}</span>
                          <svg className={`faq-chevron ${openFaq === i ? "open" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {openFaq === i && <div className="faq-a">{faq.a}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="st-card">
                  <div className="st-card-header"><div className="st-card-title">Contact support</div></div>
                  <div className="st-card-body">
                    <div className="contact-grid">
                      {[
                        { icon: "📧", label: "Email us", sub: "Response within 24hrs" },
                        { icon: "💬", label: "Live chat", sub: "Mon–Fri, 9am–5pm" },
                        { icon: "📖", label: "Documentation", sub: "Guides and tutorials" },
                        { icon: "🐛", label: "Report a bug", sub: "Help us improve Divvy" },
                      ].map(c => (
                        <div className="contact-card" key={c.label}>
                          <span className="contact-icon">{c.icon}</span>
                          <div>
                            <div className="contact-label">{c.label}</div>
                            <div className="contact-sub">{c.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 0", borderTop: "1px solid #1E1E1E", display: "flex", gap: 20 }}>
                  {["Terms of Service", "Privacy Policy", "v1.0.0"].map((l, i) => (
                    <span key={l} style={{ fontSize: 12, color: i < 2 ? "#555" : "#333", cursor: i < 2 ? "pointer" : "default" }}>{l}</span>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
