import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/layout/SiteHeader";
import Reveal from "@/components/marketing/Reveal";
import PricingCards from "@/components/marketing/PricingCards";
import SiteFooter from "@/components/marketing/SiteFooter";
import { marketingFonts } from "@/components/marketing/fonts";
import type { PricingPlanData } from "@/components/marketing/PricingCards";
import { fetchPolarPrices } from "@/lib/polar-prices";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("pricing"), getLocale()]);
  const title = `${t("title")} · Observer AI`;
  const description = t("subtitle");
  const image = { url: "/opengraph-image", width: 1200, height: 630, type: "image/png", alt: title };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/pricing" },
    // A page-level openGraph replaces the inherited one, including the root social image; name it again.
    openGraph: { type: "website", siteName: "Observer AI", url: "/pricing", title, description, locale: locale === "en" ? "en_US" : "tr_TR", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [{ ...image, url: "/twitter-image" }] },
  };
}

export default async function PricingPage() {
  const [t, tPricing, polarPrices] = await Promise.all([
    getTranslations("billing"),
    getTranslations("pricing"),
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
    perYear: t("perYear"),
    custom: tPricing("custom"),
  };

  return (
    <div className={`mk flex min-h-screen flex-col overflow-x-clip ${marketingFonts}`}>
      <SiteHeader />

      <main className="flex-1">
        <Reveal className="mx-auto max-w-[1120px] px-5 pb-10 pt-12 sm:px-8 sm:pt-16 md:pb-12 md:pt-20">
          <h1 className="font-mk-display text-[clamp(2.5rem,7vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
            {tPricing("title")}
          </h1>
          <p className="mt-5 max-w-[52ch] text-[1.08rem] leading-[1.65] text-mk-soft">
            {tPricing("subtitle")}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <PricingCards plans={plans} labels={labels} prices={polarPrices} />
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
