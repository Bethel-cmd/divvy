"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  payment_pending:  "🕐",
  payment_verified: "✅",
  payment_rejected: "❌",
  bill_added:       "📋",
};

const TYPE_COLORS: Record<string, string> = {
  payment_pending:  "#F59E0B",
  payment_verified: "#22C55E",
  payment_rejected: "#FF5555",
  bill_added:       "#C8F135",
};

export default function NotificationsBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.is_read).length;

  async function loadNotifs() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs(data || []);
  }

  useEffect(() => {
    loadNotifs();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    await loadNotifs();
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  return (
    <>
      <style>{`
        .nb-wrap { position: relative; }

        .nb-btn {
          width: 40px; height: 40px;
          background: #1E1E1E; border: 1px solid #2A2A2A;
          border-radius: 12px; display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; position: relative; transition: background .15s;
        }
        .nb-btn:hover { background: #242424; }

        .nb-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 18px; height: 18px;
          background: #C8F135; border-radius: 9px;
          border: 2px solid #161616;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 9px; font-weight: 800; color: #161616;
          padding: 0 4px;
          animation: popIn .3s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .nb-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 360px; max-height: 480px;
          background: #1A1A1A; border: 1px solid #252525;
          border-radius: 20px; overflow: hidden;
          z-index: 200;
          box-shadow: 0 24px 48px rgba(0,0,0,0.5);
          animation: dropIn .25s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .nb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; border-bottom: 1px solid #222;
        }

        .nb-header-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700; color: #fff;
        }

        .nb-mark-all {
          font-size: 12px; color: #C8F135; cursor: pointer;
          background: none; border: none; font-family: 'DM Sans', sans-serif;
          font-weight: 500; transition: opacity .15s;
        }
        .nb-mark-all:hover { opacity: .7; }

        .nb-list { overflow-y: auto; max-height: 380px; }

        .nb-item {
          display: flex; gap: 12px;
          padding: 14px 18px; border-bottom: 1px solid #1E1E1E;
          cursor: pointer; transition: background .15s;
          position: relative;
        }
        .nb-item:last-child { border-bottom: none; }
        .nb-item:hover { background: #1E1E1E; }
        .nb-item.unread { background: rgba(200,241,53,.03); }

        .nb-item-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0; margin-top: 1px;
        }

        .nb-item-content { flex: 1; min-width: 0; }

        .nb-item-title {
          font-size: 13px; font-weight: 500; color: #fff;
          margin-bottom: 3px; line-height: 1.3;
        }

        .nb-item-msg {
          font-size: 12px; color: #666;
          line-height: 1.5; margin-bottom: 4px;
        }

        .nb-item-time { font-size: 11px; color: #444; }

        .nb-unread-dot {
          position: absolute; top: 18px; right: 14px;
          width: 6px; height: 6px;
          background: #C8F135; border-radius: 50%;
        }

        .nb-empty {
          padding: 48px 24px; text-align: center;
        }
        .nb-empty-icon { font-size: 32px; margin-bottom: 12px; }
        .nb-empty-text { font-size: 13px; color: #555; }

        @media (max-width: 1024px) {
          .nb-dropdown { max-width: 360px; }
          .nb-header-title { font-size: 13px; }
          .nb-mark-all { font-size: 12px; }
          .nb-item-text { font-size: 12px; }
          .nb-item-time { font-size: 11px; }
        }

        @media (max-width: 900px) {
          .nb-dropdown { max-width: 320px; right: 16px; }
          .nb-header-title { font-size: 12px; }
          .nb-mark-all { font-size: 11px; padding: 6px 10px; }
          .nb-item { padding: 10px 12px; }
          .nb-item-text { font-size: 12px; }
          .nb-item-time { font-size: 10px; }
          .nb-empty-icon { font-size: 28px; }
          .nb-empty-text { font-size: 12px; }
        }

        @media (max-width: 640px) {
          .nb-dropdown { max-width: 300px; left: 12px; right: 12px; top: 64px; }
          .nb-header { padding: 12px 14px; }
          .nb-header-title { font-size: 11px; }
          .nb-mark-all { font-size: 10px; padding: 5px 8px; }
          .nb-list { max-height: calc(100vh - 180px); }
          .nb-item { padding: 9px 11px; border-radius: 10px; }
          .nb-item-icon { width: 32px; height: 32px; font-size: 16px; }
          .nb-item-text { font-size: 11px; margin-bottom: 2px; }
          .nb-item-time { font-size: 9px; }
          .nb-empty { padding: 40px 20px; }
          .nb-empty-icon { font-size: 24px; margin-bottom: 8px; }
          .nb-empty-text { font-size: 11px; }
        }

        @media (max-width: 480px) {
          .nb-dropdown {
            position: fixed;
            top: 56px;
            left: 8px;
            right: 8px;
            width: auto;
            max-height: calc(100vh - 100px);
            max-width: none;
          }
          .nb-header { padding: 10px 12px; gap: 6px; }
          .nb-header-title { font-size: 10px; }
          .nb-mark-all { font-size: 9px; padding: 4px 6px; border-radius: 6px; }
          .nb-list { max-height: calc(100vh - 150px); }
          .nb-item { padding: 8px 10px; border-radius: 9px; gap: 8px; }
          .nb-item-icon { width: 28px; height: 28px; font-size: 13px; border-radius: 8px; }
          .nb-item-text { font-size: 10px; margin-bottom: 1px; }
          .nb-item-time { font-size: 8px; }
          .nb-empty { padding: 32px 16px; }
          .nb-empty-icon { font-size: 20px; margin-bottom: 6px; }
          .nb-empty-text { font-size: 10px; }
        }
      `}</style>

      <div className="nb-wrap" ref={dropdownRef}>
        <button className="nb-btn" onClick={() => { setOpen(!open); if (!open) loadNotifs(); }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {unread > 0 && <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>}
        </button>

        {open && (
          <div className="nb-dropdown">
            <div className="nb-header">
              <span className="nb-header-title">
                Notifications {unread > 0 && <span style={{ color: "#C8F135" }}>({unread})</span>}
              </span>
              {unread > 0 && (
                <button className="nb-mark-all" onClick={markAllRead}>Mark all read</button>
              )}
            </div>

            <div className="nb-list">
              {notifs.length === 0 ? (
                <div className="nb-empty">
                  <div className="nb-empty-icon">🔔</div>
                  <div className="nb-empty-text">No notifications yet</div>
                </div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  className={`nb-item ${!n.is_read ? "unread" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <div
                    className="nb-item-icon"
                    style={{ background: `${TYPE_COLORS[n.type]}15` }}
                  >
                    {TYPE_ICONS[n.type] || "📋"}
                  </div>
                  <div className="nb-item-content">
                    <div className="nb-item-title">{n.title}</div>
                    <div className="nb-item-msg">{n.message}</div>
                    <div className="nb-item-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div className="nb-unread-dot" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
