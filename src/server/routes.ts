import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import {
  prisma,
  hashPassword,
  verifyPassword,
  createSessionForUser,
  clearSession,
  requireAuth,
  serializeUserPrivate,
  type AuthenticatedRequest,
} from './auth';

export const apiRouter = Router();

const NEIGHBORHOOD_PRESETS = [
  { name: 'Lodhi Colony', latitude: 28.5931, longitude: 77.2197 },
  { name: 'Chanakyapuri', latitude: 28.5924, longitude: 77.1947 },
  { name: 'Hauz Khas', latitude: 28.5535, longitude: 77.1942 },
  { name: 'Saket', latitude: 28.5194, longitude: 77.2022 },
  { name: 'Mehrauli', latitude: 28.5227, longitude: 77.1855 },
  { name: 'Central Delhi', latitude: 28.6129, longitude: 77.2295 },
  { name: 'Connaught Place', latitude: 28.6315, longitude: 77.2167 },
  { name: 'Shahpur Jat', latitude: 28.5493, longitude: 77.2135 },
  { name: 'Nizamuddin', latitude: 28.5944, longitude: 77.2452 },
  { name: 'Khan Market', latitude: 28.6001, longitude: 77.2270 },
  { name: 'Gurugram', latitude: 28.4950, longitude: 77.0895 },
  { name: 'Noida', latitude: 28.5708, longitude: 77.3261 },
  { name: 'North Delhi', latitude: 28.7006, longitude: 77.2280 },
  { name: 'South Delhi', latitude: 28.5327, longitude: 77.2422 },
];

