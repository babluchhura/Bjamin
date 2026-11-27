import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export interface AdminSessionUser {
  uid: string;
  username: string;
  email: string;
  role: 'admin';
  provider: 'supabase' | 'env' | 'database';
  exp: number;
}

export interface AuthRequest extends Request {
  dbUser?: {
    uid: string;
    email: string;
    name: string;
    role: 'admin';
    provider: 'supabase' | 'env' | 'database';
  };
}

declare global {
  var _emeraldSessionSecret: string | undefined;
}

function getSessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  if (!global._emeraldSessionSecret) {
    global._emeraldSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return global._emeraldSessionSecret;
}

export function safeStringEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function signAdminToken(
  user: Omit<AdminSessionUser, 'exp'>,
  ttlSeconds = 60 * 60 * 12
): string {
  const payload: AdminSessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSessionUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, sig] = parts;
  if (!encodedPayload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (!safeStringEqual(sig, expectedSig)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as AdminSessionUser;
    if (!parsed || parsed.role !== 'admin' || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return { url: url.replace(/\/+$/, ''), anonKey };
  } catch {
    return null;
  }
}

export function isSupabaseAuthConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function isEnvAdminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASSWORD_HASH?.trim()
  );
}

export function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAIL?.trim();
  if (!raw) return false;
  const allowed = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

async function resolveSupabaseAdminProfile(
  sb: { url: string; anonKey: string },
  accessToken: string,
  userId: string,
  email: string,
  displayName: string
): Promise<
  | { ok: true; user: Omit<AdminSessionUser, 'exp'> }
  | { ok: false; status: number; error: string }
> {
  let isAdmin = isConfiguredAdminEmail(email);

  if (!isAdmin) {
    const profileRes = await fetch(
      `${sb.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`,
      {
        headers: {
          apikey: sb.anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (profileRes.ok) {
      const profiles = (await profileRes.json().catch(() => [])) as Array<{
        role?: string;
      }>;
      if (Array.isArray(profiles) && profiles.length > 0) {
        isAdmin = profiles[0]?.role === 'admin';
      }
    }
  }

  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      error:
        'Forbidden: Your Supabase account is not an authorized administrator. Set role = "admin" in public.profiles or add your email to ADMIN_EMAIL.',
    };
  }

  return {
    ok: true,
    user: {
      uid: userId,
      username: displayName,
      email,
      role: 'admin',
      provider: 'supabase',
    },
  };
}

export async function verifySupabaseAccessToken(
  accessToken: string
): Promise<
  | { ok: true; user: Omit<AdminSessionUser, 'exp'> }
  | { ok: false; status: number; error: string }
> {
  const sb = getSupabaseConfig();
  if (!sb) {
    return { ok: false, status: 500, error: 'Supabase Auth is not configured.' };
  }

  try {
    const userRes = await fetch(`${sb.url}/auth/v1/user`, {
      headers: {
        apikey: sb.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const sbUser = (await userRes.json().catch(() => ({}))) as {
      id?: string;
      email?: string;
      user_metadata?: { full_name?: string };
    };
    if (!userRes.ok || !sbUser.id || !sbUser.email) {
      return { ok: false, status: 401, error: 'Invalid or expired Supabase session.' };
    }
    const email = sbUser.email.trim().toLowerCase();
    const displayName = sbUser.user_metadata?.full_name?.trim() || email;
    return resolveSupabaseAdminProfile(sb, accessToken, sbUser.id, email, displayName);
  } catch (error) {
    console.error('Supabase access token verification error:', error);
    return {
      ok: false,
      status: 502,
      error: 'Unable to verify Supabase session.',
    };
  }
}

export async function authenticateWithSupabase(
  emailInput: string,
  password: string
): Promise<
  | { ok: true; user: Omit<AdminSessionUser, 'exp'> }
  | { ok: false; status: number; error: string }
> {
  const sb = getSupabaseConfig();
  if (!sb) {
    return { ok: false, status: 500, error: 'Supabase Auth is not configured.' };
  }

  try {
    const tokenRes = await fetch(`${sb.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: sb.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailInput.trim(),
        password,
      }),
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      user?: { id?: string; email?: string; user_metadata?: { full_name?: string } };
      error_description?: string;
      msg?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token || !tokenData.user?.id) {
      return {
        ok: false,
        status: 401,
        error:
          tokenData.error_description || tokenData.msg || 'Invalid Supabase email or password.',
      };
    }

    const userId = tokenData.user.id;
    const email = (tokenData.user.email || emailInput).trim().toLowerCase();
    const displayName =
      tokenData.user.user_metadata?.full_name?.trim() || email;

    return resolveSupabaseAdminProfile(
      sb,
      tokenData.access_token,
      userId,
      email,
      displayName
    );
  } catch (error) {
    console.error('Supabase authentication error:', error);
    return {
      ok: false,
      status: 502,
      error: 'Unable to verify credentials with Supabase Auth.',
    };
  }
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing admin sign-in token.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const session = verifyAdminToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session.' });
  }

  req.dbUser = {
    uid: session.uid,
    email: session.email,
    name: session.username,
    role: session.role,
    provider: session.provider,
  };
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  requireAuth(req, res, () => {
    if (!req.dbUser || req.dbUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Only authorized administrators can perform this action.',
      });
    }
    next();
  });
};
