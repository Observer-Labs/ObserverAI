# i18n — Türkçe Default + Dil Seçici Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `next-intl` ile Türkçe default dil, İngilizce fallback, cookie tabanlı dil seçici — URL değişmez, her sayfada `t('key')` ile string.

**Architecture:** `next-intl` plugin `next.config.ts`'e eklenir. `src/i18n/request.ts` SSR'da `NEXT_LOCALE` cookie'den locale okur. `NextIntlClientProvider` layout'ta client bileşenlere locale aktarır. LocaleSwitcher server action ile cookie set edip `router.refresh()` tetikler.

**Tech Stack:** `next-intl@^3`, Next.js 16 App Router, server actions, cookie-based locale, `tr.json` master schema

---

## Dosya Haritası

| Dosya | İşlem | Ne yapıyor |
|-------|-------|-----------|
| `src/i18n/config.ts` | Yeni | Locale listesi + default |
| `src/i18n/request.ts` | Yeni | SSR cookie→locale okuyucu |
| `src/messages/tr.json` | Yeni | Master TR şeması |
| `src/messages/en.json` | Yeni | EN çeviriler |
| `src/actions/locale.ts` | Yeni | Cookie set server action |
| `src/components/LocaleSwitcher.tsx` | Yeni | TR/EN toggle bileşen |
| `next.config.ts` | Düzenle | next-intl plugin ekle |
| `src/app/layout.tsx` | Düzenle | NextIntlClientProvider + lang attr |
| `middleware.ts` | Yeni (proxy.ts bazlı) | next-intl + auth zinciri |
| `src/proxy.ts` | Değişmez | Auth guard mantığı korunur |
| `src/app/page.tsx` | Düzenle | Landing TR |
| `src/app/login/page.tsx` | Düzenle | Auth TR |
| `src/app/signup/page.tsx` | Düzenle | Auth TR |
| `src/app/forgot-password/page.tsx` | Düzenle | Auth TR |
| `src/app/reset-password/page.tsx` | Düzenle | Auth TR |
| `src/app/auth/confirm/page.tsx` | Düzenle | Auth TR |
| `src/app/onboarding/whatsapp/page.tsx` | Düzenle | Onboarding TR |
| `src/app/onboarding/connect/page.tsx` | Düzenle | Onboarding TR |
| `src/components/layout/Sidebar.tsx` | Düzenle | Nav TR + LocaleSwitcher |
| `src/app/dashboard/page.tsx` | Düzenle | Dashboard TR |
| `src/components/dashboard/OverviewTab.tsx` | Düzenle | Dashboard tab TR |
| `src/components/dashboard/SignalsTab.tsx` | Düzenle | Signals tab TR |
| `src/components/dashboard/IntentGapsTab.tsx` | Düzenle | Gaps tab TR |
| `src/app/pricing/page.tsx` | Düzenle | Pricing TR |
| `src/app/settings/page.tsx` | Düzenle | Settings TR |
| `src/app/settings/billing/page.tsx` | Düzenle | Billing TR |
| `src/app/settings/distribution/page.tsx` | Düzenle | Distribution TR |
| `src/app/settings/integrations/page.tsx` | Düzenle | Integrations TR |
| `src/app/connect/page.tsx` | Düzenle | Sources TR |
| `src/app/alerts/page.tsx` | Düzenle | Alerts TR |
| `src/app/history/page.tsx` | Düzenle | History TR |
| `src/app/delivery-log/page.tsx` | Düzenle | Delivery log TR |
| `src/app/terms/page.tsx` | Düzenle | Terms TR |
| `src/app/privacy/page.tsx` | Düzenle | Privacy TR |
| `src/app/not-found.tsx` | Düzenle | 404 TR |
| `src/app/error.tsx` | Düzenle | Error TR |
| `src/lib/email.ts` | Düzenle | Email şablon TR |
| `src/lib/whatsapp.ts` | Düzenle | WA mesaj TR |

---

