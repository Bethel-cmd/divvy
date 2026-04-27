"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke={active ? "#C8F135" : "#555"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "rgba(200,241,53,0.12)" : "none"}
        />
        <path
          d="M9 21V12h6v9"
          stroke={active ? "#C8F135" : "#555"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Housemates",
    href: "/dashboard/housemates",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8"/>
        <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M16 11c1.657 0 3 1.343 3 3" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M19 20c0-2.21-1.343-4-3-4" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="2" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8"/>
        <path d="M8 8h8M8 12h8M8 16h5" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? "#C8F135" : "#555"} strokeWidth="1.8"/>
        <path
          d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke={active ? "#C8F135" : "#555"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1A1A1A;
          border-top: 1px solid #2A2A2A;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 10px 0 20px;
          z-index: 100;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          padding: 6px 20px;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .nav-item:active {
          transform: scale(0.9);
        }

        .nav-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2px;
          transition: color 0.2s;
        }

        .nav-label.active { color: #C8F135; }
        .nav-label.inactive { color: #555; }

        .nav-dot {
          position: absolute;
          top: 2px;
          width: 4px;
          height: 4px;
          background: #C8F135;
          border-radius: 50%;
        }
      `}</style>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="nav-item">
              {active && <span className="nav-dot" />}
              {item.icon(active)}
              <span className={`nav-label ${active ? "active" : "inactive"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
