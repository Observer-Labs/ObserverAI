"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';

interface SidebarProps {
  sourceCount?: number;
  signalCount?: number;
  userInitials?: string;
  workspaceName?: string;
  plan?: "trial" | "pro" | "past_due" | "expired" | "no_plan";
  runsLeft?: number;
  trialDaysLeft?: number;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke="#f97316" strokeWidth="1.2" opacity="0.5" />
      <path d="M3.5 12C5.5 7.5 8.5 5.5 12 5.5C15.5 5.5 18.5 7.5 20.5 12C18.5 16.5 15.5 18.5 12 18.5C8.5 18.5 5.5 16.5 3.5 12Z" stroke="#f97316" strokeWidth="1.3" fill="none" />
      <circle cx="12" cy="12" r="3" fill="#f97316" />
      <circle cx="13.2" cy="10.8" r="0.9" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}
function SignalsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="4.5" width="2.5" height="8" rx="1.25" fill="currentColor" />
      <rect x="5" y="2.5" width="2.5" height="10" rx="1.25" fill="currentColor" />
      <rect x="9.5" y="0.5" width="2.5" height="12" rx="1.25" fill="currentColor" />
    </svg>
  );
}
function SourcesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 4.5Q6.5 6 11.5 4.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M1.5 8.5Q6.5 7 11.5 8.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
function AlertsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
      <circle cx="2.5" cy="6.5" r="1.8" fill="currentColor" />
      <circle cx="10.5" cy="2.5" r="1.8" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="1.8" fill="currentColor" />
      <line x1="4.2" y1="6.5" x2="8.8" y2="3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="4.2" y1="6.5" x2="8.8" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="2.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M0.5 5L6.5 8.5L12.5 5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.5 9.5L12 7l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="7" x2="5.5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  signalCount = 0,
  sourceCount = 0,
  userInitials = "?",
  workspaceName,
  plan,
  runsLeft,
  trialDaysLeft,
}: SidebarProps) {
  const t = useTranslations('nav');
  const tSidebar = useTranslations('sidebar');
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  const navItems = [
    { href: "/dashboard", label: t('signals'), icon: <SignalsIcon />, badge: signalCount > 0 ? signalCount : undefined },
    { href: "/sources", label: t('sources'), icon: <SourcesIcon />, badge: sourceCount > 0 ? sourceCount : undefined },
    { href: "/alerts", label: t('alerts'), icon: <AlertsIcon />, badge: undefined },
    { href: "/history", label: t('history'), icon: <HistoryIcon />, badge: undefined },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/sources" && (pathname.startsWith("/sources") || pathname.startsWith("/connect"))) return true;
    if (href === "/alerts" && (pathname.startsWith("/alerts") || pathname.startsWith("/settings/distribution"))) return true;
    if (href === "/history" && (pathname.startsWith("/history") || pathname.startsWith("/delivery-log"))) return true;
    return pathname.startsWith(href);
  };

  return (
    <aside className="app-sidebar">
      {/* ── Logo ── */}
      <Link href="/dashboard" className="sidebar-logo">
        <LogoMark />
        <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.05rem", fontStyle: "italic", letterSpacing: "-0.02em" }}>
          Observer
        </span>
      </Link>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? "active" : ""}`}>
              <span className="sidebar-item-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom block ── */}
      <div className="sidebar-bottom">
        <div style={{ padding: '8px 12px 4px' }}>
          <LocaleSwitcher />
        </div>
        {/* Plan pill */}
        {plan === "trial" && typeof runsLeft === "number" && (
          <Link href="/settings/billing" className="sidebar-plan" style={{
            background: runsLeft <= 2 ? "color-mix(in oklch, var(--amber) 12%, transparent)" : "var(--muted-surface)",
            borderColor: runsLeft <= 2 ? "color-mix(in oklch, var(--amber) 35%, transparent)" : "var(--border)",
            color: runsLeft <= 2 ? "oklch(0.55 0.14 70)" : "var(--foreground)",
          }}>
            <span style={{ fontWeight: 700 }}>{runsLeft}</span>
            <span style={{ opacity: 0.65 }}>{tSidebar('runsLeftSuffix')}</span>
            {typeof trialDaysLeft === "number" && trialDaysLeft <= 7 && (
              <><span style={{ opacity: 0.4 }}>·</span><span>{trialDaysLeft}d</span></>
            )}
          </Link>
        )}
        {plan === "expired" && (
          <Link href="/settings/billing" className="sidebar-plan" style={{ background: "color-mix(in oklch, var(--destructive) 10%, transparent)", borderColor: "color-mix(in oklch, var(--destructive) 30%, transparent)", color: "var(--destructive)" }}>
            {tSidebar('trialEnded')}
          </Link>
        )}
        {plan === "past_due" && (
          <Link href="/settings/billing" className="sidebar-plan" style={{ background: "color-mix(in oklch, var(--amber) 12%, transparent)", borderColor: "color-mix(in oklch, var(--amber) 35%, transparent)", color: "oklch(0.55 0.14 70)" }}>
            {tSidebar('paymentFailed')}
          </Link>
        )}
        {plan === "pro" && (
          <div className="sidebar-plan" style={{ background: "color-mix(in oklch, var(--success) 12%, transparent)", borderColor: "color-mix(in oklch, var(--success) 30%, transparent)", color: "var(--success)", cursor: "default" }}>
            <span style={{ fontWeight: 700 }}>PRO</span>
            <span style={{ opacity: 0.65 }}>{tSidebar('proActive')}</span>
          </div>
        )}

        {/* User row */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {workspaceName || t('myWorkspace')}
            </div>
            <Link href="/settings" style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", textDecoration: "none" }}>
              {t('settings')}
            </Link>
          </div>
          <button onClick={handleSignOut} title={t('signOut')} className="sidebar-icon-btn">
            <SignOutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
