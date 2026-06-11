"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

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
    <div className="sticky top-0 z-50 border-b border-white/[0.07] bg-[rgba(8,8,8,0.93)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]">
      {/* Orange accent line at top */}
      <div className="h-0.5 bg-[linear-gradient(90deg,transparent_0%,rgba(249,115,22,0.55)_30%,rgba(249,115,22,0.55)_70%,transparent_100%)]" />

      <div className="mx-auto flex h-[50px] max-w-[1400px] items-center gap-0.5 px-6">

        {/* ── Logo ── */}
        <Link href="/dashboard" className="mr-4 flex shrink-0 items-center gap-[9px] no-underline">
          <LogoMark />
          <span className="text-[0.95rem] font-bold italic tracking-[-0.02em] text-white">
            Observer
          </span>
        </Link>

        {/* Separator */}
        <div className="mr-3.5 h-4 w-px shrink-0 bg-white/10" />

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
        <div className="flex-1" />

        {/* ── Right controls ── */}
        <div className="flex shrink-0 items-center gap-2.5">

          {/* Stats counter pill */}
          {(sourceCount > 0 || signalCount > 0) && (
            <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-[3px]">
              {sourceCount > 0 && (
                <span className="font-mono text-[0.72rem] font-medium text-[var(--muted-light)]">
                  <span className="text-primary">{sourceCount}</span>
                  <span className="opacity-50"> src</span>
                </span>
              )}
              {sourceCount > 0 && signalCount > 0 && (
                <div className="h-2.5 w-px bg-white/[0.12]" />
              )}
              {signalCount > 0 && (
                <span className="font-mono text-[0.72rem] font-medium text-[var(--muted-light)]">
                  <span className="text-primary">{signalCount}</span>
                  <span className="opacity-50"> sig</span>
                </span>
              )}
            </div>
          )}

          {/* Plan pill, only render when we have meaningful data */}
          {plan === "trial" && typeof runsLeft === "number" && (
            <Link
              href="/settings/billing"
              title={`${runsLeft} of trial runs remaining${typeof trialDaysLeft === "number" ? ` · ${trialDaysLeft} days left` : ""}`}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-[20px] border px-[11px] py-1 font-mono text-[0.7rem] font-semibold no-underline",
                runsLeft <= 2
                  ? "border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)] text-[#fbbf24]"
                  : "border-[rgba(249,115,22,0.22)] bg-[rgba(249,115,22,0.08)] text-primary"
              )}
            >
              <span className="font-bold">{runsLeft}</span>
              <span className="opacity-65">runs left</span>
              {typeof trialDaysLeft === "number" && trialDaysLeft <= 7 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{trialDaysLeft}d</span>
                </>
              )}
            </Link>
          )}
          {plan === "expired" && (
            <Link
              href="/settings/billing"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-[20px] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.10)] px-3 py-1 text-[0.7rem] font-semibold text-[#f87171] no-underline"
            >
              Trial ended · Upgrade →
            </Link>
          )}
          {plan === "past_due" && (
            <Link
              href="/settings/billing"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-[20px] border border-[rgba(251,191,36,0.30)] bg-[rgba(251,191,36,0.10)] px-3 py-1 text-[0.7rem] font-semibold text-[#fbbf24] no-underline"
            >
              Payment failed
            </Link>
          )}

          {/* Avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.12)] text-[0.68rem] font-bold tracking-[0.03em] text-primary">
            {userInitials}
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center rounded-[7px] p-[5px] text-[var(--muted-dim)] transition-colors duration-[120ms] hover:bg-white/[0.06] hover:text-white"
          >
            <GearIcon />
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex cursor-pointer items-center rounded-[7px] border-none bg-transparent p-[5px] text-[var(--muted-dim)] transition-colors duration-[120ms] hover:bg-white/[0.06] hover:text-white"
          >
            <SignOutIcon />
          </button>

        </div>
      </div>
    </div>
  );
}
