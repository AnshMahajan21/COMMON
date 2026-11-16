import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Globe, LayoutGrid, Map as MapIcon, MapPin, RotateCcw, Search } from 'lucide-react';
import { apiFetch, getTintSurfaceClasses } from '../lib/api';
import type { Activity, Category } from '../types/common';
import { ActivityCard, ActivityCardSkeleton } from '../components/ActivityCard';
import { CategoryGlyph, HeadingWithAccent } from '../components/BrandAndIcons';

const LazyExploreMapView = React.lazy(() =>
  import('../components/CommonMap').then((m) => ({ default: m.ExploreMapView }))
);

export function ActivitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [kind, setKind] = useState<'ALL' | 'ACTIVITY' | 'EVENT'>(
    (searchParams.get('kind')?.toUpperCase() as 'ALL' | 'ACTIVITY' | 'EVENT') || 'ALL'
  );
  const [price, setPrice] = useState<'ALL' | 'FREE' | 'PAID'>(
    (searchParams.get('price')?.toUpperCase() as 'ALL' | 'FREE' | 'PAID') || 'ALL'
  );
  const [activityType, setActivityType] = useState(searchParams.get('type') || 'ALL');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || 'all');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'upcoming');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'list'
  );

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [boundsCsv, setBoundsCsv] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const paramQ = searchParams.get('q') || '';
    const paramCat = searchParams.get('category') || 'all';
    const paramKind = searchParams.get('kind')?.toUpperCase();
    const paramPrice = searchParams.get('price')?.toUpperCase();
    const paramView = searchParams.get('view');

    setQ(paramQ);
    setCategory(paramCat);
    if (paramKind === 'ACTIVITY' || paramKind === 'EVENT') {
      setKind(paramKind);
    } else if (!searchParams.has('kind')) {
      setKind('ALL');
    }
    if (paramPrice === 'FREE' || paramPrice === 'PAID') {
      setPrice(paramPrice);
    } else if (!searchParams.has('price')) {
      setPrice('ALL');
    }
    if (paramView === 'map') {
      setViewMode('map');
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ categories: Category[] }>('/api/categories'),
      apiFetch<{ neighborhoods: string[] }>('/api/locations'),
    ])
      .then(([catRes, locRes]) => {
        setCategories(catRes.categories);
        setNeighborhoods(locRes.neighborhoods);
      })
      .catch(() => {});
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (category && category !== 'all') params.set('category', category);
      if (kind !== 'ALL') params.set('kind', kind);
      if (price !== 'ALL') params.set('price', price);
      if (activityType !== 'ALL') params.set('activityType', activityType);
      if (locationFilter && locationFilter !== 'all') params.set('location', locationFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (availableOnly) params.set('availableOnly', 'true');
      if (boundsCsv && viewMode === 'map') params.set('bounds', boundsCsv);
      if (userCoords) {
        params.set('lat', String(userCoords.lat));
        params.set('lng', String(userCoords.lng));
        if (radiusKm) params.set('radiusKm', String(radiusKm));
      }
      if (sort) params.set('sort', sort);

      const data = await apiFetch<{ activities: Activity[] }>(
        `/api/activities?${params.toString()}`
      );
      setActivities(data.activities);
    } catch (err: any) {
      setError(err.message || 'Could not load gatherings.');
    } finally {
      setLoading(false);
    }
  }, [
    q,
    category,
    kind,
    price,
    activityType,
    locationFilter,
    dateFilter,
    availableOnly,
    boundsCsv,
    viewMode,
    userCoords,
    radiusKm,
    sort,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivities();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchActivities]);

  const updateSearchParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 'ALL') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const updateCategory = (slug: string) => {
    setCategory(slug);
    updateSearchParam('category', slug);
  };

  const updateKind = (nextKind: 'ALL' | 'ACTIVITY' | 'EVENT') => {
    setKind(nextKind);
    updateSearchParam('kind', nextKind);
  };

  const updatePrice = (nextPrice: 'ALL' | 'FREE' | 'PAID') => {
    setPrice(nextPrice);
    updateSearchParam('price', nextPrice);
  };

  const updateViewMode = (mode: 'list' | 'map') => {
    setViewMode(mode);
    updateSearchParam('view', mode === 'map' ? 'map' : null);
  };

  const handleLocationEnabled = (
    coords: { lat: number; lng: number } | null,
    nextRadius: number | null
  ) => {
    setUserCoords(coords);
    setRadiusKm(nextRadius);
    if (coords) {
      setSort('distance');
    } else if (sort === 'distance') {
      setSort('upcoming');
    }
  };

  const resetFilters = () => {
    setQ('');
    setCategory('all');
    setKind('ALL');
    setPrice('ALL');
    setActivityType('ALL');
    setLocationFilter('all');
    setDateFilter('upcoming');
    setAvailableOnly(false);
    setBoundsCsv(null);
    setUserCoords(null);
    setRadiusKm(null);
    setSort('upcoming');
    setSearchParams(viewMode === 'map' ? { view: 'map' } : {}, { replace: true });
  };

  const hasActiveFilters =
    q.trim() !== '' ||
    category !== 'all' ||
    kind !== 'ALL' ||
    price !== 'ALL' ||
    activityType !== 'ALL' ||
    locationFilter !== 'all' ||
    dateFilter !== 'upcoming' ||
    availableOnly ||
    Boolean(boundsCsv) ||
    Boolean(userCoords);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <HeadingWithAccent
            as="h1"
            prefix="Discover"
            accent={kind === 'EVENT' ? 'Events' : kind === 'ACTIVITY' ? 'Activities' : 'Gatherings'}
            className="text-3xl sm:text-4xl font-bold"
          />
          <p className="mt-1 text-sm text-[#5A4D3F] tabular-nums">
            {loading
              ? 'Finding gatherings across Delhi-NCR...'
              : `${activities.length} ${activities.length === 1 ? 'listing' : 'listings'} found`}
          </p>
        </div>

        {/* List / Map Toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex items-center rounded-full bg-[#FEFAE0] border border-[#D7DEB0] p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => updateViewMode('list')}
            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-[#2B3322] text-[#FEFAE0]'
                : 'text-[#5A4D3F] hover:text-[#2B3322]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            List
          </button>
          <button
            type="button"
            onClick={() => updateViewMode('map')}
            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'map'
                ? 'bg-[#2B3322] text-[#FEFAE0]'
                : 'text-[#5A4D3F] hover:text-[#2B3322]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Map
          </button>
        </div>
      </div>

      {/* Circular Category Chips */}
      <div
        className="flex items-start gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0"
        aria-label="Filter by category"
      >
        <button
          type="button"
          onClick={() => updateCategory('all')}
          className="flex flex-col items-center shrink-0 w-18 group"
        >
          <span
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
              category === 'all'
                ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322]'
                : 'bg-[#FEFAE0] text-[#2B3322] border-[#D7DEB0] group-hover:bg-[#E9EDC9]'
            }`}
          >
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
          </span>
          <span
            className={`mt-1.5 text-xs text-center leading-tight ${
              category === 'all' ? 'font-semibold text-[#2B3322]' : 'text-[#5A4D3F]'
            }`}
          >
            All
          </span>
        </button>

        {categories.map((cat) => {
          const active = category === cat.slug;
          const tint = getTintSurfaceClasses(cat.tintColor);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateCategory(cat.slug)}
              className="flex flex-col items-center shrink-0 w-20 group"
            >
              <span
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                  active
                    ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322] ring-2 ring-[#D4A373] ring-offset-2 ring-offset-[#F7F5EE]'
                    : `${tint.bg} ${tint.border} text-[#2B3322] group-hover:scale-105`
                }`}
              >
                <CategoryGlyph icon={cat.icon} className="w-6 h-6" />
              </span>
              <span
                className={`mt-1.5 text-xs text-center leading-tight line-clamp-2 ${
                  active ? 'font-semibold text-[#2B3322]' : 'text-[#5A4D3F]'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <label htmlFor="activities-search" className="sr-only">
              Search activities and events
            </label>
            <Search
              className="w-4 h-4 text-[#5A4D3F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="activities-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search walks, workshops, open mics, venues..."
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] pl-10 pr-4 py-2.5 text-sm text-[#2B3322] placeholder:text-[#7A6E5D] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          {/* Kind Segmented Filter (All / Activities / Events) */}
          <div className="md:col-span-4">
            <div
              role="group"
              aria-label="Listing kind filter"
              className="grid grid-cols-3 rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] p-1"
            >
              {[
                { value: 'ALL', label: 'All' },
                { value: 'ACTIVITY', label: 'Activities' },
                { value: 'EVENT', label: 'Events' },
              ].map((opt) => {
                const isSelected = kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateKind(opt.value as 'ALL' | 'ACTIVITY' | 'EVENT')}
                    className={`rounded-xl px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
                        : 'text-[#5A4D3F] hover:text-[#2B3322]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Select */}
          <div className="md:col-span-3">
            <label htmlFor="sort-select" className="sr-only">
              Sort listings
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              <option value="upcoming">Sort: Soonest first</option>
              <option value="recent">Sort: Recently created</option>
              <option value="popular">Sort: Most going</option>
              {userCoords && <option value="distance">Sort: Nearest first</option>}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Price Filter */}
          <div
            role="group"
            aria-label="Price filter"
            className="inline-flex rounded-xl bg-[#F7F5EE] border border-[#D7DEB0] p-0.5"
          >
            {[
              { value: 'ALL', label: 'All Prices' },
              { value: 'FREE', label: 'Free' },
              { value: 'PAID', label: 'Paid' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePrice(opt.value as 'ALL' | 'FREE' | 'PAID')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  price === opt.value
                    ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
                    : 'text-[#5A4D3F] hover:text-[#2B3322]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Format Segmented Filter */}
          <div
            role="group"
            aria-label="Format filter"
            className="inline-flex rounded-xl bg-[#F7F5EE] border border-[#D7DEB0] p-0.5"
          >
            {[
              { value: 'ALL', label: 'All Formats', icon: null },
              { value: 'IN_PERSON', label: 'In-Person', icon: MapPin },
              { value: 'ONLINE', label: 'Online', icon: Globe },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActivityType(opt.value)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    activityType === opt.value
                      ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
                      : 'text-[#5A4D3F] hover:text-[#2B3322]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Location Select */}
          <div className="min-w-[165px] flex-1 sm:flex-initial">
            <label htmlFor="location-filter" className="sr-only">
              Filter by location
            </label>
            <select
              id="location-filter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-xl bg-[#F7F5EE] border border-[#D7DEB0] px-3 py-2 text-xs font-medium text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              <option value="all">All locations (Delhi-NCR)</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n.toLowerCase()}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="min-w-[145px] flex-1 sm:flex-initial">
            <label htmlFor="date-filter" className="sr-only">
              Filter by date
            </label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl bg-[#F7F5EE] border border-[#D7DEB0] px-3 py-2 text-xs font-medium text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            >
              <option value="upcoming">Upcoming dates</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">Next 30 days</option>
              <option value="all">All dates (incl. past)</option>
              <option value="past">Past gatherings</option>
            </select>
          </div>

          {/* Open Spots Checkbox */}
          <label className="inline-flex items-center gap-2 rounded-xl bg-[#F7F5EE] border border-[#D7DEB0] px-3.5 py-2 text-xs font-medium text-[#2B3322] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="rounded border-[#5A4D3F] accent-[#2B3322]"
            />
            <span>Available spots only</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#5A4D3F] hover:text-[#2B3322] hover:bg-[#E9EDC9] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-3xl bg-[#FAEDCD] border border-[#D4A373] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-[#4A4238]">{error}</p>
          <button
            type="button"
            onClick={fetchActivities}
            className="rounded-full bg-[#2B3322] px-4 py-2 text-xs font-semibold text-[#FEFAE0]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results View */}
      {viewMode === 'map' ? (
        <Suspense
          fallback={
            <div className="h-[640px] rounded-3xl bg-[#E9EDC9]/70 border border-[#D7DEB0] animate-pulse flex items-center justify-center text-sm text-[#5A4D3F]">
              Loading calm Delhi-NCR map...
            </div>
          }
        >
          <LazyExploreMapView
            activities={activities}
            categories={categories}
            activeKind={kind}
            onKindChange={updateKind}
            activePrice={price}
            onPriceChange={updatePrice}
            activeCategory={category}
            onCategoryChange={updateCategory}
            userCoords={userCoords}
            radiusKm={radiusKm}
            onLocationEnabled={handleLocationEnabled}
            onSearchBounds={setBoundsCsv}
            hasBoundsFilter={Boolean(boundsCsv)}
            onResetFilters={resetFilters}
          />
        </Suspense>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ActivityCardSkeleton key={i} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-10 text-center max-w-2xl mx-auto">
          <Search className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-[#2B3322]">
            No matching gatherings found
          </h2>
          <p className="mt-2 text-sm text-[#5A4D3F] leading-relaxed">
            Nothing matched that combination of filters right now. Try broadening your dates, clearing the search term, or hosting a gathering yourself.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
            >
              Clear all filters
            </button>
            <Link
              to="/activities/new"
              className="rounded-full border border-[#D7DEB0] bg-[#E9EDC9] px-5 py-2.5 text-sm font-medium text-[#2B3322]"
            >
              Host a gathering
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
