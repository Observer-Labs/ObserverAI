'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/actions/locale';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center gap-0.5">
      {(['tr', 'en'] as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          disabled={isPending}
          className={cn(
            'rounded-[6px] border px-[9px] py-1 text-[0.72rem] tracking-[0.04em] uppercase transition-all',
            isPending ? 'cursor-wait opacity-50' : 'cursor-pointer',
            locale === loc
              ? 'border-border bg-muted font-semibold text-foreground'
              : 'border-transparent bg-transparent font-normal text-muted-foreground'
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
