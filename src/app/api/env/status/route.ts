import { NextResponse } from "next/server";
import { getEnvStatus } from "@/env";

export async function GET() {
  return NextResponse.json({
    groups: getEnvStatus(),
  });
}

export const dynamic = "force-dynamic";
