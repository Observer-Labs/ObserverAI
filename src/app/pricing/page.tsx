import Link from "next/link";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/layout/SiteHeader";
import Logo from "@/components/Logo";
import Reveal from "@/components/marketing/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function PricingPage() {
  const t = await getTranslations("billing");
  const tPricing = await getTranslations("pricing");
  const tNav = await getTranslations("nav");

  const plans = [
    {
      name: t("starterName"),
      price: "$79",
      suffix: t("perMonth"),
      description: t("starterDesc"),
      audience: t("starterAudience"),
      features: [
        t("feature_starter_1"),
        t("feature_starter_2"),
        t("feature_starter_3"),
      ],
      cta: t("starterCta"),
      href: "/signup",
      featured: false,
    },
    {
      name: t("growthName"),
      price: "$149",
      suffix: t("perMonth"),
      description: t("growthDesc"),
      audience: t("growthAudience"),
      features: [
        t("feature_growth_1"),
        t("feature_growth_2"),
        t("feature_growth_3"),
      ],
      cta: t("growthCta"),
      href: "/signup",
      featured: true,
    },
    {
      name: t("scaleName"),
      price: "$299",
      suffix: t("perMonth"),
      description: t("scaleDesc"),
      audience: t("scaleAudience"),
      features: [
        t("feature_scale_1"),
        t("feature_scale_2"),
        t("feature_scale_3"),
      ],
      cta: t("scaleCta"),
      href: "/signup",
      featured: false,
    },
    {
      name: t("enterpriseName"),
      price: "Özel",
      suffix: "",
      description: t("enterpriseDesc"),
      audience: t("enterpriseAudience"),
      features: [
        t("feature_enterprise_1"),
        t("feature_enterprise_2"),
        t("feature_enterprise_3"),
      ],
      cta: t("enterpriseCta"),
      href: "mailto:hello@observerai.app?subject=ObserverAI%20Enterprise",
      featured: false,
    },
  ];

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

        <Reveal className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 px-6 pb-24" delay={0.1}>
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative gap-0 rounded-3xl border-border py-0 shadow-[0_2px_16px_rgba(16,24,40,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)]",
                plan.featured && "border-foreground bg-foreground text-background",
              )}
            >
              <CardContent className="p-7">
                {plan.featured && (
                  <Badge className="absolute right-[18px] top-[18px] rounded-full bg-white/[0.12] px-2.5 py-[3px] text-[0.68rem] font-bold text-background">
                    {t("mostPopular")}
                  </Badge>
                )}

                <div className="mb-[22px]">
                  <div className={cn("mb-2.5 text-[0.78rem] font-bold uppercase tracking-[0.1em]", plan.featured ? "text-background" : "text-muted-foreground")}>
                    {plan.name}
                  </div>
                  <div className={cn("font-extrabold leading-none tracking-[-0.04em]", plan.name === t("enterpriseName") ? "text-[2rem]" : "text-[2.8rem]")}>
                    {plan.price}
                  </div>
                  {plan.name === t("enterpriseName") && (
                    <div className={cn("mt-1.5 text-[0.85rem]", plan.featured ? "text-white/70" : "text-muted-foreground")}>~$500+{t("perMonth")}</div>
                  )}
                  {plan.suffix && (
                    <div className={cn("mt-1.5 text-[0.85rem]", plan.featured ? "text-white/70" : "text-muted-foreground")}>{plan.suffix}</div>
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
          ))}
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
