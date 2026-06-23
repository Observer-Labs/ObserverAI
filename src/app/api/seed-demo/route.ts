export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch or create demo branches (idempotent — safe to call multiple times)
  const { data: existingBranches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("brand", "Observer Coffee");

  let kId: string;
  let bId: string;

  if (existingBranches && existingBranches.length >= 2) {
    // Branches already exist — check if clusters are also present
    const branchIds = existingBranches.map((b: { id: string }) => b.id);
    const { count: clusterCount } = await supabase
      .from("clusters")
      .select("id", { count: "exact", head: true })
      .in("branch_id", branchIds);

    if ((clusterCount ?? 0) > 0) {
      return NextResponse.json({ message: "Demo data already loaded" });
    }

    // Branches exist but clusters are missing (previous partial failure) — finish the job
    kId = existingBranches.find((b: { name: string; id: string }) => b.name === "Kadıköy")?.id ?? existingBranches[0].id;
    bId = existingBranches.find((b: { name: string; id: string }) => b.name === "Beşiktaş")?.id ?? existingBranches[1].id;
  } else {
    // ── Create 2 demo branches ──────────────────────────────────────────────
    const { data: kadikoy, error: e1 } = await supabase
      .from("branches")
      .insert({ workspace_id: workspaceId, name: "Kadıköy", brand: "Observer Coffee", district: "Kadıköy", city: "İstanbul", timezone: "Europe/Istanbul", status: "active" })
      .select("id")
      .single();

    const { data: besiktas, error: e2 } = await supabase
      .from("branches")
      .insert({ workspace_id: workspaceId, name: "Beşiktaş", brand: "Observer Coffee", district: "Beşiktaş", city: "İstanbul", timezone: "Europe/Istanbul", status: "active" })
      .select("id")
      .single();

    if (e1 || e2 || !kadikoy || !besiktas) {
      return NextResponse.json({ error: "Branch creation failed" }, { status: 500 });
    }

    kId = kadikoy.id as string;
    bId = besiktas.id as string;
  }

  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

  // ── Demo signals ──────────────────────────────────────────────────────────
  const signals = [
    // Kadıköy — hafta sonu kuyruk (critical)
    { workspace_id: workspaceId, branch_id: kId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Elif Y.", content: "★★ Cumartesi sabahı 20 dakika sıra bekledim. Çok kalabalıktı, sipariş vermeden çıktım.", timestamp: ago(1), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Mert K.", content: "★★ Kadıköy şubesi hafta sonları çok kalabalık ve personel yetersiz. 15 dakika flat white için bekledim.", timestamp: ago(2), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Deniz A.", content: "★★★ Hafta içi harika ama Pazar kaotik. Tek barista, sıra kapıya kadar, hiç masa temizlenmiyor.", timestamp: ago(2), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Sipariş 45 dakika gecikti. Uygulama 15 dk demişti. Kahve soğumuştu. Cumartesi sabahı.", timestamp: ago(1), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Hazırlık süresi çok uzadı. Cumartesi sabahı yoğunluğu her şeyi etkiliyor.", timestamp: ago(3), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "pos", source_type: "pos", channel: "demo", sender: "POS · Kadıköy", content: "Cumartesi 08:00-11:00: 142 işlem, ort. servis 9dk12sn (haftaiçi 4dk30sn). 23 bırakılan sipariş.", timestamp: ago(1), reviewed: false },

    // Kadıköy — soğuk teslimat (high)
    { workspace_id: workspaceId, branch_id: kId, source: "yemeksepeti", source_type: "yemeksepeti", channel: "demo", sender: "Yemeksepeti", content: "★★ Yemek soğuk geldi, paketleme de kötüydü. 1 saati geçti teslimat. Hafta sonu akşamı.", timestamp: ago(2), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "yemeksepeti", source_type: "yemeksepeti", channel: "demo", sender: "Yemeksepeti", content: "★ Burger soğuktu, kızartmalar iyice ıslanmış. Bu ay üçüncü geç teslimatım.", timestamp: ago(3), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Saat 21:40'ta sipariş verdim, 22:55'te geldi. Her şey soğumuştu. Hafta sonu geceleri çok yavaş.", timestamp: ago(2), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Geç teslimat, soğuk yemek, çantada çatal bıçak da yoktu. Cuma gecesi.", timestamp: ago(4), reviewed: false },

    // Kadıköy — sipariş hataları (medium)
    { workspace_id: workspaceId, branch_id: kId, source: "yemeksepeti", source_type: "yemeksepeti", channel: "demo", sender: "Yemeksepeti", content: "★★ Yanlış sipariş geldi, içecek eksikti. Kontrolsüz gönderiyorlar.", timestamp: ago(3), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Selin D.", content: "★★ Tezgahta başkasının siparişini verdiler. Personel yoğun saatte biletleri kontrol etmiyor.", timestamp: ago(4), reviewed: false },
    { workspace_id: workspaceId, branch_id: kId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Hakan M.", content: "★★ Bu ay üçüncü kez oat milk istedim, normal süt geldi. Sipariş doğruluğunu düzeltin.", timestamp: ago(5), reviewed: false },

    // Beşiktaş — pazar kuyruğu (high)
    { workspace_id: workspaceId, branch_id: bId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Ayşe T.", content: "★★ Her Pazar sabahı aynı sorun. Sıra çok uzun, tek barista çalışıyor.", timestamp: ago(2), reviewed: false },
    { workspace_id: workspaceId, branch_id: bId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Burak S.", content: "★★★ Hafta içi çok iyi ama Pazar sabahı kalabalık için önlem alınmalı.", timestamp: ago(3), reviewed: false },
    { workspace_id: workspaceId, branch_id: bId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Pazar öğle siparişi verdim, 35 dakika hazırlanma süresi geldi. Çok fazla.", timestamp: ago(2), reviewed: false },

    // Beşiktaş — taşıyıcı kalitesi (low)
    { workspace_id: workspaceId, branch_id: bId, source: "googlereviews", source_type: "googlereviews", channel: "demo", sender: "Canan B.", content: "★★★ Kahveler güzel ama eve taşırken taşıyıcı tutmadı, biraz döküldü.", timestamp: ago(5), reviewed: false },
    { workspace_id: workspaceId, branch_id: bId, source: "getir", source_type: "getir", channel: "demo", sender: "Getir Müşterisi", content: "Siparişi aldığımda kapak sızmış, kahvenin yarısı gitmişti.", timestamp: ago(6), reviewed: false },
  ];

  const { error: sigErr } = await supabase.from("signals").insert(signals);
  if (sigErr) return NextResponse.json({ error: sigErr.message }, { status: 500 });

  // ── Pre-computed demo clusters ────────────────────────────────────────────
  const clusters = [
    {
      workspace_id: workspaceId,
      branch_id: kId,
      candidate_key: "demo_kadikoy_weekend_staffing",
      title: "Hafta sonu sabahı kuyruk ve servis hızı problemi",
      root_cause: "Cumartesi-Pazar 08:00-11:00 arası çalışan sayısı yetersiz; ortalama servis süresi haftaiçinin 2 katına çıkıyor.",
      recommended_action: "Hafta sonu sabahı 2 ek barista vardiyası oluştur; peak saatte çift tezgah kullan.",
      business_case: "Haftada 23 bırakılan sipariş x ~35 TL ≈ 800 TL kayıp. Ek vardiya maliyeti bu rakamın çok altında.",
      customer_quote: "Cumartesi sabahı 20 dakika sıra bekledim, sipariş vermeden çıktım.",
      severity: 88,
      severity_label: "critical",
      category: "personel",
      evidence_count: 6,
      source_breakdown: { googlereviews: 3, getir: 2, pos: 1 },
      status: "active",
    },
    {
      workspace_id: workspaceId,
      branch_id: kId,
      candidate_key: "demo_kadikoy_cold_delivery",
      title: "Akşam teslimatlarında soğuk yemek şikayeti",
      root_cause: "Gece 21:00-23:00 arası kurye teslim süresi ortalama 65 dakikaya çıkıyor; mutfak-kurye handoff'u optimize edilmemiş.",
      recommended_action: "Akşam piki için kurye önceliklendirme standardı belirle; ısı koruyucu paket zorunlu kıl.",
      business_case: "Tekrarlayan soğuk yemek şikayetleri platform puanını düşürüyor; yeni sipariş kaybına neden oluyor.",
      customer_quote: "Sipariş 1 saat 10 dakika sonra geldi, her şey soğumuştu.",
      severity: 72,
      severity_label: "high",
      category: "operasyon",
      evidence_count: 4,
      source_breakdown: { yemeksepeti: 2, getir: 2 },
      status: "active",
    },
    {
      workspace_id: workspaceId,
      branch_id: kId,
      candidate_key: "demo_kadikoy_order_accuracy",
      title: "Sipariş hataları ve eksik ürün bildirimleri",
      root_cause: "Yoğun saatlerde sipariş hazırlama adımında çift kontrol yapılmıyor; bilet okunmadan paket kapatılıyor.",
      recommended_action: "Hazırlama adımında sesli onay kontrol listesi uygula; haftalık hata sayısını raporla.",
      business_case: "Yanlış siparişler iade ve yeniden gönderim maliyeti doğuruyor; müşteri sadakatini olumsuz etkiliyor.",
      customer_quote: "Bu ay üçüncü kez oat milk istedim, normal süt geldi.",
      severity: 48,
      severity_label: "medium",
      category: "musteri",
      evidence_count: 3,
      source_breakdown: { yemeksepeti: 1, googlereviews: 2 },
      status: "active",
    },
    {
      workspace_id: workspaceId,
      branch_id: bId,
      candidate_key: "demo_besiktas_sunday_queue",
      title: "Pazar sabahı bekleme süresi şikayetleri",
      root_cause: "Pazar 10:00-12:00 arasında tek baristayla çalışılıyor; Beşiktaş şubesinin kapasitesini aşıyor.",
      recommended_action: "Pazar sabahı 09:30-13:00 arası ek barista takviyesi yap; ön sipariş seçeneği değerlendir.",
      business_case: "Uzun bekleme, potansiyel müşterilerin rakiplere geçmesine neden oluyor; Pazar sabahı geliri artırılabilir.",
      customer_quote: "Her Pazar aynı sorun, sıra çok uzun.",
      severity: 65,
      severity_label: "high",
      category: "personel",
      evidence_count: 3,
      source_breakdown: { googlereviews: 2, getir: 1 },
      status: "active",
    },
    {
      workspace_id: workspaceId,
      branch_id: bId,
      candidate_key: "demo_besiktas_cup_carrier",
      title: "Paket kahve taşıyıcı kalitesi şikayeti",
      root_cause: "Mevcut tek katlı taşıyıcılar hafif sarsılmalarda kahvenin dökülmesine yol açıyor.",
      recommended_action: "Çift katlı taşıyıcı ve kapak takoz malzemesi dene; 2 haftalık pilot uygula.",
      business_case: "Düşük maliyetli bir paket değişikliği müşteri deneyimini önemli ölçüde iyileştirebilir.",
      customer_quote: "Kahvemi eve getirene kadar yarısı dökülmüştü.",
      severity: 22,
      severity_label: "low",
      category: "musteri",
      evidence_count: 2,
      source_breakdown: { googlereviews: 1, getir: 1 },
      status: "active",
    },
  ];

  const { error: clusterErr } = await supabase.from("clusters").insert(clusters);
  if (clusterErr) return NextResponse.json({ error: clusterErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, branches: 2, signals: signals.length, clusters: clusters.length });
}
