import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export interface AdminSessionUser {
  uid: string;
  username: string;
  email: string;
  role: 'admin';
  provider: 'supabase' | 'env' | 'database';
  appUrl?: string;
  emailMatchesAdminEmail?: boolean;
  exp: number;
}

export interface AuthRequest extends Request {
  dbUser?: {
    uid: string;
    email: string;
    name: string;
    role: 'admin';
    provider: 'supabase' | 'env' | 'database';
    appUrl?: string;
    emailMatchesAdminEmail?: boolean;
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

export function getConfiguredAppUrl(): string | null {
  const raw = process.env.APP_URL?.trim();
  if (!raw || raw === 'MY_APP_URL') return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getRequestAppOrigin(req: Request): string | null {
  const explicitHeader = req.headers['x-app-url'];
  const candidates = [
    typeof explicitHeader === 'string' ? explicitHeader : undefined,
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate.trim());
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed origin/referer header
    }
  }
  return null;
}

function normalizeAiStudioPreviewHost(hostname: string): string {
  return hostname.replace(/^ais-(?:dev|pre)-/, 'ais-app-');
}

export function isAllowedAppOrigin(
  requestOrigin: string | null,
  configuredAppUrl: string | null
): boolean {
  if (!configuredAppUrl || !requestOrigin) return true;
  if (requestOrigin === configuredAppUrl) return true;
  try {
    const reqParsed = new URL(requestOrigin);
    if (reqParsed.hostname === 'localhost' || reqParsed.hostname === '127.0.0.1') {
      return true;
    }
    const cfgParsed = new URL(configuredAppUrl);
    if (
      reqParsed.protocol === cfgParsed.protocol &&
      normalizeAiStudioPreviewHost(reqParsed.hostname) ===
        normalizeAiStudioPreviewHost(cfgParsed.hostname)
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function signAdminToken(
  user: Omit<AdminSessionUser, 'exp'>,
  ttlSeconds = 60 * 60 * 12
): string {
  const configuredAppUrl = getConfiguredAppUrl();
  const payload: AdminSessionUser = {
    ...user,
    appUrl: user.appUrl || configuredAppUrl || undefined,
    emailMatchesAdminEmail:
      user.emailMatchesAdminEmail ?? isConfiguredAdminEmail(user.email),
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

    const configuredAppUrl = getConfiguredAppUrl();
    if (configuredAppUrl && parsed.appUrl !== configuredAppUrl) {
      return null;
    }

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
  | { ok: false; status: number; code?: string; error: string }
> {
  const emailMatchesAdmin = isConfiguredAdminEmail(email);
  let profileRole: string | null = null;
  let hasProfileAdminRole = false;

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
      profileRole = profiles[0]?.role ?? null;
      hasProfileAdminRole = profileRole === 'admin';
    }
  }

  const isAdmin = emailMatchesAdmin || hasProfileAdminRole;

  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      code: 'missing_admin_permissions',
      error:
        `Forbidden: Supabase session (${email}) is missing the required admin email (ADMIN_EMAIL) or admin role permissions (public.profiles role: ${profileRole || 'none'}).`,
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
      appUrl: getConfiguredAppUrl() || undefined,
      emailMatchesAdminEmail: emailMatchesAdmin,
    },
  };
}

export async function verifySupabaseAccessToken(
  accessToken: string
): Promise<
  | { ok: true; user: Omit<AdminSessionUser, 'exp'> }
  | { ok: false; status: number; code?: string; error: string }
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
      return {
        ok: false,
        status: 401,
        code: 'invalid_supabase_session',
        error: 'Invalid or expired Supabase session.',
      };
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
  | { ok: false; status: number; code?: string; error: string }
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
      error_code?: string;
      error_description?: string;
      msg?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token || !tokenData.user?.id) {
      const code = tokenData.error_code || 'supabase_auth_failed';
      const rawMessage =
        tokenData.error_description || tokenData.msg || 'Invalid Supabase email or password.';
      const friendlyMessage =
        code === 'email_not_confirmed'
          ? `Supabase email is not confirmed for ${emailInput.trim()}. Please confirm this user in Supabase Dashboard -> Authentication -> Users.`
          : rawMessage;
      return {
        ok: false,
        status: 401,
        code,
        error: friendlyMessage,
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
  const configuredAppUrl = getConfiguredAppUrl();
  const requestOrigin = getRequestAppOrigin(req);
  if (!isAllowedAppOrigin(requestOrigin, configuredAppUrl)) {
    return res.status(403).json({
      error: `Forbidden: Request origin (${requestOrigin}) does not match configured APP_URL (${configuredAppUrl}).`,
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing admin sign-in token.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const session = verifyAdminToken(token);
  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid, expired, or APP_URL-mismatched admin session.',
    });
  }

  req.dbUser = {
    uid: session.uid,
    email: session.email,
    name: session.username,
    role: session.role,
    provider: session.provider,
    appUrl: session.appUrl,
    emailMatchesAdminEmail:
      session.emailMatchesAdminEmail ?? isConfiguredAdminEmail(session.email),
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