## Task 1: next-intl kurulumu + config dosyaları

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/request.ts`
- Modify: `next.config.ts`

- [ ] **Adım 1: next-intl kur**

```bash
npm install next-intl
```

Expected: `package.json`'da `"next-intl": "^3.x.x"` görünür.

- [ ] **Adım 2: `src/i18n/config.ts` oluştur**

```ts
export const locales = ['tr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'tr';
```

- [ ] **Adım 3: `src/i18n/request.ts` oluştur**

```ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Adım 4: `next.config.ts` güncelle**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
```

- [ ] **Adım 5: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -20
```

Expected: exit 0, typecheck + lint temiz.

- [ ] **Adım 6: commit**

```bash
git add src/i18n/ next.config.ts package.json package-lock.json
git commit -m "feat(i18n): add next-intl, config, and SSR request handler"
```

---

## Task 2: Mesaj dosyaları — tr.json + en.json

**Files:**
- Create: `src/messages/tr.json`
- Create: `src/messages/en.json`

- [ ] **Adım 1: `src/messages/tr.json` oluştur (master şema)**

```json
{
  "common": {
    "save": "Kaydet",
    "cancel": "İptal",
    "loading": "Yükleniyor...",
    "error": "Bir hata oluştu",
    "retry": "Tekrar dene",
    "back": "Geri",
    "next": "İleri",
    "done": "Tamam",
    "close": "Kapat",
    "or": "veya",
    "signIn": "Giriş Yap",
    "signUp": "Kayıt Ol",
    "signOut": "Çıkış Yap",
    "settings": "Ayarlar",
    "upgrade": "Yükselt",
    "connect": "Bağlan",
    "connecting": "Bağlanıyor...",
    "saving": "Kaydediliyor...",
    "continue": "Devam Et",
    "skip": "Atla"
  },
  "nav": {
    "pricing": "Fiyatlandırma",
    "signIn": "Giriş Yap",
    "startFree": "Ücretsiz Başla",
    "signals": "Sinyaller",
    "sources": "Kaynaklar",
    "alerts": "Uyarılar",
    "history": "Geçmiş",
    "settings": "Ayarlar",
    "myWorkspace": "Çalışma Alanım",
    "signOut": "Çıkış Yap"
  },
  "landing": {
    "watchesLabel": "İzler",
    "heroFlow": "Yorumlar · Getir · POS",
    "heroTitle": "Müşterilerinizin gerçekten ne düşündüğü,",
    "heroTitleAccent": "WhatsApp'ınızda.",
    "heroSubtitle": "Her Google yorumunu, Getir şikayetini ve POS raporunu okuyamazsınız. Observer her gün bunları okur ve düzeltmeye değer tek şeyi size WhatsApp'tan gönderir. Dashboard yok, uygulama yok, teknik bilgi gerekmez.",
    "tryFree": "Ücretsiz dene →",
    "seeExample": "Canlı örnek gör",
    "noCard": "Kredi kartı gerekmez · Kafe, restoran ve dükkanlar için",
    "problemLabel": "Sorun",
    "problemTitle": "Müşterileriniz size her şeyi söylüyor.",
    "problemTitleAccent": "Dinleyecek vaktiniz yok.",
    "problemBody1": "Gece 11'de 1 yıldızlı Google yorumu. Yemeksepeti'nde \"Soğuk geldi\". POS'ta Cumartesi satışlarında düşüş. Her biri ayrı bir uygulamada, hiçbirini açacak vaktiniz yok ve örüntü gürültüde kayboluyor.",
    "problemBody2": "Haftanın rakamları gelince bir şeylerin yanlış gittiğini öğreniyorsunuz. Observer hepsini sizin için okur ve cevabı telefonunuza gönderir — hâlâ bir şeyler yapabilecekken.",
    "howItWorksLabel": "Nasıl çalışır",
    "step1Title": "Bağlan",
    "step1Body": "Google Reviews, Getir, Yemeksepeti, POS'unuzu bağlayın. İki dakika, teknik bilgi gerekmez.",
    "step2Title": "Observer okur",
    "step2Body": "Her yorum, her sipariş ve her şikayeti tarar, sizi gerçekten neyin engellediğini bulur.",
    "step3Title": "Mesaj gelir",
    "step3Body": "Dikkatinizi çekmeye değer tek şey WhatsApp'ınıza düşer. Uygulama yok, giriş yok.",
    "step4Title": "Sen karar verirsin",
    "step4Body": "Detaylar için 1, halledildi için 2. Bu kadar.",
    "builtForLabel": "İşletmeniz için yapıldı",
    "builtForTitle": "Müşteriniz varsa Observer işinize yarar.",
    "persona1Type": "Kafeler",
    "persona2Type": "Restoranlar",
    "persona3Type": "Perakende & Dükkanlar",
    "exampleAlertLabel": "Örnek WhatsApp uyarısı",
    "comingSoon": "Online mağazalar ve uygulamalar? <b>Çok yakında.</b>",
    "proof1Label": "İlk içgörünüze",
    "proof2Label": "Kontrol edilecek dashboard",
    "proof3Label": "Eylem için dokunuş",
    "proof4Label": "Yorumlarınızı izliyor",
    "ctaTitle": "Bir sonraki sorununuz zaten yorumlarınızda.",
    "footerTagline": "Müşteri sinyalleri, telefonunuzda",
    "footerTerms": "Koşullar",
    "footerPrivacy": "Gizlilik",
    "waBusinessLabel": "iş hesabı · çevrimiçi",
    "waUrgentLabel": "🔴 Acil",
    "waReplyHint": "Yanıtla: <b>1</b> detaylar · <b>2</b> hallettim · <b>3</b> geç"
  },
  "auth": {
    "tagline": "Müşteri sinyalleri, WhatsApp'ınızda.",
    "loginTitle": "Tekrar hoş geldiniz",
    "loginSubtitle": "Hesabınız yok mu?",
    "signUpFree": "Ücretsiz kayıt ol →",
    "signInWithGoogle": "Google ile giriş yap",
    "emailLabel": "E-posta",
    "emailPlaceholder": "siz@isletme.com",
    "passwordLabel": "Şifre",
    "passwordPlaceholder": "Şifreniz",
    "forgotPassword": "Şifremi unuttum?",
    "signingIn": "Giriş yapılıyor...",
    "signInBtn": "Giriş Yap →",
    "signUpTitle": "Hesabınızı oluşturun",
    "signUpSubtitle": "Zaten hesabınız var mı?",
    "signInLink": "Giriş Yap →",
    "signUpWithGoogle": "Google ile kayıt ol",
    "workspaceLabel": "İşletme veya çalışma alanı adı",
    "workspacePlaceholder": "örn. Kronotrop veya Kafem",
    "newPasswordLabel": "Şifre",
    "newPasswordPlaceholder": "En az 8 karakter",
    "creating": "Hesap oluşturuluyor...",
    "createBtn": "Hesap oluştur →",
    "noCard": "Kredi kartı gerekmez",
    "errAllRequired": "Tüm alanlar zorunludur.",
    "errPasswordLength": "Şifre en az 8 karakter olmalıdır.",
    "errEmailExists": "Bu e-posta ile kayıtlı bir hesap zaten var. Lütfen giriş yapın.",
    "errNoUserId": "Kayıt başarısız. Lütfen tekrar deneyin.",
    "errWorkspace": "Çalışma alanı oluşturulamadı.",
    "errSignInFailed": "Giriş yapılamadı. Şifrenizi sıfırlamayı deneyin.",
    "accountCreated": "Hesap oluşturuldu. Devam etmek için giriş yapın.",
    "forgotTitle": "Şifrenizi mi unuttunuz?",
    "forgotSubtitle": "E-postanızı girin, sıfırlama bağlantısı gönderelim.",
    "sendResetLink": "Sıfırlama bağlantısı gönder",
    "sending": "Gönderiliyor...",
    "checkEmailTitle": "E-postanızı kontrol edin",
    "checkEmailBody": "Şifre sıfırlama bağlantısını {email} adresine gönderdik. Görmüyorsanız spam klasörünüzü kontrol edin.",
    "backToSignIn": "Giriş yapmaya geri dön",
    "rememberPassword": "Şifrenizi hatırladınız mı?",
    "resetTitle": "Yeni şifre belirleyin",
    "resetSubtitle": "Yeni şifrenizi girin.",
    "newPasswordBtn": "Şifreyi güncelle →",
    "updating": "Güncelleniyor...",
    "resetSuccess": "Şifreniz güncellendi! Yönlendiriliyorsunuz...",
    "confirmTitle": "E-postanız doğrulandı",
    "confirmBody": "Hesabınız aktif. Panele yönlendiriliyorsunuz...",
    "confirmError": "Doğrulama başarısız. Lütfen tekrar deneyin."
  },
  "onboarding": {
    "step1": "WhatsApp",
    "step2": "İlk kaynak",
    "whatsappTitle": "WhatsApp numaranız nedir?",
    "whatsappSubtitle": "Haftalık içgörülerinizi buraya göndereceğiz.",
    "phonePlaceholder": "5XX XXX XX XX",
    "saveBtn": "Kaydet ve devam et",
    "saving": "Kaydediliyor...",
    "connectTitle": "İlk kaynağınızı bağlayın",
    "connectSubtitle": "Observer hangi kaynakları izleyecek?",
    "connectBtn": "Bağlan",
    "connecting": "Bağlanıyor...",
    "doneBtn": "Tamam! →",
    "skipDemo": "Şimdilik atla — demo içgörüleri göster",
    "seedingDemo": "Demo veriler yükleniyor...",
    "effortOAuth": "OAuth",
    "effortCsv": "CSV",
    "recommendedBadge": "Önerilen"
  },
  "dashboard": {
    "tabOverview": "Genel Bakış",
    "tabSignals": "Sinyaller",
    "tabGaps": "Boşluklar",
    "readingSignals": "Sinyalleriniz okunuyor...",
    "analysisRunning": "Analiz çalışıyor",
    "noSignals": "Henüz sinyal yok",
    "noSignalsHint": "Bir kaynak bağladıktan sonra içgörüler burada görünür.",
    "urgentLabel": "Acil",
    "soonLabel": "Yakında",
    "whenLabel": "Fırsatta",
    "lowLabel": "Düşük öncelik",
    "justNow": "az önce",
    "minutesAgo": "{n}dk önce",
    "hoursAgo": "{n}sa önce",
    "daysAgo": "{n}g önce",
    "evidenceCount": "{n} müşteri bahsetti",
    "viewDetails": "Detayları gör →",
    "runAnalysis": "Analizi Çalıştır",
    "connectSources": "Kaynak Bağla",
    "sampleBadge": "Örnek veri",
    "welcomeTitle": "Observer'a hoş geldiniz",
    "welcomeBody": "İlk içgörülerinizi görmek için bir kaynak bağlayın.",
    "connectFirstSource": "İlk kaynağı bağla →"
  },
  "sidebar": {
    "runsLeft": "{n} analiz hakkı",
    "trialDays": "{n}g",
    "trialEnded": "Deneme doldu · Yükselt →",
    "paymentFailed": "Ödeme başarısız →",
    "proActive": "· aktif"
  },
  "settings": {
    "title": "Ayarlar",
    "tabProfile": "Profil",
    "tabBilling": "Faturalandırma",
    "tabNotifications": "Bildirimler",
    "tabAccount": "Hesap",
    "profileTitle": "Profil",
    "workspaceName": "Çalışma alanı adı",
    "save": "Kaydet",
    "saving": "Kaydediliyor...",
    "saved": "Kaydedildi",
    "billingTitle": "Faturalandırma",
    "currentPlan": "Mevcut Plan",
    "trialBadge": "ÜCRETSİZ DENEME",
    "proBadge": "PRO · AKTİF",
    "pastDueBadge": "GECİKMİŞ ÖDEME",
    "cancelledBadge": "İPTAL EDİLDİ",
    "expiredBadge": "SÜRESİ DOLDU",
    "upgradeBtn": "Pro'ya Yükselt →",
    "manageBtn": "Aboneliği Yönet →",
    "notificationsTitle": "Bildirimler",
    "alertThreshold": "Uyarı eşiği",
    "criticalOnly": "Yalnızca kritik",
    "allAlerts": "Tüm uyarılar",
    "whatsappEnabled": "WhatsApp bildirimleri",
    "emailEnabled": "E-posta bildirimleri",
    "accountTitle": "Hesap",
    "deleteAccount": "Hesabı Sil",
    "deleteWarning": "Bu işlem geri alınamaz.",
    "distributionTitle": "Dağıtım",
    "integrationsTitle": "Entegrasyonlar"
  },
  "billing": {
    "starterName": "Starter",
    "proName": "Pro",
    "enterpriseName": "Enterprise",
    "starterDesc": "Tek lokasyonlu işletmeler için basit erken uyarı sistemi.",
    "proDesc": "Büyüyen operatörler için her kaynağı tek karar akışında toplar.",
    "enterpriseDesc": "Özel kaynak, raporlama veya kurulum ihtiyacı olan çok lokasyonlu operatörler için.",
    "starterAudience": "1-5 lokasyon",
    "proAudience": "10 lokasyona kadar",
    "enterpriseAudience": "Sınırsız lokasyon",
    "starterCta": "Starter'ı Başlat",
    "proCta": "Pro'ya Geç",
    "enterpriseCta": "Satışla İletişim",
    "perMonth": "/ ay",
    "mostPopular": "En Popüler",
    "currentPlanBadge": "Mevcut Plan",
    "feature_starter_1": "5 iş lokasyonuna kadar",
    "feature_starter_2": "2 aktif sinyal kaynağı",
    "feature_starter_3": "Haftalık içgörü özeti",
    "feature_starter_4": "E-posta uyarıları",
    "feature_starter_5": "Temel kaynak sağlık kontrolü",
    "feature_pro_1": "10 iş lokasyonuna kadar",
    "feature_pro_2": "Tüm sinyal kaynakları",
    "feature_pro_3": "Günlük analiz",
    "feature_pro_4": "E-posta ve WhatsApp uyarıları",
    "feature_pro_5": "Öncelikli sorun sıralaması",
    "feature_enterprise_1": "Sınırsız iş lokasyonu",
    "feature_enterprise_2": "Tüm sinyal kaynakları",
    "feature_enterprise_3": "Özel onboarding ve kaynak kurulumu",
    "feature_enterprise_4": "Gelişmiş raporlama iş akışları",
    "feature_enterprise_5": "Özel destek"
  },
  "sources": {
    "title": "Kaynaklar",
    "subtitle": "Observer hangi kaynaklardan veri alıyor?",
    "connected": "Bağlı",
    "notConnected": "Bağlı Değil",
    "connect": "Bağlan",
    "disconnect": "Bağlantıyı Kes",
    "lastSync": "Son senkron",
    "never": "Hiç",
    "googleReviewsDesc": "Google'da şubeleriniz hakkında söylenenler",
    "getirDesc": "Teslimat puanları ve şikayetler",
    "yemeksepatiDesc": "Sipariş puanları ve müşteri yorumları",
    "trendyolDesc": "Sipariş puanları ve müşteri yorumları",
    "posDesc": "Şubeye göre günlük satışlar, erken düşüşleri yakala",
    "ga4Desc": "Web siteniz varsa trafik ve checkout düşüşleri"
  },
  "alerts": {
    "title": "Uyarılar",
    "subtitle": "Hangi kanallardan bildirim almak istiyorsunuz?",
    "whatsapp": "WhatsApp",
    "email": "E-posta",
    "enabled": "Aktif",
    "disabled": "Pasif",
    "criticalOnly": "Yalnızca kritik",
    "allSignals": "Tüm sinyaller",
    "recipient": "Alıcı",
    "save": "Kaydet",
    "saved": "Kaydedildi"
  },
  "history": {
    "title": "Geçmiş",
    "subtitle": "Gönderilen tüm uyarılar ve kararlar",
    "noHistory": "Henüz gönderilen uyarı yok.",
    "approved": "Onaylandı",
    "rejected": "Reddedildi",
    "pending": "Bekliyor",
    "dismissed": "Atlandı",
    "channel": "Kanal",
    "status": "Durum",
    "sentAt": "Gönderildi"
  },
  "pricing": {
    "title": "Fiyatlandırma",
    "subtitle": "Tüm planlar 14 günlük ücretsiz deneme ile başlar.",
    "questions": "Sorunuz mu var?",
    "contactUs": "Bize ulaşın →"
  },
  "terms": {
    "title": "Kullanım Koşulları",
    "lastUpdated": "Son güncelleme: Mart 2026"
  },
  "privacy": {
    "title": "Gizlilik Politikası",
    "lastUpdated": "Son güncelleme: Mart 2026"
  },
  "errors": {
    "notFoundTitle": "Bu sinyali bulamadık",
    "notFoundBody": "Aradığınız sayfa bulunamadı veya taşındı.",
    "backToDashboard": "Panele dön →",
    "home": "Ana Sayfa",
    "errorTitle": "Bir şeyler ters gitti",
    "errorBody": "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.",
    "tryAgain": "Tekrar dene",
    "backToHome": "Ana sayfaya dön"
  },
  "email": {
    "digestSubject": "Observer — Bu Haftaki Sinyalleriniz",
    "highLabel": "YÜKSEK",
    "mediumLabel": "ORTA",
    "lowLabel": "DÜŞÜK",
    "signalsCount": "{n} sinyal",
    "confidenceLabel": "Güven",
    "actionLabel": "Eylem",
    "viewBrief": "Tam Özeti Gör →",
    "approve": "✅ Onayla",
    "reject": "❌ Reddet"
  },
  "whatsapp": {
    "alertTitle": "Observer Uyarısı",
    "severityHigh": "YÜKSEK",
    "severityMedium": "ORTA",
    "severityLow": "DÜŞÜK",
    "actionLabel": "Eylem",
    "evidenceLabel": "Kanıt",
    "viewLabel": "Görüntüle",
    "replyHint": "Yanıtla: 1 detaylar · 2 hallettim · 3 geç",
    "detailsResponse": "📊 *{evidenceCount} müşteri geri bildirimi*\n\n{businessCase}\n\n✅ *Öneri:* {recommendedAction}",
    "approvedResponse": "✅ Kaydedildi. Takibe alındı.",
    "dismissedResponse": "Anlaşıldı, atlandı.",
    "unknownResponse": "Geçerli bir seçenek gönder: 1 (detaylar), 2 (hallettim) veya 3 (geç)."
  }
}
```

- [ ] **Adım 2: `src/messages/en.json` oluştur (İngilizce)**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "close": "Close",
    "or": "or",
    "signIn": "Sign in",
    "signUp": "Sign up",
    "signOut": "Sign out",
    "settings": "Settings",
    "upgrade": "Upgrade",
    "connect": "Connect",
    "connecting": "Connecting...",
    "saving": "Saving...",
    "continue": "Continue",
    "skip": "Skip"
  },
  "nav": {
    "pricing": "Pricing",
    "signIn": "Sign in",
    "startFree": "Start free",
    "signals": "Signals",
    "sources": "Sources",
    "alerts": "Alerts",
    "history": "History",
    "settings": "Settings",
    "myWorkspace": "My Workspace",
    "signOut": "Sign out"
  },
  "landing": {
    "watchesLabel": "Watches",
    "heroFlow": "Reviews · Getir · POS",
    "heroTitle": "What your customers really think,",
    "heroTitleAccent": "on your WhatsApp.",
    "heroSubtitle": "You can't read every Google review, Getir comment and POS report. Observer does, every day, and texts you the one thing worth fixing. No dashboards, no apps, no tech.",
    "tryFree": "Try for free →",
    "seeExample": "See a live example",
    "noCard": "No credit card · Built for cafés, restaurants and shops",
    "problemLabel": "The problem",
    "problemTitle": "Your customers tell you everything.",
    "problemTitleAccent": "You're too busy to listen.",
    "problemBody1": "A 1-star Google review at 11pm. \"Soğuk geldi\" on Yemeksepeti. A drop in Saturday sales on your POS. It's spread across five apps you never have time to open, and the pattern hides in the noise.",
    "problemBody2": "So you find out something's wrong when the week's numbers come in. Observer reads all of it for you and sends the answer to your phone, while you can still do something about it.",
    "howItWorksLabel": "How it works",
    "step1Title": "Connect",
    "step1Body": "Link Google Reviews, Getir, Yemeksepeti, your POS. Two minutes, no tech skills.",
    "step2Title": "Observer reads it",
    "step2Body": "It goes through every review, order and complaint, and finds what's actually hurting you.",
    "step3Title": "You get a text",
    "step3Body": "The one thing worth your attention lands on your WhatsApp. No app, no login.",
    "step4Title": "You decide",
    "step4Body": "Reply 1 for the details, 2 to mark it done. That's it.",
    "builtForLabel": "Built for your business",
    "builtForTitle": "If you have customers, Observer works for you.",
    "persona1Type": "Coffee shops",
    "persona2Type": "Restaurants",
    "persona3Type": "Retail & shops",
    "exampleAlertLabel": "Example WhatsApp alert",
    "comingSoon": "Online stores and apps? <b>Coming next.</b>",
    "proof1Label": "To your first insight",
    "proof2Label": "Dashboards to check",
    "proof3Label": "Tap to act",
    "proof4Label": "Watching your reviews",
    "ctaTitle": "Your next problem is already in your reviews.",
    "footerTagline": "Customer signals, on your phone",
    "footerTerms": "Terms",
    "footerPrivacy": "Privacy",
    "waBusinessLabel": "business account · online",
    "waUrgentLabel": "🔴 Urgent",
    "waReplyHint": "Reply: <b>1</b> details · <b>2</b> on it · <b>3</b> skip"
  },
  "auth": {
    "tagline": "Customer signals, on your WhatsApp.",
    "loginTitle": "Welcome back",
    "loginSubtitle": "Don't have an account?",
    "signUpFree": "Sign up free →",
    "signInWithGoogle": "Sign in with Google",
    "emailLabel": "Email",
    "emailPlaceholder": "you@company.com",
    "passwordLabel": "Password",
    "passwordPlaceholder": "Your password",
    "forgotPassword": "Forgot password?",
    "signingIn": "Signing in...",
    "signInBtn": "Sign in →",
    "signUpTitle": "Create your account",
    "signUpSubtitle": "Already have an account?",
    "signInLink": "Sign in →",
    "signUpWithGoogle": "Sign up with Google",
    "workspaceLabel": "Business or workspace name",
    "workspacePlaceholder": "e.g. Kronotrop or My Café",
    "newPasswordLabel": "Password",
    "newPasswordPlaceholder": "At least 8 characters",
    "creating": "Creating account...",
    "createBtn": "Create account →",
    "noCard": "No credit card required",
    "errAllRequired": "All fields are required.",
    "errPasswordLength": "Password must be at least 8 characters.",
    "errEmailExists": "An account with this email already exists. Please sign in instead.",
    "errNoUserId": "Signup failed. Please try again.",
    "errWorkspace": "Failed to create workspace.",
    "errSignInFailed": "We couldn't sign you in. Try resetting your password.",
    "accountCreated": "Account created. Please sign in to continue.",
    "forgotTitle": "Forgot your password?",
    "forgotSubtitle": "Enter your email and we'll send you a reset link.",
    "sendResetLink": "Send reset link",
    "sending": "Sending...",
    "checkEmailTitle": "Check your email",
    "checkEmailBody": "We've sent a password reset link to {email}. If you don't see it, check your spam folder.",
    "backToSignIn": "Back to sign in",
    "rememberPassword": "Remember your password?",
    "resetTitle": "Set a new password",
    "resetSubtitle": "Enter your new password below.",
    "newPasswordBtn": "Update password →",
    "updating": "Updating...",
    "resetSuccess": "Password updated! Redirecting...",
    "confirmTitle": "Email confirmed",
    "confirmBody": "Your account is active. Redirecting to dashboard...",
    "confirmError": "Confirmation failed. Please try again."
  },
  "onboarding": {
    "step1": "WhatsApp",
    "step2": "First source",
    "whatsappTitle": "What's your WhatsApp number?",
    "whatsappSubtitle": "We'll send your weekly insights here.",
    "phonePlaceholder": "5XX XXX XX XX",
    "saveBtn": "Save & continue",
    "saving": "Saving...",
    "connectTitle": "Connect your first source",
    "connectSubtitle": "Which sources should Observer watch?",
    "connectBtn": "Connect",
    "connecting": "Connecting...",
    "doneBtn": "Done! →",
    "skipDemo": "Skip for now — show me demo insights",
    "seedingDemo": "Loading demo data...",
    "effortOAuth": "OAuth",
    "effortCsv": "CSV",
    "recommendedBadge": "Recommended"
  },
  "dashboard": {
    "tabOverview": "Overview",
    "tabSignals": "Signals",
    "tabGaps": "Gaps",
    "readingSignals": "Reading your signals...",
    "analysisRunning": "Analysis running",
    "noSignals": "No signals yet",
    "noSignalsHint": "Connect a source and insights will appear here.",
    "urgentLabel": "Urgent",
    "soonLabel": "Soon",
    "whenLabel": "When you can",
    "lowLabel": "Low priority",
    "justNow": "just now",
    "minutesAgo": "{n}m ago",
    "hoursAgo": "{n}h ago",
    "daysAgo": "{n}d ago",
    "evidenceCount": "{n} customers mentioned this",
    "viewDetails": "View details →",
    "runAnalysis": "Run Analysis",
    "connectSources": "Connect Sources",
    "sampleBadge": "Sample data",
    "welcomeTitle": "Welcome to Observer",
    "welcomeBody": "Connect a source to see your first insights.",
    "connectFirstSource": "Connect first source →"
  },
  "sidebar": {
    "runsLeft": "{n} runs left",
    "trialDays": "{n}d",
    "trialEnded": "Trial ended · Upgrade →",
    "paymentFailed": "Payment failed →",
    "proActive": "· active"
  },
  "settings": {
    "title": "Settings",
    "tabProfile": "Profile",
    "tabBilling": "Billing",
    "tabNotifications": "Notifications",
    "tabAccount": "Account",
    "profileTitle": "Profile",
    "workspaceName": "Workspace name",
    "save": "Save",
    "saving": "Saving...",
    "saved": "Saved",
    "billingTitle": "Billing",
    "currentPlan": "Current Plan",
    "trialBadge": "FREE TRIAL",
    "proBadge": "PRO · ACTIVE",
    "pastDueBadge": "PAST DUE",
    "cancelledBadge": "CANCELLED",
    "expiredBadge": "EXPIRED",
    "upgradeBtn": "Upgrade to Pro →",
    "manageBtn": "Manage subscription →",
    "notificationsTitle": "Notifications",
    "alertThreshold": "Alert threshold",
    "criticalOnly": "Critical only",
    "allAlerts": "All alerts",
    "whatsappEnabled": "WhatsApp notifications",
    "emailEnabled": "Email notifications",
    "accountTitle": "Account",
    "deleteAccount": "Delete account",
    "deleteWarning": "This action cannot be undone.",
    "distributionTitle": "Distribution",
    "integrationsTitle": "Integrations"
  },
  "billing": {
    "starterName": "Starter",
    "proName": "Pro",
    "enterpriseName": "Enterprise",
    "starterDesc": "For owner-operated teams that need a simple early warning system.",
    "proDesc": "For growing operators that want every source in one decision feed.",
    "enterpriseDesc": "For multi-location operators with custom source, reporting, or rollout needs.",
    "starterAudience": "1-5 locations",
    "proAudience": "Up to 10 locations",
    "enterpriseAudience": "Unlimited locations",
    "starterCta": "Start Starter",
    "proCta": "Start Pro",
    "enterpriseCta": "Contact Sales",
    "perMonth": "/ month",
    "mostPopular": "Most Popular",
    "currentPlanBadge": "Current Plan",
    "feature_starter_1": "Up to 5 business locations",
    "feature_starter_2": "2 active signal sources",
    "feature_starter_3": "Weekly insight summary",
    "feature_starter_4": "Email alerts",
    "feature_starter_5": "Basic source health checks",
    "feature_pro_1": "Up to 10 business locations",
    "feature_pro_2": "All available signal sources",
    "feature_pro_3": "Daily analysis runs",
    "feature_pro_4": "Email and WhatsApp alerts",
    "feature_pro_5": "Priority issue ranking",
    "feature_enterprise_1": "Unlimited business locations",
    "feature_enterprise_2": "All available signal sources",
    "feature_enterprise_3": "Custom onboarding and source setup",
    "feature_enterprise_4": "Advanced reporting workflows",
    "feature_enterprise_5": "Dedicated support"
  },
  "sources": {
    "title": "Sources",
    "subtitle": "Which sources is Observer pulling data from?",
    "connected": "Connected",
    "notConnected": "Not Connected",
    "connect": "Connect",
    "disconnect": "Disconnect",
    "lastSync": "Last sync",
    "never": "Never",
    "googleReviewsDesc": "What people say about your branches on Google",
    "getirDesc": "Delivery ratings & complaints",
    "yemeksepatiDesc": "Order ratings & customer comments",
    "trendyolDesc": "Order ratings & customer comments",
    "posDesc": "Daily sales by branch, spot drops early",
    "ga4Desc": "If you have a website, traffic & checkout drops"
  },
  "alerts": {
    "title": "Alerts",
    "subtitle": "Which channels should receive notifications?",
    "whatsapp": "WhatsApp",
    "email": "Email",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "criticalOnly": "Critical only",
    "allSignals": "All signals",
    "recipient": "Recipient",
    "save": "Save",
    "saved": "Saved"
  },
  "history": {
    "title": "History",
    "subtitle": "All sent alerts and decisions",
    "noHistory": "No alerts sent yet.",
    "approved": "Approved",
    "rejected": "Rejected",
    "pending": "Pending",
    "dismissed": "Dismissed",
    "channel": "Channel",
    "status": "Status",
    "sentAt": "Sent"
  },
  "pricing": {
    "title": "Pricing",
    "subtitle": "All plans start with a 14-day free trial.",
    "questions": "Have questions?",
    "contactUs": "Contact us →"
  },
  "terms": {
    "title": "Terms of Service",
    "lastUpdated": "Last updated: March 2026"
  },
  "privacy": {
    "title": "Privacy Policy",
    "lastUpdated": "Last updated: March 2026"
  },
  "errors": {
    "notFoundTitle": "We couldn't find that signal",
    "notFoundBody": "The page you're looking for doesn't exist or has moved.",
    "backToDashboard": "Back to dashboard →",
    "home": "Home",
    "errorTitle": "Something went wrong",
    "errorBody": "An unexpected error occurred. Please try again.",
    "tryAgain": "Try again",
    "backToHome": "Go back home"
  },
  "email": {
    "digestSubject": "Observer — Your Signals This Week",
    "highLabel": "HIGH",
    "mediumLabel": "MEDIUM",
    "lowLabel": "LOW",
    "signalsCount": "{n} signals",
    "confidenceLabel": "Confidence",
    "actionLabel": "Action",
    "viewBrief": "View Full Brief →",
    "approve": "✅ Approve",
    "reject": "❌ Reject"
  },
  "whatsapp": {
    "alertTitle": "Observer Alert",
    "severityHigh": "HIGH",
    "severityMedium": "MEDIUM",
    "severityLow": "LOW",
    "actionLabel": "Action",
    "evidenceLabel": "Evidence",
    "viewLabel": "View",
    "replyHint": "Reply: 1 details · 2 on it · 3 skip",
    "detailsResponse": "📊 *{evidenceCount} customer responses*\n\n{businessCase}\n\n✅ *Suggested:* {recommendedAction}",
    "approvedResponse": "✅ Marked as handled. Logged.",
    "dismissedResponse": "Got it, skipped.",
    "unknownResponse": "Please reply with a valid option: 1 (details), 2 (on it) or 3 (skip)."
  }
}
```

- [ ] **Adım 3: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Adım 4: commit**

```bash
git add src/messages/
git commit -m "feat(i18n): add tr.json and en.json message files"
```

---

## Task 3: Server action + LocaleSwitcher bileşeni

**Files:**
- Create: `src/actions/locale.ts`
- Create: `src/components/LocaleSwitcher.tsx`

- [ ] **Adım 1: `src/actions/locale.ts` oluştur**

```ts
'use server';
import { cookies } from 'next/headers';
import { locales, type Locale } from '@/i18n/config';

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  if (!locales.includes(locale)) return;
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 31_536_000,
    path: '/',
    sameSite: 'lax',
  });
}
```

- [ ] **Adım 2: `src/components/LocaleSwitcher.tsx` oluştur**

```tsx
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
```

- [ ] **Adım 3: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Adım 4: commit**

```bash
git add src/actions/locale.ts src/components/LocaleSwitcher.tsx
git commit -m "feat(i18n): add setLocale server action and LocaleSwitcher component"
```

---

## Task 4: middleware.ts — next-intl + auth zinciri

**Files:**
- Create: `middleware.ts` (kök dizin — Next.js middleware konumu)
- `src/proxy.ts` değişmez

Mevcut `src/proxy.ts` auth guard mantığını olduğu gibi tutar. Yeni `middleware.ts` sadece locale cookie set eder, ardından `proxy()` çağırır.

- [ ] **Adım 1: kök `middleware.ts` oluştur**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { proxy, config as proxyConfig } from './src/proxy';
import { defaultLocale, locales } from './src/i18n/config';

export function middleware(req: NextRequest) {
  // 1. Locale cookie eksikse default'u set et
  const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;
  const needsLocale = !localeCookie || !locales.includes(localeCookie as typeof locales[number]);

  // 2. Auth guard (proxy.ts)
  const authResult = proxy(req);

  // 3. Locale cookie eklenmesi gereken durumlarda response'a yaz
  if (needsLocale) {
    const res = authResult instanceof NextResponse ? authResult : NextResponse.next();
    res.cookies.set('NEXT_LOCALE', defaultLocale, {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    });
    return res;
  }

  return authResult;
}

export const config = proxyConfig;
```

