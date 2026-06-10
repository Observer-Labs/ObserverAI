import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default async function PricingPage() {
  const t = await getTranslations('billing');
  const tPricing = await getTranslations('pricing');
  const tNav = await getTranslations('nav');

  const plans = [
    {
      name: t('starterName'),
      price: "$79",
      suffix: t('perMonth'),
      description: t('starterDesc'),
      audience: t('starterAudience'),
      features: [
        t('feature_starter_1'),
        t('feature_starter_2'),
        t('feature_starter_3'),
      ],
      cta: t('starterCta'),
      href: "/signup",
      featured: false,
    },
    {
      name: t('growthName'),
      price: "$149",
      suffix: t('perMonth'),
      description: t('growthDesc'),
      audience: t('growthAudience'),
      features: [
        t('feature_growth_1'),
        t('feature_growth_2'),
        t('feature_growth_3'),
      ],
      cta: t('growthCta'),
      href: "/signup",
      featured: true,
    },
    {
      name: t('scaleName'),
      price: "$299",
      suffix: t('perMonth'),
      description: t('scaleDesc'),
      audience: t('scaleAudience'),
      features: [
        t('feature_scale_1'),
        t('feature_scale_2'),
        t('feature_scale_3'),
      ],
      cta: t('scaleCta'),
      href: "/signup",
      featured: false,
    },
    {
      name: t('enterpriseName'),
      price: "Özel",
      suffix: "",
      description: t('enterpriseDesc'),
      audience: t('enterpriseAudience'),
      features: [
        t('feature_enterprise_1'),
        t('feature_enterprise_2'),
        t('feature_enterprise_3'),
      ],
      cta: t('enterpriseCta'),
      href: "mailto:hello@observerai.app?subject=ObserverAI%20Enterprise",
      featured: false,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div className="brand-dot" />
            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1rem" }}>Observer</span>
          </Link>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LocaleSwitcher />
            <Link href="/login" style={{ color: "var(--muted)", fontSize: "0.875rem", textDecoration: "none", padding: "8px 16px" }}>
              {tNav('signIn')}
            </Link>
            <Link href="/signup" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.875rem" }}>
              {tNav('startFree')}
            </Link>
          </div>
        </nav>

        <div style={{ textAlign: "center", padding: "76px 24px 48px" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 800, color: "var(--foreground)", margin: "0 0 16px", letterSpacing: "-0.03em" }}>
            {tPricing('title')}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            {tPricing('subtitle')}
          </p>
        </div>

        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 96px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: "30px 28px",
                borderRadius: 16,
                background: plan.featured ? "var(--foreground)" : "var(--card)",
                border: `1px solid ${plan.featured ? "var(--foreground)" : "var(--border)"}`,
                color: plan.featured ? "var(--background)" : "var(--foreground)",
                position: "relative",
              }}
            >
              {plan.featured && (
                <div style={{ position: "absolute", top: 18, right: 18, borderRadius: 9999, padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "var(--background)" }}>
                  {t('mostPopular')}
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, color: plan.featured ? "var(--background)" : "var(--muted)" }}>
                  {plan.name}
                </div>
                <div style={{ color: plan.featured ? "var(--background)" : "var(--foreground)", fontSize: plan.name === t('enterpriseName') ? "2rem" : "2.8rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {plan.price}
                </div>
                {plan.name === t('enterpriseName') && <div style={{ color: plan.featured ? "rgba(255,255,255,0.7)" : "var(--muted)", fontSize: "0.85rem", marginTop: 6 }}>~$500+{t('perMonth')}</div>}
                {plan.suffix && <div style={{ color: plan.featured ? "rgba(255,255,255,0.7)" : "var(--muted)", fontSize: "0.85rem", marginTop: 6 }}>{plan.suffix}</div>}
                <p style={{ color: plan.featured ? "rgba(255,255,255,0.76)" : "var(--muted)", fontSize: "0.86rem", margin: "16px 0 0", lineHeight: 1.55 }}>
                  {plan.description}
                </p>
              </div>

              <div style={{ padding: "9px 12px", borderRadius: 10, background: plan.featured ? "rgba(255,255,255,0.1)" : "var(--muted-surface)", fontSize: "0.82rem", fontWeight: 700, marginBottom: 22 }}>
                {plan.audience}
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 11 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: plan.featured ? "rgba(255,255,255,0.78)" : "var(--muted)", fontSize: "0.86rem", lineHeight: 1.45 }}>
                    <span style={{ color: plan.featured ? "var(--background)" : "var(--foreground)", fontSize: "0.9rem", flexShrink: 0 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: `1px solid ${plan.featured ? "transparent" : "var(--border)"}`,
                  color: plan.featured ? "var(--foreground)" : "var(--foreground)",
                  background: plan.featured ? "var(--background)" : "var(--muted-surface)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="brand-dot" style={{ width: 18, height: 18 }} />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Observer</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>Ana Sayfa</Link>
            <Link href="/login" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>{tNav('signIn')}</Link>
            <Link href="/signup" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>{tNav('signUp')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
