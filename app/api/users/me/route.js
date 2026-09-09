import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeUser } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      const res = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      // Never cache 401 — otherwise a stale 401 can mask a fresh login
      // (useUser does fetch no-store, but CDN/proxy must also not cache it)
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const response = NextResponse.json({ success: true, user: sanitizeUser(user) });
    
    // Short private cache for valid user, but not for error paths
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
