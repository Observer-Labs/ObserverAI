import Link from "next/link";
import Logo from "@/components/Logo";
import { getTranslations } from 'next-intl/server';

export default async function TermsPage() {
  const t = await getTranslations('terms');
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto max-w-[760px] px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="mb-8">
            <Logo href="/" size={20} textSize="1rem" color="white" gap={8} />
          </div>
          <h1 className="mb-2 text-[2rem] font-bold">{t('title')}</h1>
          <p className="text-[0.9rem] text-muted-foreground">{t('lastUpdated')}</p>
        </div>

        <div className="flex flex-col gap-8 leading-[1.7] text-white/80">

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">1. Agreement to Terms</h2>
            <p>By accessing or using Observer AI (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. The Service is operated by Observer AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">2. Description of Service</h2>
            <p>Observer AI is a product intelligence platform that collects signals from connected data sources (Slack, Jira, Zendesk, Intercom, GitHub, and others), analyzes them using AI, and surfaces actionable insights for product teams. You connect your own data sources and control what data is processed.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">3. Your Account</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately at <a href="mailto:hello@observerai.app" className="text-[var(--accent-green)]">hello@observerai.app</a> if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">4. Your Data</h2>
            <p>You retain ownership of all data you connect to Observer AI. By using the Service, you grant us a limited license to process your data solely to provide the Service. We do not sell your data to third parties. We use Anthropic&apos;s Claude API to analyze signals, data sent to Claude is subject to <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-green)]">Anthropic&apos;s Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">5. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) reverse engineer or copy the Service; (d) use the Service to process data you do not have rights to; (e) interfere with the Service&apos;s operation.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">6. Third-Party Integrations</h2>
            <p>The Service integrates with third-party platforms (Slack, Jira, etc.). Your use of those platforms is governed by their respective terms. We are not responsible for third-party services or data they provide.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">7. Service Availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service at any time with reasonable notice. During beta, the Service is provided as-is.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">8. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. AI-generated analysis may contain errors, always verify important decisions independently.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">9. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SIGNAL AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. We will notify you by email or by posting notice in the Service. Continued use after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-semibold text-white">11. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:hello@observerai.app" className="text-[var(--accent-green)]">hello@observerai.app</a>.</p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 border-t border-white/[0.08] pt-6">
          <Link href="/" className="text-[0.85rem] text-muted-foreground no-underline">← Home</Link>
          <Link href="/privacy" className="text-[0.85rem] text-muted-foreground no-underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
