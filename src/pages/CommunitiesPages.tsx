import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Search, Users } from 'lucide-react';
import { apiFetch, getTintSurfaceClasses } from '../lib/api';
import type { Category, Community } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarStack, HeadingWithAccent, SafeImage } from '../components/BrandAndIcons';
import { ActivityCard } from '../components/ActivityCard';

const LazyListingsPreviewMap = React.lazy(() =>
  import('../components/CommonMap').then((m) => ({ default: m.ListingsPreviewMap }))
);

export function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [categorySlug, setCategorySlug] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const loadCommunities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categorySlug !== 'all') params.set('category', categorySlug);
      const res = await apiFetch<{ communities: Community[] }>(
        `/api/communities?${params.toString()}`
      );
      setCommunities(res.communities);
    } catch (err: any) {
      setError(err.message || 'Could not load communities.');
    } finally {
      setLoading(false);
    }
  }, [q, categorySlug]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCommunities();
    }, 150);
    return () => clearTimeout(t);
  }, [loadCommunities]);

  return (
    <div className="space-y-6">
      <div>
        <HeadingWithAccent
          as="h1"
          prefix="Local"
          accent="Communities"
          className="text-3xl sm:text-4xl font-bold"
        />
        <p className="mt-1 text-sm text-[#5A4D3F]">
          Interest circles across Delhi-NCR where repeated gatherings turn into lasting friendships.
        </p>
      </div>

      {/* Filter */}
      <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-7 relative">
          <label htmlFor="community-search" className="sr-only">
            Search communities
          </label>
          <Search
            className="w-4 h-4 text-[#5A4D3F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="community-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search photowalks, cycling, books, board games..."
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] pl-10 pr-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="community-cat" className="sr-only">
            Filter communities by category
          </label>
          <select
            id="community-cat"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] p-4 text-sm text-[#8C3B2B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-[#E9EDC9]/60 animate-pulse" />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-10 text-center max-w-xl mx-auto">
          <Users className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-[#2B3322]">No communities matched</h2>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setCategorySlug('all');
            }}
            className="mt-4 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
          >
            Reset search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {communities.map((com) => {
            const tint = getTintSurfaceClasses(com.tintColor);
            return (
              <Link
                key={com.id}
                to={`/communities/${com.slug}`}
                className={`group rounded-3xl ${tint.bg} border ${tint.border} p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div>
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#F7F5EE]">
                    <SafeImage
                      src={com.imageUrl}
                      alt={com.name}
                      fallbackLabel={com.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="px-1 pt-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A4D3F]">
                      <span className="font-semibold text-[#2B3322]">{com.category.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{com.neighborhood}</span>
                      {com.isMember && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#2B3322]">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Member
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1.5 text-lg font-semibold text-[#2B3322]">{com.name}</h2>
                    <p className="mt-1.5 text-sm text-[#4A4238] line-clamp-3 leading-relaxed">
                      {com.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2B3322]/10 flex items-center justify-between px-1">
                  <AvatarStack
                    users={com.membersPreview || []}
                    totalCount={com.memberCount}
                    label="members"
                  />
                  <span className="text-xs font-medium text-[#5A4D3F] tabular-nums">
                    {com.upcomingActivityCount || 0} upcoming
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadCommunity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ community: Community }>(`/api/communities/${id}`);
      setCommunity(res.community);
    } catch (err: any) {
      setError(err.message || 'Community not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const handleToggleJoin = async () => {
    if (!community) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/communities/${community.slug}`)}`);
      return;
    }

    setBusy(true);
    try {
      const endpoint = community.isMember
        ? `/api/communities/${community.id}/leave`
        : `/api/communities/${community.id}/join`;
      await apiFetch(endpoint, { method: 'POST' });
      await loadCommunity();
    } catch (err: any) {
      setError(err.message || 'Could not update community membership.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-64 rounded-3xl bg-[#E9EDC9]" />
        <div className="h-48 rounded-3xl bg-[#FEFAE0]" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
        <h1 className="text-xl font-semibold text-[#2B3322]">Community unavailable</h1>
        <p className="mt-2 text-sm text-[#5A4D3F]">{error}</p>
        <Link
          to="/communities"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
        >
          Back to communities
        </Link>
      </div>
    );
  }

  const tint = getTintSurfaceClasses(community.tintColor);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Link
        to="/communities"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to communities
      </Link>

      {/* Community Hero */}
      <section className={`rounded-3xl ${tint.bg} border ${tint.border} overflow-hidden grid grid-cols-1 lg:grid-cols-12`}>
        <div className="lg:col-span-5 min-h-[220px]">
          <SafeImage
            src={community.imageUrl}
            alt={community.name}
            fallbackLabel={community.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-[#5A4D3F]">
              {community.category.name} · {community.neighborhood}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#2B3322]">
              {community.name}
            </h1>
            <p className="mt-3 text-base text-[#3A352D] leading-relaxed">
              {community.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#2B3322]/10">
            <span className="text-sm font-medium text-[#2B3322] tabular-nums">
              {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={handleToggleJoin}
              className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                community.isMember
                  ? 'bg-[#FEFAE0] border border-[#2B3322] text-[#2B3322] hover:bg-[#FAEDCD]'
                  : 'bg-[#2B3322] text-[#FEFAE0] hover:bg-[#3B462F]'
              }`}
            >
              {busy
                ? 'Updating...'
                : !user
                ? 'Sign in to join group'
                : community.isMember
                ? 'Leave community'
                : 'Join community'}
            </button>
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[#2B3322] mb-4">
          Members ({community.members?.length || 0})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(community.members || []).map((m) => (
            <Link
              key={m.id}
              to={`/people/${m.id}`}
              className="flex items-center gap-3 rounded-2xl bg-[#F7F5EE] border border-[#E4DEC3] p-3 hover:bg-[#E9EDC9]/60 transition-colors"
            >
              <Avatar user={m} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2B3322] truncate">{m.fullName}</p>
                <p className="text-xs text-[#5A4D3F] truncate">{m.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Related Activities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#2B3322]">
            Related gatherings ({community.activities?.length || 0})
          </h2>
          <Link
            to="/activities/new"
            className="text-sm font-medium text-[#2B3322] hover:underline"
          >
            Organise a gathering
          </Link>
        </div>
        {community.activities && community.activities.length > 0 && (
          <Suspense fallback={null}>
            <LazyListingsPreviewMap
              activities={community.activities}
              heading={`${community.name} gathering venues`}
            />
          </Suspense>
        )}
        {!community.activities || community.activities.length === 0 ? (
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 text-sm text-[#5A4D3F]">
            No gatherings scheduled for this community yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {community.activities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
