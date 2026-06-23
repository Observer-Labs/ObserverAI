import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/layout/SiteHeader";
import Logo from "@/components/Logo";
import Reveal from "@/components/marketing/Reveal";
import PricingCards from "@/components/marketing/PricingCards";
import Link from "next/link";
import type { PricingPlanData } from "@/components/marketing/PricingCards";
import { fetchPolarPrices } from "@/lib/polar-prices";

export default async function PricingPage() {
  const [t, tPricing, tNav, polarPrices] = await Promise.all([
    getTranslations("billing"),
    getTranslations("pricing"),
    getTranslations("nav"),
    fetchPolarPrices(),
  ]);

  const plans: PricingPlanData[] = [
    {
      id: "starter",
      name: t("starterName"),
      description: t("starterDesc"),
      audience: t("starterAudience"),
      features: [t("feature_starter_1"), t("feature_starter_2"), t("feature_starter_3")],
      cta: t("starterCta"),
      href: "/signup",
      featured: false,
    },
    {
      id: "growth",
      name: t("growthName"),
      description: t("growthDesc"),
      audience: t("growthAudience"),
      features: [t("feature_growth_1"), t("feature_growth_2"), t("feature_growth_3")],
      cta: t("growthCta"),
      href: "/signup",
      featured: true,
    },
    {
      id: "scale",
      name: t("scaleName"),
      description: t("scaleDesc"),
      audience: t("scaleAudience"),
      features: [t("feature_scale_1"), t("feature_scale_2"), t("feature_scale_3")],
      cta: t("scaleCta"),
      href: "/signup",
      featured: false,
    },
    {
      id: "enterprise",
      name: t("enterpriseName"),
      description: t("enterpriseDesc"),
      audience: t("enterpriseAudience"),
      features: [t("feature_enterprise_1"), t("feature_enterprise_2"), t("feature_enterprise_3")],
      cta: t("enterpriseCta"),
      href: "mailto:hello@observerai.app?subject=ObserverAI%20Enterprise",
      featured: false,
    },
  ];

  const labels = {
    monthly: t("monthly"),
    yearly: t("yearly"),
    save20: t("save20"),
    perMonth: t("perMonth"),
    perMonthAnnual: t("perMonthAnnual"),
    yearlyOnly: t("yearlyOnly"),
    mostPopular: t("mostPopular"),
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-[1]">
        <SiteHeader />

        <Reveal className="px-6 pb-14 pt-20 text-center">
          <h1 className="mb-5 font-display text-[clamp(2.5rem,5vw,3.9rem)] font-bold leading-[1.06] tracking-[-0.03em] text-foreground">
            {tPricing("title")}
          </h1>
          <p className="mx-auto max-w-[560px] text-[1.1rem] leading-[1.7] text-muted-foreground">
            {tPricing("subtitle")}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <PricingCards plans={plans} labels={labels} prices={polarPrices} />
        </Reveal>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-6 sm:px-12">
          <Logo size={18} textSize="0.85rem" color="var(--muted-foreground)" gap={8} />
          <div className="flex gap-6">
            <Link href="/" className="text-[0.8rem] text-muted-foreground hover:text-foreground">Ana Sayfa</Link>
            <Link href="/login" className="text-[0.8rem] text-muted-foreground hover:text-foreground">{tNav("signIn")}</Link>
            <Link href="/signup" className="text-[0.8rem] text-muted-foreground hover:text-foreground">{tNav("signUp")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
