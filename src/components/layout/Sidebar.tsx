"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Activity, Bell, History, LogOut, Plug, ShieldCheck } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LogoMark } from "@/components/Logo";
import { AnimatedIcon, type IconPreset } from "@/components/motion/animated-icon";
import type { LucideIcon } from "lucide-react";

// Row hover drives the icon animation via variant propagation.
const MotionLink = motion.create(Link);

interface SidebarProps {
  sourceCount?: number;
  signalCount?: number;
  userInitials?: string;
  workspaceName?: string;
  plan?: "trial" | "starter" | "growth" | "scale" | "enterprise" | "pro" | "past_due" | "expired" | "no_plan";
  runsLeft?: number;
  trialDaysLeft?: number;
  isAdmin?: boolean;
}

function planLabel(plan: SidebarProps["plan"]) {
  if (plan === "starter") return "Starter";
  if (plan === "growth") return "Growth";
  if (plan === "scale") return "Scale";
  if (plan === "enterprise") return "Enterprise";
  if (plan === "pro") return "Pro";
  if (plan === "trial") return "Trial";
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  signalCount = 0,
  sourceCount = 0,
  userInitials = "?",
  workspaceName,
  plan,
  isAdmin = false,
}: SidebarProps) {
  const t = useTranslations('nav');
  const tSidebar = useTranslations('sidebar');
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  const navItems: Array<{ href: string; label: string; icon: LucideIcon; preset: IconPreset; badge?: number }> = [
    { href: "/dashboard", label: t('signals'), icon: Activity, preset: "pulse", badge: signalCount > 0 ? signalCount : undefined },
    { href: "/sources", label: t('sources'), icon: Plug, preset: "pop", badge: sourceCount > 0 ? sourceCount : undefined },
    { href: "/alerts", label: t('alerts'), icon: Bell, preset: "swing", badge: undefined },
    { href: "/history", label: t('history'), icon: History, preset: "spin", badge: undefined },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck, preset: "pop" as IconPreset, badge: undefined }] : []),
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
        <LogoMark size={26} />
        <span className="text-[1.05rem] font-bold italic tracking-[-0.02em] text-foreground">
          Observer
        </span>
      </Link>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <MotionLink key={item.href} href={item.href} whileHover="hover" className={`sidebar-item ${active ? "active" : ""}`}>
              <span className="sidebar-item-icon">
                <AnimatedIcon icon={item.icon} preset={item.preset} trigger="parent" size={18} strokeWidth={1.7} />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </MotionLink>
          );
        })}
      </nav>

      {/* ── Bottom block ── */}
      <div className="sidebar-bottom">
        <div className="px-3 pt-2 pb-1">
          <LocaleSwitcher />
        </div>
        {/* Plan pill — hidden for admin users */}
        {!isAdmin && planLabel(plan) && (
          <Link
            href="/settings/billing"
            className="sidebar-plan border-border! bg-muted text-foreground"
          >
            <span className="font-bold uppercase">{planLabel(plan)}</span>
            {plan !== "trial" && <span className="opacity-65">{tSidebar('proActive')}</span>}
          </Link>
        )}
        {!isAdmin && plan === "expired" && (
          <Link
            href="/settings/billing"
            className="sidebar-plan border-[color-mix(in_oklch,var(--destructive)_30%,transparent)]! bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] text-destructive"
          >
            {tSidebar('trialEnded')}
          </Link>
        )}
        {!isAdmin && plan === "past_due" && (
          <Link
            href="/settings/billing"
            className="sidebar-plan border-[color-mix(in_oklch,var(--amber)_35%,transparent)]! bg-[color-mix(in_oklch,var(--amber)_12%,transparent)] text-[oklch(0.55_0.14_70)]"
          >
            {tSidebar('paymentFailed')}
          </Link>
        )}
        {!isAdmin && plan === "pro" && (
          <div className="sidebar-plan cursor-default border-[color-mix(in_oklch,var(--success)_30%,transparent)]! bg-[color-mix(in_oklch,var(--success)_12%,transparent)] text-[var(--success)]">
            <span className="font-bold">PRO</span>
            <span className="opacity-65">{tSidebar('proActive')}</span>
          </div>
        )}

        {/* User row */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{userInitials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.8rem] font-semibold text-foreground">
              {workspaceName || t('myWorkspace')}
            </div>
            <Link href="/settings" className="text-[0.7rem] text-muted-foreground no-underline">
              {t('settings')}
            </Link>
          </div>
          <button onClick={handleSignOut} title={t('signOut')} className="sidebar-icon-btn">
            <AnimatedIcon icon={LogOut} preset="slide" size={18} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </aside>
  );
}
