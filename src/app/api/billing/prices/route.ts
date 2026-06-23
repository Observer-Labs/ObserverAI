import { NextResponse } from "next/server";
import { fetchPolarPrices } from "@/lib/polar-prices";

export async function GET() {
  const prices = await fetchPolarPrices();
  return NextResponse.json(prices, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
