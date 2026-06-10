'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/actions/locale';
import type { Locale } from '@/i18n/config';

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {(['tr', 'en'] as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          disabled={isPending}
          style={{
            padding: '4px 9px',
            borderRadius: 6,
            border: locale === loc ? '1px solid var(--border)' : '1px solid transparent',
            background: locale === loc ? 'var(--muted-surface)' : 'transparent',
            color: locale === loc ? 'var(--foreground)' : 'var(--muted-foreground)',
            fontWeight: locale === loc ? 600 : 400,
            fontSize: '0.72rem',
            cursor: isPending ? 'wait' : 'pointer',
            opacity: isPending ? 0.5 : 1,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
