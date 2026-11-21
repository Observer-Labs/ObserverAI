"use client";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AllPlanPrices } from "@/lib/polar-prices";

export type PricingPlanData = {
  id: "starter" | "growth" | "scale" | "enterprise";
  name: string;
  description: string;
  audience: string;
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
};

type Labels = {
  monthly: string;
  yearly: string;
  save20: string;
  perMonth: string;
  perMonthAnnual: string;
  yearlyOnly: string;
  mostPopular: string;
  perYear: string;
  custom: string;
};

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function PricingCards({ plans, labels, prices }: { plans: PricingPlanData[]; labels: Labels; prices: AllPlanPrices }) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      {/* Period toggle */}
      <div className="mx-auto mb-8 max-w-[1120px] px-5 sm:px-8">
        <div role="group" aria-label={`${labels.monthly} / ${labels.yearly}`} className="inline-flex items-center rounded-full border border-mk-line bg-mk-sunken p-[3px]">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-[0.86rem] font-medium transition-colors duration-200",
                period === p ? "bg-mk-raised text-mk-ink shadow-[0_1px_2px_rgba(23,20,15,0.12)]" : "text-mk-muted hover:text-mk-ink",
              )}
            >
              {labels[p]}
              {p === "yearly" && <span className="font-mk-mono text-[0.7rem] font-medium text-mk-accent-ink">{labels.save20}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 px-5 pb-20 sm:grid-cols-2 sm:px-8 md:pb-28 xl:grid-cols-4">
        {plans.map((plan) => {
          const planPrices = prices[plan.id as keyof AllPlanPrices];
          const isEnterprise = plan.id === "enterprise";
          // Derive from API: yearly-only if no monthly price exists
          const isYearlyOnly = !isEnterprise && !planPrices?.monthly && !!planPrices?.yearly;

          let displayCents: number | null = null;
          let annualTotal: number | null = null;
          if (!isEnterprise) {
            if (period === "yearly" && planPrices?.yearly !== undefined) {
              displayCents = Math.round(planPrices.yearly / 12);
              annualTotal = planPrices.yearly;
            } else if (planPrices?.monthly !== undefined) {
              displayCents = planPrices.monthly;
            } else if (planPrices?.yearly !== undefined) {
              // no monthly option → yearly equivalent in monthly mode too
              displayCents = Math.round(planPrices.yearly / 12);
              annualTotal = planPrices.yearly;
            }
          }

          const activePrice = isEnterprise ? labels.custom : (displayCents !== null ? fmt(displayCents) : "—");
          // Badge only when plan has no monthly option and monthly tab is selected
          const showYearlyOnlyBadge = isYearlyOnly && period === "monthly";
          // Annual total subtext shown when billing is annual
          const yearlySubText = annualTotal !== null ? `${fmt(annualTotal)} ${labels.perYear}` : null;

          const sub = plan.featured ? "text-mk-paper/75" : "text-mk-muted";

          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                plan.featured ? "mk-on-ink border-mk-ink bg-mk-ink text-mk-paper" : "border-mk-line bg-mk-raised",
              )}
            >
              <div className="flex min-h-6 items-center justify-between gap-2">
                <h2 lang="en" className={cn("font-mk-mono text-[0.74rem] font-medium uppercase tracking-[0.08em]", plan.featured ? "text-mk-paper" : "text-mk-soft")}>
                  {plan.name}
                </h2>
                {plan.featured && (
                  <span className="rounded-full bg-mk-accent px-2.5 py-0.5 text-[0.68rem] font-semibold text-[#17140f]">{labels.mostPopular}</span>
                )}
                {showYearlyOnlyBadge && (
                  <span className="rounded-full border border-mk-line px-2.5 py-0.5 text-[0.68rem] font-medium text-mk-soft">{labels.yearlyOnly}</span>
                )}
              </div>

              <p className="mt-5 font-mk-display text-[3.1rem] leading-none tracking-[-0.01em]">{activePrice}</p>
              <p className={cn("mt-2 min-h-5 text-[0.84rem]", sub)}>
                {isEnterprise && <>~$500+{labels.perMonth}</>}
                {!isEnterprise && displayCents !== null && (
                  <>
                    {labels.perMonth}
                    {yearlySubText && <span className="ml-2">· {yearlySubText}</span>}
                  </>
                )}
              </p>

              <p className={cn("mt-5 text-[0.9rem] leading-[1.55] xl:min-h-[5.6rem]", sub)}>{plan.description}</p>

              <p className={cn("mt-6 border-t pt-5 text-[0.86rem] font-semibold", plan.featured ? "border-mk-paper/20" : "border-mk-line")}>{plan.audience}</p>

              <ul className="mb-8 mt-4 flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className={cn("flex items-start gap-2.5 text-[0.88rem] leading-[1.45]", sub)}>
                    <Check aria-hidden className={cn("mt-[3px] size-3.5 shrink-0", plan.featured ? "text-mk-accent" : "text-mk-accent-ink")} strokeWidth={2.4} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  "mt-auto inline-flex h-11 w-full items-center justify-center rounded-full border text-[0.9rem] font-medium transition-colors duration-200",
                  plan.featured
                    ? "border-mk-paper bg-mk-paper text-mk-ink hover:bg-mk-sunken"
                    : "border-mk-line bg-transparent text-mk-ink hover:border-mk-ink",
                )}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
