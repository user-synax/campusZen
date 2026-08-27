import { jwtVerify } from 'jose';

export async function verifyToken(token) {
  if (!token) return null;
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured; refusing to verify tokens.');
  }
  
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ['HS256'],
      }
    );
    return payload;
  } catch (error) {
    // Log auth failure reasons for debugging production logout issues
    console.error('JWT Verification failed:', error.message);
    return null;
  }
}