- [ ] **Adım 2: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Adım 3: commit**

```bash
git add middleware.ts
git commit -m "feat(i18n): add middleware with locale cookie injection + auth chain"
```

---

## Task 5: layout.tsx — NextIntlClientProvider + lang attr

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Adım 1: layout.tsx'i güncelle**

```tsx
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AppSidebarShell from "@/components/layout/AppSidebarShell";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "https://observerai.app";

const SITE_NAME = "Observer AI";
const TAGLINE = "Müşteri sinyalleri, WhatsApp'ınızda.";
const DESCRIPTION =
  "Observer AI her müşteri sinyalini analiz eder, en önemli sorunları WhatsApp'ınıza gönderir.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Observer AI" }],
  creator: "Observer AI",
  publisher: "Observer AI",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppSidebarShell />
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Adım 2: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Adım 3: commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(i18n): wrap app with NextIntlClientProvider, dynamic lang attr"
```

---

## Task 6: Landing page çevirisi + public nav'a LocaleSwitcher

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Adım 1: page.tsx başına import ekle ve `"use client"` koru, çevirileri ekle**

`page.tsx` şu an `"use client"` — `useTranslations` hook'unu kullanabiliriz.

Dosyanın en üstüne ekle:
```tsx
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
```

`LandingPage` bileşeni içine ekle (diğer satırların hemen arkasına):
```tsx
const t = useTranslations('landing');
const tNav = useTranslations('nav');
```

