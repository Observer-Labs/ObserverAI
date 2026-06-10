export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/seed-demo
 * Inserts 80 realistic demo signals into the authenticated workspace.
 * Safe to call multiple times, checks for existing demo signals first.
 * Signals are designed to cluster into 4 clear intent gaps via Claude analysis.
 */
export async function POST() {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotency: don't double-seed
  const { count } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("channel", "demo");

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: "Demo data already loaded", count });
  }

  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

  // ── Demo signals for a small café / restaurant business ───────────────────
  const signals = [

    // ── GAP 1: Slow service & long queues at Kadıköy (weekends) ──────────────
    { source: "googlereviews", channel: "demo", sender: "Elif Y.",        content: "★★ Coffee is great but the wait on Saturday morning was 20 minutes just to order. Two people behind the counter for a packed shop. Left without ordering.", timestamp: ago(1) },
    { source: "googlereviews", channel: "demo", sender: "Mert K.",        content: "★★ Kadıköy branch is always slammed on weekends and hugely understaffed. Waited 15 min for a flat white. Will go elsewhere next time.", timestamp: ago(2) },
    { source: "googlereviews", channel: "demo", sender: "Deniz A.",       content: "★★★ Love the place midweek but Sunday is chaos. One barista, queue out the door, nobody clearing tables. Needs more staff.", timestamp: ago(2) },
    { source: "googlereviews", channel: "demo", sender: "Canan T.",       content: "★ Waited 18 minutes, my order was forgotten, had to ask twice. Weekend mornings are a mess at the Kadıköy store.", timestamp: ago(3) },
    { source: "googlereviews", channel: "demo", sender: "Ozan B.",        content: "★★ Great coffee, terrible weekend service. Long line, slow, stressed staff. Fix the morning rush staffing please.", timestamp: ago(4) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Order took 45 minutes, way longer than the estimate. Coffee arrived lukewarm. Saturday around 10am.", timestamp: ago(1) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Prep time was super slow, app said 15 min, took 40. Weekend rush clearly overwhelms the Kadıköy branch.", timestamp: ago(2) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Waited ages, by the time it arrived my latte was cold. Sunday morning order.", timestamp: ago(3) },
    { source: "pos",           channel: "demo", sender: "POS · Kadıköy",  content: "Sat 08:00-11:00: 142 transactions, average ticket time 9m12s (vs 4m30s on weekdays). 23 abandoned orders at counter. Throughput bottleneck during morning peak.", timestamp: ago(1) },
    { source: "pos",           channel: "demo", sender: "POS · Kadıköy",  content: "Weekend morning sales per labor hour down 18% vs last month, queue wait flagged by 3 staff. Understaffing on Sat/Sun 8-11am.", timestamp: ago(2) },

    // ── GAP 2: Cold food & late delivery (restaurant, Yemeksepeti/Getir) ─────
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★★ Yemek soğuk geldi, paketleme de kötüydü. 1 saati geçti teslimat. Akşam 21:30 siparişi.", timestamp: ago(1) },
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★ Burger cold and soggy, fries inedible. Took 70 minutes. This is the third late delivery this month.", timestamp: ago(2) },
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★★ Food quality fine in-store but delivery is always cold. The late evening orders after 9pm are the worst.", timestamp: ago(2) },
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★ Çok geç geldi, yemekler soğumuştu. Kurye 1 saat 10 dk sonra geldi. Hafta sonu akşamı.", timestamp: ago(3) },
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★★ Late again. 65 min on a Friday night. Soup was room temperature. Please sort out the evening courier handoff.", timestamp: ago(4) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Ordered at 21:40, arrived 22:55. Everything cold. Weekend nights are unreliable.", timestamp: ago(2) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Late delivery, cold food, no cutlery in the bag. Friday 10pm.", timestamp: ago(3) },
    { source: "googlereviews", channel: "demo", sender: "Burak S.",       content: "★★ Dine-in is lovely, but delivery is hit or miss. Ordered twice on weekend evenings, both cold and late.", timestamp: ago(5) },
    { source: "pos",           channel: "demo", sender: "POS · Delivery", content: "Fri/Sat 21:00-23:00: avg delivery dispatch delay 28 min, 19 orders flagged late. Courier handoff queue building during evening peak.", timestamp: ago(2) },

    // ── GAP 3: Order accuracy / wrong items ──────────────────────────────────
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★★ Wrong order again. I ordered chicken, got beef. No napkins, missing the drink I paid for.", timestamp: ago(2) },
    { source: "yemeksepeti",   channel: "demo", sender: "Yemeksepeti",    content: "★ Yanlış sipariş geldi, eksik ürün var. İçecek gelmedi. Kontrol edilmiyor galiba.", timestamp: ago(3) },
    { source: "googlereviews", channel: "demo", sender: "Selin D.",       content: "★★ Got someone else's order at the counter. Staff are clearly rushed and not double-checking tickets on busy days.", timestamp: ago(4) },
    { source: "getir",         channel: "demo", sender: "Getir Customer", content: "Missing item from my order, and the bag had the wrong name on it. Mix-ups happening a lot lately.", timestamp: ago(5) },
    { source: "googlereviews", channel: "demo", sender: "Hakan M.",       content: "★★ Third time this month they got my modifier wrong (asked oat milk, got regular). Order accuracy needs attention.", timestamp: ago(6) },

    // ── GAP 4: Positive base (so it's not all negative) ─────────────────────
    { source: "googlereviews", channel: "demo", sender: "Aslı R.",        content: "★★★★★ Best filter coffee in Kadıköy, lovely staff midweek. Just avoid the weekend morning rush.", timestamp: ago(2) },
    { source: "googlereviews", channel: "demo", sender: "Tolga E.",       content: "★★★★ Consistently good food and friendly team. Delivery timing is the only weak spot.", timestamp: ago(4) },
  ];

  const rows = signals.map((s) => ({
    workspace_id: workspaceId,
    source: s.source,
    channel: s.channel,
    sender: s.sender,
    content: s.content,
    timestamp: s.timestamp,
    reviewed: false,
  }));

  const { error } = await supabase.from("signals").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length,
    message: `${rows.length} demo signals loaded. Click "Run Analysis" to generate intent gaps.`,
  });
}
