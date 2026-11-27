import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { profiles } from '../db/schema.ts';

export const SESSION_COOKIE = 'uy_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

declare global {
  var _uySessionSecret: string | undefined;
}

export interface SessionPayload {
  uid: number;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  exp: number;
}

export interface AuthedRequest extends Request {
  user?: { id: number; email: string; name: string; role: 'customer' | 'admin'; phone: string | null };
}

function getSessionSecret(): string {
  const configured = (process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '').trim();
  if (configured.length >= 16) return configured;
  if (!global._uySessionSecret) {
    global._uySessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return global._uySessionSecret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = (stored || '').split(':');
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

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9]{10}$/.test(phone.replace(/\D/g, '').slice(-10)) && phone.replace(/\D/g, '').length >= 10;
}

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const body: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed?.uid || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function sessionFromRequest(req: Request): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies[SESSION_COOKIE]);
}

/** Attaches the current user when a valid session cookie is present. */
export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const session = sessionFromRequest(req);
  if (!session) return next();
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, session.uid)).limit(1);
    if (row && row.active) {
      req.user = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role === 'admin' ? 'admin' : 'customer',
        phone: row.phone,
      };
    }
  } catch (error) {
    console.error('Failed to load session user:', error);
  }
  return next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  return next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Administrator sign-in required.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access only.' });
  return next();
}