- [ ] **Adım 2: `sources` dizisini sil, `personas` ve `steps` dizilerini `t()` ile güncelle**

```tsx
// personas dizisini şu şekilde değiştir:
const personas = [
  {
    icon: "☕",
    type: t('persona1Type'),
    sources: ["Google Reviews", "Getir", "POS"],
    gap: "Bu hafta 12 kişi Kadıköy şubenizde sabah kuyruğunun çok yavaş olduğunu söyledi. 8-10 arası vardiyaya bir barista ekleyin.",
  },
  {
    icon: "🍽️",
    type: t('persona2Type'),
    sources: ["Yemeksepeti", "Trendyol", "Google"],
    gap: "Yemeksepeti'ndeki soğuk yemek şikayetleri bu hafta sonu üçe katlandı, hepsi gece 9'dan sonra yapılan geç teslimatlardan. Kurye teslimat sürecini kontrol edin.",
  },
  {
    icon: "🏪",
    type: t('persona3Type'),
    sources: ["Google Reviews", "POS", "Analytics"],
    gap: "Cumartesi müşteri trafiği artıyor ama satışlar sabit. Müşteriler uzun ödeme kuyruklarından bahsediyor. Hafta sonları ikinci kasayı açın.",
  },
];

// steps dizisini şu şekilde değiştir:
const steps = [
  { n: "01", icon: "🔌", title: t('step1Title'), body: t('step1Body') },
  { n: "02", icon: "🧠", title: t('step2Title'), body: t('step2Body') },
  { n: "03", icon: "💬", title: t('step3Title'), body: t('step3Body') },
  { n: "04", icon: "✅", title: t('step4Title'), body: t('step4Body') },
];

// proof dizisini şu şekilde değiştir:
const proof = [
  { n: "5dk", label: t('proof1Label') },
  { n: "0",   label: t('proof2Label') },
  { n: "1",   label: t('proof3Label') },
  { n: "7/24",label: t('proof4Label') },
];
```

