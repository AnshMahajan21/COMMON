import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Globe,
  MapPin,
  Ticket,
  Users,
} from 'lucide-react';
import type { Activity } from '../types/common';
import {
  formatActivityDate,
  formatDayAndMonth,
  formatInr,
  formatTime12h,
  getTintSurfaceClasses,
} from '../lib/api';
import { AvatarStack, SafeImage } from './BrandAndIcons';

export function ActivityCard({ activity }: { activity: Activity }) {
  const tint = getTintSurfaceClasses(activity.tintColor);
  const isEvent = activity.kind === 'EVENT';

  let statusIndicator: { label: string; icon: React.ReactNode; toneClass: string } | null = null;
  if (activity.status === 'CANCELLED') {
    statusIndicator = {
      label: 'Cancelled',
      icon: <Ban className="w-3.5 h-3.5" aria-hidden="true" />,
      toneClass: 'text-[#8C3B2B] font-semibold',
    };
  } else if (activity.isPast) {
    statusIndicator = {
      label: 'Completed',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
      toneClass: 'text-[#5A4D3F] font-medium',
    };
  } else if (activity.isJoined) {
    statusIndicator = {
      label: activity.isOrganiser ? 'Organising' : 'You are going',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
      toneClass: 'text-[#2B3322] font-semibold',
    };
  } else if (activity.isFull) {
    statusIndicator = {
      label: isEvent ? 'Sold out' : 'Full',
      icon: <Users className="w-3.5 h-3.5" aria-hidden="true" />,
      toneClass: 'text-[#7A4E24] font-semibold',
    };
  }

  const remainingRatio =
    isEvent &&
    activity.totalTicketsCapacity &&
    activity.totalTicketsCapacity > 0 &&
    activity.totalTicketsRemaining !== null
      ? activity.totalTicketsRemaining / activity.totalTicketsCapacity
      : null;

  const fewSpotsLeft =
    activity.status === 'ACTIVE' &&
    !activity.isPast &&
    !activity.isFull &&
    remainingRatio !== null &&
    remainingRatio > 0 &&
    remainingRatio < 0.2;

  if (isEvent) {
    const dateParts = formatDayAndMonth(activity.date);
    const priceLabel = activity.isFree ? 'Free' : `From ${formatInr(activity.minPriceInr)}`;

    return (
      <Link
        to={`/activities/${activity.id}`}
        className={`group flex flex-col justify-between rounded-3xl bg-[#FEFAE0] border ${tint.border} overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#2B3322] ${
          activity.status === 'CANCELLED' ? 'opacity-80' : ''
        }`}
      >
        <div>
          {/* Taller Image-Led Cover */}
          <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-[#E9EDC9]">
            <SafeImage
              src={activity.imageUrl}
              alt={`${activity.title} in ${activity.neighborhood}`}
              fallbackLabel={activity.category.name}
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                activity.status === 'CANCELLED' ? 'opacity-65 grayscale-[35%]' : ''
              }`}
            />

            {/* Date Block (Big Day Number + Small Month) */}
            <div className="absolute top-3 left-3 rounded-2xl bg-[#FEFAE0]/95 border border-[#D7DEB0] px-3 py-2 text-center shadow-sm min-w-[52px]">
              <span className="block text-xl font-bold leading-none text-[#2B3322] tabular-nums">
                {dateParts.day}
              </span>
              <span className="mt-1 block text-[10px] font-semibold tracking-wider text-[#5A4D3F]">
                {dateParts.month}
              </span>
            </div>

            {/* Price Summary */}
            <div className="absolute top-3 right-3 rounded-xl bg-[#2B3322]/90 text-[#FEFAE0] px-3 py-1.5 text-xs font-semibold tabular-nums shadow-sm">
              {priceLabel}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5A4D3F]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#2B3322]">
                <Flag className="w-3.5 h-3.5 text-[#A66C3E]" aria-hidden="true" />
                Event · {activity.category.name}
              </span>
              {fewSpotsLeft && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#8C3B2B]">Few spots left</span>
                </>
              )}
              {statusIndicator && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={`inline-flex items-center gap-1 ${statusIndicator.toneClass}`}>
                    {statusIndicator.icon}
                    {statusIndicator.label}
                  </span>
                </>
              )}
            </div>

            <h3 className="mt-2 text-lg font-bold leading-snug text-[#2B3322] line-clamp-2">
              {activity.title}
            </h3>

            {activity.tagline && (
              <p className="mt-1 text-xs text-[#5A4D3F] line-clamp-1">{activity.tagline}</p>
            )}

            <p className="mt-2 text-sm text-[#4A4238] tabular-nums">
              {dateParts.weekday}, {formatActivityDate(activity.date)} · {formatTime12h(activity.startTime)}
            </p>
            <p className="mt-0.5 text-xs text-[#5A4D3F] truncate">
              {activity.venueName || activity.neighborhood}
              {activity.venueName && activity.neighborhood ? ` · ${activity.neighborhood}` : ''}
            </p>
          </div>
        </div>

        <div className="mx-4 sm:mx-5 mb-4 pt-3 border-t border-[#2B3322]/10 flex items-center justify-between gap-3">
          <AvatarStack
            users={activity.participants}
            totalCount={activity.participantCount}
          />
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B3322] shrink-0">
            <Ticket className="w-3.5 h-3.5 text-[#A66C3E]" aria-hidden="true" />
            {activity.status === 'CANCELLED'
              ? 'Cancelled'
              : activity.isFull
              ? 'Sold out'
              : 'Tickets'}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/activities/${activity.id}`}
      className={`group flex flex-col justify-between rounded-3xl ${tint.bg} border ${tint.border} p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#2B3322]`}
    >
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F7F5EE]">
          <SafeImage
            src={activity.imageUrl}
            alt={`${activity.title} in ${activity.neighborhood}`}
            fallbackLabel={activity.category.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              activity.status === 'CANCELLED' ? 'opacity-65 grayscale-[30%]' : ''
            }`}
          />
        </div>

        <div className="px-1 pt-3.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5A4D3F]">
            <span className="font-medium text-[#2B3322]">{activity.category.name}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {activity.activityType === 'ONLINE' ? (
                <>
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  Online
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  In-Person
                </>
              )}
            </span>
            {statusIndicator && (
              <>
                <span aria-hidden="true">·</span>
                <span className={`inline-flex items-center gap-1 ${statusIndicator.toneClass}`}>
                  {statusIndicator.icon}
                  {statusIndicator.label}
                </span>
              </>
            )}
          </div>

          <h3 className="mt-1.5 text-lg font-semibold leading-snug text-[#2B3322] line-clamp-2">
            {activity.title}
          </h3>

          <p className="mt-1 text-sm text-[#4A4238] tabular-nums">
            {formatActivityDate(activity.date)} · {formatTime12h(activity.startTime)}
          </p>
          <p className="mt-0.5 text-xs text-[#5A4D3F] truncate">
            {activity.neighborhood}
            {activity.organiser ? ` · Hosted by ${activity.organiser.fullName}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 pb-0.5 pt-2 border-t border-[#2B3322]/10">
        <AvatarStack
          users={activity.participants}
          totalCount={activity.participantCount}
          capacity={activity.capacity}
        />
        <span
          aria-hidden="true"
          className="w-9 h-9 rounded-full bg-[#FEFAE0]/90 text-[#2B3322] inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

export function ActivityCardSkeleton() {
  return (
    <div className="rounded-3xl bg-[#E9EDC9]/60 border border-[#D7DEB0] p-3.5 animate-pulse">
      <div className="aspect-[4/3] w-full rounded-2xl bg-[#CCD5AE]/60" />
      <div className="px-1 pt-3.5 space-y-2.5">
        <div className="h-3 w-36 rounded bg-[#CCD5AE]/70" />
        <div className="h-5 w-4/5 rounded bg-[#CCD5AE]/80" />
        <div className="h-4 w-2/3 rounded bg-[#CCD5AE]/60" />
        <div className="pt-3 flex items-center justify-between">
          <div className="h-7 w-28 rounded-full bg-[#CCD5AE]/70" />
          <div className="h-9 w-9 rounded-full bg-[#CCD5AE]/70" />
        </div>
      </div>
    </div>
  );
}
