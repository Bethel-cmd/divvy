"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(2);

  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push(next);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router, next]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .conf-root {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .conf-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 600px 500px at 50% 30%, rgba(200,241,53,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .conf-card {
          text-align: center;
          position: relative;
          z-index: 1;
          max-width: 400px;
          animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .check-circle {
          width: 80px;
          height: 80px;
          background: rgba(200,241,53,0.1);
          border: 2px solid var(--accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          animation: popIn 0.5s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }

        .check-circle svg {
          animation: checkDraw 0.4s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes checkDraw {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }

        .conf-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: var(--text);
          letter-spacing: -0.5px;
          margin-bottom: 10px;
          animation: cardIn 0.5s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .conf-sub {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 32px;
          animation: cardIn 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .conf-redirect {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 13px;
          color: var(--text-muted);
          animation: cardIn 0.5s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .conf-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="conf-root">
        <div className="conf-card">
          <div className="check-circle">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="var(--accent)" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="conf-title">Email confirmed</h1>
          <p className="conf-sub">
            Your account is verified and ready to go.<br />
            Taking you into Divvy now.
          </p>

          <div className="conf-redirect">
            <span className="conf-spinner" />
            Redirecting in {countdown}s...
          </div>
        </div>
      </div>
    </>
  );
}