- [ ] **Adım 3: Nav'a LocaleSwitcher ekle**

Nav bölümünde sağ kısma `<LocaleSwitcher />` ekle (mevcut linklerin yanına):
```tsx
<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
  <LocaleSwitcher />
  <Link href="/pricing" ...>{tNav('pricing')}</Link>
  <Link href="/login" ...>{tNav('signIn')}</Link>
  <Link href="/signup" ...>{tNav('startFree')}</Link>
</div>
```

- [ ] **Adım 4: Hero, problem, CTA, footer metinlerini `t()` ile güncelle**

Hero:
```tsx
// hero akış etiketi
<span style={{ fontSize: "0.72rem", color: muted }}>{t('heroFlow')}</span>
// h1
<h1>
  {t('heroTitle')}<br />
  <span style={{ color: muted }}>{t('heroTitleAccent')}</span>
</h1>
// subtitle
<p>{t('heroSubtitle')}</p>
// CTA butonları
<Link href="/signup">{ t('tryFree') }</Link>
<Link href="/showcase">{ t('seeExample') }</Link>
// alt yazı
<p>{ t('noCard') }</p>
```

Sources strip:
```tsx
<span ...>{t('watchesLabel')}</span>
```

Problem bölümü:
```tsx
<p ...>{t('problemLabel')}</p>
<h2>
  {t('problemTitle')}<br />{t('problemTitleAccent')}
</h2>
<p>{t('problemBody1')}</p>
<p>{t('problemBody2')}</p>
```

