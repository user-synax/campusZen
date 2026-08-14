import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  if (!key) {
    console.error("[VAPID] No public key found in process.env. Checked: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY");
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
