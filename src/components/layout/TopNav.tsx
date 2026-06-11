"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { LogoMark } from "@/components/Logo";

interface TopNavProps {
  sourceCount?: number;
  signalCount?: number;
  userInitials?: string;
  /** Plan tier, drives the trial counter pill. */
  plan?: "trial" | "pro" | "past_due" | "expired" | "no_plan";
  runsLeft?: number;
  trialDaysLeft?: number;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SignalsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="4.5" width="2.5" height="8" rx="1.25" fill="currentColor"/>
      <rect x="5"   y="2.5" width="2.5" height="10" rx="1.25" fill="currentColor"/>
      <rect x="9.5" y="0.5" width="2.5" height="12" rx="1.25" fill="currentColor"/>
    </svg>
  );
}

function SourcesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="2" fill="currentColor"/>
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1"/>
      <path d="M1.5 4.5Q6.5 6 11.5 4.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <path d="M1.5 8.5Q6.5 7 11.5 8.5" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  );
}

function DistributionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="2.5" cy="6.5" r="1.8" fill="currentColor"/>
      <circle cx="10.5" cy="2.5" r="1.8" fill="currentColor"/>
      <circle cx="10.5" cy="10.5" r="1.8" fill="currentColor"/>
      <line x1="4.2" y1="6.5" x2="8.8" y2="3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="4.2" y1="6.5" x2="8.8" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="2.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <path d="M0.5 5L6.5 8.5L12.5 5" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.9 10.9l1.05 1.05M10.9 4.1l1.05-1.05M3.05 11.95l1.06-1.06"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.5 9.5L12 7l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="7" x2="5.5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopNav({
  sourceCount = 0,
  signalCount = 0,
  userInitials = "?",
  plan,
  runsLeft,
  trialDaysLeft,
}: TopNavProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    // Full reload, clears cookies cleanly and avoids the auth-flash where the
    // next render briefly sees the old cookie before middleware redirects.
    window.location.href = "/";
  };

  const navItems = [
    { href: "/dashboard", label: "Signals",  icon: <SignalsIcon /> },
    { href: "/sources",   label: "Sources",  icon: <SourcesIcon /> },
    { href: "/alerts",    label: "Alerts",   icon: <DistributionIcon /> },
    { href: "/history",   label: "History",  icon: <DeliveryIcon /> },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    // aliases
    if (href === "/sources"  && (pathname.startsWith("/sources")  || pathname.startsWith("/connect"))) return true;
    if (href === "/alerts"   && (pathname.startsWith("/alerts")   || pathname.startsWith("/settings/distribution"))) return true;
    if (href === "/history"  && (pathname.startsWith("/history")  || pathname.startsWith("/delivery-log"))) return true;
    return pathname.startsWith(href);
  };

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(8,8,8,0.93)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      {/* Orange accent line at top */}
      <div style={{
        height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.55) 30%, rgba(249,115,22,0.55) 70%, transparent 100%)",
      }} />

      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 2,
        height: 50,
      }}>

        {/* ── Logo ── */}
        <Link href="/dashboard" style={{
          textDecoration: "none",
          display: "flex", alignItems: "center", gap: 9,
          marginRight: 16, flexShrink: 0,
        }}>
          <LogoMark />
          <span style={{
            color: "#fff", fontWeight: 700, fontSize: "0.95rem",
            fontStyle: "italic", letterSpacing: "-0.02em",
          }}>
            Observer
          </span>
        </Link>

        {/* Separator */}
        <div style={{
          width: 1, height: 16,
          background: "rgba(255,255,255,0.1)",
          marginRight: 14, flexShrink: 0,
        }} />

        {/* ── Nav tabs ── */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-tab ${isActive(item.href) ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Right controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

          {/* Stats counter pill */}
          {(sourceCount > 0 || signalCount > 0) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              {sourceCount > 0 && (
                <span style={{
                  color: "var(--muted-light)", fontSize: "0.72rem",
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                }}>
                  <span style={{ color: "var(--accent)" }}>{sourceCount}</span>
                  <span style={{ opacity: 0.5 }}> src</span>
                </span>
              )}
              {sourceCount > 0 && signalCount > 0 && (
                <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.12)" }} />
              )}
              {signalCount > 0 && (
                <span style={{
                  color: "var(--muted-light)", fontSize: "0.72rem",
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                }}>
                  <span style={{ color: "var(--accent)" }}>{signalCount}</span>
                  <span style={{ opacity: 0.5 }}> sig</span>
                </span>
              )}
            </div>
          )}

          {/* Plan pill, only render when we have meaningful data */}
          {plan === "trial" && typeof runsLeft === "number" && (
            <Link
              href="/settings/billing"
              title={`${runsLeft} of trial runs remaining${typeof trialDaysLeft === "number" ? ` · ${trialDaysLeft} days left` : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 11px", borderRadius: 20,
                background: runsLeft <= 2
                  ? "rgba(251,191,36,0.10)"
                  : "rgba(249,115,22,0.08)",
                border: `1px solid ${runsLeft <= 2 ? "rgba(251,191,36,0.30)" : "rgba(249,115,22,0.22)"}`,
                color: runsLeft <= 2 ? "#fbbf24" : "var(--accent)",
                fontSize: "0.7rem", fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 700 }}>{runsLeft}</span>
              <span style={{ opacity: 0.65 }}>runs left</span>
              {typeof trialDaysLeft === "number" && trialDaysLeft <= 7 && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{trialDaysLeft}d</span>
                </>
              )}
            </Link>
          )}
          {plan === "expired" && (
            <Link href="/settings/billing" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 20,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)",
              color: "#f87171", fontSize: "0.7rem", fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Trial ended · Upgrade →
            </Link>
          )}
          {plan === "past_due" && (
            <Link href="/settings/billing" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 20,
              background: "rgba(251,191,36,0.10)",
              border: "1px solid rgba(251,191,36,0.30)",
              color: "#fbbf24", fontSize: "0.7rem", fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Payment failed
            </Link>
          )}

          {/* Avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(249,115,22,0.12)",
            border: "1.5px solid rgba(249,115,22,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)",
            flexShrink: 0, letterSpacing: "0.03em",
          }}>
            {userInitials}
          </div>

          {/* Settings */}
          <Link href="/settings" title="Settings" style={{
            color: "var(--muted-dim)", display: "flex", alignItems: "center",
            padding: 5, borderRadius: 7,
            transition: "color 0.12s, background 0.12s",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <GearIcon />
          </Link>

          {/* Sign out */}
          <button onClick={handleSignOut} title="Sign out" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-dim)", display: "flex", alignItems: "center",
            padding: 5, borderRadius: 7,
            transition: "color 0.12s, background 0.12s",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <SignOutIcon />
          </button>

        </div>
      </div>
    </div>
  );
}