How it works:
```tsx
<p ...>{t('howItWorksLabel')}</p>
```

Built for section:
```tsx
<p ...>{t('builtForLabel')}</p>
<h2>{t('builtForTitle')}</h2>
// alt yazı
<p ... dangerouslySetInnerHTML={{ __html: t.raw('comingSoon') }} />
```

Example alert label (persona kartları):
```tsx
<div ...>{t('exampleAlertLabel')}</div>
```

CTA section:
```tsx
<h2>{t('ctaTitle')}</h2>
<Link href="/signup">{t('tryFree')}</Link>
<p>{t('noCard')}</p>
```

Footer:
```tsx
{[
  [tNav('pricing'), "/pricing"],
  [tNav('signIn'), "/login"],
  [tNav('signUp'), "/signup"],
  [t('footerTerms'), "/terms"],
  [t('footerPrivacy'), "/privacy"],
].map(([label, href]) => (
  <Link key={href} href={href} ...>{label}</Link>
))}
<span ...>{t('footerTagline')}</span>
```

WA mockup içindeki metinler:
```tsx
// business label
<div ...>{t('waBusinessLabel')}</div>
// Urgent label
<div ...>{t('waUrgentLabel')}</div>
// Reply hint
<div dangerouslySetInnerHTML={{ __html: t.raw('waReplyHint') }} />
```

- [ ] **Adım 5: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

- [ ] **Adım 6: commit**

```bash
git add src/app/page.tsx
git commit -m "feat(i18n): translate landing page, add LocaleSwitcher to public nav"
```

---

## Task 7: Auth sayfaları çevirisi

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `src/app/auth/confirm/page.tsx`

- [ ] **Adım 1: login/page.tsx — `useTranslations` ekle ve metinleri değiştir**

`LoginContent` bileşenine ekle:
```tsx
import { useTranslations } from 'next-intl';
// bileşen içinde:
const t = useTranslations('auth');
const tNav = useTranslations('nav');
```

Değiştir:
```tsx
// tagline
<p ...>{t('tagline')}</p>
// card title
<h1>{t('loginTitle')}</h1>
// subtitle
<p>{t('loginSubtitle')}{" "}<Link href="/signup">{t('signUpFree')}</Link></p>
// google button
<GoogleButton label={t('signInWithGoogle')} />
// email label
<label>{t('emailLabel')}</label>
<input ... placeholder={t('emailPlaceholder')} />
// password label + forgot
<label>{t('passwordLabel')}</label>
<Link href="/forgot-password">{t('forgotPassword')}</Link>
<input ... placeholder={t('passwordPlaceholder')} />
// submit button
{loading ? <>{spinner}{t('signingIn')}</> : t('signInBtn')}
// error mesajı — sabit Türkçe olarak değil, zaten t() key'iyle:
// signInError mesajında "Email not confirmed" kontrolü yapılırken:
const msg = signInError.message.includes("Email not confirmed")
  ? t('errSignInFailed')
  : signInError.message;
```

- [ ] **Adım 2: signup/page.tsx — metinleri değiştir**

`SignupPage` bileşenine ekle:
```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('auth');
```

Değiştir:
```tsx
<h1>{t('signUpTitle')}</h1>
<p>{t('signUpSubtitle')}{" "}<Link href="/login">{t('signInLink')}</Link></p>
<GoogleButton label={t('signUpWithGoogle')} />
<label>{t('workspaceLabel')}</label>
<input placeholder={t('workspacePlaceholder')} />
<label>{t('emailLabel')}</label>
<input placeholder={t('emailPlaceholder')} />
<label>{t('newPasswordLabel')}</label>
<input placeholder={t('newPasswordPlaceholder')} />
// hata mesajları — t() key'leri ile:
if (!email || !password || !workspaceName) { setError(t('errAllRequired')); }
if (password.length < 8) { setError(t('errPasswordLength')); }
// already exists:
setError(t('errEmailExists'));
// no userId:
setError(t('errNoUserId'));
// workspace fail:
setError(body.error ?? t('errWorkspace'));
// sign in failed:
setError(t('accountCreated'));
// submit button:
{loading ? t('creating') : t('createBtn')}
// alt yazı:
<p>{t('noCard')}</p>
```

- [ ] **Adım 3: forgot-password/page.tsx — metinleri değiştir**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('auth');
// sent durumunda:
<h1>{t('checkEmailTitle')}</h1>
<p>{t('checkEmailBody').replace('{email}', email)}</p>
<Link href="/login">{t('backToSignIn')}</Link>
// form:
<h1>{t('forgotTitle')}</h1>
<p>{t('forgotSubtitle')}</p>
<label>{t('emailLabel')}</label>
<input placeholder={t('emailPlaceholder')} />
<button>{loading ? t('sending') : t('sendResetLink')}</button>
<p>{t('rememberPassword')}{" "}<Link href="/login">{t('signInBtn')}</Link></p>
```

- [ ] **Adım 4: reset-password/page.tsx ve auth/confirm/page.tsx — aynı pattern**

reset-password:
```tsx
const t = useTranslations('auth');
// title, subtitle, label, placeholder, buttons — t() ile değiştir
// success mesajı: t('resetSuccess')
// button: loading ? t('updating') : t('newPasswordBtn')
```

auth/confirm:
```tsx
const t = useTranslations('auth');
// success: t('confirmTitle'), t('confirmBody')
// error: t('confirmError')
```

- [ ] **Adım 5: verify:fast çalıştır**

```bash
npm run verify:fast 2>&1 | tail -10
```

- [ ] **Adım 6: commit**

```bash
git add src/app/login/ src/app/signup/ src/app/forgot-password/ src/app/reset-password/ src/app/auth/
git commit -m "feat(i18n): translate all auth pages to Turkish"
```

---

## Task 8: Onboarding sayfaları

**Files:**
- Modify: `src/app/onboarding/whatsapp/page.tsx`
- Modify: `src/app/onboarding/connect/page.tsx`

- [ ] **Adım 1: onboarding/whatsapp/page.tsx**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('onboarding');
// Progress steps:
{[t('step1'), t('step2')].map((s, i) => (...))}
// Title + subtitle:
<h1>{t('whatsappTitle')}</h1>
<p>{t('whatsappSubtitle')}</p>
// Input placeholder:
<input placeholder={t('phonePlaceholder')} />
// Country names — sadece Türkçe olan:
const COUNTRIES = [
  { code: "+90", flag: "🇹🇷", name: "Türkiye" },
  // diğerleri İngilizce kalsın (uluslararası standart)
  ...
];
// Save button:
{saving ? t('saving') : t('saveBtn')}
```

- [ ] **Adım 2: onboarding/connect/page.tsx**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('onboarding');
// Progress steps:
{[t('step1'), t('step2')].map((s, i) => (...))}
// Title:
<h2>{t('connectTitle')}</h2>
// Source kartlarındaki effort badge:
effort === "OAuth" ? t('effortOAuth') : effort === "CSV" ? t('effortCsv') : effort
// Recommended badge:
{src.recommended && <span>{t('recommendedBadge')}</span>}
// Connect button:
{saving ? t('connecting') : done ? t('doneBtn') : t('connectBtn')}
// Skip button:
<button>{seeding ? t('seedingDemo') : t('skipDemo')}</button>
```

- [ ] **Adım 3: verify:fast çalıştır + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/onboarding/
git commit -m "feat(i18n): translate onboarding pages"
```

---

## Task 9: Sidebar — nav çevirisi + LocaleSwitcher

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Adım 1: import ekle**

```tsx
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
```

- [ ] **Adım 2: `Sidebar` bileşeni içinde `t` tanımla**