const ACTIVITY_DETAIL_INCLUDE = {
  organiser: true,
  category: true,
  community: true,
  participations: {
    include: {
      user: {
        include: {
          interests: { select: { interestId: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  agendaItems: {
    orderBy: { sortOrder: 'asc' as const },
  },
  ticketTiers: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      tickets: {
        where: { status: { in: ['VALID', 'USED'] } },
        select: { id: true },
      },
    },
  },
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function serializePublicUser(u: {
  id: string;
  fullName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  avatarTone: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    fullName: u.fullName,
    bio: u.bio,
    location: u.location,
    avatarUrl: u.avatarUrl,
    avatarTone: u.avatarTone,
    createdAt: u.createdAt.toISOString(),
  };
}

function serializeActivity(
  act: any,
  currentUserId?: string,
  viewerInterestIds?: Set<string>,
  distanceKm: number | null = null
) {
  const now = new Date();
  const participations = act.participations || [];
  const participantCount = participations.length;
  const isJoined = currentUserId
    ? participations.some((p: any) => p.userId === currentUserId)
    : false;
  const isOrganiser = currentUserId ? act.organiserId === currentUserId : false;

  const rawTiers = act.ticketTiers || [];
  const ticketTiers = rawTiers.map((tier: any) => {
    const soldCount = Array.isArray(tier.tickets) ? tier.tickets.length : 0;
    const remaining = Math.max(tier.quantity - soldCount, 0);
    return {
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      priceInr: tier.priceInr,
      quantity: tier.quantity,
      soldCount,
      remaining,
      salesEndAt: tier.salesEndAt ? tier.salesEndAt.toISOString() : null,
      sortOrder: tier.sortOrder,
    };
  });

  const totalTicketsCapacity =
    ticketTiers.length > 0
      ? ticketTiers.reduce((acc: number, t: any) => acc + t.quantity, 0)
      : null;
  const totalTicketsRemaining =
    ticketTiers.length > 0
      ? ticketTiers.reduce((acc: number, t: any) => acc + t.remaining, 0)
      : null;
  const hasTicketSales = ticketTiers.some((t: any) => t.soldCount > 0);
  const minPriceInr =
    ticketTiers.length > 0 ? Math.min(...ticketTiers.map((t: any) => t.priceInr)) : 0;
  const isFree = minPriceInr === 0;

  const isFullByTiers =
    act.kind === 'EVENT' && ticketTiers.length > 0 && totalTicketsRemaining === 0;
  const isFullByCapacity =
    act.capacity !== null && act.capacity !== undefined
      ? participantCount >= act.capacity
      : false;
  const isFull = isFullByTiers || isFullByCapacity;
  const isPast = new Date(act.date) < now;

  let sharedInterestParticipantsCount = 0;
  if (viewerInterestIds && viewerInterestIds.size > 0) {
    sharedInterestParticipantsCount = participations.filter((p: any) => {
      if (p.userId === currentUserId) return false;
      const pInterestIds = (p.user?.interests || []).map((i: any) => i.interestId);
      return pInterestIds.some((id: string) => viewerInterestIds.has(id));
    }).length;
  }

  return {
    id: act.id,
    kind: act.kind || 'ACTIVITY',
    title: act.title,
    tagline: act.tagline || '',
    description: act.description,
    activityType: act.activityType,
    date: act.date.toISOString(),
    startTime: act.startTime,
    endDate: act.endDate ? act.endDate.toISOString() : null,
    endTime: act.endTime || null,
    durationMins: act.durationMins,
    location: act.location,
    venueName: act.venueName || '',
    fullAddress: act.fullAddress || '',
    neighborhood: act.neighborhood,
    latitude: act.latitude,
    longitude: act.longitude,
    capacity: act.capacity,
    imageUrl: act.imageUrl,
    tintColor: act.tintColor,
    hostName: act.hostName || '',
    refundPolicy: act.refundPolicy || '',
    status: act.status,
    createdAt: act.createdAt.toISOString(),
    organiser: serializePublicUser(act.organiser),
    category: act.category,
    community: act.community
      ? {
          id: act.community.id,
          name: act.community.name,
          slug: act.community.slug,
        }
      : null,
    participantCount,
    participants: participations.map((p: any) => serializePublicUser(p.user)),
    isJoined,
    isOrganiser,
    isFull,
    isPast,
    agendaItems: (act.agendaItems || []).map((a: any) => ({
      id: a.id,
      time: a.time,
      title: a.title,
      description: a.description || '',
      sortOrder: a.sortOrder,
    })),
    ticketTiers,
    minPriceInr,
    isFree,
    totalTicketsRemaining,
    totalTicketsCapacity,
    hasTicketSales,
    sharedInterestParticipantsCount,
    distanceKm,
  };
}

async function getViewerInterestIds(userId?: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.userInterest.findMany({
    where: { userId },
    select: { interestId: true },
  });
  return new Set(rows.map((r) => r.interestId));
}

function generateTicketCode(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CMN-${part1}-${part2}`;
}

function generateOrderNumber(): string {
  const suffix = crypto.randomInt(1000, 9999);
  const stamp = new Date().toISOString().slice(2, 7).replace('-', '');
  return `ORD-${stamp}-${suffix}`;
}

// ==========================================
// AUTH ROUTES
// ==========================================

apiRouter.get('/auth/me', (req: AuthenticatedRequest, res) => {
  if (!req.authUser) {
    return res.json({ user: null });
  }
  return res.json({ user: serializeUserPrivate(req.authUser) });
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
    email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    location: z.string().trim().max(80).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

apiRouter.post('/auth/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid registration details',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const { fullName, email, password, location } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const tones = ['sage', 'peach', 'earth', 'light-sage', 'cream'];
  const avatarTone = tones[Math.floor(Math.random() * tones.length)];

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash: hashPassword(password),
      location: location && location.length > 0 ? location : 'New Delhi',
      avatarTone,
    },
    include: {
      interests: { include: { interest: true } },
    },
  });

  const sessionToken = await createSessionForUser(req, res, user.id, user.email);
  return res.status(201).json({ user: serializeUserPrivate(user), sessionToken });
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Please enter your password'),
});

apiRouter.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid email or password',
    });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { interests: { include: { interest: true } } },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const sessionToken = await createSessionForUser(req, res, user.id, user.email);
  return res.json({ user: serializeUserPrivate(user), sessionToken });
});

const DEMO_EMAILS = ['aarav@common.in', 'meera@common.in', 'kabir@common.in'];

apiRouter.post('/auth/demo', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!DEMO_EMAILS.includes(email)) {
    return res.status(400).json({ error: 'Invalid demo account selection.' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { interests: { include: { interest: true } } },
  });

  if (!user) {
    return res.status(404).json({ error: 'Demo account not found in database.' });
  }

  const sessionToken = await createSessionForUser(req, res, user.id, user.email);
  return res.json({ user: serializeUserPrivate(user), sessionToken });
});

apiRouter.post('/auth/logout', async (req, res) => {
  await clearSession(req, res);
  return res.json({ ok: true });
});

// ==========================================
// METADATA (CATEGORIES, INTERESTS, LOCATIONS)
// ==========================================

apiRouter.get('/categories', async (_req, res) => {
  const now = new Date();
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      activities: {
        where: {
          status: 'ACTIVE',
          date: { gte: now },
        },
        select: { id: true },
      },
    },
  });

  return res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      tintColor: c.tintColor,
      activityCount: c.activities.length,
    })),
  });
});

apiRouter.get('/interests', async (_req, res) => {
  const interests = await prisma.interest.findMany({ orderBy: { name: 'asc' } });
  return res.json({ interests });
});

apiRouter.get('/locations', async (_req, res) => {
  const activities = await prisma.activity.findMany({
    select: { neighborhood: true },
    distinct: ['neighborhood'],
  });
  const dbNeighborhoods = activities.map((a) => a.neighborhood).filter(Boolean);
  const presetNames = NEIGHBORHOOD_PRESETS.map((p) => p.name);
  const uniqueNeighborhoods = Array.from(new Set([...presetNames, ...dbNeighborhoods])).sort();
  return res.json({
    neighborhoods: uniqueNeighborhoods,
    presets: NEIGHBORHOOD_PRESETS,
  });
});

// ==========================================
// ACTIVITIES DISCOVERY, DETAIL & MANAGEMENT
// ==========================================

apiRouter.get('/activities', async (req: AuthenticatedRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const kind = typeof req.query.kind === 'string' ? req.query.kind.trim().toUpperCase() : 'ALL';
  const priceFilter = typeof req.query.price === 'string' ? req.query.price.trim().toUpperCase() : 'ALL';
  const activityType = typeof req.query.activityType === 'string' ? req.query.activityType.trim().toUpperCase() : 'ALL';
  const locationFilter = typeof req.query.location === 'string' ? req.query.location.trim().toLowerCase() : '';
  const dateFilter = typeof req.query.date === 'string' ? req.query.date.trim() : 'upcoming';
  const availableOnly = req.query.availableOnly === 'true';
  const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'upcoming';
  const limit = req.query.limit ? Math.min(Number(req.query.limit) || 50, 100) : 100;

  const userLat = req.query.lat ? Number(req.query.lat) : null;
  const userLng = req.query.lng ? Number(req.query.lng) : null;
  const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : null;
  const boundsRaw = typeof req.query.bounds === 'string' ? req.query.bounds.trim() : '';

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const endOfMonth = new Date(startOfToday);
  endOfMonth.setDate(endOfMonth.getDate() + 30);

  const where: any = {};

  if (categorySlug && categorySlug !== 'all') {
    where.category = { slug: categorySlug };
  }

  if (kind === 'ACTIVITY' || kind === 'EVENT') {
    where.kind = kind;
  }

  if (activityType === 'IN_PERSON' || activityType === 'ONLINE') {
    where.activityType = activityType;
  }

  if (dateFilter === 'today') {
    where.date = { gte: startOfToday, lte: endOfToday };
  } else if (dateFilter === 'this-week') {
    where.date = { gte: now, lte: endOfWeek };
  } else if (dateFilter === 'this-month') {
    where.date = { gte: now, lte: endOfMonth };
  } else if (dateFilter === 'upcoming') {
    where.date = { gte: now };
  } else if (dateFilter === 'past') {
    where.date = { lt: now };
  }

  const [rawActivities, viewerInterestIds] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: sort === 'recent' ? { createdAt: 'desc' } : { date: 'asc' },
    }),
    getViewerInterestIds(req.authUser?.id),
  ]);

  let filtered = rawActivities.map((act) => {
    let dist: number | null = null;
    if (
      userLat !== null &&
      userLng !== null &&
      !Number.isNaN(userLat) &&
      !Number.isNaN(userLng) &&
      act.latitude !== null &&
      act.longitude !== null
    ) {
      dist = Math.round(haversineKm(userLat, userLng, act.latitude, act.longitude) * 10) / 10;
    }
    return serializeActivity(act, req.authUser?.id, viewerInterestIds, dist);
  });

  if (q) {
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tagline.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.venueName.toLowerCase().includes(q) ||
        a.neighborhood.toLowerCase().includes(q) ||
        a.category.name.toLowerCase().includes(q) ||
        a.organiser.fullName.toLowerCase().includes(q)
    );
  }

  if (locationFilter && locationFilter !== 'all') {
    filtered = filtered.filter(
      (a) =>
        a.neighborhood.toLowerCase().includes(locationFilter) ||
        a.location.toLowerCase().includes(locationFilter) ||
        a.venueName.toLowerCase().includes(locationFilter)
    );
  }

  if (priceFilter === 'FREE') {
    filtered = filtered.filter((a) => a.isFree);
  } else if (priceFilter === 'PAID') {
    filtered = filtered.filter((a) => !a.isFree && a.minPriceInr > 0);
  }

  if (availableOnly) {
    filtered = filtered.filter((a) => a.status === 'ACTIVE' && !a.isFull && !a.isPast);
  }

  if (boundsRaw) {
    const parts = boundsRaw.split(',').map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [south, west, north, east] = parts;
      filtered = filtered.filter(
        (a) =>
          a.latitude !== null &&
          a.longitude !== null &&
          a.latitude >= south &&
          a.latitude <= north &&
          a.longitude >= west &&
          a.longitude <= east
      );
    }
  }

  if (radiusKm !== null && !Number.isNaN(radiusKm) && radiusKm > 0 && userLat !== null && userLng !== null) {
    filtered = filtered.filter((a) => a.distanceKm !== null && a.distanceKm !== undefined && a.distanceKm <= radiusKm);
  }

  if (sort === 'distance' && userLat !== null && userLng !== null) {
    filtered.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  } else if (sort === 'popular') {
    filtered.sort((a, b) => b.participantCount - a.participantCount);
  } else if (sort === 'upcoming') {
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return res.json({
    activities: filtered.slice(0, limit),
    total: filtered.length,
  });
});

apiRouter.get('/activities/:id', async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const [act, viewerInterestIds] = await Promise.all([
    prisma.activity.findUnique({
      where: { id },
      include: {
        ...ACTIVITY_DETAIL_INCLUDE,
        conversations: {
          where: { type: 'ACTIVITY' },
          select: { id: true },
        },
      },
    }),
    getViewerInterestIds(req.authUser?.id),
  ]);

  if (!act) {
    return res.status(404).json({ error: 'Activity not found or may have been removed.' });
  }

  const serialized = serializeActivity(act, req.authUser?.id, viewerInterestIds);
  const canAccessThread = serialized.isJoined || serialized.isOrganiser;

  return res.json({
    activity: {
      ...serialized,
      conversationId: canAccessThread ? act.conversations[0]?.id ?? null : null,
    },
  });
});

const agendaItemInputSchema = z.object({
  time: z.string().trim().min(1, 'Agenda item time is required').max(20),
  title: z.string().trim().min(2, 'Agenda title must be at least 2 characters').max(120),
  description: z.string().trim().max(300).optional().default(''),
});

const ticketTierInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Tier name must be at least 2 characters').max(60),
  description: z.string().trim().max(240).optional().default(''),
  priceInr: z.number().int().min(0, 'Price cannot be negative').max(50000),
  quantity: z.number().int().min(1, 'Tier quantity must be at least 1').max(2000),
  salesEndAt: z.string().nullable().optional(),
});

const activityMutationSchema = z.object({
  kind: z.enum(['ACTIVITY', 'EVENT']).default('ACTIVITY'),
  title: z.string().trim().min(4, 'Title must be at least 4 characters').max(120),
  tagline: z.string().trim().max(180).optional().default(''),
  description: z.string().trim().min(15, 'Description must be at least 15 characters').max(2500),
  categoryId: z.string().min(1, 'Please select a category'),
  activityType: z.enum(['IN_PERSON', 'ONLINE']).default('IN_PERSON'),
  date: z.string().min(1, 'Please choose a date'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please choose a valid start time (HH:MM)'),
  endDate: z.string().nullable().optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Please choose a valid end time (HH:MM)')
    .nullable()
    .optional()
    .or(z.literal('')),
  durationMins: z
    .union([z.number().int().min(15).max(1440), z.null(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  location: z.string().trim().min(3, 'Please provide a meeting location or room note').max(200),
  venueName: z.string().trim().max(140).optional().default(''),
  fullAddress: z.string().trim().max(300).optional().default(''),
  neighborhood: z.string().trim().min(2, 'Please provide a neighbourhood or Online label').max(100),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  capacity: z
    .union([z.number().int().min(2, 'Capacity must be at least 2').max(2000), z.null(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  imageUrl: z.string().trim().max(500).optional(),
  tintColor: z.enum(['light-sage', 'sage', 'peach', 'cream', 'earth']).optional(),
  communityId: z.string().nullable().optional(),
  hostName: z.string().trim().max(120).optional().default(''),
  refundPolicy: z.string().trim().max(500).optional().default(''),
  agendaItems: z.array(agendaItemInputSchema).max(20).optional().default([]),
  ticketTiers: z.array(ticketTierInputSchema).max(10).optional().default([]),
});

function buildActivityDateTime(dateStr: string, startTime: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const [hh, mm] = startTime.split(':').map(Number);
  const combined = new Date(Number(y), Number(m) - 1, Number(d), hh, mm, 0, 0);
  if (Number.isNaN(combined.getTime())) return null;
  return combined;
}

const DEFAULT_ACTIVITY_IMAGE = '/src/assets/images/hero_delhi_morning_walk_1794851444677.jpg';

apiRouter.post('/activities', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = activityMutationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Please check your listing details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return res.status(400).json({ error: 'Selected category does not exist.' });
  }

  if (data.communityId) {
    const community = await prisma.community.findUnique({ where: { id: data.communityId } });
    if (!community) {
      return res.status(400).json({ error: 'Selected community does not exist.' });
    }
  }

  const combinedDate = buildActivityDateTime(data.date, data.startTime);
  if (!combinedDate) {
    return res.status(400).json({ error: 'Invalid date or start time.' });
  }
  if (combinedDate <= new Date()) {
    return res.status(400).json({ error: 'Date and start time must be in the future.' });
  }

  let combinedEndDate: Date | null = null;
  if (data.endDate && data.endTime) {
    combinedEndDate = buildActivityDateTime(data.endDate, data.endTime);
  } else if (data.endTime) {
    combinedEndDate = buildActivityDateTime(data.date, data.endTime);
  }

  if (data.kind === 'EVENT' && data.ticketTiers.length === 0) {
    return res.status(400).json({
      error: 'Events require at least one ticket tier (use price ₹0 for a free event).',
    });
  }

  const preset = NEIGHBORHOOD_PRESETS.find(
    (p) => p.name.toLowerCase() === data.neighborhood.toLowerCase()
  );

  const latitude =
    data.activityType === 'ONLINE'
      ? null
      : data.latitude ?? preset?.latitude ?? 28.6139;
  const longitude =
    data.activityType === 'ONLINE'
      ? null
      : data.longitude ?? preset?.longitude ?? 77.209;

  const userId = req.authUser!.id;
  const derivedCapacity =
    data.kind === 'EVENT' && data.ticketTiers.length > 0
      ? data.ticketTiers.reduce((acc, t) => acc + t.quantity, 0)
      : data.capacity ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        kind: data.kind,
        title: data.title,
        tagline: data.tagline,
        description: data.description,
        activityType: data.activityType,
        date: combinedDate,
        startTime: data.startTime,
        endDate: combinedEndDate,
        endTime: data.endTime || null,
        durationMins: data.durationMins ?? 90,
        location: data.venueName ? `${data.venueName}, ${data.neighborhood}` : data.location,
        venueName: data.venueName || data.location,
        fullAddress: data.fullAddress || data.location,
        neighborhood: data.activityType === 'ONLINE' ? 'Online · Delhi-NCR' : data.neighborhood,
        latitude,
        longitude,
        capacity: derivedCapacity,
        imageUrl: data.imageUrl && data.imageUrl.length > 0 ? data.imageUrl : DEFAULT_ACTIVITY_IMAGE,
        tintColor: data.tintColor || category.tintColor || 'light-sage',
        hostName: data.hostName || req.authUser!.fullName,
        refundPolicy:
          data.refundPolicy ||
          (data.kind === 'EVENT'
            ? 'Refundable up to 24 hours before the event starts. Full automatic refund if cancelled by organiser.'
            : ''),
        status: 'ACTIVE',
        organiserId: userId,
        categoryId: category.id,
        communityId: data.communityId || null,
        participations: {
          create: { userId },
        },
        agendaItems:
          data.kind === 'EVENT' && data.agendaItems.length > 0
            ? {
                create: data.agendaItems.map((item, idx) => ({
                  time: item.time,
                  title: item.title,
                  description: item.description || '',
                  sortOrder: idx,
                })),
              }
            : undefined,
        ticketTiers:
          data.kind === 'EVENT' && data.ticketTiers.length > 0
            ? {
                create: data.ticketTiers.map((tier, idx) => ({
                  name: tier.name,
                  description: tier.description || '',
                  priceInr: tier.priceInr,
                  quantity: tier.quantity,
                  salesEndAt: tier.salesEndAt ? new Date(tier.salesEndAt) : null,
                  sortOrder: idx,
                })),
              }
            : undefined,
      },
      include: ACTIVITY_DETAIL_INCLUDE,
    });

    await tx.conversation.create({
      data: {
        type: 'ACTIVITY',
        title: activity.title,
        activityId: activity.id,
        members: { create: { userId } },
      },
    });

    return activity;
  });

  const viewerInterestIds = await getViewerInterestIds(userId);
  return res.status(201).json({ activity: serializeActivity(created, userId, viewerInterestIds) });
});

apiRouter.patch('/activities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const existing = await prisma.activity.findUnique({
    where: { id },
    include: {
      participations: true,
      ticketTiers: {
        include: {
          tickets: {
            where: { status: { in: ['VALID', 'USED'] } },
            select: { id: true },
          },
        },
      },
      tickets: {
        where: { status: { in: ['VALID', 'USED'] } },
        select: { id: true },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Activity not found.' });
  }
  if (existing.organiserId !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the organiser can edit this listing.' });
  }

  const parsed = activityMutationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid listing fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return res.status(400).json({ error: 'Selected category does not exist.' });
  }

  if (existing.tickets.length > 0 && data.kind !== existing.kind) {
    return res.status(400).json({
      error: 'Cannot change an Event to an Activity after tickets have been issued.',
    });
  }

  // Tier lock enforcement: once tickets are sold, organisers cannot edit prices or delete/shrink sold tiers; only quantity increases allowed
  const hasSales = existing.tickets.length > 0;
  if (existing.kind === 'EVENT' && hasSales) {
    const incomingById = new Map<string, typeof data.ticketTiers[number]>();
    for (const t of data.ticketTiers) {
      if (t.id) incomingById.set(t.id, t);
    }

    for (const oldTier of existing.ticketTiers) {
      const match = incomingById.get(oldTier.id);
      if (!match) {
        return res.status(400).json({
          error: `Tier "${oldTier.name}" cannot be removed after ticket sales have started.`,
        });
      }
      if (match.priceInr !== oldTier.priceInr) {
        return res.status(400).json({
          error: `Ticket price for "${oldTier.name}" is locked once tickets are sold. You can still increase available quantity.`,
        });
      }
      if (match.quantity < oldTier.quantity) {
        return res.status(400).json({
          error: `Quantity for "${oldTier.name}" cannot be reduced below ${oldTier.quantity} once ticket sales have started.`,
        });
      }
    }
  }

  if (data.capacity !== null && data.capacity !== undefined && data.capacity < existing.participations.length) {
    return res.status(400).json({
      error: `Capacity cannot be lower than the ${existing.participations.length} current participants.`,
    });
  }

  const combinedDate = buildActivityDateTime(data.date, data.startTime);
  if (!combinedDate) {
    return res.status(400).json({ error: 'Invalid date or start time.' });
  }
  if (combinedDate <= new Date() && existing.status === 'ACTIVE') {
    return res.status(400).json({ error: 'Updated date and start time must be in the future.' });
  }

  let combinedEndDate: Date | null = existing.endDate;
  if (data.endDate && data.endTime) {
    combinedEndDate = buildActivityDateTime(data.endDate, data.endTime);
  } else if (data.endTime) {
    combinedEndDate = buildActivityDateTime(data.date, data.endTime);
  }

  const preset = NEIGHBORHOOD_PRESETS.find(
    (p) => p.name.toLowerCase() === data.neighborhood.toLowerCase()
  );

  const latitude =
    data.activityType === 'ONLINE'
      ? null
      : data.latitude ?? preset?.latitude ?? existing.latitude ?? 28.6139;
  const longitude =
    data.activityType === 'ONLINE'
      ? null
      : data.longitude ?? preset?.longitude ?? existing.longitude ?? 77.209;

  const derivedCapacity =
    data.kind === 'EVENT' && data.ticketTiers.length > 0
      ? data.ticketTiers.reduce((acc, t) => acc + t.quantity, 0)
      : data.capacity ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.kind === 'EVENT') {
      await tx.agendaItem.deleteMany({ where: { activityId: id } });
      if (data.agendaItems.length > 0) {
        await tx.agendaItem.createMany({
          data: data.agendaItems.map((item, idx) => ({
            activityId: id,
            time: item.time,
            title: item.title,
            description: item.description || '',
            sortOrder: idx,
          })),
        });
      }

      if (!hasSales) {
        await tx.ticketTier.deleteMany({ where: { activityId: id } });
        if (data.ticketTiers.length > 0) {
          await tx.ticketTier.createMany({
            data: data.ticketTiers.map((tier, idx) => ({
              activityId: id,
              name: tier.name,
              description: tier.description || '',
              priceInr: tier.priceInr,
              quantity: tier.quantity,
              salesEndAt: tier.salesEndAt ? new Date(tier.salesEndAt) : null,
              sortOrder: idx,
            })),
          });
        }
      } else {
        for (let idx = 0; idx < data.ticketTiers.length; idx++) {
          const tier = data.ticketTiers[idx];
          if (tier.id) {
            await tx.ticketTier.update({
              where: { id: tier.id },
              data: {
                name: tier.name,
                description: tier.description || '',
                quantity: tier.quantity,
                salesEndAt: tier.salesEndAt ? new Date(tier.salesEndAt) : null,
                sortOrder: idx,
              },
            });
          } else {
            await tx.ticketTier.create({
              data: {
                activityId: id,
                name: tier.name,
                description: tier.description || '',
                priceInr: tier.priceInr,
                quantity: tier.quantity,
                salesEndAt: tier.salesEndAt ? new Date(tier.salesEndAt) : null,
                sortOrder: idx,
              },
            });
          }
        }
      }
    }

    return tx.activity.update({
      where: { id },
      data: {
        kind: data.kind,
        title: data.title,
        tagline: data.tagline,
        description: data.description,
        activityType: data.activityType,
        date: combinedDate,
        startTime: data.startTime,
        endDate: combinedEndDate,
        endTime: data.endTime || null,
        durationMins: data.durationMins ?? existing.durationMins,
        location: data.venueName ? `${data.venueName}, ${data.neighborhood}` : data.location,
        venueName: data.venueName || data.location,
        fullAddress: data.fullAddress || data.location,
        neighborhood: data.activityType === 'ONLINE' ? 'Online · Delhi-NCR' : data.neighborhood,
        latitude,
        longitude,
        capacity: derivedCapacity,
        imageUrl: data.imageUrl && data.imageUrl.length > 0 ? data.imageUrl : existing.imageUrl,
        tintColor: data.tintColor || existing.tintColor,
        hostName: data.hostName || existing.hostName,
        refundPolicy: data.refundPolicy || existing.refundPolicy,
        categoryId: category.id,
        communityId: data.communityId || null,
      },
      include: ACTIVITY_DETAIL_INCLUDE,
    });
  });

  await prisma.conversation.updateMany({
    where: { activityId: id, type: 'ACTIVITY' },
    data: { title: updated.title },
  });

  const viewerInterestIds = await getViewerInterestIds(req.authUser!.id);
  return res.json({ activity: serializeActivity(updated, req.authUser!.id, viewerInterestIds) });
});

apiRouter.post('/activities/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Activity not found.' });
  }
  if (existing.organiserId !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the organiser can cancel this listing.' });
  }

  const { updated, refundedTicketsCount } = await prisma.$transaction(async (tx) => {
    const refundedTickets = await tx.ticket.updateMany({
      where: { activityId: id, status: 'VALID' },
      data: { status: 'REFUNDED' },
    });

    await tx.order.updateMany({
      where: { activityId: id, status: 'PAID' },
      data: { status: 'REFUNDED' },
    });

    const act = await tx.activity.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: ACTIVITY_DETAIL_INCLUDE,
    });

    return { updated: act, refundedTicketsCount: refundedTickets.count };
  });

  const viewerInterestIds = await getViewerInterestIds(req.authUser!.id);
  return res.json({
    activity: serializeActivity(updated, req.authUser!.id, viewerInterestIds),
    refundedTicketsCount,
  });
});

apiRouter.delete('/activities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Activity not found.' });
  }
  if (existing.organiserId !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the organiser can delete this listing.' });
  }

  await prisma.activity.delete({ where: { id } });
  return res.json({ ok: true });
});

apiRouter.post('/activities/:id/join', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: { id },
        include: {
          participations: true,
          ticketTiers: {
            orderBy: { sortOrder: 'asc' },
            include: {
              tickets: { where: { status: { in: ['VALID', 'USED'] } }, select: { id: true } },
            },
          },
        },
      });

      if (!activity) {
        return { status: 404 as const, error: 'Activity not found.' };
      }
      if (activity.status === 'CANCELLED') {
        return { status: 400 as const, error: 'This gathering has been cancelled and is no longer accepting participants.' };
      }
      if (new Date(activity.date) < new Date()) {
        return { status: 400 as const, error: 'This gathering has already taken place.' };
      }

      if (activity.kind === 'EVENT') {
        const hasPaidTier = activity.ticketTiers.some((t) => t.priceInr > 0);
        if (hasPaidTier) {
          return {
            status: 400 as const,
            error: 'Please select a ticket tier through event checkout to reserve your spot.',
          };
        }
      }

      const alreadyJoined = activity.participations.some((p) => p.userId === userId);
      if (alreadyJoined) {
        return { status: 409 as const, error: 'You have already joined this gathering.' };
      }

      if (activity.capacity !== null && activity.participations.length >= activity.capacity) {
        return { status: 409 as const, error: 'This gathering has reached its maximum capacity.' };
      }

      await tx.participation.create({
        data: { userId, activityId: id },
      });

      // If it is a free event with a free tier, also issue a free ticket so it appears in My Tickets
      if (activity.kind === 'EVENT' && activity.ticketTiers.length > 0) {
        const freeTier =
          activity.ticketTiers.find(
            (t) => t.priceInr === 0 && t.tickets.length < t.quantity
          ) || activity.ticketTiers[0];
        if (freeTier && freeTier.tickets.length < freeTier.quantity) {
          const order = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              idempotencyKey: `join-free-${id}-${userId}-${Date.now()}`,
              userId,
              activityId: id,
              tierId: freeTier.id,
              quantity: 1,
              unitPriceInr: 0,
              totalAmountInr: 0,
              paymentMethod: 'FREE',
              status: 'PAID',
            },
          });
          await tx.ticket.create({
            data: {
              code: generateTicketCode(),
              activityId: id,
              ownerId: userId,
              tierId: freeTier.id,
              orderId: order.id,
              pricePaidInr: 0,
              status: 'VALID',
            },
          });
        }
      }

      let conv = await tx.conversation.findFirst({
        where: { activityId: id, type: 'ACTIVITY' },
      });
      if (!conv) {
        conv = await tx.conversation.create({
          data: {
            type: 'ACTIVITY',
            title: activity.title,
            activityId: id,
          },
        });
      }

      await tx.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: conv.id,
            userId,
          },
        },
        update: {},
        create: {
          conversationId: conv.id,
          userId,
        },
      });

      const refreshed = await tx.activity.findUnique({
        where: { id },
        include: ACTIVITY_DETAIL_INCLUDE,
      });

      return { status: 200 as const, activity: refreshed };
    });

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const viewerInterestIds = await getViewerInterestIds(userId);
    return res.json({ activity: serializeActivity(result.activity, userId, viewerInterestIds) });
  } catch {
    return res.status(500).json({ error: 'Unable to join right now.' });
  }
});

apiRouter.post('/activities/:id/leave', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found.' });
  }

  if (activity.organiserId === userId) {
    return res.status(400).json({
      error: 'Organisers cannot leave their own listing. You can edit or cancel it instead.',
    });
  }

  const deleted = await prisma.participation.deleteMany({
    where: { userId, activityId: id },
  });

  if (deleted.count === 0) {
    return res.status(400).json({ error: 'You are not currently participating in this activity.' });
  }

  // Cancel free tickets if leaving a free event
  await prisma.ticket.updateMany({
    where: {
      activityId: id,
      ownerId: userId,
      status: 'VALID',
      pricePaidInr: 0,
    },
    data: { status: 'CANCELLED' },
  });

  const refreshed = await prisma.activity.findUnique({
    where: { id },
    include: ACTIVITY_DETAIL_INCLUDE,
  });

  const viewerInterestIds = await getViewerInterestIds(userId);
  return res.json({ activity: serializeActivity(refreshed, userId, viewerInterestIds) });
});

apiRouter.get('/my-activities', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;

  const [organisedRaw, joinedRaw, viewerInterestIds] = await Promise.all([
    prisma.activity.findMany({
      where: { organiserId: userId },
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    prisma.activity.findMany({
      where: {
        participations: { some: { userId } },
        organiserId: { not: userId },
      },
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    getViewerInterestIds(userId),
  ]);

  return res.json({
    organised: organisedRaw.map((a) => serializeActivity(a, userId, viewerInterestIds)),
    joined: joinedRaw.map((a) => serializeActivity(a, userId, viewerInterestIds)),
  });
});

// ==========================================
// CHECKOUT, ORDERS, TICKETS & ORGANISER TOOLS
// ==========================================

const checkoutSchema = z.object({
  activityId: z.string().min(1),
  tierId: z.string().min(1),
  quantity: z.number().int().min(1, 'Select at least 1 ticket').max(5, 'Maximum 5 tickets per order'),
  paymentMethod: z.enum(['FREE', 'UPI', 'CARD', 'NETBANKING']),
  idempotencyKey: z.string().min(6).max(120),
  simulateFailure: z.boolean().optional().default(false),
});

function serializeTicketRecord(t: any) {
  return {
    id: t.id,
    code: t.code,
    pricePaidInr: t.pricePaidInr,
    status: t.status,
    usedAt: t.usedAt ? t.usedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    owner: serializePublicUser(t.owner),
    tier: {
      id: t.tier.id,
      name: t.tier.name,
      priceInr: t.tier.priceInr,
    },
    order: {
      id: t.order.id,
      orderNumber: t.order.orderNumber,
      quantity: t.order.quantity,
      unitPriceInr: t.order.unitPriceInr,
      totalAmountInr: t.order.totalAmountInr,
      paymentMethod: t.order.paymentMethod,
      status: t.order.status,
      createdAt: t.order.createdAt.toISOString(),
    },
    activity: {
      id: t.activity.id,
      kind: t.activity.kind,
      title: t.activity.title,
      tagline: t.activity.tagline || '',
      date: t.activity.date.toISOString(),
      startTime: t.activity.startTime,
      endDate: t.activity.endDate ? t.activity.endDate.toISOString() : null,
      endTime: t.activity.endTime || null,
      location: t.activity.location,
      venueName: t.activity.venueName || '',
      fullAddress: t.activity.fullAddress || '',
      neighborhood: t.activity.neighborhood,
      activityType: t.activity.activityType,
      imageUrl: t.activity.imageUrl,
      tintColor: t.activity.tintColor,
      status: t.activity.status,
      refundPolicy: t.activity.refundPolicy || '',
      category: t.activity.category,
    },
  };
}

const TICKET_INCLUDE = {
  owner: true,
  tier: true,
  order: true,
  activity: {
    include: { category: true },
  },
};

apiRouter.post('/orders/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid checkout payload.',
    });
  }

  const { activityId, tierId, quantity, paymentMethod, idempotencyKey, simulateFailure } = parsed.data;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // Idempotency guard: if order with this key already succeeded, return it cleanly
      const existingOrder = await tx.order.findUnique({
        where: { idempotencyKey },
        include: {
          tickets: {
            include: TICKET_INCLUDE,
          },
        },
      });

      if (existingOrder) {
        if (existingOrder.userId !== userId) {
          return { status: 403 as const, error: 'Order key does not belong to current user.' };
        }
        if (existingOrder.status === 'PAID') {
          return {
            status: 200 as const,
            order: {
              id: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              quantity: existingOrder.quantity,
              unitPriceInr: existingOrder.unitPriceInr,
              totalAmountInr: existingOrder.totalAmountInr,
              paymentMethod: existingOrder.paymentMethod,
              status: existingOrder.status,
              createdAt: existingOrder.createdAt.toISOString(),
            },
            tickets: existingOrder.tickets.map(serializeTicketRecord),
          };
        }
      }

      const activity = await tx.activity.findUnique({
        where: { id: activityId },
      });
      if (!activity) {
        return { status: 404 as const, error: 'Event not found.' };
      }
      if (activity.status === 'CANCELLED') {
        return { status: 400 as const, error: 'This event has been cancelled and tickets are closed.' };
      }
      if (new Date(activity.date) < new Date()) {
        return { status: 400 as const, error: 'This event has already started or ended.' };
      }

      const tier = await tx.ticketTier.findUnique({
        where: { id: tierId },
      });
      if (!tier || tier.activityId !== activityId) {
        return { status: 404 as const, error: 'Selected ticket tier not found for this event.' };
      }
      if (tier.salesEndAt && new Date(tier.salesEndAt) < new Date()) {
        return { status: 400 as const, error: `Ticket sales for "${tier.name}" have ended.` };
      }

      const soldCount = await tx.ticket.count({
        where: {
          tierId,
          status: { in: ['VALID', 'USED'] },
        },
      });
      const remaining = Math.max(tier.quantity - soldCount, 0);
      if (quantity > remaining) {
        return {
          status: 409 as const,
          error:
            remaining === 0
              ? `"${tier.name}" is sold out.`
              : `Only ${remaining} ticket${remaining === 1 ? '' : 's'} remaining in "${tier.name}".`,
        };
      }

      const effectiveMethod = tier.priceInr === 0 ? 'FREE' : paymentMethod;
      if (tier.priceInr > 0 && effectiveMethod === 'FREE') {
        return { status: 400 as const, error: 'Please select a payment method (UPI, Card, or Netbanking).' };
      }

      if (simulateFailure) {
        const failedKey = existingOrder ? `${idempotencyKey}-retry-${Date.now()}` : idempotencyKey;
        await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            idempotencyKey: failedKey,
            userId,
            activityId,
            tierId,
            quantity,
            unitPriceInr: tier.priceInr,
            totalAmountInr: tier.priceInr * quantity,
            paymentMethod: effectiveMethod,
            status: 'FAILED',
          },
        });
        return {
          status: 402 as const,
          error: 'Demo payment declined as simulated. No tickets were issued and no money was charged.',
        };
      }

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          idempotencyKey,
          userId,
          activityId,
          tierId,
          quantity,
          unitPriceInr: tier.priceInr,
          totalAmountInr: tier.priceInr * quantity,
          paymentMethod: effectiveMethod,
          status: 'PAID',
        },
      });

      const createdTicketIds: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const t = await tx.ticket.create({
          data: {
            code: generateTicketCode(),
            activityId,
            ownerId: userId,
            tierId,
            orderId: order.id,
            pricePaidInr: tier.priceInr,
            status: 'VALID',
          },
        });
        createdTicketIds.push(t.id);
      }

      // Ensure buyer appears as a participant and is added to the event chat
      await tx.participation.upsert({
        where: { userId_activityId: { userId, activityId } },
        update: {},
        create: { userId, activityId },
      });

      let conv = await tx.conversation.findFirst({
        where: { activityId, type: 'ACTIVITY' },
      });
      if (!conv) {
        conv = await tx.conversation.create({
          data: { type: 'ACTIVITY', title: activity.title, activityId },
        });
      }
      await tx.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        update: {},
        create: { conversationId: conv.id, userId },
      });

      const tickets = await tx.ticket.findMany({
        where: { id: { in: createdTicketIds } },
        include: TICKET_INCLUDE,
        orderBy: { createdAt: 'asc' },
      });

      return {
        status: 201 as const,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          quantity: order.quantity,
          unitPriceInr: order.unitPriceInr,
          totalAmountInr: order.totalAmountInr,
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        },
        tickets: tickets.map(serializeTicketRecord),
      };
    });

    if ('error' in outcome) {
      return res.status(outcome.status).json({ error: outcome.error });
    }

    return res.status(outcome.status).json({
      order: outcome.order,
      tickets: outcome.tickets,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Unable to complete checkout right now. Please try again.' });
  }
});

apiRouter.get('/tickets', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: userId },
    include: TICKET_INCLUDE,
    orderBy: [{ activity: { date: 'asc' } }, { createdAt: 'desc' }],
  });

  return res.json({
    tickets: tickets.map(serializeTicketRecord),
  });
});

apiRouter.get('/activities/:id/manage', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const user = req.authUser!;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: ACTIVITY_DETAIL_INCLUDE,
  });

  if (!activity) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (activity.organiserId !== user.id && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the organiser or an admin can access sales and check-in tools.' });
  }

  const allTickets = await prisma.ticket.findMany({
    where: { activityId: id },
    include: {
      owner: true,
      tier: true,
      order: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const tierStats = activity.ticketTiers.map((tier) => {
    const tierTickets = allTickets.filter((t) => t.tierId === tier.id);
    const activeTickets = tierTickets.filter((t) => t.status === 'VALID' || t.status === 'USED');
    const usedCount = tierTickets.filter((t) => t.status === 'USED').length;
    const revenueInr = activeTickets.reduce((sum, t) => sum + t.pricePaidInr, 0);
    return {
      id: tier.id,
      name: tier.name,
      priceInr: tier.priceInr,
      quantity: tier.quantity,
      soldCount: activeTickets.length,
      usedCount,
      remaining: Math.max(tier.quantity - activeTickets.length, 0),
      revenueInr,
    };
  });

  const totalSold = tierStats.reduce((s, t) => s + t.soldCount, 0);
  const totalCapacity = tierStats.reduce((s, t) => s + t.quantity, 0);
  const totalRemaining = tierStats.reduce((s, t) => s + t.remaining, 0);
  const totalUsed = tierStats.reduce((s, t) => s + t.usedCount, 0);
  const totalRevenueInr = tierStats.reduce((s, t) => s + t.revenueInr, 0);
  const refundedCount = allTickets.filter((t) => t.status === 'REFUNDED').length;

  const viewerInterestIds = await getViewerInterestIds(user.id);

  return res.json({
    activity: serializeActivity(activity, user.id, viewerInterestIds),
    summary: {
      totalSold,
      totalCapacity,
      totalRemaining,
      totalUsed,
      totalRevenueInr,
      refundedCount,
    },
    tierStats,
    tickets: allTickets.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      pricePaidInr: t.pricePaidInr,
      usedAt: t.usedAt ? t.usedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      tierName: t.tier.name,
      orderNumber: t.order.orderNumber,
      paymentMethod: t.order.paymentMethod,
      owner: serializePublicUser(t.owner),
    })),
  });
});

const checkInSchema = z.object({
  code: z.string().trim().min(3, 'Enter a valid ticket code'),
});

apiRouter.post('/activities/:id/check-in', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const user = req.authUser!;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    return res.status(404).json({ error: 'Event not found.' });
  }
  if (activity.organiserId !== user.id && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the organiser or an admin can check in tickets.' });
  }

  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Enter a ticket code.' });
  }

  const code = parsed.data.code.toUpperCase();
  const ticket = await prisma.ticket.findUnique({
    where: { code },
    include: { owner: true, tier: true, order: true },
  });

  if (!ticket || ticket.activityId !== id) {
    return res.status(404).json({
      error: `Ticket code "${code}" is invalid or belongs to a different event.`,
    });
  }

  if (ticket.status === 'CANCELLED') {
    return res.status(400).json({
      error: `Ticket ${code} (${ticket.owner.fullName}) was cancelled and cannot be checked in.`,
    });
  }
  if (ticket.status === 'REFUNDED') {
    return res.status(400).json({
      error: `Ticket ${code} (${ticket.owner.fullName}) has been refunded and is no longer valid.`,
    });
  }
  if (ticket.status === 'USED') {
    return res.status(409).json({
      error: `Ticket ${code} (${ticket.owner.fullName}) was already checked in${
        ticket.usedAt ? ` at ${ticket.usedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : ''
      }.`,
    });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'USED',
      usedAt: new Date(),
    },
    include: { owner: true, tier: true, order: true },
  });

  return res.json({
    ticket: {
      id: updated.id,
      code: updated.code,
      status: updated.status,
      pricePaidInr: updated.pricePaidInr,
      usedAt: updated.usedAt ? updated.usedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      tierName: updated.tier.name,
      orderNumber: updated.order.orderNumber,
      paymentMethod: updated.order.paymentMethod,
      owner: serializePublicUser(updated.owner),
    },
  });
});

