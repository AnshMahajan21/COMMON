export type TintColor = 'light-sage' | 'sage' | 'peach' | 'cream' | 'earth';
export type ListingKind = 'ACTIVITY' | 'EVENT';
export type ActivityType = 'IN_PERSON' | 'ONLINE';
export type ActivityStatus = 'ACTIVE' | 'CANCELLED';
export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'FREE' | 'UPI' | 'CARD' | 'NETBANKING';

export interface Interest {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  tintColor: TintColor | string;
  activityCount?: number;
}

export interface PublicUser {
  id: string;
  fullName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  avatarTone: string;
  createdAt: string;
}

export interface AuthUser extends PublicUser {
  email: string;
  role: string;
  interests: Interest[];
}

export interface CommunitySummary {
  id: string;
  name: string;
  slug: string;
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  priceInr: number;
  quantity: number;
  soldCount: number;
  remaining: number;
  salesEndAt: string | null;
  sortOrder: number;
}

export interface Activity {
  id: string;
  kind: ListingKind;
  title: string;
  tagline: string;
  description: string;
  activityType: ActivityType;
  date: string;
  startTime: string;
  endDate: string | null;
  endTime: string | null;
  durationMins: number | null;
  location: string;
  venueName: string;
  fullAddress: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  imageUrl: string;
  tintColor: TintColor | string;
  hostName: string;
  refundPolicy: string;
  status: ActivityStatus;
  createdAt: string;
  organiser: PublicUser;
  category: Category;
  community: CommunitySummary | null;
  participantCount: number;
  participants: PublicUser[];
  isJoined: boolean;
  isOrganiser: boolean;
  isFull: boolean;
  isPast: boolean;
  conversationId?: string | null;
  agendaItems: AgendaItem[];
  ticketTiers: TicketTier[];
  minPriceInr: number;
  isFree: boolean;
  totalTicketsRemaining: number | null;
  totalTicketsCapacity: number | null;
  hasTicketSales: boolean;
  sharedInterestParticipantsCount: number;
  distanceKm?: number | null;
}

export interface TicketOrderSummary {
  id: string;
  orderNumber: string;
  quantity: number;
  unitPriceInr: number;
  totalAmountInr: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  code: string;
  pricePaidInr: number;
  status: TicketStatus;
  usedAt: string | null;
  createdAt: string;
  owner: PublicUser;
  tier: {
    id: string;
    name: string;
    priceInr: number;
  };
  order: TicketOrderSummary;
  activity: {
    id: string;
    kind: ListingKind;
    title: string;
    tagline: string;
    date: string;
    startTime: string;
    endDate: string | null;
    endTime: string | null;
    location: string;
    venueName: string;
    fullAddress: string;
    neighborhood: string;
    activityType: ActivityType;
    imageUrl: string;
    tintColor: string;
    status: ActivityStatus;
    refundPolicy: string;
    category: Category;
  };
}

export interface OrganiserTierStat {
  id: string;
  name: string;
  priceInr: number;
  quantity: number;
  soldCount: number;
  usedCount: number;
  remaining: number;
  revenueInr: number;
}

export interface OrganiserManageData {
  activity: Activity;
  summary: {
    totalSold: number;
    totalCapacity: number;
    totalRemaining: number;
    totalUsed: number;
    totalRevenueInr: number;
    refundedCount: number;
  };
  tierStats: OrganiserTierStat[];
  tickets: Array<{
    id: string;
    code: string;
    status: TicketStatus;
    pricePaidInr: number;
    usedAt: string | null;
    createdAt: string;
    tierName: string;
    orderNumber: string;
    paymentMethod: PaymentMethod;
    owner: PublicUser;
  }>;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  neighborhood: string;
  tintColor: string;
  imageUrl: string;
  category: Category;
  memberCount: number;
  upcomingActivityCount?: number;
  membersPreview?: PublicUser[];
  members?: PublicUser[];
  isMember: boolean;
  activities?: Activity[];
}

export interface PersonDiscovery extends PublicUser {
  interests: Interest[];
  sharedInterests: Interest[];
  sharedActivities: Array<{
    id: string;
    title: string;
    date: string;
    categoryName: string;
  }>;
  sharedCommunities: CommunitySummary[];
  recentActivities: Array<{
    id: string;
    title: string;
    date: string;
    categoryName: string;
  }>;
  activityCount: number;
  canMessage: boolean;
}

export interface PersonDetail extends PublicUser {
  interests: Interest[];
  organisedActivities: Activity[];
  joinedActivities: Activity[];
  communities: Array<CommunitySummary & { category: Category; neighborhood: string }>;
  sharedInterests: Interest[];
  sharedActivitiesCount: number;
  sharedCommunitiesCount: number;
  canMessage: boolean;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: PublicUser;
}

export interface ConversationSummary {
  id: string;
  type: 'ACTIVITY' | 'DIRECT';
  title: string;
  activity: {
    id: string;
    title: string;
    date: string;
    status: ActivityStatus;
    neighborhood: string;
  } | null;
  members: PublicUser[];
  otherMembers: PublicUser[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: PublicUser;
  } | null;
  updatedAt: string;
}
