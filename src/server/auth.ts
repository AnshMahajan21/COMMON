import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

function getModuleDir(): string {
  try {
    if (typeof __dirname === 'string') return __dirname;
  } catch {
    // Ignore in strict ESM
  }
  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Ignore in CJS
  }
  return process.cwd();
}

const MODULE_DIR = getModuleDir();

function createPrismaClient(): PrismaClient {
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
  );
  const rawUrl = process.env.DATABASE_URL?.trim();

  if (
    isServerless &&
    (!rawUrl || rawUrl.startsWith('file:./') || rawUrl.startsWith('file:../'))
  ) {
    const tmpDbPath = '/tmp/common-dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      const bundledCandidates = [
        path.resolve(process.cwd(), 'prisma/dev.db'),
        path.resolve(process.cwd(), 'dev.db'),
        path.resolve(MODULE_DIR, '../../prisma/dev.db'),
      ];
      const source = bundledCandidates.find((candidate) => fs.existsSync(candidate));
      if (source) {
        fs.copyFileSync(source, tmpDbPath);
      }
    }
    const tmpUrl = `file:${tmpDbPath}`;
    process.env.DATABASE_URL = tmpUrl;
    return new PrismaClient({ datasources: { db: { url: tmpUrl } } });
  }

  if (!rawUrl) {
    const localDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
    const fallbackUrl = `file:${localDbPath}`;
    process.env.DATABASE_URL = fallbackUrl;
    return new PrismaClient({ datasources: { db: { url: fallbackUrl } } });
  }

  return new PrismaClient();
}

export const prisma = createPrismaClient();

export const SESSION_COOKIE_NAME = 'common_session';
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const TOKEN_VERSION = 'v1';
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || 'common-app-session-hmac-secret-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function signSessionToken(userId: string, email: string): string {
  const payload = {
    uid: userId,
    email,
    exp: Date.now() + SESSION_DURATION_MS,
    jti: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signingInput = `${TOKEN_VERSION}.${payloadB64}`;
  const sigHex = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(signingInput)
    .digest('hex');
  return `${signingInput}.${sigHex}`;
}

function verifySignedSessionToken(
  token: string
): { uid: string; email: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [version, payloadB64, sigHex] = parts;
  if (version !== TOKEN_VERSION || !payloadB64 || !sigHex) return null;

  const expectedHex = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${version}.${payloadB64}`)
    .digest('hex');

  const sigBuf = Buffer.from(sigHex, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (sigBuf.length === 0 || sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (
      typeof parsed?.uid !== 'string' ||
      typeof parsed?.email !== 'string' ||
      typeof parsed?.exp !== 'number' ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    return { uid: parsed.uid, email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

function isHttpsRequest(req: Request): boolean {
  if (process.env.VERCEL) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https') {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('https://')) {
    return true;
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.startsWith('https://')) {
    return true;
  }
  return Boolean(req.secure);
}

function extractSessionTokens(req: Request): string[] {
  const tokens: string[] = [];
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 0) tokens.push(bearer);
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0 && !tokens.includes(cookieToken)) {
    tokens.push(cookieToken);
  }
  return tokens;
}

export async function createSessionForUser(
  req: Request,
  res: Response,
  userId: string,
  userEmail?: string
) {
  let email = userEmail || '';
  if (!email) {
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    email = userRow?.email || '';
  }

  const token = signSessionToken(userId, email);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session
    .create({
      data: {
        token,
        userId,
        expiresAt,
      },
    })
    .catch(() => {});

  const isHttps = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });

  return token;
}

export async function clearSession(req: Request, res: Response) {
  const tokens = extractSessionTokens(req);
  if (tokens.length > 0) {
    await prisma.session.deleteMany({ where: { token: { in: tokens } } }).catch(() => {});
  }
  const isHttps = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
}

const USER_WITH_INTERESTS = {
  interests: {
    include: { interest: true },
  },
} as const;

export async function getAuthenticatedUser(req: Request) {
  const tokens = extractSessionTokens(req);
  if (tokens.length === 0) return null;

  for (const token of tokens) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: USER_WITH_INTERESTS,
        },
      },
    });

    if (session) {
      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        continue;
      }
      return session.user;
    }

    // Stateless HMAC fallback for serverless / multi-instance deployments
    const verified = verifySignedSessionToken(token);
    if (verified) {
      const userById = await prisma.user.findUnique({
        where: { id: verified.uid },
        include: USER_WITH_INTERESTS,
      });
      if (userById) return userById;

      if (verified.email) {
        const userByEmail = await prisma.user.findUnique({
          where: { email: verified.email },
          include: USER_WITH_INTERESTS,
        });
        if (userByEmail) return userByEmail;
      }
    }
  }

  return null;
}

export type AuthenticatedRequest = Request & {
  authUser?: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
};

export async function attachAuthUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (user) {
      req.authUser = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

export function serializeUserPrivate(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl,
    avatarTone: user.avatarTone,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    interests: user.interests.map((ui) => ui.interest),
  };
}
