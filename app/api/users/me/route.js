import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeUser } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Use a lightweight cookie jar so getCurrentUser can attach a rolling
    // refresh Set-Cookie when <50% TTL remains. useUser hits this endpoint on
    // every mount, so active users extend their 7d sliding window.
    const cookieJar = NextResponse.next();
    const user = await getCurrentUser(request, cookieJar);

    if (!user) {
      const res = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      // Never cache 401 — otherwise a stale 401 can mask a fresh login
      // (useUser does fetch no-store, but CDN/proxy must also not cache it)
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const finalRes = NextResponse.json({ success: true, user: sanitizeUser(user) });
    // Forward rolling refresh cookie if getCurrentUser set one
    const refreshed = cookieJar.cookies.get("campusx_token");
    if (refreshed?.value) {
      // Re-apply with canonical options (httpOnly, secure, sameSite, maxAge)
      const { setAuthCookie } = await import("@/lib/auth");
      await setAuthCookie(finalRes, refreshed.value);
    }
    
    // Short private cache for valid user, but not for error paths
    finalRes.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return finalRes;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
