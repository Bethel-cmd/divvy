"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setSuccess("");

    // Diagnostic logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log("Supabase URL:", supabaseUrl);
    console.log("Supabase Key available:", !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      setError("Supabase configuration is missing. Check your .env.local file.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) {
          console.error("Signup error:", error);
          setError(error.message);
        } else if (data.session) {
          setSuccess("Account created! Setting up your space...");
          setTimeout(() => router.push("/onboarding"), 1000);
        } else {
          setSuccess("Account created! Please check your email for a confirmation link.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Signin error:", error);
          if (error.message.toLowerCase().includes("confirmed")) {
            setError("Email not confirmed. Please check your inbox or disable 'Confirm Email' in your Supabase Auth settings.");
          } else {
            setError(error.message);
          }
        } else {
          // Check if user has a household
          const { data: hm } = await supabase
            .from("housemates")
            .select("household_id")
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
            .single();

          if (hm?.household_id) router.push("/dashboard");
          else router.push("/onboarding");
        }
      }
    } catch (err: any) {
      console.error("Fetch error caught:", err);
      setError(`Connection failed: ${err.message || "Unknown error"}. Check your internet connection and Supabase URL.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          min-height: 100vh;
          background: #1E1E1E;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background texture */
        .auth-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at 80% 10%, rgba(200,241,53,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 400px 600px at 10% 90%, rgba(200,241,53,0.03) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Grid dot pattern */
        .auth-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
          animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Logo mark */
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
          animation: cardIn 0.5s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: #C8F135;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-mark svg {
          width: 18px;
          height: 18px;
        }

        .logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 20px;
          color: #FFFFFF;
          letter-spacing: -0.3px;
        }

        /* Heading */
        .auth-heading {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 32px;
          color: #FFFFFF;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin-bottom: 8px;
          animation: cardIn 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .auth-heading span {
          color: #C8F135;
        }

        .auth-sub {
          font-size: 14px;
          color: #666;
          margin-bottom: 36px;
          animation: cardIn 0.5s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Tab switcher */
        .tab-switcher {
          display: flex;
          background: #2A2A2A;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
          animation: cardIn 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .tab-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 9px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background: transparent;
          color: #666;
        }

        .tab-btn.active {
          background: #333;
          color: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        /* Form fields */
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: cardIn 0.5s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .field {
          position: relative;
        }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: #666;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .field-input {
          width: 100%;
          background: #242424;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 14px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #FFFFFF;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          -webkit-appearance: none;
        }

        .field-input::placeholder {
          color: #444;
        }

        .field-input:focus {
          border-color: #C8F135;
          background: #262626;
        }

        .field-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #242424 inset;
          -webkit-text-fill-color: #FFFFFF;
        }

        /* Error / success */
        .msg {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .msg.error {
          background: rgba(255,68,68,0.1);
          border: 1px solid rgba(255,68,68,0.2);
          color: #FF6B6B;
        }

        .msg.success {
          background: rgba(200,241,53,0.08);
          border: 1px solid rgba(200,241,53,0.2);
          color: #C8F135;
        }

        /* Submit button */
        .submit-btn {
          margin-top: 20px;
          width: 100%;
          padding: 16px;
          background: #C8F135;
          border: none;
          border-radius: 14px;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #1E1E1E;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: -0.2px;
          animation: cardIn 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
          overflow: hidden;
        }

        .submit-btn:hover:not(:disabled) {
          background: #D4F557;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(200,241,53,0.25);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0px) scale(0.99);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading spinner inside button */
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(30,30,30,0.3);
          border-top-color: #1E1E1E;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
          animation: cardIn 0.5s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #2E2E2E;
        }

        .divider-text {
          font-size: 12px;
          color: #444;
          white-space: nowrap;
        }

        /* Bottom note */
        .bottom-note {
          text-align: center;
          font-size: 12px;
          color: #444;
          margin-top: 28px;
          animation: cardIn 0.5s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          line-height: 1.6;
        }

        .bottom-note a {
          color: #C8F135;
          text-decoration: none;
        }

        @media (max-width: 1024px) {
          .auth-root { padding: 32px 24px; }
          .auth-card { max-width: 440px; }
          .logo-mark { width: 36px; height: 36px; }
          .logo-text { font-size: 18px; }
          .auth-heading { font-size: 28px; }
          .auth-sub { font-size: 14px; margin-bottom: 28px; }
          .field-label { font-size: 11px; }
          .field-input { padding: 13px 14px; font-size: 14px; }
          .msg { font-size: 12px; padding: 10px 14px; }
          .submit-btn { padding: 14px; font-size: 14px; margin-top: 18px; }
          .divider { margin: 20px 0; }
          .divider-text { font-size: 11px; }
          .oauth-btns { gap: 10px; }
          .oauth-btn { padding: 12px; font-size: 13px; }
          .bottom-note { font-size: 11px; margin-top: 20px; }
          .tab-btn { padding: 10px 14px; font-size: 12px; }
        }

        @media (max-width: 900px) {
          .auth-root { padding: 28px 20px; }
          .auth-card { max-width: 400px; }
          .logo-mark { width: 32px; height: 32px; }
          .logo-text { font-size: 16px; }
          .auth-heading { font-size: 24px; letter-spacing: -0.5px; }
          .auth-sub { font-size: 13px; margin-bottom: 24px; }
          .field-label { font-size: 10px; margin-bottom: 4px; }
          .field-input { padding: 12px 12px; font-size: 13px; margin-bottom: 14px; border-radius: 11px; }
          .msg { font-size: 12px; padding: 10px 12px; margin-top: 14px; border-radius: 9px; }
          .submit-btn { padding: 13px; font-size: 13px; border-radius: 12px; margin-top: 16px; }
          .divider { margin: 18px 0; gap: 10px; }
          .divider-line { height: 1px; }
          .divider-text { font-size: 11px; }
          .oauth-btns { gap: 8px; }
          .oauth-btn { padding: 11px; font-size: 12px; border-radius: 11px; }
          .bottom-note { font-size: 11px; margin-top: 18px; }
          .tab-btn { padding: 9px 12px; font-size: 11px; }
          .tab-btn.active::after { height: 2px; }
          .spinner { width: 14px; height: 14px; margin-right: 6px; }
        }

        @media (max-width: 640px) {
          .auth-root { padding: 20px 16px; }
          .auth-card { max-width: 100%; }
          .logo-wrap { margin-bottom: 28px; gap: 6px; }
          .logo-mark { width: 28px; height: 28px; }
          .logo-text { font-size: 14px; }
          .auth-heading { font-size: 22px; letter-spacing: -0.3px; line-height: 1.2; margin-bottom: 6px; }
          .auth-sub { font-size: 12px; margin-bottom: 20px; line-height: 1.6; }
          .mode-tabs { margin-bottom: 20px; gap: 4px; }
          .tab-btn { padding: 8px 10px; font-size: 10px; border-radius: 9px; }
          .tab-btn.active::after { height: 2px; }
          .form-group { margin-bottom: 12px; }
          .field-label { font-size: 9px; letter-spacing: 0.4px; margin-bottom: 3px; }
          .field-input { padding: 11px 11px; font-size: 12px; margin-bottom: 12px; border-radius: 10px; }
          .msg { font-size: 11px; padding: 9px 10px; margin-top: 12px; }
          .submit-btn { padding: 12px; font-size: 12px; border-radius: 11px; margin-top: 14px; }
          .divider { margin: 16px 0; gap: 8px; }
          .divider-text { font-size: 10px; }
          .oauth-btns { gap: 6px; margin-bottom: 20px; }
          .oauth-btn { padding: 10px; font-size: 11px; border-radius: 10px; gap: 6px; }
          .oauth-icon { width: 16px; height: 16px; }
          .bottom-note { font-size: 10px; margin-top: 16px; line-height: 1.5; }
          .spinner { width: 12px; height: 12px; margin-right: 5px; }
        }

        @media (max-width: 480px) {
          .auth-root { padding: 16px 12px; }
          .auth-card { max-width: 100%; }
          .logo-wrap { margin-bottom: 24px; gap: 5px; }
          .logo-mark { width: 24px; height: 24px; }
          .logo-text { font-size: 13px; }
          .auth-heading { font-size: 20px; letter-spacing: -0.2px; margin-bottom: 4px; }
          .auth-sub { font-size: 11px; margin-bottom: 16px; }
          .mode-tabs { margin-bottom: 16px; gap: 2px; }
          .tab-btn { padding: 7px 8px; font-size: 9px; border-radius: 8px; }
          .tab-btn.active::after { height: 1.5px; }
          .form-group { margin-bottom: 10px; }
          .field-label { font-size: 8px; letter-spacing: 0.3px; margin-bottom: 2px; }
          .field-input { padding: 10px 9px; font-size: 11px; margin-bottom: 10px; border-radius: 8px; }
          .msg { font-size: 10px; padding: 8px 9px; margin-top: 10px; border-radius: 8px; }
          .submit-btn { padding: 11px; font-size: 11px; border-radius: 10px; margin-top: 12px; }
          .divider { margin: 14px 0; gap: 6px; }
          .divider-text { font-size: 9px; }
          .oauth-btns { gap: 5px; margin-bottom: 16px; }
          .oauth-btn { padding: 9px; font-size: 10px; border-radius: 9px; gap: 5px; }
          .oauth-icon { width: 14px; height: 14px; }
          .bottom-note { font-size: 9px; margin-top: 14px; line-height: 1.4; }
          .spinner { width: 11px; height: 11px; margin-right: 4px; }
        }
      `}</style>

      <div className="auth-root">
        <div className="auth-card">

          {/* Logo */}
          <div className="logo-wrap">
            <div className="logo-mark">
              <svg viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3l6 6-6 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">Divvy</span>
          </div>

          {/* Heading */}
          <h1 className="auth-heading">
            {mode === "login" ? (
              <>Split smart,<br /><span>live easy.</span></>
            ) : (
              <>Your house,<br /><span>your rules.</span></>
            )}
          </h1>
          <p className="auth-sub">
            {mode === "login"
              ? "Sign in to manage shared expenses with your housemates."
              : "Create an account and invite your housemates."}
          </p>

          {/* Tab switcher */}
          <div className="tab-switcher">
            <button
              className={`tab-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            >
              Sign in
            </button>
            <button
              className={`tab-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
            >
              Create account
            </button>
          </div>

          {/* Form fields */}
          <div className="field-group">
            {mode === "signup" && (
              <div className="field">
                <label className="field-label">Full name</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Elvis Okonkwo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="field">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {/* Error / success messages */}
          {error && <div className="msg error">{error}</div>}
          {success && <div className="msg success">{success}</div>}

          {/* Submit */}
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <span className="spinner" />}
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign in to Divvy"
              : "Create my account"}
          </button>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">secured by Supabase</span>
            <div className="divider-line" />
          </div>

          {/* Bottom note */}
          <p className="bottom-note">
            By continuing you agree to our{" "}
            <a href="#">Terms of Service</a>
            {" "}and{" "}
            <a href="#">Privacy Policy</a>
            .<br />
            Your data stays within your household only.
          </p>

        </div>
      </div>
    </>
  );
}
