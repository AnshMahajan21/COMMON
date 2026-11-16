import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, MessageCircle, Search, Users } from 'lucide-react';
import { apiFetch, formatActivityDate } from '../lib/api';
import type { Interest, PersonDetail, PersonDiscovery } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, HeadingWithAccent } from '../components/BrandAndIcons';
import { ActivityCard } from '../components/ActivityCard';

const LazyListingsPreviewMap = React.lazy(() =>
  import('../components/CommonMap').then((m) => ({ default: m.ListingsPreviewMap }))
);

export function PeoplePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [people, setPeople] = useState<PersonDiscovery[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [q, setQ] = useState('');
  const [interestSlug, setInterestSlug] = useState('all');
  const [mode, setMode] = useState<'all' | 'shared-activities' | 'shared-interests'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/people');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    apiFetch<{ interests: Interest[] }>('/api/interests')
      .then((res) => setInterests(res.interests))
      .catch(() => {});
  }, []);

  const loadPeople = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (interestSlug !== 'all') params.set('interest', interestSlug);
      params.set('mode', mode);
      const res = await apiFetch<{ people: PersonDiscovery[] }>(`/api/people?${params.toString()}`);
      setPeople(res.people);
    } catch (err: any) {
      setError(err.message || 'Could not load people.');
    } finally {
      setLoading(false);
    }
  }, [user, q, interestSlug, mode]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (user) loadPeople();
    }, 150);
    return () => clearTimeout(t);
  }, [user, loadPeople]);

  const handleDirectMessage = async (personId: string) => {
    try {
      const res = await apiFetch<{ conversationId: string }>(
        `/api/conversations/direct/${personId}`,
        { method: 'POST' }
      );
      navigate(`/messages?conversation=${encodeURIComponent(res.conversationId)}`);
    } catch (err: any) {
      setError(err.message || 'Could not open conversation.');
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded bg-[#E9EDC9]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-3xl bg-[#FEFAE0]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <HeadingWithAccent
          as="h1"
          prefix="Discover"
          accent="People"
          className="text-3xl sm:text-4xl font-bold"
        />
        <p className="mt-1 text-sm text-[#5A4D3F]">
          Find companions through shared interests, overlapping activities, and common communities—never swipe cards.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <label htmlFor="people-search" className="sr-only">
              Search people by name, location, or interest
            </label>
            <Search
              className="w-4 h-4 text-[#5A4D3F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="people-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, neighbourhood, or hobby..."
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] pl-10 pr-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          <div className="md:col-span-4">
            <div
              role="group"
              aria-label="Discovery filter"
              className="grid grid-cols-3 rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] p-1"
            >
              {[
                { key: 'all', label: 'Everyone' },
                { key: 'shared-activities', label: 'Same Activities' },
                { key: 'shared-interests', label: 'Shared Interests' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key as any)}
                  className={`rounded-xl px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    mode === item.key
                      ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
                      : 'text-[#5A4D3F] hover:text-[#2B3322]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="people-interest-select" className="sr-only">
              Filter by interest
            </label>
            <select
              id="people-interest-select"
              value={interestSlug}
              onChange={(e) => setInterestSlug(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              <option value="all">All interests</option>
              {interests.map((int) => (
                <option key={int.id} value={int.slug}>
                  {int.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] p-4 text-sm text-[#8C3B2B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] animate-pulse" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-10 text-center max-w-xl mx-auto">
          <Users className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-[#2B3322]">No members match that filter</h2>
          <p className="mt-2 text-sm text-[#5A4D3F]">
            Try clearing your filter or joining an upcoming activity to meet people in person first.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setInterestSlug('all');
              setMode('all');
            }}
            className="mt-5 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
          >
            Show all people
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {people.map((person) => (
            <article
              key={person.id}
              className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start gap-4">
                  <Link to={`/people/${person.id}`}>
                    <Avatar user={person} size="lg" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/people/${person.id}`}
                      className="text-lg font-semibold text-[#2B3322] hover:underline"
                    >
                      {person.fullName}
                    </Link>
                    <p className="text-xs text-[#5A4D3F] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{person.location}</span>
                    </p>
                    <p className="mt-2 text-sm text-[#4A4238] line-clamp-2 leading-relaxed">
                      {person.bio || 'Exploring Delhi-NCR through shared hobbies.'}
                    </p>
                  </div>
                </div>

                {/* Common Ground Summary */}
                <div className="mt-4 pt-3 border-t border-[#E4DEC3] space-y-2 text-xs text-[#4A4238]">
                  {person.sharedActivities.length > 0 && (
                    <p className="font-medium text-[#2B3322]">
                      Shared activity: {person.sharedActivities.map((a) => a.title).join(', ')}
                    </p>
                  )}
                  {person.sharedCommunities.length > 0 && (
                    <p className="text-[#5A4D3F]">
                      Shared group: {person.sharedCommunities.map((c) => c.name).join(', ')}
                    </p>
                  )}
                  <p className="text-[#5A4D3F]">
                    Interests:{' '}
                    {person.interests.length > 0
                      ? person.interests
                          .map((i) =>
                            person.sharedInterests.some((si) => si.id === i.id)
                              ? `${i.name} (in common)`
                              : i.name
                          )
                          .join(' · ')
                      : 'Not listed yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Link
                  to={`/people/${person.id}`}
                  className="rounded-full bg-[#E9EDC9] border border-[#D7DEB0] px-4 py-2 text-xs font-semibold text-[#2B3322] hover:bg-[#CCD5AE] transition-colors"
                >
                  View profile
                </Link>

                {person.canMessage ? (
                  <button
                    type="button"
                    onClick={() => handleDirectMessage(person.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2B3322] px-4 py-2 text-xs font-semibold text-[#FEFAE0] hover:bg-[#3B462F] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Message
                  </button>
                ) : (
                  <span className="text-[11px] text-[#5A4D3F]">
                    Join an activity together to message
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{ person: PersonDetail }>(`/api/people/${id}`)
      .then((res) => setPerson(res.person))
      .catch((err: any) => setError(err.message || 'Member profile not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMessage = async () => {
    if (!person) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/people/${person.id}`)}`);
      return;
    }
    try {
      const res = await apiFetch<{ conversationId: string }>(
        `/api/conversations/direct/${person.id}`,
        { method: 'POST' }
      );
      navigate(`/messages?conversation=${encodeURIComponent(res.conversationId)}`);
    } catch (err: any) {
      setError(err.message || 'Could not start message.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-44 rounded-3xl bg-[#E9EDC9]" />
        <div className="h-64 rounded-3xl bg-[#FEFAE0]" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
        <h1 className="text-xl font-semibold text-[#2B3322]">Profile unavailable</h1>
        <p className="mt-2 text-sm text-[#5A4D3F]">{error}</p>
        <Link
          to="/activities"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
        >
          Back to activities
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === person.id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back
      </button>

      <section className="rounded-3xl bg-[#E9EDC9] border border-[#D7DEB0] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          <Avatar user={person} size="xl" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2B3322]">
              {person.fullName}
            </h1>
            <p className="mt-1 text-xs text-[#5A4D3F] flex flex-wrap items-center gap-2 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                {person.location}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Joined {formatActivityDate(person.createdAt)}
              </span>
            </p>
            <p className="mt-3 text-sm text-[#3A352D] max-w-xl leading-relaxed">
              {person.bio || 'Exploring local hobbies and shared experiences across Delhi-NCR.'}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isOwnProfile ? (
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0]"
            >
              Edit your profile
            </Link>
          ) : person.canMessage ? (
            <button
              type="button"
              onClick={handleMessage}
              className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F]"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              Message {person.fullName.split(' ')[0]}
            </button>
          ) : (
            <span className="inline-block rounded-2xl bg-[#FEFAE0]/90 px-4 py-2 text-xs text-[#5A4D3F]">
              {user
                ? 'Join a shared activity or community to message'
                : 'Sign in & join a shared activity to connect'}
            </span>
          )}
        </div>
      </section>

      {/* Shared Context & Interests */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#2B3322]">Interests & common ground</h2>
        {person.sharedInterests.length > 0 && (
          <p className="text-sm text-[#2B3322] font-medium">
            In common with you: {person.sharedInterests.map((i) => i.name).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {person.interests.map((int) => {
            const isShared = person.sharedInterests.some((si) => si.id === int.id);
            return (
              <span
                key={int.id}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                  isShared
                    ? 'bg-[#CCD5AE] border-[#2B3322]/30 text-[#2B3322] font-semibold'
                    : 'bg-[#F7F5EE] border-[#D7DEB0] text-[#4A4238]'
                }`}
              >
                {int.name}
              </span>
            );
          })}
        </div>
      </section>

      {person.communities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#2B3322]">Communities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {person.communities.map((com) => (
              <Link
                key={com.id}
                to={`/communities/${com.slug}`}
                className="rounded-2xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 hover:bg-[#E9EDC9]/60 transition-colors"
              >
                <p className="text-xs text-[#5A4D3F]">{com.category?.name}</p>
                <p className="mt-1 font-semibold text-[#2B3322]">{com.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {person.organisedActivities.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#2B3322]">
            Hosted gatherings ({person.organisedActivities.length})
          </h2>
          <Suspense fallback={null}>
            <LazyListingsPreviewMap
              activities={person.organisedActivities}
              heading={`Venues hosted by ${person.fullName.split(' ')[0]}`}
            />
          </Suspense>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {person.organisedActivities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        </section>
      )}

      {person.joinedActivities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#2B3322]">
            Activities participating in ({person.joinedActivities.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {person.joinedActivities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
