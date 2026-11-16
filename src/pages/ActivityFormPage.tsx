import React, { Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, Globe, Lock, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ACTIVITY_IMAGE_PRESETS, apiFetch } from '../lib/api';
import type { Activity, Category, Community, ListingKind } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { HeadingWithAccent, SafeImage } from '../components/BrandAndIcons';

const LazyLocationPickerMap = React.lazy(() =>
  import('../components/CommonMap').then((m) => ({ default: m.LocationPickerMap }))
);

interface NeighborhoodPreset {
  name: string;
  latitude: number;
  longitude: number;
}

interface AgendaDraft {
  time: string;
  title: string;
  description: string;
}

interface TierDraft {
  id?: string;
  name: string;
  description: string;
  priceInr: string;
  quantity: string;
  minQuantity?: number;
  lockedPrice?: boolean;
}

export function ActivityFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [presets, setPresets] = useState<NeighborhoodPreset[]>([]);

  const [kind, setKind] = useState<ListingKind>('ACTIVITY');
  const [hasTicketSales, setHasTicketSales] = useState(false);

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activityType, setActivityType] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:30');
  const [durationMins, setDurationMins] = useState('90');
  const [neighborhood, setNeighborhood] = useState('Lodhi Colony');
  const [location, setLocation] = useState('');
  const [venueName, setVenueName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(28.5918);
  const [longitude, setLongitude] = useState<number>(77.2197);
  const [capacity, setCapacity] = useState('14');
  const [communityId, setCommunityId] = useState('');
  const [hostName, setHostName] = useState('');
  const [refundPolicy, setRefundPolicy] = useState(
    'Full refund up to 24 hours before the event begins. Automatic full refund if cancelled by the organiser.'
  );
  const [imageUrl, setImageUrl] = useState(ACTIVITY_IMAGE_PRESETS[0].url);
  const [tintColor, setTintColor] = useState<'light-sage' | 'sage' | 'peach' | 'cream' | 'earth'>('light-sage');

  const [agendaItems, setAgendaItems] = useState<AgendaDraft[]>([
    { time: '08:00', title: 'Arrival & welcome chai', description: 'Settle in and meet fellow guests.' },
    { time: '08:30', title: 'Main session', description: '' },
  ]);

  const [ticketTiers, setTicketTiers] = useState<TierDraft[]>([
    {
      name: 'General Pass',
      description: 'Includes full entry and community mixer',
      priceInr: '0',
      quantity: '30',
    },
  ]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?next=${encodeURIComponent(mode === 'edit' ? `/activities/${id}/edit` : '/activities/new')}`);
    }
  }, [authLoading, user, navigate, mode, id]);

  useEffect(() => {
    let active = true;
    async function loadMeta() {
      try {
        const [catRes, comRes, locRes] = await Promise.all([
          apiFetch<{ categories: Category[] }>('/api/categories'),
          apiFetch<{ communities: Community[] }>('/api/communities'),
          apiFetch<{ presets: NeighborhoodPreset[] }>('/api/locations'),
        ]);
        if (!active) return;
        setCategories(catRes.categories);
        setCommunities(comRes.communities);
        setPresets(locRes.presets);

        if (mode === 'create') {
          if (catRes.categories[0]) {
            setCategoryId(catRes.categories[0].id);
          }
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 3);
          setDate(tomorrow.toISOString().slice(0, 10));
          setHostName(user?.fullName || '');
          setLoadingInitial(false);
        } else if (id) {
          const actRes = await apiFetch<{ activity: Activity }>(`/api/activities/${id}`);
          if (!active) return;
          const act = actRes.activity;
          if (!act.isOrganiser && user?.role !== 'ADMIN') {
            setError('Only the organiser can edit this listing.');
            setLoadingInitial(false);
            return;
          }
          setKind(act.kind);
          setHasTicketSales(act.hasTicketSales);
          setTitle(act.title);
          setTagline(act.tagline || '');
          setDescription(act.description);
          setCategoryId(act.category.id);
          setActivityType(act.activityType);
          setDate(new Date(act.date).toISOString().slice(0, 10));
          setStartTime(act.startTime);
          setEndTime(act.endTime || '11:00');
          setDurationMins(act.durationMins ? String(act.durationMins) : '');
          setNeighborhood(act.neighborhood);
          setLocation(act.location);
          setVenueName(act.venueName || '');
          setFullAddress(act.fullAddress || '');
          if (typeof act.latitude === 'number') setLatitude(act.latitude);
          if (typeof act.longitude === 'number') setLongitude(act.longitude);
          setCapacity(act.capacity ? String(act.capacity) : '');
          setCommunityId(act.community?.id || '');
          setHostName(act.hostName || act.organiser.fullName);
          setRefundPolicy(act.refundPolicy || '');
          setImageUrl(act.imageUrl || ACTIVITY_IMAGE_PRESETS[0].url);
          setTintColor((act.tintColor as any) || 'light-sage');

          if (act.agendaItems.length > 0) {
            setAgendaItems(
              act.agendaItems.map((item) => ({
                time: item.time,
                title: item.title,
                description: item.description || '',
              }))
            );
          }
          if (act.ticketTiers.length > 0) {
            setTicketTiers(
              act.ticketTiers.map((tier) => ({
                id: tier.id,
                name: tier.name,
                description: tier.description || '',
                priceInr: String(tier.priceInr),
                quantity: String(tier.quantity),
                minQuantity: tier.quantity,
                lockedPrice: act.hasTicketSales,
              }))
            );
          }
          setLoadingInitial(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Could not load form.');
          setLoadingInitial(false);
        }
      }
    }
    if (user) {
      loadMeta();
    }
    return () => {
      active = false;
    };
  }, [user, mode, id]);

  const handleKindSwitch = (nextKind: ListingKind) => {
    if (hasTicketSales) return;
    setKind(nextKind);
    if (nextKind === 'EVENT' && imageUrl === ACTIVITY_IMAGE_PRESETS[0].url) {
      setImageUrl(ACTIVITY_IMAGE_PRESETS[6].url);
    }
  };

  const handleNeighborhoodChange = (val: string) => {
    setNeighborhood(val);
    const matched = presets.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      setLatitude(matched.latitude);
      setLongitude(matched.longitude);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (title.trim().length < 4) {
      setError('Please enter a title (at least 4 characters).');
      return;
    }
    if (description.trim().length < 15) {
      setError('Please add a fuller description (at least 15 characters) so guests know what to expect.');
      return;
    }
    if (!date || !startTime) {
      setError('Please pick a date and start time.');
      return;
    }

    const cleanAgenda =
      kind === 'EVENT'
        ? agendaItems
            .filter((item) => item.title.trim().length >= 2 && item.time.trim().length > 0)
            .map((item) => ({
              time: item.time.trim(),
              title: item.title.trim(),
              description: item.description.trim(),
            }))
        : [];

    const cleanTiers =
      kind === 'EVENT'
        ? ticketTiers
            .filter((t) => t.name.trim().length >= 2)
            .map((t) => ({
              ...(t.id ? { id: t.id } : {}),
              name: t.name.trim(),
              description: t.description.trim(),
              priceInr: Math.max(0, Math.round(Number(t.priceInr) || 0)),
              quantity: Math.max(1, Math.round(Number(t.quantity) || 1)),
            }))
        : [];

    if (kind === 'EVENT' && cleanTiers.length === 0) {
      setError('Events require at least one ticket tier (enter 0 for a free event).');
      return;
    }

    const effectiveLocation =
      kind === 'EVENT' && activityType === 'IN_PERSON'
        ? venueName.trim() || fullAddress.trim() || location.trim()
        : location.trim();

    if (effectiveLocation.length < 3) {
      setError(
        activityType === 'ONLINE'
          ? 'Please provide online session details.'
          : 'Please enter a venue or meeting point.'
      );
      return;
    }

    const payload = {
      kind,
      title: title.trim(),
      tagline: kind === 'EVENT' ? tagline.trim() : '',
      description: description.trim(),
      categoryId,
      activityType,
      date,
      startTime,
      endDate: kind === 'EVENT' ? date : null,
      endTime: kind === 'EVENT' && endTime ? endTime : null,
      durationMins: durationMins.trim() ? Number(durationMins) : null,
      neighborhood: activityType === 'ONLINE' ? 'Online · Delhi-NCR' : neighborhood.trim(),
      location: effectiveLocation,
      venueName: kind === 'EVENT' ? venueName.trim() || effectiveLocation : effectiveLocation,
      fullAddress: kind === 'EVENT' ? fullAddress.trim() || effectiveLocation : effectiveLocation,
      latitude: activityType === 'ONLINE' ? null : latitude,
      longitude: activityType === 'ONLINE' ? null : longitude,
      capacity: kind === 'ACTIVITY' && capacity.trim() ? Number(capacity) : null,
      communityId: communityId || null,
      hostName: hostName.trim() || user?.fullName || '',
      refundPolicy: kind === 'EVENT' ? refundPolicy.trim() : '',
      imageUrl: imageUrl.trim(),
      tintColor,
      agendaItems: cleanAgenda,
      ticketTiers: cleanTiers,
    };

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const res = await apiFetch<{ activity: Activity }>('/api/activities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        navigate(`/activities/${res.activity.id}`);
      } else if (id) {
        const res = await apiFetch<{ activity: Activity }>(`/api/activities/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        navigate(`/activities/${res.activity.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Could not save listing. Please check your fields.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingInitial) {
    return (
      <div className="max-w-3xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 animate-pulse space-y-4">
        <div className="h-8 w-56 rounded bg-[#E9EDC9]" />
        <div className="h-12 w-full rounded-2xl bg-[#E9EDC9]" />
        <div className="h-32 w-full rounded-2xl bg-[#E9EDC9]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <Link
        to={mode === 'edit' && id ? `/activities/${id}` : '/activities'}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {mode === 'edit' ? 'Back to listing' : 'Back to discover'}
      </Link>

      <div>
        <HeadingWithAccent
          as="h1"
          prefix={mode === 'edit' ? 'Edit' : 'Host a'}
          accent={kind === 'EVENT' ? 'Event' : 'Activity'}
          className="text-3xl font-bold"
        />
        <p className="mt-1 text-sm text-[#5A4D3F]">
          {kind === 'EVENT'
            ? 'Organise a scheduled workshop, open mic, trek, or food table with clear agenda & tickets.'
            : 'Keep it casual and welcoming—a morning walk, board game night, or sketchbook coffee.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] px-4 py-3 text-sm font-medium text-[#8C3B2B]"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-6"
      >
        {/* Step 1: Activity or Event? */}
        <div>
          <span className="block text-sm font-semibold text-[#2B3322] mb-2">
            Step 1 · Activity or Event?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={hasTicketSales}
              onClick={() => handleKindSwitch('ACTIVITY')}
              className={`text-left rounded-2xl border p-4 transition-all ${
                kind === 'ACTIVITY'
                  ? 'bg-[#E9EDC9] border-2 border-[#2B3322]'
                  : 'bg-[#F7F5EE] border-[#D7DEB0] hover:bg-[#E9EDC9]/40'
              } ${hasTicketSales ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2B3322]">
                <Sparkles className="w-4 h-4 text-[#5E7446]" aria-hidden="true" />
                Casual Activity
              </div>
              <p className="mt-1 text-xs text-[#5A4D3F]">
                Free small-group hangout like a morning walk, book circle, or badminton set.
              </p>
            </button>

            <button
              type="button"
              disabled={hasTicketSales}
              onClick={() => handleKindSwitch('EVENT')}
              className={`text-left rounded-2xl border p-4 transition-all ${
                kind === 'EVENT'
                  ? 'bg-[#FAEDCD] border-2 border-[#2B3322]'
                  : 'bg-[#F7F5EE] border-[#D7DEB0] hover:bg-[#FAEDCD]/40'
              } ${hasTicketSales ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2B3322]">
                <Flag className="w-4 h-4 text-[#A66C3E]" aria-hidden="true" />
                Organised Event
              </div>
              <p className="mt-1 text-xs text-[#5A4D3F]">
                Scheduled gathering with venue, agenda, free or paid ticket tiers &amp; check-in.
              </p>
            </button>
          </div>
          {hasTicketSales && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#7A4E24]">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              Listing type is locked because tickets have already been issued.
            </p>
          )}
        </div>

        {/* Format: In-Person vs Online */}
        <div>
          <span className="block text-sm font-semibold text-[#2B3322] mb-2">
            Format
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setActivityType('IN_PERSON');
                if (neighborhood.startsWith('Online')) setNeighborhood('Lodhi Colony');
              }}
              className={`min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                activityType === 'IN_PERSON'
                  ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322]'
                  : 'bg-[#F7F5EE] text-[#4A4238] border-[#D7DEB0] hover:bg-[#E9EDC9]'
              }`}
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              In-Person (Delhi-NCR)
            </button>
            <button
              type="button"
              onClick={() => setActivityType('ONLINE')}
              className={`min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                activityType === 'ONLINE'
                  ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322]'
                  : 'bg-[#F7F5EE] text-[#4A4238] border-[#D7DEB0] hover:bg-[#E9EDC9]'
              }`}
            >
              <Globe className="w-4 h-4" aria-hidden="true" />
              Online Session
            </button>
          </div>
        </div>

        {/* Title & Event Tagline */}
        <div className="space-y-4">
          <div>
            <label htmlFor="act-title" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              {kind === 'EVENT' ? 'Event title' : 'Activity title'}
            </label>
            <input
              id="act-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === 'EVENT'
                  ? 'e.g. Shahpur Jat Courtyard Acoustic Open Mic'
                  : 'e.g. Saturday Morning Walk & Chai at Lodhi Garden'
              }
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          {kind === 'EVENT' && (
            <div>
              <label htmlFor="act-tagline" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Short tagline (optional)
              </label>
              <input
                id="act-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Intimate candlelit acoustics, warm ginger chai & new neighbourhood friends"
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Category & Optional Community */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="act-category" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Category
            </label>
            <select
              id="act-category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="act-community" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Host with a community (optional)
            </label>
            <select
              id="act-community"
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              <option value="">Independent gathering</option>
              {communities.map((com) => (
                <option key={com.id} value={com.id}>
                  {com.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="act-desc" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            About this {kind === 'EVENT' ? 'event' : 'activity'}
          </label>
          <textarea
            id="act-desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share the pace, what to expect, what is included, and who will feel at home..."
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        {/* Date, Start Time, End Time / Duration, Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="act-date" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Date
            </label>
            <input
              id="act-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="act-time" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Start time
            </label>
            <input
              id="act-time"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          {kind === 'EVENT' ? (
            <div>
              <label htmlFor="act-endtime" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                End time
              </label>
              <input
                id="act-endtime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="act-duration" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Duration (mins)
              </label>
              <input
                id="act-duration"
                type="number"
                min={15}
                max={720}
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                placeholder="90"
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          )}

          {kind === 'ACTIVITY' ? (
            <div>
              <label htmlFor="act-capacity" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Max people (optional)
              </label>
              <input
                id="act-capacity"
                type="number"
                min={2}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Open"
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="act-host" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Host / Co-host name
              </label>
              <input
                id="act-host"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Aarav & Delhi Sketchers"
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Venue & Location */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activityType === 'IN_PERSON' && (
              <div>
                <label htmlFor="act-neighborhood" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                  Neighbourhood / Area
                </label>
                <select
                  id="act-neighborhood"
                  value={neighborhood}
                  onChange={(e) => handleNeighborhoodChange(e.target.value)}
                  className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
                >
                  {presets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {kind === 'EVENT' && activityType === 'IN_PERSON' ? (
              <div>
                <label htmlFor="act-venue-name" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                  Venue name
                </label>
                <input
                  id="act-venue-name"
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Neem Courtyard Studio"
                  className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
                />
              </div>
            ) : (
              <div className={activityType === 'ONLINE' ? 'sm:col-span-2' : ''}>
                <label htmlFor="act-location" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                  {activityType === 'ONLINE' ? 'Online room details' : 'Exact meeting point'}
                </label>
                <input
                  id="act-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={
                    activityType === 'ONLINE'
                      ? 'e.g. Video link shared in group chat 15 mins before'
                      : 'e.g. Lodhi Garden Gate 1 near Khan Market'
                  }
                  className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
                />
              </div>
            )}
          </div>

          {kind === 'EVENT' && activityType === 'IN_PERSON' && (
            <div>
              <label htmlFor="act-full-address" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Full venue address
              </label>
              <input
                id="act-full-address"
                type="text"
                required
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="e.g. 5K Dada Jungi House, Shahpur Jat, New Delhi 110049"
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          )}

          {activityType === 'IN_PERSON' && (
            <Suspense
              fallback={<div className="h-60 rounded-2xl bg-[#E9EDC9]/70 animate-pulse" />}
            >
              <LazyLocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onCoordinatesChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressPicked={(display) => {
                  if (kind === 'EVENT' && !fullAddress.trim()) {
                    setFullAddress(display);
                  } else if (kind === 'ACTIVITY' && !location.trim()) {
                    setLocation(display.split(',').slice(0, 2).join(', '));
                  }
                }}
              />
            </Suspense>
          )}
        </div>

        {/* Event-Specific Builders: Agenda, Ticket Tiers & Refund Policy */}
        {kind === 'EVENT' && (
          <div className="space-y-6 pt-2 border-t border-[#E4DEC3]">
            {/* Agenda Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#2B3322]">Schedule &amp; Agenda</h2>
                  <p className="text-xs text-[#5A4D3F]">Help attendees picture the flow of the gathering.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAgendaItems((prev) => [...prev, { time: '09:30', title: '', description: '' }])
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#E9EDC9] px-3 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#CCD5AE]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add item
                </button>
              </div>

              <div className="space-y-2.5">
                {agendaItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start"
                  >
                    <input
                      type="time"
                      value={item.time}
                      onChange={(e) =>
                        setAgendaItems((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, time: e.target.value } : row))
                        )
                      }
                      aria-label={`Agenda item ${idx + 1} time`}
                      className="sm:col-span-3 rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-2.5 py-2 text-xs text-[#2B3322]"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setAgendaItems((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row))
                        )
                      }
                      placeholder="Session title (e.g. Opening acoustic set)"
                      className="sm:col-span-4 rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322]"
                    />
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        setAgendaItems((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, description: e.target.value } : row
                          )
                        )
                      }
                      placeholder="Short note (optional)"
                      className="sm:col-span-4 rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAgendaItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove agenda item"
                      className="sm:col-span-1 min-h-[36px] inline-flex items-center justify-center rounded-xl text-[#8C3B2B] hover:bg-[#FAEDCD]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Tiers Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#2B3322]">Ticket Tiers (INR)</h2>
                  <p className="text-xs text-[#5A4D3F]">
                    Set price to 0 for a free pass, or create tiered pricing like Early Bird &amp; General.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTicketTiers((prev) => [
                      ...prev,
                      { name: 'Standard Pass', description: '', priceInr: '299', quantity: '25' },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#E9EDC9] px-3 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#CCD5AE]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add tier
                </button>
              </div>

              {hasTicketSales && (
                <div className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] p-3 text-xs text-[#5A4D3F] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-[#7A4E24] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Tickets have already been sold for this event. Prices on existing tiers are locked and sold tiers cannot be removed, though you may increase available quantities or add a new tier.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {ticketTiers.map((tier, idx) => (
                  <div
                    key={tier.id || idx}
                    className="rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] p-3.5 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-[#5A4D3F] mb-1">
                          Tier name
                        </label>
                        <input
                          type="text"
                          required
                          value={tier.name}
                          onChange={(e) =>
                            setTicketTiers((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                            )
                          }
                          placeholder="e.g. Early Bird, Couple Pass"
                          className="w-full rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5A4D3F] mb-1">
                          Price (₹ INR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={50000}
                          disabled={tier.lockedPrice}
                          value={tier.priceInr}
                          onChange={(e) =>
                            setTicketTiers((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, priceInr: e.target.value } : row
                              )
                            )
                          }
                          className="w-full rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322] disabled:opacity-60"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5A4D3F] mb-1">
                          Quantity{tier.minQuantity ? ` (min ${tier.minQuantity})` : ''}
                        </label>
                        <input
                          type="number"
                          min={tier.minQuantity || 1}
                          max={2000}
                          value={tier.quantity}
                          onChange={(e) =>
                            setTicketTiers((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, quantity: e.target.value } : row
                              )
                            )
                          }
                          className="w-full rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322]"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end pt-4">
                        <button
                          type="button"
                          disabled={ticketTiers.length <= 1 || tier.lockedPrice}
                          onClick={() =>
                            setTicketTiers((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove tier"
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-[#8C3B2B] hover:bg-[#FAEDCD] disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={tier.description}
                      onChange={(e) =>
                        setTicketTiers((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, description: e.target.value } : row
                          )
                        )
                      }
                      placeholder="What is included in this tier? (optional)"
                      className="w-full rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs text-[#2B3322]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Policy */}
            <div>
              <label htmlFor="act-refund" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
                Refund policy
              </label>
              <textarea
                id="act-refund"
                rows={2}
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-xs text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Card Tint & Photo Selection */}
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-semibold text-[#2B3322] mb-2">
              Card colour tint
            </span>
            <div className="flex flex-wrap gap-2.5">
              {[
                { key: 'light-sage', label: 'Light Sage', swatch: 'bg-[#E9EDC9]' },
                { key: 'sage', label: 'Sage', swatch: 'bg-[#CCD5AE]' },
                { key: 'peach', label: 'Peach', swatch: 'bg-[#FAEDCD]' },
                { key: 'cream', label: 'Cream', swatch: 'bg-[#FEFAE0]' },
                { key: 'earth', label: 'Earth', swatch: 'bg-[#EAD4BC]' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTintColor(t.key as any)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                    tintColor === t.key
                      ? 'border-[#2B3322] ring-2 ring-[#2B3322] bg-[#F7F5EE]'
                      : 'border-[#D7DEB0] bg-[#F7F5EE]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${t.swatch} border border-[#2B3322]/20`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#2B3322] mb-2">
              Cover photo
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACTIVITY_IMAGE_PRESETS.map((preset) => {
                const selected = imageUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`group rounded-2xl overflow-hidden border text-left transition-all ${
                      selected
                        ? 'border-[#2B3322] ring-2 ring-[#2B3322]'
                        : 'border-[#D7DEB0] opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <SafeImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="px-2.5 py-1.5 text-[11px] font-medium text-[#2B3322] bg-[#F7F5EE] truncate">
                      {preset.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
          <Link
            to={mode === 'edit' && id ? `/activities/${id}` : '/activities'}
            className="min-h-[44px] inline-flex items-center rounded-full border border-[#D7DEB0] px-5 py-2.5 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-full bg-[#2B3322] px-7 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-60 transition-colors"
          >
            {submitting
              ? 'Saving...'
              : mode === 'edit'
              ? 'Save Changes'
              : kind === 'EVENT'
              ? 'Publish Event'
              : 'Publish Activity'}
          </button>
        </div>
      </form>
    </div>
  );
}