```tsx
const t = useTranslations('nav');
const tSidebar = useTranslations('sidebar');
```

- [ ] **Adım 3: navItems çevirisi**

```tsx
const navItems = [
  { href: "/dashboard", label: t('signals'), icon: <SignalsIcon />, ... },
  { href: "/sources",   label: t('sources'), icon: <SourcesIcon />, ... },
  { href: "/alerts",    label: t('alerts'),  icon: <AlertsIcon />,  ... },
  { href: "/history",   label: t('history'), icon: <HistoryIcon />, ... },
];
```

- [ ] **Adım 4: Plan pill metinleri**

```tsx
// trial pill:
<><span>{runsLeft}</span><span>{tSidebar('runsLeft').replace('{n}', String(runsLeft))}</span></>
// expired:
{tSidebar('trialEnded')}
// past_due:
{tSidebar('paymentFailed')}
// pro:
<><span>PRO</span><span>{tSidebar('proActive')}</span></>
```

- [ ] **Adım 5: User row + Settings + Sign out**

```tsx
// Settings link:
<Link href="/settings">{t('settings')}</Link>
// Workspace fallback:
{workspaceName || t('myWorkspace')}
// Sign out title:
<button title={t('signOut')} ...>
```

- [ ] **Adım 6: LocaleSwitcher'ı sidebar-bottom'a ekle**

`sidebar-bottom` div'inin içine, plan pill'in üstüne:
```tsx
<div style={{ padding: '8px 12px 4px' }}>
  <LocaleSwitcher />
</div>
```

- [ ] **Adım 7: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/components/layout/Sidebar.tsx
git commit -m "feat(i18n): translate sidebar nav, add LocaleSwitcher to sidebar bottom"
```

---

## Task 10: Dashboard sayfası + bileşenleri

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/OverviewTab.tsx`
- Modify: `src/components/dashboard/SignalsTab.tsx`
- Modify: `src/components/dashboard/IntentGapsTab.tsx`

- [ ] **Adım 1: dashboard/page.tsx — tab etiketleri ve yükleme durumları**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('dashboard');
// Tab labels:
{ id: "overview", label: t('tabOverview') }
{ id: "signals",  label: t('tabSignals') }
{ id: "gaps",     label: t('tabGaps') }
// Loading/reading state:
<p>{t('readingSignals')}</p>
// timeSince fonksiyonu — t() ile:
// dashboard/page.tsx içindeki timeSince'i locale-aware yap:
function timeSince(d: Date, t: ReturnType<typeof useTranslations<'dashboard'>>): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return t('justNow');
  if (mins < 60) return t('minutesAgo').replace('{n}', String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('hoursAgo').replace('{n}', String(hrs));
  return t('daysAgo').replace('{n}', String(Math.floor(hrs / 24)));
}
// urgencyLabel fonksiyonu:
function urgencyLabel(s: number, t: ReturnType<typeof useTranslations<'dashboard'>>): string {
  if (s >= 80) return t('urgentLabel');
  if (s >= 60) return t('soonLabel');
  if (s >= 35) return t('whenLabel');
  return t('lowLabel');
}
// Sample clusters içindeki İngilizce metinleri Türkçe'ye çevir:
// (title, business_case, recommended_action, customer_quote alanları)
// Bu alanlar zaten Türkçe örnek veri içeriyor, kontrol et
```

- [ ] **Adım 2: OverviewTab.tsx — metinleri çevir**

```tsx
import { useTranslations } from 'next-intl';
// OverviewTabProps'a t geçirmek yerine bileşen içinde kullan:
const t = useTranslations('dashboard');
// Onboarding state'indeki metinler:
<h2>{t('welcomeTitle')}</h2>
<p>{t('welcomeBody')}</p>
// steps:
{ n: 1, label: t('connectSources') }
{ n: 2, label: t('runAnalysis') }
{ n: 3, label: "İçgörüleri Al" }  // veya dashboard.getInsights key ekle
// insight cards:
<span>{t('sampleBadge')}</span>
<Link href="/connect">{t('connectFirstSource')}</Link>
```

- [ ] **Adım 3: SignalsTab.tsx ve IntentGapsTab.tsx**

Her ikisine de:
```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('dashboard');
// urgency badge'lerini t() ile değiştir
// evidence count: t('evidenceCount').replace('{n}', String(cluster.evidence_count))
// view details: t('viewDetails')
// no signals state: t('noSignals'), t('noSignalsHint')
```

- [ ] **Adım 4: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/dashboard/ src/components/dashboard/
git commit -m "feat(i18n): translate dashboard page and tab components"
```

---

## Task 11: Settings sayfaları

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/settings/billing/page.tsx`
- Modify: `src/app/settings/distribution/page.tsx`
- Modify: `src/app/settings/integrations/page.tsx`

- [ ] **Adım 1: settings/page.tsx — tab etiketleri ve alan isimleri**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('settings');
// Tab labels:
"profile"       → t('tabProfile')
"billing"       → t('tabBilling')
"notifications" → t('tabNotifications')
"account"       → t('tabAccount')
// Her tab içindeki başlıklar, etiketler, butonlar t() ile
// PlanBadge içindeki metinler:
"FREE TRIAL"  → t('trialBadge')
"PRO · ACTIVE"→ t('proBadge')
"PAST DUE"    → t('pastDueBadge')
"CANCELLED"   → t('cancelledBadge')
"EXPIRED"     → t('expiredBadge')
// fmtDate → locale-aware: new Date(isoDate).toLocaleDateString('tr-TR', ...)
```

- [ ] **Adım 2: settings/billing/page.tsx**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('billing');
const tSettings = useTranslations('settings');
// Plan kartı isimleri, açıklamalar, feature listesi, CTA butonları t() ile
// Plan options array:
const planOptions = [
  {
    name: t('starterName'), price: "$29.99", suffix: t('perMonth'),
    description: t('starterDesc'), audience: t('starterAudience'),
    features: [t('feature_starter_1'), ...],
    cta: t('starterCta'),
  },
  {
    name: t('proName'), price: "$49.99", ...
    cta: t('proCta'),
  },
  {
    name: t('enterpriseName'), price: "Konuşalım", ...
    cta: t('enterpriseCta'),
  },
];
// fmtDate locale → 'tr-TR'
```

- [ ] **Adım 3: settings/distribution/page.tsx + integrations/page.tsx**

```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('alerts'); // distribution için
const tInt = useTranslations('settings'); // integrations için
// Başlıklar, toggle etiketleri, kaydet butonu t() ile
```

- [ ] **Adım 4: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/settings/
git commit -m "feat(i18n): translate settings pages"
```

---

## Task 12: Sources, Alerts, History, Delivery-log sayfaları

**Files:**
- Modify: `src/app/connect/page.tsx`
- Modify: `src/app/alerts/page.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/app/delivery-log/page.tsx`

- [ ] **Adım 1: Her dosyaya `useTranslations` ekle**

```tsx
// connect/page.tsx (Sources):
import { useTranslations } from 'next-intl';
const t = useTranslations('sources');
// ACTIVE_SOURCES içindeki description alanları → t('googleReviewsDesc') vs.
// "Connected" → t('connected'), "Not Connected" → t('notConnected')
// "Connect" button → t('connect')
// "Last sync" → t('lastSync'), "Never" → t('never')

// alerts/page.tsx:
const t = useTranslations('alerts');
// Başlık, alt başlık, toggle etiketleri, kaydet → t() ile

// history/page.tsx + delivery-log/page.tsx:
const t = useTranslations('history');
// Başlık, alt başlık, empty state, status badges → t() ile
// "Approved" → t('approved'), "Pending" → t('pending') vb.
```

- [ ] **Adım 2: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/connect/ src/app/alerts/ src/app/history/ src/app/delivery-log/
git commit -m "feat(i18n): translate sources, alerts, history, delivery-log pages"
```

---

## Task 13: Pricing + Terms + Privacy sayfaları

**Files:**
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/privacy/page.tsx`

Bu sayfalar server components. `getTranslations` kullanır.

- [ ] **Adım 1: pricing/page.tsx**

