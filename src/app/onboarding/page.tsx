"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "choose" | "create" | "join" | "created";

export default function OnboardingPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!householdName.trim()) { setError("Please enter a household name."); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Call the security definer function instead of inserting directly
    const { data, error: fnErr } = await supabase
      .rpc("create_household", { household_name: householdName.trim() });

    if (fnErr || !data) {
      setError(fnErr?.message || "Failed to create household.");
      setLoading(false); return;
    }

    setCreatedCode(data.invite_code);
    setMode("created");
    setLoading(false);
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError("Please enter an invite code."); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data, error: fnErr } = await supabase
      .rpc("join_household", { code: inviteCode.trim().toLowerCase() });

    if (fnErr) {
      setError(
        fnErr.message.includes("Invalid invite code")
          ? "Invalid invite code. Double-check and try again."
          : fnErr.message.includes("Already a member")
          ? "You're already a member of this household."
          : fnErr.message
      );
      setLoading(false); return;
    }

    router.push("/dashboard");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ob-root {
          min-height: 100vh;
          background: #161616;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Left decorative panel - desktop only */
        .ob-left {
          width: 420px;
          min-width: 420px;
          background: #1A1A1A;
          border-right: 1px solid #222;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
        }

        .ob-left::before {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(200,241,53,0.07) 0%, transparent 65%);
          pointer-events: none;
        }

        .ob-left-logo {
          display: flex; align-items: center; gap: 10px;
        }

        .ob-logo-mark {
          width: 36px; height: 36px;
          background: #C8F135; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }

        .ob-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 20px;
          color: #fff; letter-spacing: -0.3px;
        }

        .ob-left-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }

        .ob-left-heading {
          font-family: 'Syne', sans-serif;
          font-size: 36px; font-weight: 800;
          color: #fff; letter-spacing: -1.5px;
          line-height: 1.1; margin-bottom: 16px;
        }

        .ob-left-heading span { color: #C8F135; }

        .ob-left-sub {
          font-size: 14px; color: #555;
          line-height: 1.7; max-width: 300px;
        }

        /* Steps indicator */
        .ob-steps {
          display: flex; flex-direction: column; gap: 16px;
          margin-top: 48px;
        }

        .ob-step {
          display: flex; align-items: center; gap: 14px;
        }

        .ob-step-dot {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0;
          font-family: 'Syne', sans-serif; font-weight: 700;
        }

        .ob-step-dot.done { background: #C8F135; color: #1A1A1A; }
        .ob-step-dot.active { background: rgba(200,241,53,0.12); color: #C8F135; border: 1px solid rgba(200,241,53,0.3); }
        .ob-step-dot.pending { background: #222; color: #444; }

        .ob-step-label { font-size: 13px; font-weight: 500; }
        .ob-step-label.done { color: #888; }
        .ob-step-label.active { color: #fff; }
        .ob-step-label.pending { color: #444; }

        .ob-left-footer {
          font-size: 12px; color: #333;
        }

        /* Right content panel */
        .ob-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
        }

        .ob-card {
          width: 100%;
          max-width: 480px;
          animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Choose screen */
        .ob-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 700;
          color: #fff; letter-spacing: -0.8px;
          margin-bottom: 8px;
        }

        .ob-sub {
          font-size: 14px; color: #555;
          margin-bottom: 36px; line-height: 1.6;
        }

        .choose-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }

        .choose-card {
          background: #1E1E1E;
          border: 1px solid #2A2A2A;
          border-radius: 20px;
          padding: 28px 24px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          text-align: left;
        }

        .choose-card:hover {
          border-color: #C8F135;
          background: rgba(200,241,53,0.04);
          transform: translateY(-2px);
        }

        .choose-card:active { transform: scale(0.98); }

        .choose-card-icon {
          width: 44px; height: 44px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 16px;
        }

        .choose-card-icon.create { background: rgba(200,241,53,0.1); }
        .choose-card-icon.join   { background: rgba(99,102,241,0.12); }

        .choose-card-title {
          font-family: 'Syne', sans-serif;
          font-size: 16px; font-weight: 700;
          color: #fff; letter-spacing: -0.3px;
          margin-bottom: 6px;
        }

        .choose-card-desc {
          font-size: 12px; color: #555; line-height: 1.6;
        }

        /* Form screen */
        .ob-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: #555;
          cursor: pointer; margin-bottom: 32px;
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
          padding: 0;
        }
        .ob-back:hover { color: #fff; }

        .field-label {
          display: block; font-size: 11px; font-weight: 500;
          color: #555; letter-spacing: 0.6px;
          text-transform: uppercase; margin-bottom: 6px;
        }

        .field-input {
          width: 100%; background: #1E1E1E;
          border: 1px solid #2A2A2A; border-radius: 12px;
          padding: 14px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; color: #fff; outline: none;
          transition: border-color 0.2s;
          margin-bottom: 20px;
        }
        .field-input::placeholder { color: #383838; }
        .field-input:focus { border-color: #C8F135; }

        .ob-hint {
          font-size: 12px; color: #444;
          margin-top: -12px; margin-bottom: 20px;
          line-height: 1.5;
        }

        .primary-btn {
          width: 100%; padding: 15px;
          background: #C8F135; border: none;
          border-radius: 13px;
          font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 700;
          color: #1A1A1A; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          letter-spacing: -0.2px;
        }
        .primary-btn:hover:not(:disabled) {
          background: #D4F557; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(200,241,53,0.2);
        }
        .primary-btn:active:not(:disabled) { transform: scale(0.98); }
        .primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .error-msg {
          background: rgba(255,85,85,0.08);
          border: 1px solid rgba(255,85,85,0.2);
          color: #FF6B6B; font-size: 13px;
          padding: 12px 16px; border-radius: 10px;
          margin-bottom: 16px;
          animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }

        /* Spinner */
        .spinner {
          display: inline-block; width: 15px; height: 15px;
          border: 2px solid rgba(26,26,26,0.3);
          border-top-color: #1A1A1A;
          border-radius: 50%; animation: spin 0.65s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Created / success screen */
        .success-icon {
          width: 64px; height: 64px;
          background: rgba(200,241,53,0.1);
          border: 1px solid rgba(200,241,53,0.2);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin-bottom: 24px;
        }

        .code-box {
          background: #1E1E1E;
          border: 1px solid #2A2A2A;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex; align-items: center;
          justify-content: space-between;
          margin: 24px 0; gap: 16px;
        }

        .code-value {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 800;
          color: #C8F135; letter-spacing: 6px;
        }

        .copy-btn {
          padding: 8px 16px;
          background: #242424; border: 1px solid #2E2E2E;
          border-radius: 9px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          color: #888; transition: all 0.15s;
          white-space: nowrap; flex-shrink: 0;
        }
        .copy-btn:hover { background: #2A2A2A; color: #fff; }
        .copy-btn.copied { background: rgba(200,241,53,0.1); color: #C8F135; border-color: rgba(200,241,53,0.2); }

        .code-note {
          font-size: 13px; color: #555;
          line-height: 1.6; margin-bottom: 28px;
        }
        .code-note strong { color: #888; }

        /* Responsive */
        @media (max-width: 768px) {
          .ob-left { display: none; }
          .ob-right { padding: 32px 24px; align-items: flex-start; padding-top: 56px; }
          .choose-grid { grid-template-columns: 1fr; }
          .ob-card { max-width: 100%; }
          .ob-title { font-size: 24px; }
          .code-box { padding: 16px; flex-direction: column; align-items: stretch; gap: 12px; }
          .code-value { font-size: 24px; text-align: center; }
        }
      `}</style>

      <div className="ob-root">

        {/* Left panel */}
        <div className="ob-left">
          <div className="ob-left-logo">
            <div className="ob-logo-mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="ob-logo-text">Divvy</span>
          </div>

          <div className="ob-left-content">
            <h2 className="ob-left-heading">
              Your shared<br />home,<br /><span>simplified.</span>
            </h2>
            <p className="ob-left-sub">
              Divvy automatically splits bills, tracks who owes what, and keeps every housemate on the same page.
            </p>

            <div className="ob-steps">
              {[
                { label: "Create your account", state: "done" },
                { label: "Set up your household", state: mode === "choose" || mode === "create" || mode === "join" ? "active" : "done" },
                { label: "Invite housemates", state: mode === "created" ? "active" : "pending" },
                { label: "Start splitting bills", state: "pending" },
              ].map((step, i) => (
                <div className="ob-step" key={i}>
                  <div className={`ob-step-dot ${step.state}`}>
                    {step.state === "done" ? "✓" : i + 1}
                  </div>
                  <span className={`ob-step-label ${step.state}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ob-left-footer">
            Your data stays within your household only.
          </div>
        </div>

        {/* Right panel */}
        <div className="ob-right">
          <div className="ob-card">

            {/* Step 1: Choose */}
            {mode === "choose" && (
              <>
                <h1 className="ob-title">Set up your household</h1>
                <p className="ob-sub">Are you starting a new household or joining one your housemate already created?</p>
                <div className="choose-grid">
                  <div className="choose-card" onClick={() => { setMode("create"); setError(""); }}>
                    <div className="choose-card-icon create">🏠</div>
                    <div className="choose-card-title">Create new</div>
                    <div className="choose-card-desc">Start a household and invite your housemates with a code.</div>
                  </div>
                  <div className="choose-card" onClick={() => { setMode("join"); setError(""); }}>
                    <div className="choose-card-icon join">🔑</div>
                    <div className="choose-card-title">Join existing</div>
                    <div className="choose-card-desc">Enter an invite code from your housemate to join their household.</div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2a: Create */}
            {mode === "create" && (
              <>
                <button className="ob-back" onClick={() => { setMode("choose"); setError(""); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                <h1 className="ob-title">Name your household</h1>
                <p className="ob-sub">Give your shared space a name. You can always change this later.</p>

                {error && <div className="error-msg">{error}</div>}

                <label className="field-label">Household name</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. The Lagos Flat, Block C Room 4..."
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  autoFocus
                />

                <button className="primary-btn" onClick={handleCreate} disabled={loading}>
                  {loading && <span className="spinner" />}
                  {loading ? "Creating…" : "Create household →"}
                </button>
              </>
            )}

            {/* Step 2b: Join */}
            {mode === "join" && (
              <>
                <button className="ob-back" onClick={() => { setMode("choose"); setError(""); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                <h1 className="ob-title">Join a household</h1>
                <p className="ob-sub">Ask your housemate for their invite code and enter it below.</p>

                {error && <div className="error-msg">{error}</div>}

                <label className="field-label">Invite code</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. a3f9bc12"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toLowerCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  autoFocus
                  maxLength={8}
                  style={{ letterSpacing: "4px", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 }}
                />
                <p className="ob-hint">Codes are 8 characters long. Ask your housemate to share theirs from the Housemates page.</p>

                <button className="primary-btn" onClick={handleJoin} disabled={loading}>
                  {loading && <span className="spinner" />}
                  {loading ? "Joining…" : "Join household →"}
                </button>
              </>
            )}

            {/* Step 3: Created — share invite code */}
            {mode === "created" && (
              <>
                <div className="success-icon">🏠</div>
                <h1 className="ob-title">Household created!</h1>
                <p className="ob-sub">
                  Share this invite code with your housemates so they can join.
                  Keep it somewhere safe — you can always find it in the Housemates page.
                </p>

                <div className="code-box">
                  <span className="code-value">{createdCode.toUpperCase()}</span>
                  <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyCode}>
                    {copied ? "✓ Copied!" : "Copy code"}
                  </button>
                </div>

                <p className="code-note">
                  Your housemates will need this code to join. Once they sign up for Divvy, they select <strong>"Join existing household"</strong> and enter this code.
                </p>

                <button className="primary-btn" onClick={() => router.push("/dashboard")}>
                  Go to dashboard →
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
