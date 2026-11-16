import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Ban,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  Globe,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  UsersRound,
} from 'lucide-react';
import {
  apiFetch,
  formatActivityDate,
  formatInr,
  formatTime12h,
  getTintSurfaceClasses,
} from '../lib/api';
import type { Activity } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, SafeImage } from '../components/BrandAndIcons';

const LazyMiniVenueMap = React.lazy(() =>
  import('../components/CommonMap').then((m) => ({ default: m.MiniVenueMap }))
);

function renderEditorialTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return title;
  const last = words.pop();
  return (
    <>
      {words.join(' ')}{' '}
      <span className="font-serif-accent font-normal text-[#4E5A3C]">{last}</span>
    </>
  );
}

function useCountdownText(targetIso: string, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);

  return useMemo(() => {
    if (!enabled) return null;
    const diffMs = new Date(targetIso).getTime() - now;
    if (diffMs <= 0) return null;
    const totalMins = Math.floor(diffMs / 60_000);
    const days = Math.floor(totalMins / (60 * 24));
    const hours = Math.floor((totalMins % (60 * 24)) / 60);
    const mins = totalMins % 60;
    if (days > 0) return `${days}d · ${hours}h to go`;
    if (hours > 0) return `${hours}h · ${mins}m to go`;
    return `${mins} mins to go`;
  }, [targetIso, enabled, now]);
}

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ activity: Activity }>(`/api/activities/${id}`);
      setActivity(data.activity);
      const firstAvailable =
        data.activity.ticketTiers.find((t) => t.remaining > 0) || data.activity.ticketTiers[0];
      if (firstAvailable) {
        setSelectedTierId(firstAvailable.id);
      }
    } catch (err: any) {
      setError(err.message || 'Gathering not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const countdown = useCountdownText(
    activity?.date || '',
    Boolean(activity && activity.kind === 'EVENT' && activity.status === 'ACTIVE' && !activity.isPast)
  );

  const handleJoin = async () => {
    if (!activity) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/activities/${activity.id}`)}`);
      return;
    }

    setActionBusy(true);
    setFeedback(null);
    try {
      const data = await apiFetch<{ activity: Activity }>(`/api/activities/${activity.id}/join`, {
        method: 'POST',
      });
      setActivity(data.activity);
      setFeedback({ type: 'success', text: 'You are in! Your spot is confirmed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Unable to join right now.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!activity || !user) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      const data = await apiFetch<{ activity: Activity }>(`/api/activities/${activity.id}/leave`, {
        method: 'POST',
      });
      setActivity(data.activity);
      setFeedback({ type: 'success', text: 'You have left this gathering.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Unable to leave right now.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelActivity = async () => {
    if (!activity) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      const data = await apiFetch<{ activity: Activity; refundedTicketsCount?: number }>(
        `/api/activities/${activity.id}/cancel`,
        { method: 'POST' }
      );
      setActivity(data.activity);
      setConfirmCancel(false);
      setFeedback({
        type: 'success',
        text:
          data.refundedTicketsCount && data.refundedTicketsCount > 0
            ? `Cancelled. ${data.refundedTicketsCount} active ticket${
                data.refundedTicketsCount === 1 ? '' : 's'
              } were automatically marked as Refunded.`
            : 'This listing has been marked as Cancelled. Participants can still see the update.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Could not cancel listing.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenChat = async () => {
    if (!activity) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/activities/${activity.id}`)}`);
      return;
    }
    setActionBusy(true);
    try {
      const data = await apiFetch<{ conversationId: string }>(
        `/api/conversations/activity/${activity.id}`,
        { method: 'POST' }
      );
      navigate(`/messages?conversation=${encodeURIComponent(data.conversationId)}`);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Could not open group chat.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      setFeedback({ type: 'success', text: 'Share link ready in your address bar.' });
    }
  };

  const handleGetTickets = () => {
    if (!activity) return;
    const tierQuery = selectedTierId ? `?tier=${encodeURIComponent(selectedTierId)}` : '';
    const target = `/events/${activity.id}/checkout${tierQuery}`;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-6 w-32 rounded bg-[#E9EDC9]" />
        <div className="h-72 sm:h-96 w-full rounded-3xl bg-[#E9EDC9]" />
        <div className="h-10 w-2/3 rounded bg-[#CCD5AE]" />
        <div className="h-32 w-full rounded-3xl bg-[#FEFAE0]" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
        <h1 className="text-2xl font-bold text-[#2B3322]">Gathering unavailable</h1>
        <p className="mt-2 text-sm text-[#5A4D3F]">
          {error || 'This listing may have been removed or does not exist.'}
        </p>
        <Link
          to="/activities"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to discover
        </Link>
      </div>
    );
  }

  const isEvent = activity.kind === 'EVENT';
  const tint = getTintSurfaceClasses(activity.tintColor);
  const spotsLeft =
    isEvent && activity.totalTicketsRemaining !== null
      ? activity.totalTicketsRemaining
      : activity.capacity !== null
      ? Math.max(activity.capacity - activity.participantCount, 0)
      : null;

  const selectedTier =
    activity.ticketTiers.find((t) => t.id === selectedTierId) || activity.ticketTiers[0];
  const hasAvailableTier = activity.ticketTiers.some((t) => t.remaining > 0);
  const canManage = activity.isOrganiser || user?.role === 'ADMIN';

  const canJoinActivity =
    activity.status === 'ACTIVE' &&
    !activity.isPast &&
    !activity.isJoined &&
    !activity.isFull;

  const renderPrimaryAction = (fullWidth = false) => {
    const baseBtn = `${
      fullWidth ? 'w-full' : ''
    } min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors whitespace-nowrap`;

    if (activity.status === 'CANCELLED') {
      return (
        <button
          type="button"
          disabled
          className={`${baseBtn} bg-[#E4DEC3] text-[#5A4D3F] cursor-not-allowed`}
        >
          <Ban className="w-4 h-4" aria-hidden="true" />
          {isEvent ? 'Event Cancelled' : 'Activity Cancelled'}
        </button>
      );
    }

    if (activity.isPast) {
      return (
        <button
          type="button"
          disabled
          className={`${baseBtn} bg-[#E4DEC3] text-[#5A4D3F] cursor-not-allowed`}
        >
          <Clock className="w-4 h-4" aria-hidden="true" />
          {isEvent ? 'Event Completed' : 'Activity Completed'}
        </button>
      );
    }

    if (isEvent) {
      if (activity.isFull || !hasAvailableTier) {
        return (
          <button
            type="button"
            disabled
            className={`${baseBtn} bg-[#E4DEC3] text-[#5A4D3F] cursor-not-allowed`}
          >
            Sold out
          </button>
        );
      }

      const tierDisabled = selectedTier ? selectedTier.remaining <= 0 : false;
      const ctaText = selectedTier
        ? selectedTier.priceInr === 0
          ? 'Get free ticket'
          : `Get tickets · ${formatInr(selectedTier.priceInr)}`
        : 'Get tickets';

      return (
        <button
          type="button"
          disabled={tierDisabled}
          onClick={handleGetTickets}
          className={`${baseBtn} bg-[#2B3322] text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-50`}
        >
          <Ticket className="w-4 h-4" aria-hidden="true" />
          {user ? ctaText : `Sign in · ${ctaText}`}
        </button>
      );
    }

    if (activity.isOrganiser) {
      return (
        <Link
          to={`/activities/${activity.id}/edit`}
          className={`${baseBtn} bg-[#2B3322] text-[#FEFAE0] hover:bg-[#3B462F]`}
        >
          <Edit3 className="w-4 h-4" aria-hidden="true" />
          Edit Activity
        </Link>
      );
    }

    if (activity.isJoined) {
      return (
        <button
          type="button"
          disabled={actionBusy}
          onClick={handleLeave}
          className={`${baseBtn} bg-[#FEFAE0] border border-[#2B3322] text-[#2B3322] hover:bg-[#FAEDCD] disabled:opacity-60`}
        >
          {actionBusy ? 'Updating...' : 'Leave Activity'}
        </button>
      );
    }

    if (activity.isFull) {
      return (
        <button
          type="button"
          disabled
          className={`${baseBtn} bg-[#E4DEC3] text-[#5A4D3F] cursor-not-allowed`}
        >
          Activity Full
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={actionBusy || !canJoinActivity}
        onClick={handleJoin}
        className={`${baseBtn} bg-[#2B3322] text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-60`}
      >
        {actionBusy ? 'Joining...' : user ? 'Join Activity' : 'Sign in to Join'}
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/activities"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to discover
        </Link>

        <button
          type="button"
          onClick={handleShare}
          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-4 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9] transition-colors"
        >
          {copiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#5E7446]" aria-hidden="true" />
              Link copied
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              Share
            </>
          )}
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-[#E9EDC9] border-[#B9C496] text-[#2B3322]'
              : 'bg-[#FAEDCD] border-[#D4A373] text-[#8C3B2B]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Hero Section (Full-bleed cream fade for Events, clean rounded banner for Activities) */}
      {isEvent ? (
        <div className="relative rounded-3xl overflow-hidden border border-[#D7DEB0] bg-[#E9EDC9]">
          <div className="relative h-72 sm:h-96 lg:h-[430px] w-full">
            <SafeImage
              src={activity.imageUrl}
              alt={`${activity.title} in ${activity.neighborhood}`}
              fallbackLabel={activity.category.name}
              className={`w-full h-full object-cover ${
                activity.status === 'CANCELLED' ? 'opacity-65 grayscale-[35%]' : ''
              }`}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#FEFAE0] via-[#FEFAE0]/75 to-transparent" />
          </div>

          <div className="relative -mt-20 px-6 sm:px-8 pb-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5A4D3F]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#2B3322]">
                <Flag className="w-3.5 h-3.5 text-[#A66C3E]" aria-hidden="true" />
                Event · {activity.category.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activity.isFree ? 'Free entry' : `From ${formatInr(activity.minPriceInr)}`}</span>
              {countdown && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#2B3322] tabular-nums">{countdown}</span>
                </>
              )}
              {activity.status === 'CANCELLED' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8C3B2B] font-semibold">Cancelled (tickets refunded)</span>
                </>
              )}
            </div>

            <h1 className="mt-2.5 text-3xl sm:text-4xl font-bold tracking-tight text-[#2B3322] leading-[1.14]">
              {renderEditorialTitle(activity.title)}
            </h1>

            {activity.tagline && (
              <p className="mt-2 text-base text-[#4A4238] max-w-2xl">{activity.tagline}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden border border-[#D7DEB0] bg-[#E9EDC9] h-64 sm:h-80 lg:h-[380px]">
          <SafeImage
            src={activity.imageUrl}
            alt={`${activity.title} in ${activity.neighborhood}`}
            fallbackLabel={activity.category.name}
            className={`w-full h-full object-cover ${
              activity.status === 'CANCELLED' ? 'opacity-65 grayscale-[30%]' : ''
            }`}
          />
        </div>
      )}

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* About Card */}
          <div className={`rounded-3xl ${isEvent ? 'bg-[#FEFAE0]' : tint.bg} border ${tint.border} p-6 sm:p-8`}>
            {!isEvent && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5A4D3F]">
                  <span className="text-[#2B3322] font-semibold">{activity.category.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    {activity.activityType === 'ONLINE' ? (
                      <>
                        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                        Online Session
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        In-Person Gathering
                      </>
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  {activity.status === 'CANCELLED' ? (
                    <span className="inline-flex items-center gap-1 text-[#8C3B2B] font-semibold">
                      <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                      Cancelled
                    </span>
                  ) : activity.isPast ? (
                    <span className="inline-flex items-center gap-1 text-[#5A4D3F] font-semibold">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      Completed
                    </span>
                  ) : activity.isFull ? (
                    <span className="inline-flex items-center gap-1 text-[#7A4E24] font-semibold">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      Full
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#2B3322] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Open to join
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#2B3322]">
                  {renderEditorialTitle(activity.title)}
                </h1>
              </>
            )}

            {isEvent && (
              <h2 className="text-lg font-semibold text-[#2B3322]">About this event</h2>
            )}

            <p className={`${isEvent ? 'mt-3' : 'mt-4'} text-base text-[#3A352D] leading-relaxed whitespace-pre-line`}>
              {activity.description}
            </p>

            {activity.community && (
              <div className="mt-6 pt-5 border-t border-[#2B3322]/10 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-[#5A4D3F]">
                  <UsersRound className="w-4 h-4" aria-hidden="true" />
                  Hosted with{' '}
                  <Link
                    to={`/communities/${activity.community.slug}`}
                    className="font-semibold text-[#2B3322] hover:underline"
                  >
                    {activity.community.name}
                  </Link>
                </span>
              </div>
            )}
          </div>

          {/* Vertical Agenda Timeline (for Events) */}
          {isEvent && activity.agendaItems.length > 0 && (
            <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#2B3322] mb-5">Schedule &amp; Agenda</h2>
              <ol className="relative border-l-2 border-[#CCD5AE] ml-2.5 space-y-5 pl-6">
                {activity.agendaItems.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[#CCD5AE] border-2 border-[#2B3322]"
                    />
                    <p className="text-xs font-semibold text-[#5A4D3F] tabular-nums">
                      {formatTime12h(item.time)}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-[#2B3322]">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-xs text-[#4A4238] leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Mini Venue Map (for In-Person listings) */}
          {activity.activityType === 'IN_PERSON' && activity.latitude !== null && activity.longitude !== null && (
            <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[#2B3322]">Venue &amp; Directions</h2>
                <p className="text-sm text-[#4A4238] mt-0.5">
                  {activity.venueName || activity.location}
                </p>
              </div>
              <Suspense
                fallback={
                  <div className="h-52 rounded-2xl bg-[#E9EDC9]/70 animate-pulse" />
                }
              >
                <LazyMiniVenueMap
                  latitude={activity.latitude}
                  longitude={activity.longitude}
                  title={activity.title}
                  address={activity.fullAddress || activity.location}
                  tintColor={activity.tintColor}
                />
              </Suspense>
            </section>
          )}

          {/* Participants Section */}
          <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#2B3322]">People going</h2>
                {activity.sharedInterestParticipantsCount > 0 && (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#4E5A3C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#A66C3E]" aria-hidden="true" />
                    {activity.sharedInterestParticipantsCount}{' '}
                    {activity.sharedInterestParticipantsCount === 1 ? 'person' : 'people'} who share your interests{' '}
                    {activity.sharedInterestParticipantsCount === 1 ? 'is' : 'are'} going
                  </p>
                )}
              </div>
              <span className="text-sm font-medium text-[#5A4D3F] tabular-nums">
                {activity.participantCount} going
              </span>
            </div>

            {activity.participants.length === 0 ? (
              <p className="mt-3 text-sm text-[#5A4D3F]">
                No participants have joined yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activity.participants.map((person) => (
                  <Link
                    key={person.id}
                    to={`/people/${person.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-[#F7F5EE] border border-[#E4DEC3] p-3 hover:bg-[#E9EDC9]/60 transition-colors"
                  >
                    <Avatar user={person} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2B3322] truncate">
                        {person.fullName}
                        {person.id === activity.organiser.id ? ' (Organiser)' : ''}
                      </p>
                      <p className="text-xs text-[#5A4D3F] truncate">{person.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Refund Policy (for Events) */}
          {isEvent && activity.refundPolicy && (
            <section className="rounded-3xl bg-[#F7F5EE] border border-[#E4DEC3] p-5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#5E7446] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-[#2B3322]">Refund policy</h2>
                <p className="mt-1 text-xs text-[#5A4D3F] leading-relaxed">
                  {activity.refundPolicy}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Right Logistics & Ticket Tier Panel */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-5">
            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#5A4D3F] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#2B3322] tabular-nums">
                    {formatActivityDate(activity.date)}
                  </p>
                  <p className="text-[#5A4D3F] tabular-nums">
                    {formatTime12h(activity.startTime)}
                    {activity.endTime
                      ? ` – ${formatTime12h(activity.endTime)}`
                      : activity.durationMins
                      ? ` · ${activity.durationMins} mins`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {activity.activityType === 'ONLINE' ? (
                  <Globe className="w-4 h-4 text-[#5A4D3F] mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#5A4D3F] mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <p className="font-semibold text-[#2B3322]">{activity.neighborhood}</p>
                  <p className="text-[#5A4D3F]">
                    {activity.fullAddress || activity.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-[#5A4D3F] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#2B3322] tabular-nums">
                    {activity.participantCount} going
                  </p>
                  <p className="text-[#5A4D3F] tabular-nums">
                    {spotsLeft !== null
                      ? `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} remaining`
                      : 'Open capacity'}
                  </p>
                </div>
              </div>
            </div>

            {/* Event Ticket Tier Cards */}
            {isEvent && activity.ticketTiers.length > 0 && (
              <div className="pt-4 border-t border-[#E4DEC3] space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5A4D3F]">
                  Select ticket tier
                </p>
                <div className="space-y-2.5">
                  {activity.ticketTiers.map((tier) => {
                    const soldOut = tier.remaining <= 0;
                    const disabled =
                      soldOut || activity.status === 'CANCELLED' || activity.isPast;
                    const isSelected = selectedTier?.id === tier.id && !disabled;

                    return (
                      <motion.button
                        key={tier.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedTierId(tier.id)}
                        animate={
                          isSelected && !prefersReducedMotion
                            ? { scale: 1.015 }
                            : { scale: 1 }
                        }
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className={`w-full text-left rounded-2xl p-3.5 border transition-colors ${
                          disabled
                            ? 'bg-[#F7F5EE]/70 border-[#E4DEC3] opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#E9EDC9]/75 border-2 border-[#D4A373] shadow-xs'
                            : 'bg-[#F7F5EE] border-[#D7DEB0] hover:bg-[#E9EDC9]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#2B3322]">{tier.name}</p>
                            {tier.description && (
                              <p className="mt-0.5 text-xs text-[#5A4D3F] leading-snug">
                                {tier.description}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#2B3322] tabular-nums shrink-0">
                            {formatInr(tier.priceInr)}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] font-medium text-[#5A4D3F] tabular-nums">
                          {soldOut
                            ? 'Sold out'
                            : `${tier.remaining} of ${tier.quantity} left`}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Host / Organiser Row */}
            <div className="pt-4 border-t border-[#E4DEC3]">
              <p className="text-xs font-medium text-[#5A4D3F] mb-2">
                {activity.hostName && activity.hostName !== activity.organiser.fullName
                  ? `Hosted by ${activity.hostName}`
                  : 'Organised by'}
              </p>
              <Link
                to={`/people/${activity.organiser.id}`}
                className="flex items-center gap-3 rounded-2xl bg-[#F7F5EE] p-3 hover:bg-[#E9EDC9]/70 transition-colors"
              >
                <Avatar user={activity.organiser} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2B3322] truncate">
                    {activity.organiser.fullName}
                  </p>
                  <p className="text-xs text-[#5A4D3F] truncate">
                    {activity.organiser.location}
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Primary CTA */}
            <div className="hidden md:block pt-2 space-y-2.5">
              {renderPrimaryAction(true)}

              {(activity.isJoined || activity.isOrganiser) && (
                <button
                  type="button"
                  onClick={handleOpenChat}
                  disabled={actionBusy}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#E9EDC9] border border-[#D7DEB0] px-5 py-2.5 text-sm font-medium text-[#2B3322] hover:bg-[#CCD5AE] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  {isEvent ? 'Event Group Chat' : 'Activity Group Chat'}
                </button>
              )}
            </div>

            {/* Organiser / Admin Management Controls */}
            {canManage && (
              <div className="pt-3 border-t border-[#E4DEC3] space-y-2.5">
                {isEvent && (
                  <Link
                    to={`/activities/${activity.id}/manage`}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#FAEDCD] border border-[#D4A373] px-4 py-2.5 text-xs font-semibold text-[#2B3322] hover:bg-[#F3DFB1]"
                  >
                    <BarChart3 className="w-4 h-4" aria-hidden="true" />
                    Sales &amp; Ticket Check-In
                  </Link>
                )}

                {activity.status === 'ACTIVE' && !activity.isPast && (
                  <>
                    {isEvent && (
                      <Link
                        to={`/activities/${activity.id}/edit`}
                        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full border border-[#D7DEB0] bg-[#F7F5EE] px-4 py-2 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9]"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit Event
                      </Link>
                    )}

                    {!confirmCancel ? (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                        className="w-full text-center text-xs font-medium text-[#8C3B2B] hover:underline py-1.5"
                      >
                        Cancel this {isEvent ? 'event' : 'activity'}
                      </button>
                    ) : (
                      <div className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] p-3.5 space-y-2.5">
                        <p className="text-xs text-[#4A4238]">
                          Cancel this {isEvent ? 'event' : 'activity'}?{' '}
                          {isEvent
                            ? 'All valid tickets and paid orders will automatically be marked Refunded.'
                            : 'It will remain visible with a Cancelled status so participants know.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={handleCancelActivity}
                            className="flex-1 min-h-[40px] rounded-xl bg-[#8C3B2B] px-3 py-2 text-xs font-semibold text-[#FEFAE0]"
                          >
                            Confirm cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancel(false)}
                            className="flex-1 min-h-[40px] rounded-xl bg-[#FEFAE0] px-3 py-2 text-xs font-medium text-[#2B3322]"
                          >
                            Keep active
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Liquid-Glass Pinned Action Bar */}
      <div className="md:hidden fixed bottom-20 left-3 right-3 z-30 flex items-center gap-2 rounded-3xl liquid-glass p-2.5 shadow-lg">
        <div className="flex-1">{renderPrimaryAction(true)}</div>
        {(activity.isJoined || activity.isOrganiser) && (
          <button
            type="button"
            onClick={handleOpenChat}
            aria-label="Open group chat"
            className="min-h-[46px] min-w-[46px] rounded-full bg-[#E9EDC9] text-[#2B3322] inline-flex items-center justify-center shrink-0"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