// ==========================================
// PROFILE & PEOPLE DISCOVERY
// ==========================================

apiRouter.get('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { include: { interest: true } },
      communityMembers: { include: { community: { include: { category: true } } } },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  const [organisedRaw, joinedRaw, viewerInterestIds] = await Promise.all([
    prisma.activity.findMany({
      where: { organiserId: userId },
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    prisma.activity.findMany({
      where: { participations: { some: { userId } } },
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    getViewerInterestIds(userId),
  ]);

  return res.json({
    user: serializeUserPrivate(user),
    organisedActivities: organisedRaw.map((a) => serializeActivity(a, userId, viewerInterestIds)),
    joinedActivities: joinedRaw.map((a) => serializeActivity(a, userId, viewerInterestIds)),
    communities: user.communityMembers.map((cm) => cm.community),
  });
});

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  bio: z.string().trim().max(400).default(''),
  location: z.string().trim().min(2, 'Please provide your city or neighbourhood').max(100),
  avatarUrl: z.string().trim().max(500).default(''),
  avatarTone: z.enum(['sage', 'peach', 'earth', 'light-sage', 'cream']).optional(),
  interestIds: z.array(z.string()).max(12).optional(),
});

apiRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid profile fields.',
    });
  }

  const { fullName, bio, location, avatarUrl, avatarTone, interestIds } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        fullName,
        bio,
        location,
        avatarUrl,
        ...(avatarTone ? { avatarTone } : {}),
      },
    });

    if (Array.isArray(interestIds)) {
      const validInterests = await tx.interest.findMany({
        where: { id: { in: interestIds } },
        select: { id: true },
      });
      await tx.userInterest.deleteMany({ where: { userId } });
      if (validInterests.length > 0) {
        await tx.userInterest.createMany({
          data: validInterests.map((i) => ({ userId, interestId: i.id })),
        });
      }
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { interests: { include: { interest: true } } },
  });

  return res.json({ user: serializeUserPrivate(updated!) });
});