```tsx
import { getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default async function PricingPage() {
  const t = await getTranslations('billing');
  const tPricing = await getTranslations('pricing');
  const tNav = await getTranslations('nav');

  const plans = [
    {
      name: t('starterName'), price: "$29.99", suffix: t('perMonth'),
      description: t('starterDesc'), audience: t('starterAudience'),
      features: [t('feature_starter_1'), t('feature_starter_2'), t('feature_starter_3'), t('feature_starter_4'), t('feature_starter_5')],
      cta: t('starterCta'), href: "/signup", featured: false,
    },
    {
      name: t('proName'), price: "$49.99", suffix: t('perMonth'),
      description: t('proDesc'), audience: t('proAudience'),
      features: [t('feature_pro_1'), t('feature_pro_2'), t('feature_pro_3'), t('feature_pro_4'), t('feature_pro_5')],
      cta: t('proCta'), href: "/signup", featured: true,
    },
    {
      name: t('enterpriseName'), price: "Konuşalım", suffix: "",
      description: t('enterpriseDesc'), audience: t('enterpriseAudience'),
      features: [t('feature_enterprise_1'), t('feature_enterprise_2'), t('feature_enterprise_3'), t('feature_enterprise_4'), t('feature_enterprise_5')],
      cta: t('enterpriseCta'), href: "mailto:hello@observerai.app?subject=Observer%20Enterprise", featured: false,
    },
  ];
  // Sayfa başlığı, alt başlık: tPricing('title'), tPricing('subtitle')
  // Nav: LocaleSwitcher + tNav() link etiketleri
}
```

- [ ] **Adım 2: terms/page.tsx + privacy/page.tsx**

Başlıkları ve tarih satırını Türkçe yap:
```tsx
import { getTranslations } from 'next-intl/server';
// terms:
const t = await getTranslations('terms');
<h1>{t('title')}</h1>
<p>{t('lastUpdated')}</p>
// Madde başlıkları ve içerik paragrafları direkt Türkçe string olarak değiştirilebilir
// (uzun hukuki metinler için t() key yerine direkt TR metni daha pratik)
```

- [ ] **Adım 3: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/pricing/ src/app/terms/ src/app/privacy/
git commit -m "feat(i18n): translate pricing, terms, privacy pages"
```

---

## Task 14: Error + Not-found sayfaları

**Files:**
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/error.tsx`

`not-found.tsx` server component, `error.tsx` client component.

- [ ] **Adım 1: not-found.tsx**

```tsx
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  // metinleri değiştir:
  <h1>{t('notFoundTitle')}</h1>
  <p>{t('notFoundBody')}</p>
  <Link href="/dashboard">{t('backToDashboard')}</Link>
  <Link href="/">{t('home')}</Link>
}
```

- [ ] **Adım 2: error.tsx**

```tsx
import { useTranslations } from 'next-intl';

export default function GlobalError({ error, reset }) {
  const t = useTranslations('errors');
  <h1>{t('errorTitle')}</h1>
  <p>{t('errorBody')}</p>
  <button onClick={reset}>{t('tryAgain')}</button>
  <Link href="/">{t('backToHome')}</Link>
}
```

- [ ] **Adım 3: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/app/not-found.tsx src/app/error.tsx
git commit -m "feat(i18n): translate 404 and error pages"
```

---

## Task 15: Email + WhatsApp server-side şablonları

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/lib/whatsapp.ts`

Server-side olduğu için `getTranslations()` kullanılır. Locale, `cookies()` ile okunur.

- [ ] **Adım 1: email.ts — `buildEmailHTML` fonksiyonuna locale ekle**

```ts
import { getTranslations } from 'next-intl/server';

export async function buildEmailHTML(
  clusters: Cluster[],
  deliveryIds?: Record<string, string>,
  locale = 'tr'
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'email' });
  
  const rows = clusters.map((c) => {
    const color = c.severity >= 70 ? "#ff5c7a" : c.severity >= 40 ? "#ffd166" : "#46e6a6";
    const label = c.severity >= 70 ? t('highLabel') : c.severity >= 40 ? t('mediumLabel') : t('lowLabel');
    // ... geri kalan aynı, sadece metinler t() ile:
    // "signals" → t('signalsCount').replace('{n}', String(c.evidence_count))
    // "Confidence:" → t('confidenceLabel')
    // "Action:" → t('actionLabel')
    // "View Full Brief →" → t('viewBrief')
    // "✅ Approve" → t('approve')
    // "❌ Reject" → t('reject')
  });
  // ...
}
```

`buildEmailHTML` çağrıları (`src/app/api/cron/digest/route.ts` gibi) `await` ile kullanılmalı — zaten async, sorun yok.

- [ ] **Adım 2: whatsapp.ts — `sendWhatsAppAlert` fonksiyonuna locale ekle**

```ts
import { getTranslations } from 'next-intl/server';

export async function sendWhatsAppAlert(toNumber: string, cluster: Cluster, locale = 'tr') {
  const client = getTwilioClient();
  const env = requireEnvGroup("whatsapp");
  const coreEnv = requireEnvGroup("core");
  const t = await getTranslations({ locale, namespace: 'whatsapp' });

  const severityEmoji = cluster.severity >= 70 ? "🔴" : cluster.severity >= 40 ? "🟡" : "🟢";
  const severityLabel = cluster.severity >= 70 ? t('severityHigh') : cluster.severity >= 40 ? t('severityMedium') : t('severityLow');

  const body = `${severityEmoji} *${t('alertTitle')}*
*${cluster.title}*
${severityLabel} (${cluster.severity}/100)

${cluster.business_case}

${t('actionLabel')}: ${cluster.recommended_action}

${t('evidenceLabel')}: ${cluster.evidence_count}
${t('viewLabel')}: ${coreEnv.NEXTAUTH_URL}/dashboard?gap=${cluster.id}`;

  return client.messages.create({
    body,
    from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${toNumber}`,
  });
}
```

`parseInboundWhatsApp` yanıt mesajları — `whatsapp.ts`'deki reply response string'leri:
```ts
// "detailsResponse", "approvedResponse", "dismissedResponse", "unknownResponse"
// Bunlar webhook handler'da kullanılıyor, workspace locale'i oradan al
const t = await getTranslations({ locale: 'tr', namespace: 'whatsapp' });
const detailsMsg = t('detailsResponse')
  .replace('{evidenceCount}', String(cluster.evidence_count))
  .replace('{businessCase}', cluster.business_case ?? '')
  .replace('{recommendedAction}', cluster.recommended_action ?? '');
```

- [ ] **Adım 3: verify:fast + commit**

```bash
npm run verify:fast 2>&1 | tail -10
git add src/lib/email.ts src/lib/whatsapp.ts
git commit -m "feat(i18n): translate email and WhatsApp server-side templates"
```

---

## Task 16: Son kontrol — tam verify + build

- [ ] **Adım 1: Tam verify çalıştır**

```bash
npm run verify 2>&1 | tail -30
```

Expected: typecheck + lint + build hepsi exit 0.

- [ ] **Adım 2: Dev server'da manuel kontrol**

```bash
npm run dev
```

Kontrol listesi:
- [ ] `http://localhost:3000` → Türkçe landing, nav'da TR/EN toggle görünüyor
- [ ] EN seçince sayfa İngilizce oluyor, TR seçince tekrar Türkçe
- [ ] `http://localhost:3000/login` → Türkçe form
- [ ] `http://localhost:3000/dashboard` → Türkçe tab etiketleri, Türkçe insight kartları
- [ ] Sidebar altında TR/EN toggle görünüyor
- [ ] `http://localhost:3000/pricing` → Türkçe plan isimleri + özellikler
- [ ] Cookie yenilemede seçilen dil korunuyor

- [ ] **Adım 3: LAST_UPDATES.md güncelle ve final commit**

```bash
git add -A
git commit -m "feat(i18n): complete Turkish localization with next-intl, TR default, EN fallback"
```

---

## Önemli Notlar

**`"use client"` vs server component:**
- Client component (`"use client"` var) → `useTranslations('namespace')` hook
- Server component (async function, `"use client"` yok) → `await getTranslations('namespace')`

**Dinamik string interpolation:**
`next-intl` ICU format destekler ama basitçe `.replace('{n}', value)` da çalışır. Tercihen ICU:
```json
"minutesAgo": "{n}dk önce"
```
```tsx
t('minutesAgo', { n: mins })
```

**Sayfa build hatası alınırsa:**
- `getTranslations` server component'te await edilmeden çağrıldıysa hata verir → `await` ekle
- `useTranslations` server component'te kullanıldıysa hata verir → `getTranslations` kullan

**`t.raw()` kullanımı:**
HTML içeren string'ler için (`dangerouslySetInnerHTML`):
```tsx
<p dangerouslySetInnerHTML={{ __html: t.raw('comingSoon') }} />
```
