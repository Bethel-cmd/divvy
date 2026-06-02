"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./ThemeProvider";
import NotificationsBell from "./NotificationsBell";

const createNavItems = (accent: string, muted: string) => [
  {
    label: "Home",
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke={active ? accent : muted} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          fill={active ? `${accent}1f` : "none"}/>
        <path d="M9 21V12h6v9" stroke={active ? accent : muted}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Housemates",
    href: "/dashboard/housemates",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke={active ? accent : muted} strokeWidth="1.8"/>
        <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
          stroke={active ? accent : muted} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M16 11c1.657 0 3 1.343 3 3M19 20c0-2.21-1.343-4-3-4"
          stroke={active ? accent : muted} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="2"
          stroke={active ? accent : muted} strokeWidth="1.8"/>
        <path d="M8 8h8M8 12h8M8 16h5"
          stroke={active ? accent : muted} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6"
          stroke={active ? accent : muted} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? accent : muted} strokeWidth="1.8"/>
        <path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke={active ? accent : muted} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  // Theme-aware colors for icons
  const themeColors = {
    dark: { accent: "#C8F135", muted: "#555" },
    darker: { accent: "#C8F135", muted: "#444" },
    light: { accent: "#1A1A1A", muted: "#888" },
  };
  
  const colors = themeColors[theme as keyof typeof themeColors] || themeColors.dark;
  const { accent, muted } = colors;
  
  // Create nav items with theme-aware colors
  const navItems = createNavItems(accent, muted);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 240px;
          min-width: 240px;
          background: var(--surface-2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 32px 16px;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 50;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
          margin-bottom: 40px;
        }

        .sidebar-logo-mark {
          width: 32px; height: 32px;
          background: var(--accent);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .sidebar-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: var(--text);
          letter-spacing: -0.3px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.15s ease;
          position: relative;
        }

        .sidebar-link:hover {
          background: var(--surface);
        }

        .sidebar-link.active {
          background: rgba(200,241,53,0.08);
        }

        .sidebar-link-label {
          font-size: 14px;
          font-weight: 500;
          transition: color 0.15s;
        }

        .sidebar-link.active .sidebar-link-label { color: var(--accent); }
        .sidebar-link:not(.active) .sidebar-link-label { color: var(--text-muted); }

        .sidebar-link.active::before {
          content: '';
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 20px;
          background: var(--accent);
          border-radius: 0 3px 3px 0;
        }

        .sidebar-bottom {
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin-top: 16px;
        }

        .signout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 12px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'DM Sans', sans-serif;
        }

        .signout-btn:hover { background: var(--surface); }

        .signout-btn span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
        }

        /* ── MAIN CONTENT ── */
        .main-content {
          flex: 1;
          margin-left: 240px;
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }

        /* ── APP HEADER ── */
        .app-header {
          height: 64px;
          min-height: 64px;
          padding: 0 40px;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 110;
          background: rgba(var(--bg-rgb), 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .app-header-inner {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-mobile-logo {
          display: none;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .header-logo-mark {
          width: 28px; height: 28px;
          background: var(--accent);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .header-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: var(--text);
          letter-spacing: -0.3px;
        }

        /* ── BOTTOM NAV (mobile only) ── */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: var(--surface-2);
          border-top: 1px solid var(--border);
          justify-content: space-around;
          align-items: center;
          padding: 10px 0 20px;
          z-index: 100;
        }

        .bnav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          padding: 6px 20px;
          border-radius: 12px;
          transition: transform 0.15s;
          position: relative;
        }

        .bnav-item:active { transform: scale(0.9); }

        .bnav-dot {
          position: absolute;
          top: 2px;
          width: 4px; height: 4px;
          background: var(--accent);
          border-radius: 50%;
        }

        .bnav-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 500;
        }

        .bnav-label.active { color: var(--accent); }
        .bnav-label.inactive { color: var(--text-muted); }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main-content {
            margin-left: 0;
            padding-bottom: 80px;
          }
          .app-header {
            padding: 0 20px;
          }
          .header-mobile-logo {
            display: flex;
          }
          .bottom-nav { display: flex; }
        }
      `}</style>

      <div className="app-shell">

        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="sidebar-logo-text">Divvy</span>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const active = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? "active" : ""}`}
                >
                  {item.icon(active)}
                  <span className="sidebar-link-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-bottom">
            <button className="signout-btn" onClick={handleSignOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="app-header-left">
                <Link href="/dashboard" className="header-mobile-logo">
                  <div className="header-logo-mark">
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9h12M9 3l6 6-6 6" stroke="var(--bg)" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="header-logo-text">Divvy</span>
                </Link>
              </div>
              <div className="app-header-right">
                <NotificationsBell />
              </div>
            </div>
          </header>

          <div style={{ flex: 1 }}>
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav">
          {navItems.filter(item => item.href !== "/dashboard/analytics").map((item) => {
            const active = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="bnav-item">
                {active && <span className="bnav-dot" />}
                {item.icon(active)}
                <span className={`bnav-label ${active ? "active" : "inactive"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

      </div>
    </>
  );
}