apiRouter.get('/people', requireAuth, async (req: AuthenticatedRequest, res) => {
  const currentUserId = req.authUser!.id;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const interestSlug = typeof req.query.interest === 'string' ? req.query.interest.trim() : '';
  const mode = typeof req.query.mode === 'string' ? req.query.mode.trim() : 'all';

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    include: {
      interests: { include: { interest: true } },
      participations: { select: { activityId: true } },
      communityMembers: { select: { communityId: true } },
    },
  });

  const myInterestIds = new Set(currentUser?.interests.map((i) => i.interestId) || []);
  const myActivityIds = new Set(currentUser?.participations.map((p) => p.activityId) || []);
  const myCommunityIds = new Set(currentUser?.communityMembers.map((cm) => cm.communityId) || []);

  const otherUsers = await prisma.user.findMany({
    where: { id: { not: currentUserId } },
    include: {
      interests: { include: { interest: true } },
      participations: {
        include: {
          activity: {
            select: { id: true, title: true, date: true, status: true, category: true },
          },
        },
      },
      communityMembers: {
        include: {
          community: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  let people = otherUsers.map((u) => {
    const userInterests = u.interests.map((ui) => ui.interest);
    const sharedInterests = userInterests.filter((i) => myInterestIds.has(i.id));
    const sharedActivities = u.participations
      .filter((p) => myActivityIds.has(p.activityId))
      .map((p) => ({
        id: p.activity.id,
        title: p.activity.title,
        date: p.activity.date.toISOString(),
        categoryName: p.activity.category.name,
      }));
    const sharedCommunities = u.communityMembers
      .filter((cm) => myCommunityIds.has(cm.communityId))
      .map((cm) => cm.community);

    const recentActivities = u.participations
      .slice(0, 3)
      .map((p) => ({
        id: p.activity.id,
        title: p.activity.title,
        date: p.activity.date.toISOString(),
        categoryName: p.activity.category.name,
      }));

    return {
      ...serializePublicUser(u),
      interests: userInterests,
      sharedInterests,
      sharedActivities,
      sharedCommunities,
      recentActivities,
      activityCount: u.participations.length,
      canMessage: sharedActivities.length > 0 || sharedCommunities.length > 0,
      relevanceScore:
        sharedActivities.length * 4 + sharedCommunities.length * 3 + sharedInterests.length * 2,
    };
  });

  if (q) {
    people = people.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        p.interests.some((i) => i.name.toLowerCase().includes(q))
    );
  }

  if (interestSlug && interestSlug !== 'all') {
    people = people.filter((p) => p.interests.some((i) => i.slug === interestSlug));
  }

  if (mode === 'shared-activities') {
    people = people.filter((p) => p.sharedActivities.length > 0);
  } else if (mode === 'shared-interests') {
    people = people.filter((p) => p.sharedInterests.length > 0);
  }

  people.sort((a, b) => b.relevanceScore - a.relevanceScore || b.activityCount - a.activityCount);

  return res.json({ people });
});

apiRouter.get('/people/:id', async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const viewerId = req.authUser?.id;

  const person = await prisma.user.findUnique({
    where: { id },
    include: {
      interests: { include: { interest: true } },
      organisedActivities: {
        include: ACTIVITY_DETAIL_INCLUDE,
        orderBy: { date: 'asc' },
      },
      participations: {
        include: {
          activity: {
            include: ACTIVITY_DETAIL_INCLUDE,
          },
        },
      },
      communityMembers: {
        include: { community: { include: { category: true } } },
      },
    },
  });

  if (!person) {
    return res.status(404).json({ error: 'Member profile not found.' });
  }

  let sharedInterests: any[] = [];
  let sharedActivitiesCount = 0;
  let sharedCommunitiesCount = 0;

  if (viewerId && viewerId !== id) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      include: {
        interests: true,
        participations: true,
        communityMembers: true,
      },
    });
    if (viewer) {
      const viewerInterestIds = new Set(viewer.interests.map((i) => i.interestId));
      const viewerActivityIds = new Set(viewer.participations.map((p) => p.activityId));
      const viewerCommunityIds = new Set(viewer.communityMembers.map((cm) => cm.communityId));

      sharedInterests = person.interests
        .map((ui) => ui.interest)
        .filter((i) => viewerInterestIds.has(i.id));
      sharedActivitiesCount = person.participations.filter((p) =>
        viewerActivityIds.has(p.activityId)
      ).length;
      sharedCommunitiesCount = person.communityMembers.filter((cm) =>
        viewerCommunityIds.has(cm.communityId)
      ).length;
    }
  }

  const canMessage = Boolean(
    viewerId &&
      viewerId !== id &&
      (sharedActivitiesCount > 0 || sharedCommunitiesCount > 0)
  );

  return res.json({
    person: {
      ...serializePublicUser(person),
      interests: person.interests.map((ui) => ui.interest),
      organisedActivities: person.organisedActivities.map((a) => serializeActivity(a, viewerId)),
      joinedActivities: person.participations
        .map((p) => serializeActivity(p.activity, viewerId))
        .filter((a) => a.organiser.id !== id),
      communities: person.communityMembers.map((cm) => cm.community),
      sharedInterests,
      sharedActivitiesCount,
      sharedCommunitiesCount,
      canMessage,
    },
  });
});

