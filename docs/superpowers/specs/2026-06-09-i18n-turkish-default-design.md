# i18n — Türkçe Default, Dil Seçici

**Tarih:** 2026-06-09  
**Kapsam:** Tüm uygulama UI, email şablonları, WhatsApp mesajları  
**Karar:** next-intl, cookie tabanlı, URL prefix yok

---

## 1. Mimari

**Kütüphane:** `next-intl` (App Router native, SSR destekli)

**Dosya yapısı:**
```
src/
  i18n/
    config.ts          # locales: ['tr', 'en'], defaultLocale: 'tr'
    request.ts         # next-intl SSR — cookie'den locale okur
  messages/
    tr.json            # Master şema (Türkçe, default)
    en.json            # İngilizce (mevcut metinler buraya taşınır)
middleware.ts          # next-intl + mevcut proxy mantığı zincir halinde
```

**Dil tespiti sırası (middleware):**
1. `NEXT_LOCALE` cookie var mı? → kullan
2. Yoksa → `tr` default olarak set et, devam et

**Routing:** URL değişmez. `/dashboard` kalır, `/tr/dashboard` olmaz. Dil yalnızca cookie'de yaşar.

**Type safety:** `tr.json` master şema. `en.json` aynı key yapısını taşımalı. Eksik key `next-intl` strict modda build uyarısı verir.

---

## 2. Dil Seçici Bileşen

**Dosya:** `src/components/LocaleSwitcher.tsx`

**Davranış:**
- TR / EN — iki buton (toggle), dropdown yok
- Tıklayınca: server action `NEXT_LOCALE` cookie'yi set eder → `router.refresh()`
- Aktif dil vurgulanır, pasif soluk

**Konumlar:**
- Public header (landing, pricing, login): sağ üst köşe, nav linklerinin yanı
- App sidebar: alt kısım, Settings / Sign out üstü

**Cookie:**
```
name:     NEXT_LOCALE
maxAge:   31_536_000  (1 yıl)
path:     /
sameSite: lax
```

**Server action:** `'use server'` — progressive enhancement, JS olmasa da çalışır.

---

## 3. Çeviri Dosyası Yapısı

```json
{
  "common":     { "save": "...", "cancel": "...", "loading": "..." },
  "nav":        { "dashboard": "...", "sources": "...", "settings": "..." },
  "landing":    { "hero.title": "...", "hero.cta": "...", "steps.*": "..." },
  "auth":       { "login.*": "...", "signup.*": "...", "forgot.*": "..." },
  "onboarding": { "whatsapp.*": "...", "connect.*": "..." },
  "dashboard":  { "overview.*": "...", "signals.*": "...", "gaps.*": "..." },
  "settings":   { "profile.*": "...", "billing.*": "...", "integrations.*": "..." },
  "email":      { "digest.subject": "...", "digest.body.*": "..." },
  "whatsapp":   { "alert.*": "...", "reply.*": "..." },
  "errors":     { "generic": "...", "auth.*": "...", "billing.*": "..." }
}
```

---

## 4. Çevrilen Katmanlar

| Katman | Dosya sayısı | Yöntem |
|--------|-------------|--------|
| UI bileşenleri (.tsx) | ~40 | `useTranslations('namespace')` hook |
| API hata mesajları | ~15 route | Sabit Türkçe string (locale-agnostic) |
| Email şablonları | 1 | `getTranslations()` async server fonksiyon |
| WhatsApp mesajları | 1 | `getTranslations()` async server fonksiyon |

**Email & WhatsApp:** Server-side oldukları için `getTranslations('whatsapp')` kullanılır. Locale, request cookie'sinden veya workspace default'undan okunur.

---

## 5. Middleware Zinciri

Mevcut `src/proxy.ts` auth guard mantığı korunur. `middleware.ts` şu sırayla çalışır:

```
1. next-intl → cookie'den locale oku, x-locale header set et
2. proxy auth guard → korumalı route'larda session kontrol
```

---

## 6. Edge Case'ler

| Senaryo | Davranış |
|---------|----------|
| Cookie yok | Middleware `tr` set eder, devam eder |
| Eksik çeviri key | `next-intl` `en.json`'a fallback yapar, prod'da sessiz |
| Hydration flash | Middleware `x-locale` header → server/client aynı locale → flash yok |
| Yeni dil ekleme | `config.ts`'e kod ekle + `messages/xx.json` oluştur, başka değişiklik yok |
| JS kapalı | Server action ile cookie set — çalışmaya devam eder |

---

## 7. Kapsam Dışı

- URL-based locale routing (`/tr/`, `/en/`)
- Kullanıcı locale'ini Supabase'e kaydetme (ileride eklenebilir)
- Otomatik tarayıcı dili tespiti (`Accept-Language` header)
- RTL dil desteği
