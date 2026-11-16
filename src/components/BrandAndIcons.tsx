import React, { useState } from 'react';
import type { PublicUser } from '../types/common';

export function CommonLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="15" fill="#D4A373" />
        <circle cx="12.5" cy="16" r="6" fill="#FEFAE0" fillOpacity="0.92" />
        <circle cx="19.5" cy="16" r="6" fill="#CCD5AE" fillOpacity="0.9" />
      </svg>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-[#2B3322]">
          COMMON
        </span>
      )}
    </span>
  );
}

export function HeadingWithAccent({
  prefix,
  accent,
  suffix = '',
  as: Tag = 'h2',
  className = '',
}: {
  prefix: string;
  accent: string;
  suffix?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <Tag className={`tracking-tight text-[#2B3322] ${className}`}>
      {prefix}{' '}
      <span className="font-serif-accent font-normal text-[#4E5A3C]">{accent}</span>
      {suffix ? ` ${suffix}` : ''}
    </Tag>
  );
}

/**
 * Abstract organic geometric glyphs matching the visual reference circular category chips.
 */
export function CategoryGlyph({
  icon,
  className = 'w-6 h-6',
}: {
  icon: string;
  className?: string;
}) {
  switch (icon) {
    case 'trophy':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="16" cy="16" r="10" opacity="0.25" />
          <path d="M16 4l2.8 8.2L27 15l-8.2 2.8L16 26l-2.8-8.2L5 15l8.2-2.8L16 4z" />
        </svg>
      );
    case 'trees':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="11" cy="13" r="6" />
          <circle cx="21" cy="13" r="6" opacity="0.75" />
          <circle cx="16" cy="21" r="6" opacity="0.88" />
        </svg>
      );
    case 'coffee':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <path d="M7 11h14v8a7 7 0 01-14 0v-8z" />
          <path d="M21 13h2.5a3.5 3.5 0 010 7H21" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="9" y="5" width="2" height="4" rx="1" />
          <rect x="15" y="5" width="2" height="4" rx="1" />
        </svg>
      );
    case 'palette':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <path d="M16 5a11 11 0 100 22c1.8 0 3-1.2 3-2.6 0-.7-.3-1.3-.7-1.8-.4-.5-.7-1-.7-1.6 0-1.2 1-2 2.2-2H22a5 5 0 005-5C27 9.5 22 5 16 5z" opacity="0.85" />
          <circle cx="11.5" cy="13" r="1.8" fill="#FEFAE0" />
          <circle cx="16.5" cy="10.5" r="1.8" fill="#FEFAE0" />
          <circle cx="21" cy="13.5" r="1.8" fill="#FEFAE0" />
        </svg>
      );
    case 'music':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <path d="M7 8l9 8-9 8V8z" />
          <path d="M25 8l-9 8 9 8V8z" opacity="0.7" />
        </svg>
      );
    case 'camera':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <rect x="5" y="9" width="22" height="16" rx="5" opacity="0.85" />
          <circle cx="16" cy="17" r="4.5" fill="#FEFAE0" />
          <rect x="11" y="6" width="10" height="3" rx="1.5" />
        </svg>
      );
    case 'gamepad':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="11" cy="11" r="4.5" />
          <circle cx="21" cy="11" r="4.5" opacity="0.75" />
          <circle cx="11" cy="21" r="4.5" opacity="0.75" />
          <circle cx="21" cy="21" r="4.5" />
        </svg>
      );
    case 'book':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <path d="M6 7c4 0 8 1.4 10 3.5C18 8.4 22 7 26 7v17c-4 0-8 1.2-10 3-2-1.8-6-3-10-3V7z" opacity="0.85" />
        </svg>
      );
    case 'compass':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="16" cy="16" r="11" opacity="0.25" />
          <path d="M21 11l-3.2 8.2L9.5 22l3.2-8.2L21 11z" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="21" cy="13" r="3.5" opacity="0.7" />
          <path d="M5 25c0-3.8 3.2-6.5 7-6.5s7 2.7 7 6.5H5z" />
          <path d="M18 25c.6-2.8 2.8-4.8 5.5-4.8 2.2 0 4 1.8 4.5 4.8H18z" opacity="0.7" />
        </svg>
      );
    case 'graduation':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <path d="M16 6l12 6-12 6-12-6 12-6z" />
          <path d="M8 15v6c0 2.5 3.6 4.5 8 4.5s8-2 8-4.5v-6l-8 4-8-4z" opacity="0.75" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="16" cy="9" r="5" />
          <circle cx="9.5" cy="19" r="5" opacity="0.8" />
          <circle cx="22.5" cy="19" r="5" opacity="0.8" />
        </svg>
      );
  }
}

const TONE_MAP: Record<string, { bg: string; text: string }> = {
  sage: { bg: 'bg-[#CCD5AE]', text: 'text-[#2B3322]' },
  peach: { bg: 'bg-[#FAEDCD]', text: 'text-[#4A3B2C]' },
  earth: { bg: 'bg-[#D4A373]', text: 'text-[#FEFAE0]' },
  'light-sage': { bg: 'bg-[#E9EDC9]', text: 'text-[#2B3322]' },
  cream: { bg: 'bg-[#FEFAE0]', text: 'text-[#4A4238]' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function Avatar({
  user,
  size = 'md',
  className = '',
}: {
  user: Pick<PublicUser, 'fullName' | 'avatarUrl' | 'avatarTone'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass =
    size === 'xs'
      ? 'w-7 h-7 text-[10px]'
      : size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'md'
      ? 'w-11 h-11 text-sm'
      : size === 'lg'
      ? 'w-14 h-14 text-base'
      : 'w-20 h-20 text-xl';

  const tone = TONE_MAP[user.avatarTone] || TONE_MAP.sage;

  if (user.avatarUrl && !imgFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.fullName} avatar`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border-2 border-[#FEFAE0] shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={`${user.fullName} avatar`}
      className={`${sizeClass} ${tone.bg} ${tone.text} rounded-full inline-flex items-center justify-center font-semibold tracking-tight border-2 border-[#FEFAE0] shrink-0 select-none ${className}`}
    >
      {getInitials(user.fullName)}
    </span>
  );
}

export function AvatarStack({
  users,
  totalCount,
  capacity,
  label = 'going',
}: {
  users: PublicUser[];
  totalCount: number;
  capacity?: number | null;
  label?: string;
}) {
  const visible = users.slice(0, 3);
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex -space-x-2 shrink-0">
        {visible.map((u) => (
          <Avatar key={u.id} user={u} size="xs" />
        ))}
      </div>
      <span className="text-xs font-medium text-[#4A4238] tabular-nums truncate">
        {totalCount} {label}
        {capacity ? ` · ${Math.max(capacity - totalCount, 0)} left` : ''}
      </span>
    </div>
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'COMMON',
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E9EDC9] via-[#FAEDCD] to-[#CCD5AE] text-[#4A4238] p-4 ${className}`}
      >
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="14" stroke="#5A4D3F" strokeWidth="1.5" opacity="0.4" />
          <circle cx="13" cy="16" r="5" fill="#D4A373" opacity="0.6" />
          <circle cx="19" cy="16" r="5" fill="#2B3322" opacity="0.25" />
        </svg>
        <span className="mt-2 text-xs font-medium text-[#5A4D3F] text-center line-clamp-1">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
