"use client";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';

// ── Data ────────────────────────────────────────────────────────────────────

const sources = [
  "Google Reviews", "Getir", "Yemeksepeti", "Trendyol", "POS / Payments", "Google Analytics",
];

// ── WhatsApp phone mockup (dark, the one dark element) ───────────────────────

function PhoneMockup({ waBusinessLabel, waUrgentLabel, waReplyHint }: { waBusinessLabel: string; waUrgentLabel: string; waReplyHint: string }) {
  return (
    <div style={{
      position: "relative", width: 320, maxWidth: "100%", margin: "0 auto",
      background: "#0a0a0a", borderRadius: 36, border: "10px solid #18181b",
      boxShadow: "0 30px 90px rgba(16,24,40,0.18), 0 0 0 1px rgba(16,24,40,0.04)",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 22, background: "#18181b", borderRadius: "0 0 14px 14px", zIndex: 3 }} />
      <div style={{ background: "#1f2c34", padding: "26px 16px 12px", display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#202c33", border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800, color: "#e9edef" }}>S</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e9edef", fontWeight: 600, fontSize: "0.92rem" }}>Observer</div>
          <div style={{ color: "#8696a0", fontSize: "0.7rem" }}>{waBusinessLabel}</div>
        </div>
        <div style={{ color: "#8696a0", fontSize: "1.1rem" }}>⋮</div>
      </div>
      <div style={{ background: "#0b141a", padding: "16px 12px 18px", display: "flex", flexDirection: "column", gap: 8, minHeight: 420 }}>
        <div style={{ background: "#202c33", borderRadius: "4px 12px 12px 12px", padding: "11px 13px", maxWidth: "92%" }}>
          <div style={{ color: "#f0857d", fontWeight: 800, fontSize: "0.8rem", marginBottom: 5 }}>{waUrgentLabel}</div>
          <div style={{ color: "#e9edef", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: 7 }}>
            <strong>Wait times spiking at Kadıköy</strong><br />
            14 customers complained this week, 2× vs last week.
          </div>
          <div style={{ color: "#9fd9bf", fontSize: "0.76rem", marginBottom: 8 }}>💰 Weekend revenue at risk</div>
          <div
            style={{ color: "#8696a0", fontSize: "0.72rem", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 7 }}
            dangerouslySetInnerHTML={{ __html: waReplyHint }}
          />
          <div style={{ color: "#667781", fontSize: "0.6rem", textAlign: "right", marginTop: 4 }}>09:24</div>
        </div>
        <div style={{ background: "#005c4b", borderRadius: "12px 4px 12px 12px", padding: "8px 13px", alignSelf: "flex-end", maxWidth: "50%" }}>
          <div style={{ color: "#e9edef", fontSize: "0.85rem", fontWeight: 600 }}>1</div>
          <div style={{ color: "#9fd9bf", fontSize: "0.6rem", textAlign: "right", marginTop: 2 }}>09:24 ✓✓</div>
        </div>
        <div style={{ background: "#202c33", borderRadius: "4px 12px 12px 12px", padding: "11px 13px", maxWidth: "92%" }}>
          <div style={{ color: "#e9edef", fontSize: "0.8rem", lineHeight: 1.55 }}>
            📊 <strong>9 Google reviews · 5 Getir orders</strong> mention waits over 15 min, mostly Fri to Sun, 7 to 9pm.<br /><br />
            ✅ <strong>Suggested:</strong> add one person to the weekend evening shift.
          </div>
          <div style={{ color: "#667781", fontSize: "0.6rem", textAlign: "right", marginTop: 4 }}>09:24</div>
        </div>
        <div style={{ background: "#005c4b", borderRadius: "12px 4px 12px 12px", padding: "8px 13px", alignSelf: "flex-end", maxWidth: "55%" }}>
          <div style={{ color: "#e9edef", fontSize: "0.85rem", fontWeight: 600 }}>2 ✓</div>
          <div style={{ color: "#9fd9bf", fontSize: "0.6rem", textAlign: "right", marginTop: 2 }}>09:25 ✓✓</div>
        </div>
        <div style={{ background: "rgba(0,168,132,0.18)", borderRadius: 10, padding: "8px 12px", maxWidth: "80%", border: "1px solid rgba(0,168,132,0.3)" }}>
          <div style={{ color: "#7fe0c0", fontSize: "0.76rem", fontWeight: 600 }}>✅ Marked as handled. Logged.</div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const muted = "var(--muted-foreground)";
  const border = "1px solid var(--border)";

  const personas = [
    { icon: "☕", type: t('persona1Type'), sources: ["Google Reviews", "Getir", "POS"], gap: "Bu hafta 12 kişi Kadıköy şubenizde sabah kuyruğunun çok yavaş olduğunu söyledi. 8-10 arası vardiyaya bir barista ekleyin." },
    { icon: "🍽️", type: t('persona2Type'), sources: ["Yemeksepeti", "Trendyol", "Google"], gap: "Yemeksepeti'ndeki soğuk yemek şikayetleri bu hafta sonu üçe katlandı, hepsi gece 9'dan sonraki geç teslimatlardan. Kurye teslimat sürecini kontrol edin." },
    { icon: "🏪", type: t('persona3Type'), sources: ["Google Reviews", "POS", "Analytics"], gap: "Cumartesi müşteri trafiği artıyor ama satışlar sabit. Müşteriler uzun ödeme kuyruklarından bahsediyor. Hafta sonları ikinci kasayı açın." },
  ];

  const steps = [
    { n: "01", icon: "🔌", title: t('step1Title'), body: t('step1Body') },
    { n: "02", icon: "🧠", title: t('step2Title'), body: t('step2Body') },
    { n: "03", icon: "💬", title: t('step3Title'), body: t('step3Body') },
    { n: "04", icon: "✅", title: t('step4Title'), body: t('step4Body') },
  ];

  const proof = [
    { n: "5dk", label: t('proof1Label') },
    { n: "0",   label: t('proof2Label') },
    { n: "1",   label: t('proof3Label') },
    { n: "7/24",label: t('proof4Label') },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── Nav ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: border, position: "sticky", top: 0, zIndex: 50, background: "color-mix(in oklch, var(--background) 88%, transparent)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
            <path d="M3 11C5 7 7.8 5 11 5C14.2 5 17 7 19 11C17 15 14.2 17 11 17C7.8 17 5 15 3 11Z" stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.5" />
            <circle cx="11" cy="11" r="2.8" fill="currentColor" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", fontStyle: "italic" }}>Observer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <LocaleSwitcher />
          <Link href="/pricing" style={{ color: muted, fontSize: "0.875rem", textDecoration: "none", padding: "7px 14px" }}>{tNav('pricing')}</Link>
          <Link href="/login" style={{ color: muted, fontSize: "0.875rem", textDecoration: "none", padding: "7px 14px" }}>{tNav('signIn')}</Link>
          <Link href="/signup" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 8 }}>{tNav('startFree')}</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 40px 90px" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 64, alignItems: "center" }}>
          <div>
            {/* Value-prop flow: customer signals -> Observer -> WhatsApp */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap", fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ fontSize: "0.72rem", color: muted }}>{t('heroFlow')}</span>
              <span style={{ color: muted, opacity: 0.45 }}>→</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--foreground)" }}>Observer</span>
              <span style={{ color: muted, opacity: 0.45 }}>→</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 700, color: "#00a884" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00a884" }} />
                WhatsApp
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(2.6rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 0 22px" }}>
              {t('heroTitle')}<br />
              <span style={{ color: muted }}>{t('heroTitleAccent')}</span>
            </h1>

            <p style={{ fontSize: "1.05rem", color: muted, lineHeight: 1.68, margin: "0 0 36px", maxWidth: 470 }}>
              {t('heroSubtitle')}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <Link href="/signup" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.975rem", fontWeight: 600, textDecoration: "none", padding: "13px 28px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 7 }}>
                {t('tryFree')}
              </Link>
              <Link href="/showcase" style={{ color: "var(--foreground)", fontSize: "0.9rem", textDecoration: "none", padding: "13px 22px", borderRadius: 10, border: border, background: "var(--background)" }}>
                {t('seeExample')}
              </Link>
            </div>
            <p style={{ color: muted, fontSize: "0.78rem", margin: 0 }}>
              {t('noCard')}
            </p>
          </div>

          <div><PhoneMockup waBusinessLabel={t('waBusinessLabel')} waUrgentLabel={t('waUrgentLabel')} waReplyHint={t.raw('waReplyHint')} /></div>
        </div>
      </div>

      {/* ── Sources strip ── */}
      <div style={{ borderTop: border, borderBottom: border, background: "var(--muted-surface)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "18px 40px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, flexShrink: 0 }}>{t('watchesLabel')}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sources.map((src) => (
              <span key={src} style={{ padding: "4px 12px", borderRadius: 20, background: "var(--background)", border: border, fontSize: "0.78rem", fontWeight: 500, color: muted }}>{src}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "96px 40px" }}>
        <p style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 26 }}>{t('problemLabel')}</p>
        <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.7rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.15, margin: "0 0 26px" }}>
          {t('problemTitle')}<br />{t('problemTitleAccent')}
        </h2>
        <p style={{ fontSize: "1rem", color: muted, lineHeight: 1.72, margin: "0 0 16px", maxWidth: 600 }}>
          {t('problemBody1')}
        </p>
        <p style={{ fontSize: "1rem", color: muted, lineHeight: 1.72, margin: 0, maxWidth: 600 }}>
          {t('problemBody2')}
        </p>
      </div>

      {/* ── How it works ── */}
      <div style={{ borderTop: border }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 40px" }}>
          <p style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 40, textAlign: "center" }}>{t('howItWorksLabel')}</p>
          <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {steps.map((step) => (
              <div key={step.n} style={{ background: "var(--card)", border: border, borderRadius: 16, padding: "26px 22px" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 14 }}>{step.icon}</div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>{step.n}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 9, letterSpacing: "-0.02em" }}>{step.title}</div>
                <div style={{ fontSize: "0.84rem", color: muted, lineHeight: 1.6 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Personas ── */}
      <div style={{ borderTop: border, background: "var(--muted-surface)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 14 }}>{t('builtForLabel')}</p>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
              {t('builtForTitle')}
            </h2>
          </div>
          <div className="persona-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {personas.map((p) => (
              <div key={p.type} style={{ background: "var(--card)", border: border, borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: "2.2rem", marginBottom: 14 }}>{p.icon}</div>
                <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.92rem", marginBottom: 14, letterSpacing: "-0.01em" }}>{p.type}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
                  {p.sources.map((s) => (
                    <span key={s} style={{ fontSize: "0.66rem", fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "var(--muted-surface)", border: border, color: muted, fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
                  ))}
                </div>
                <div style={{ background: "var(--muted-surface)", border: border, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{t('exampleAlertLabel')}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--foreground)", lineHeight: 1.6 }}>{p.gap}</div>
                </div>
              </div>
            ))}
          </div>
          <p
            style={{ textAlign: "center", color: muted, fontSize: "0.8rem", marginTop: 28 }}
            dangerouslySetInnerHTML={{ __html: t.raw('comingSoon') }}
          />
        </div>
      </div>

      {/* ── Proof ── */}
      <div style={{ borderTop: border }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="proof-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {proof.map((p, i) => (
              <div key={p.label} style={{ padding: "48px 40px", borderRight: i < 3 ? border : "none" }}>
                <div style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.045em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, lineHeight: 1 }}>{p.n}</div>
                <div style={{ fontSize: "0.84rem", color: muted, lineHeight: 1.5 }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div style={{ borderTop: border }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "96px 40px 110px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 auto 32px", maxWidth: 680 }}>
            {t('ctaTitle')}
          </h2>
          <Link href="/signup" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "1rem", fontWeight: 600, textDecoration: "none", padding: "14px 34px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {t('tryFree')}
          </Link>
          <p style={{ color: muted, fontSize: "0.78rem", marginTop: 18 }}>{t('noCard')}</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: border, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ color: muted, fontSize: "0.82rem", fontStyle: "italic" }}>Observer</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/pricing" style={{ color: muted, fontSize: "0.78rem", textDecoration: "none" }}>{tNav('pricing')}</Link>
          <Link href="/login" style={{ color: muted, fontSize: "0.78rem", textDecoration: "none" }}>{tNav('signIn')}</Link>
          <Link href="/signup" style={{ color: muted, fontSize: "0.78rem", textDecoration: "none" }}>{tNav('signUp')}</Link>
          <Link href="/terms" style={{ color: muted, fontSize: "0.78rem", textDecoration: "none" }}>{t('footerTerms')}</Link>
          <Link href="/privacy" style={{ color: muted, fontSize: "0.78rem", textDecoration: "none" }}>{t('footerPrivacy')}</Link>
        </div>
        <span style={{ color: muted, fontSize: "0.72rem" }}>{t('footerTagline')}</span>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .how-grid { grid-template-columns: 1fr 1fr !important; }
          .persona-grid { grid-template-columns: 1fr !important; }
          .proof-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .how-grid { grid-template-columns: 1fr !important; }
          nav { padding: 16px 20px !important; }
        }
      `}</style>
    </div>
  );
}
