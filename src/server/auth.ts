import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const SESSION_COOKIE_NAME = 'common_session';
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

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

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https') {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('https://')) {
    return true;
  }
  return Boolean(req.secure);
}

function extractSessionToken(req: Request): string | null {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 0) return bearer;
  }
  return null;
}

export async function createSessionForUser(req: Request, res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

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
  const token = extractSessionToken(req);
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  const isHttps = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
}

export async function getAuthenticatedUser(req: Request) {
  const token = extractSessionToken(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          interests: {
            include: { interest: true },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
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