// ==========================================
// COMMUNITIES & GROUPS
// ==========================================

apiRouter.get('/communities', async (req: AuthenticatedRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const viewerId = req.authUser?.id;

  const raw = await prisma.community.findMany({
    include: {
      category: true,
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      },
      activities: {
        where: { status: 'ACTIVE', date: { gte: new Date() } },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  let communities = raw.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    neighborhood: c.neighborhood,
    tintColor: c.tintColor,
    imageUrl: c.imageUrl,
    category: c.category,
    memberCount: c.members.length,
    upcomingActivityCount: c.activities.length,
    membersPreview: c.members.slice(0, 5).map((m) => serializePublicUser(m.user)),
    isMember: viewerId ? c.members.some((m) => m.userId === viewerId) : false,
  }));

  if (q) {
    communities = communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.neighborhood.toLowerCase().includes(q) ||
        c.category.name.toLowerCase().includes(q)
    );
  }

  if (categorySlug && categorySlug !== 'all') {
    communities = communities.filter((c) => c.category.slug === categorySlug);
  }

  return res.json({ communities });
});

apiRouter.get('/communities/:id', async (req: AuthenticatedRequest, res) => {
  const idOrSlug = String(req.params.id);
  const viewerId = req.authUser?.id;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      category: true,
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!community) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  const [relatedActivitiesRaw, viewerInterestIds] = await Promise.all([
    prisma.activity.findMany({
      where: {
        OR: [{ communityId: community.id }, { categoryId: community.categoryId }],
      },
      include: ACTIVITY_DETAIL_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    getViewerInterestIds(viewerId),
  ]);

  return res.json({
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      neighborhood: community.neighborhood,
      tintColor: community.tintColor,
      imageUrl: community.imageUrl,
      category: community.category,
      memberCount: community.members.length,
      members: community.members.map((m) => serializePublicUser(m.user)),
      isMember: viewerId ? community.members.some((m) => m.userId === viewerId) : false,
      activities: relatedActivitiesRaw.map((a) => serializeActivity(a, viewerId, viewerInterestIds)),
    },
  });
});

