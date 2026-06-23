"use client";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
};

// Prices indexed by plan id and period
const PRICES: Record<string, { monthly: string; yearly: string }> = {
  starter: { monthly: "$79", yearly: "$79" }, // yearly-only plan, same display
  growth:  { monthly: "$149", yearly: "$119" },
  scale:   { monthly: "$299", yearly: "$239" },
  enterprise: { monthly: "Özel", yearly: "Özel" },
};

export default function PricingCards({ plans, labels }: { plans: PricingPlanData[]; labels: Labels }) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      {/* Period toggle */}
      <div className="mb-10 flex justify-center">
        <div className="flex items-center gap-0 rounded-full border bg-muted p-[3px]">
          <button
            onClick={() => setPeriod("monthly")}
            className={cn(
              "cursor-pointer rounded-full border-none px-5 py-[6px] text-[0.82rem] font-medium transition-all",
              period === "monthly" ? "bg-background text-foreground shadow-sm" : "bg-transparent text-muted-foreground"
            )}
          >
            {labels.monthly}
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border-none px-5 py-[6px] text-[0.82rem] font-medium transition-all",
              period === "yearly" ? "bg-background text-foreground shadow-sm" : "bg-transparent text-muted-foreground"
            )}
          >
            {labels.yearly}
            <span className="rounded-full bg-[rgba(70,230,166,0.18)] px-[7px] py-[2px] text-[0.68rem] font-bold text-[#46e6a6]">
              {labels.save20}
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 px-6 pb-24">
        {plans.map((plan) => {
          const prices = PRICES[plan.id] ?? { monthly: "—", yearly: "—" };
          const isYearlyOnly = plan.id === "starter";
          const isEnterprise = plan.id === "enterprise";
          const activePrice = isEnterprise ? "Özel" : (period === "yearly" ? prices.yearly : prices.monthly);
          const priceSuffix = isEnterprise
            ? ""
            : isYearlyOnly
              ? labels.perMonthAnnual
              : period === "yearly"
                ? labels.perMonthAnnual
                : labels.perMonth;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative gap-0 rounded-3xl border-border py-0 shadow-[0_2px_16px_rgba(16,24,40,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)]",
                plan.featured && "border-foreground bg-foreground text-background",
              )}
            >
              <CardContent className="p-7">
                {plan.featured && (
                  <Badge className="absolute right-[18px] top-[18px] rounded-full bg-white/[0.12] px-2.5 py-[3px] text-[0.68rem] font-bold text-background">
                    {labels.mostPopular}
                  </Badge>
                )}
                {isYearlyOnly && (
                  <Badge className="absolute right-[18px] top-[18px] rounded-full border border-[rgba(110,168,255,0.3)] bg-[rgba(110,168,255,0.1)] px-2.5 py-[3px] text-[0.68rem] font-bold text-[#6ea8ff]">
                    {labels.yearlyOnly}
                  </Badge>
                )}

                <div className="mb-[22px]">
                  <div className={cn("mb-2.5 text-[0.78rem] font-bold uppercase tracking-[0.1em]", plan.featured ? "text-background" : "text-muted-foreground")}>
                    {plan.name}
                  </div>
                  <div className={cn("font-extrabold leading-none tracking-[-0.04em]", isEnterprise ? "text-[2rem]" : "text-[2.8rem]")}>
                    {activePrice}
                  </div>
                  {isEnterprise && (
                    <div className={cn("mt-1.5 text-[0.85rem]", plan.featured ? "text-white/70" : "text-muted-foreground")}>~$500+{labels.perMonth}</div>
                  )}
                  {priceSuffix && (
                    <div className={cn("mt-1.5 text-[0.85rem]", plan.featured ? "text-white/70" : "text-muted-foreground")}>{priceSuffix}</div>
                  )}
                  <p className={cn("mt-4 text-[0.86rem] leading-[1.55]", plan.featured ? "text-white/[0.76]" : "text-muted-foreground")}>
                    {plan.description}
                  </p>
                </div>

                <div className={cn("mb-[22px] rounded-[10px] px-3 py-[9px] text-[0.82rem] font-bold", plan.featured ? "bg-white/10" : "bg-muted")}>
                  {plan.audience}
                </div>

                <ul className="mb-7 flex list-none flex-col gap-[11px] p-0">
                  {plan.features.map((feature) => (
                    <li key={feature} className={cn("flex items-start gap-2.5 text-[0.86rem] leading-[1.45]", plan.featured ? "text-white/[0.78]" : "text-muted-foreground")}>
                      <span className={cn("shrink-0 text-[0.9rem]", plan.featured ? "text-background" : "text-foreground")}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.featured ? "secondary" : "outline"}
                  className={cn("h-11 w-full rounded-full font-bold", plan.featured && "bg-background text-foreground hover:bg-background/90")}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
