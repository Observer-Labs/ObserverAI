"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Activity, History, LogOut, Plug, Send, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { LogoMark } from "@/components/Logo";
import { AnimatedIcon, type IconPreset } from "@/components/motion/animated-icon";
import { cn } from "@/lib/utils";

// Tab hover drives the icon animation via variant propagation.
const MotionLink = motion.create(Link);

interface TopNavProps {
  sourceCount?: number;
  signalCount?: number;
  userInitials?: string;
  /** Plan tier, drives the trial counter pill. */
  plan?: "trial" | "starter" | "growth" | "scale" | "enterprise" | "pro" | "past_due" | "expired" | "no_plan";
  runsLeft?: number;
  trialDaysLeft?: number;
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

  const navItems: Array<{ href: string; label: string; icon: LucideIcon; preset: IconPreset }> = [
    { href: "/dashboard", label: "Signals",  icon: Activity, preset: "pulse" },
    { href: "/sources",   label: "Sources",  icon: Plug,     preset: "pop" },
    { href: "/alerts",    label: "Alerts",   icon: Send,     preset: "slide" },
    { href: "/history",   label: "History",  icon: History,  preset: "spin" },
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
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]">
      {/* Orange accent line at top */}
      <div className="h-0.5 bg-[linear-gradient(90deg,transparent_0%,rgba(249,115,22,0.55)_30%,rgba(249,115,22,0.55)_70%,transparent_100%)]" />

      <div className="mx-auto flex h-[50px] max-w-[1400px] items-center gap-0.5 px-6">

        {/* ── Logo ── */}
        <Link href="/dashboard" className="mr-4 flex shrink-0 items-center gap-[9px] no-underline">
          <LogoMark />
          <span className="text-[0.95rem] font-bold italic tracking-[-0.02em] text-foreground">
            Observer
          </span>
        </Link>

        {/* Separator */}
        <div className="mr-3.5 h-4 w-px shrink-0 bg-border" />

        {/* ── Nav tabs ── */}
        {navItems.map((item) => (
          <MotionLink
            key={item.href}
            href={item.href}
            whileHover="hover"
            className={`nav-tab ${isActive(item.href) ? "active" : ""}`}
          >
            <AnimatedIcon icon={item.icon} preset={item.preset} trigger="parent" size={13} strokeWidth={1.8} />
            {item.label}
          </MotionLink>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Right controls ── */}
        <div className="flex shrink-0 items-center gap-2.5">

          {/* Stats counter pill */}
          {(sourceCount > 0 || signalCount > 0) && (
            <div className="flex items-center gap-2 rounded-[20px] border bg-muted px-2.5 py-[3px]">
              {sourceCount > 0 && (
                <span className="font-mono text-[0.72rem] font-medium text-[var(--muted-light)]">
                  <span className="text-primary">{sourceCount}</span>
                  <span className="opacity-50"> src</span>
                </span>
              )}
              {sourceCount > 0 && signalCount > 0 && (
                <div className="h-2.5 w-px bg-border" />
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
            className="flex items-center rounded-[7px] p-[5px] text-muted-foreground transition-colors duration-[120ms] hover:bg-muted hover:text-foreground"
          >
            <AnimatedIcon icon={Settings} preset="spin" size={15} strokeWidth={1.7} />
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex cursor-pointer items-center rounded-[7px] border-none bg-transparent p-[5px] text-muted-foreground transition-colors duration-[120ms] hover:bg-muted hover:text-foreground"
          >
            <AnimatedIcon icon={LogOut} preset="slide" size={14} strokeWidth={1.7} />
          </button>

        </div>
      </div>
    </div>
  );
}