apiRouter.post('/communities/:id/join', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) {
    return res.status(404).json({ error: 'Community not found.' });
  }

  await prisma.communityMember.upsert({
    where: { userId_communityId: { userId, communityId: id } },
    update: {},
    create: { userId, communityId: id },
  });

  const memberCount = await prisma.communityMember.count({ where: { communityId: id } });
  return res.json({ isMember: true, memberCount });
});

apiRouter.post('/communities/:id/leave', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  await prisma.communityMember.deleteMany({
    where: { userId, communityId: id },
  });

  const memberCount = await prisma.communityMember.count({ where: { communityId: id } });
  return res.json({ isMember: false, memberCount });
});

// ==========================================
// MESSAGING (POLLING-BASED, AUTHORISED)
// ==========================================

apiRouter.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      activity: {
        select: {
          id: true,
          title: true,
          date: true,
          status: true,
          neighborhood: true,
        },
      },
      members: {
        include: { user: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return res.json({
    conversations: conversations.map((c) => {
      const otherMembers = c.members
        .filter((m) => m.userId !== userId)
        .map((m) => serializePublicUser(m.user));
      const lastMessage = c.messages[0]
        ? {
            id: c.messages[0].id,
            content: c.messages[0].content,
            createdAt: c.messages[0].createdAt.toISOString(),
            sender: serializePublicUser(c.messages[0].sender),
          }
        : null;

      return {
        id: c.id,
        type: c.type,
        title:
          c.type === 'ACTIVITY'
            ? c.activity?.title || c.title || 'Activity Group Chat'
            : otherMembers[0]?.fullName || 'Direct Message',
        activity: c.activity,
        members: c.members.map((m) => serializePublicUser(m.user)),
        otherMembers,
        lastMessage,
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
  });
});

apiRouter.post('/conversations/activity/:activityId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const activityId = String(req.params.activityId);
  const userId = req.authUser!.id;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { participations: true },
  });

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found.' });
  }

  const isAllowed =
    activity.organiserId === userId ||
    activity.participations.some((p) => p.userId === userId);

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Join this activity first to open its participant conversation.',
    });
  }

  let conv = await prisma.conversation.findFirst({
    where: { activityId, type: 'ACTIVITY' },
  });

  const participantIds = Array.from(
    new Set([activity.organiserId, ...activity.participations.map((p) => p.userId)])
  );

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        type: 'ACTIVITY',
        title: activity.title,
        activityId,
        members: {
          create: participantIds.map((uid) => ({ userId: uid })),
        },
      },
    });
  } else {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: conv.id, userId } },
      update: {},
      create: { conversationId: conv.id, userId },
    });
  }

  return res.json({ conversationId: conv.id });
});

