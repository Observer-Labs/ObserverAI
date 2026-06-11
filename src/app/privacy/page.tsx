import Link from "next/link";
import Logo from "@/components/Logo";
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');
  return (
    <div style={{ minHeight: "100vh", background: "#0b0c10", color: "white" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 32 }}>
            <Logo href="/" size={20} textSize="1rem" color="white" gap={8} />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>{t('title')}</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t('lastUpdated')}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>1. Who We Are</h2>
            <p>Observer AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Observer AI platform at observerai.app. We take your privacy seriously. This policy explains what data we collect, how we use it, and your rights.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>2. Data We Collect</h2>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Account data:</strong> Your email address, password (hashed, never stored in plain text), and workspace name when you sign up.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Integration credentials:</strong> API tokens and credentials for the platforms you choose to connect (Slack, Jira, Zendesk, etc.). These are encrypted at rest.</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Observer data:</strong> Messages, tickets, issues, and other content ingested from your connected platforms. This data is processed to generate insights and stored in your isolated workspace.</p>
            <p><strong style={{ color: "white" }}>Usage data:</strong> Basic analytics about how you use the product (pages visited, features used). We do not use third-party analytics trackers.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>3. How We Use Your Data</h2>
            <p>We use your data to: (a) provide the Service, ingesting signals, running AI analysis, generating insights; (b) send transactional emails (account confirmation, password reset); (c) improve the Service; (d) respond to support requests. We do not sell your data or use it for advertising.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>4. AI Processing</h2>
            <p>Observer AI analysis is powered by Anthropic&apos;s Claude API. When you run an analysis, signal content is sent to Anthropic for processing. Anthropic&apos;s data handling is governed by their <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Privacy Policy</a>. We recommend not connecting sources containing personally identifiable information of your end-users unless you have appropriate consent.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>5. Data Storage & Security</h2>
            <p>Your data is stored in Supabase (PostgreSQL) with row-level security, each workspace is isolated and no user can access another&apos;s data. Credentials are encrypted. We use HTTPS for all data in transit. We do not store your connected platform passwords, only API tokens you explicitly provide.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>6. Data Sharing</h2>
            <p>We share your data only with: (a) Anthropic (for AI analysis, as described above); (b) Supabase (database hosting); (c) Vercel (app hosting); (d) service providers necessary to operate the platform. We share the minimum data necessary and require these providers to maintain appropriate security standards.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>7. Data Retention</h2>
            <p>We retain your data for as long as your account is active. When you delete your account, we delete your workspace data within 30 days. Observer data older than 90 days may be automatically pruned to manage storage.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>8. Your Rights</h2>
            <p>You have the right to: (a) access the data we hold about you; (b) correct inaccurate data; (c) delete your account and data; (d) export your data. To exercise these rights, email us at <a href="mailto:hello@observerai.app" style={{ color: "var(--accent-green)" }}>hello@observerai.app</a>.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>9. Cookies</h2>
            <p>We use a single session cookie to keep you logged in (set by Supabase Auth). We do not use advertising or tracking cookies. No cookie consent banner is required for strictly necessary cookies.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy. We will notify you by email for material changes. Your continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>11. Contact</h2>
            <p>Privacy questions or requests: <a href="mailto:hello@observerai.app" style={{ color: "var(--accent-green)" }}>hello@observerai.app</a></p>
          </section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 24 }}>
          <Link href="/" style={{ color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none" }}>← Home</Link>
          <Link href="/terms" style={{ color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none" }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
