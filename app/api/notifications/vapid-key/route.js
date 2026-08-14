import { NextResponse } from "next/server";
import config from "@/lib/config";

export async function GET() {
  const key = config.webpush.publicKey;
  if (!key) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