apiRouter.post('/conversations/direct/:targetUserId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const targetUserId = String(req.params.targetUserId);
  const userId = req.authUser!.id;

  if (targetUserId === userId) {
    return res.status(400).json({ error: 'You cannot start a conversation with yourself.' });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Enforce shared-experience prerequisite: shared activity OR shared community
  const [sharedParticipation, sharedCommunity] = await Promise.all([
    prisma.participation.findFirst({
      where: {
        userId,
        activity: {
          participations: { some: { userId: targetUserId } },
        },
      },
    }),
    prisma.communityMember.findFirst({
      where: {
        userId,
        community: {
          members: { some: { userId: targetUserId } },
        },
      },
    }),
  ]);

  if (!sharedParticipation && !sharedCommunity) {
    return res.status(403).json({
      error: 'Direct messages are available between people who share an activity or community.',
    });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
  });

  if (existing) {
    return res.json({ conversationId: existing.id });
  }

  const created = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [{ userId }, { userId: targetUserId }],
      },
    },
  });

  return res.status(201).json({ conversationId: created.id });
});

apiRouter.get('/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });

  if (!membership) {
    return res.status(403).json({ error: 'You do not have access to this conversation.' });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      activity: {
        select: { id: true, title: true, date: true, status: true, neighborhood: true },
      },
      members: { include: { user: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: true },
      },
    },
  });

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const otherMembers = conversation.members
    .filter((m) => m.userId !== userId)
    .map((m) => serializePublicUser(m.user));

  return res.json({
    conversation: {
      id: conversation.id,
      type: conversation.type,
      title:
        conversation.type === 'ACTIVITY'
          ? conversation.activity?.title || conversation.title || 'Activity Chat'
          : otherMembers[0]?.fullName || 'Direct Message',
      activity: conversation.activity,
      members: conversation.members.map((m) => serializePublicUser(m.user)),
    },
    messages: conversation.messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      sender: serializePublicUser(m.sender),
    })),
  });
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(1500, 'Message is too long'),
});

apiRouter.post('/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const userId = req.authUser!.id;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });

  if (!membership) {
    return res.status(403).json({ error: 'You do not have access to this conversation.' });
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Message cannot be empty.',
    });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content: parsed.data.content,
      },
      include: { sender: true },
    });

    await tx.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  return res.status(201).json({
    message: {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      sender: serializePublicUser(message.sender),
    },
  });
});
