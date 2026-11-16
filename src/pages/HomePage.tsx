import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Users } from 'lucide-react';
import { apiFetch, getTintSurfaceClasses } from '../lib/api';
import type { Activity, Category, Community } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { ActivityCard, ActivityCardSkeleton } from '../components/ActivityCard';
import { CategoryGlyph, HeadingWithAccent, SafeImage } from '../components/BrandAndIcons';

const HERO_IMAGE = '/src/assets/images/hero_delhi_morning_walk_1794851444677.jpg';

const JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Start with an interest',
    body: 'Pick what you genuinely enjoy—morning walks, badminton, sketchbooks, cycling, or quiet reading.',
    tint: 'bg-[#FEFAE0]',
  },
  {
    step: '02',
    title: 'Join a real activity',
    body: 'Show up to a small, welcoming gathering across Delhi-NCR or hop into a calm online circle.',
    tint: 'bg-[#E9EDC9]',
  },
  {
    step: '03',
    title: 'Meet people naturally',
    body: 'Conversation flows effortlessly when your hands or feet are already busy doing something together.',
    tint: 'bg-[#FAEDCD]',
  },
  {
    step: '04',
    title: 'Build lasting friendships',
    body: 'Repeated shared experiences turn familiar faces into local circles and genuine friends.',
    tint: 'bg-[#CCD5AE]',
  },
];

export function HomePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [catRes, actRes, comRes] = await Promise.all([
          apiFetch<{ categories: Category[] }>('/api/categories'),
          apiFetch<{ activities: Activity[] }>('/api/activities?date=upcoming&availableOnly=true&limit=6'),
          apiFetch<{ communities: Community[] }>('/api/communities'),
        ]);
        if (!active) return;
        setCategories(catRes.categories);
        setActivities(actRes.activities);
        setCommunities(comRes.communities.slice(0, 3));
      } catch (err: any) {
        if (active) setError(err.message || 'Could not load upcoming activities.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-14 md:space-y-18">
      {/* Story-driven Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        <div className="lg:col-span-6 rounded-3xl bg-[#E9EDC9] border border-[#D7DEB0] p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#5A4D3F]">
              Delhi-NCR · Activity-first social discovery
            </p>
            <HeadingWithAccent
              as="h1"
              prefix="Meet people through shared"
              accent="experiences"
              className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.12]"
            />
            <p className="mt-4 text-base text-[#4A4238] leading-relaxed max-w-xl">
              {user
                ? `Welcome back, ${user.fullName.split(' ')[0]}. Discover a morning walk, café table, or game night happening nearby and join in.`
                : 'Skip the awkward small talk of profile feeds. Find an activity you genuinely enjoy—and meet thoughtful people along the way.'}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/activities"
              className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-6 py-3 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] transition-colors whitespace-nowrap"
            >
              Browse Activities
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-5 py-3 text-sm font-medium text-[#2B3322] hover:bg-[#FAEDCD] transition-colors whitespace-nowrap"
            >
              Our philosophy
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl overflow-hidden border border-[#D7DEB0] bg-[#CCD5AE] min-h-[260px] lg:min-h-[380px] relative">
          <SafeImage
            src={HERO_IMAGE}
            alt="Friends walking and talking together along a sunlit path in Lodhi Garden, New Delhi"
            fallbackLabel="Morning walks in Lodhi Garden"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2B3322]/85 via-[#2B3322]/40 to-transparent p-6 text-[#FEFAE0]">
            <p className="text-xs text-[#E9EDC9] font-medium">
              Interest → Activity → People → Shared Experience → Friendship
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold">
              Free, real-life gatherings hosted by neighbours across Delhi-NCR
            </p>
          </div>
        </div>
      </section>

      {/* How It Works in 4 Steps */}
      <section aria-labelledby="how-it-works-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <HeadingWithAccent
              prefix="How COMMON"
              accent="works"
              className="text-2xl sm:text-3xl font-bold"
            />
            <p className="mt-1 text-sm text-[#5A4D3F]">
              No feeds, no follower counts, no swiping—just real gatherings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {JOURNEY_STEPS.map((item) => (
            <div
              key={item.step}
              className={`${item.tint} rounded-3xl border border-[#2B3322]/10 p-6 flex flex-col justify-between`}
            >
              <div>
                <span className="text-xs font-semibold text-[#5A4D3F] tabular-nums">
                  {item.step}.
                </span>
                <h3 className="mt-2 text-lg font-semibold text-[#2B3322]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#4A4238] leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Categories */}
      <section aria-labelledby="categories-heading">
        <div className="flex items-end justify-between gap-4 mb-6">
          <HeadingWithAccent
            prefix="Explore"
            accent="Categories"
            className="text-2xl sm:text-3xl font-bold"
          />
          <Link
            to="/activities"
            className="text-sm font-medium text-[#2B3322] hover:underline whitespace-nowrap"
          >
            View all
          </Link>
        </div>

        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat) => {
            const tint = getTintSurfaceClasses(cat.tintColor);
            return (
              <Link
                key={cat.id}
                to={`/activities?category=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col items-center text-center shrink-0 w-24 md:w-auto focus-visible:outline-none"
              >
                <span
                  className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full ${tint.bg} border ${tint.border} flex items-center justify-center text-[#2B3322] transition-transform duration-200 group-hover:scale-105 shadow-xs`}
                >
                  <CategoryGlyph icon={cat.icon} className="w-8 h-8" />
                </span>
                <span className="mt-2.5 text-xs sm:text-sm font-medium text-[#2B3322] leading-tight">
                  {cat.name}
                </span>
                {typeof cat.activityCount === 'number' && (
                  <span className="mt-0.5 text-[11px] text-[#5A4D3F] tabular-nums">
                    {cat.activityCount} open
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Upcoming Gatherings (Activities & Events) */}
      <section aria-labelledby="upcoming-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <HeadingWithAccent
              prefix="Upcoming"
              accent="Gatherings"
              className="text-2xl sm:text-3xl font-bold"
            />
            <p className="mt-1 text-sm text-[#5A4D3F]">
              Casual neighbour activities and scheduled workshops, open mics &amp; treks across Delhi-NCR.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/activities?kind=EVENT"
              className="text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322] hover:underline whitespace-nowrap"
            >
              Events only
            </Link>
            <Link
              to="/activities?view=map"
              className="text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322] hover:underline whitespace-nowrap"
            >
              Map view
            </Link>
            <Link
              to="/activities"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2B3322] hover:underline whitespace-nowrap"
            >
              Explore all
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl bg-[#FAEDCD] border border-[#D4A373] p-6 text-sm text-[#5A4D3F]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <ActivityCardSkeleton key={i} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
            <Compass className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
            <p className="mt-2 font-semibold text-[#2B3322]">No upcoming activities yet</p>
            <p className="mt-1 text-sm text-[#5A4D3F]">
              Start the first morning walk or café table in your neighbourhood.
            </p>
            <Link
              to="/activities/new"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
            >
              Create an activity
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>

      {/* Communities */}
      <section aria-labelledby="communities-heading">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <HeadingWithAccent
              prefix="Local"
              accent="Communities"
              className="text-2xl sm:text-3xl font-bold"
            />
            <p className="mt-1 text-sm text-[#5A4D3F]">
              Ongoing circles built around shared hobbies and repeated meetups.
            </p>
          </div>
          <Link
            to="/communities"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2B3322] hover:underline whitespace-nowrap"
          >
            All communities
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {communities.map((com) => {
            const tint = getTintSurfaceClasses(com.tintColor);
            return (
              <Link
                key={com.id}
                to={`/communities/${com.slug}`}
                className={`group rounded-3xl ${tint.bg} border ${tint.border} p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5A4D3F]">
                    <span className="font-medium text-[#2B3322]">{com.category.name}</span>
                    <span>{com.neighborhood}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[#2B3322]">
                    {com.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#4A4238] line-clamp-3 leading-relaxed">
                    {com.description}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#2B3322]/10 flex items-center justify-between text-xs font-medium text-[#2B3322] tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#5A4D3F]" aria-hidden="true" />
                    {com.memberCount} members
                  </span>
                  <span className="group-hover:underline">View group →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Call to Action */}
      <section className="rounded-3xl bg-[#2B3322] text-[#FEFAE0] p-8 sm:p-10 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Have an idea for a{' '}
            <span className="font-serif-accent font-normal text-[#FAEDCD]">gathering</span>?
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-[#E9EDC9] leading-relaxed">
            Whether it is a 7 AM park walk, a board game afternoon, or an online study hour, hosting on COMMON takes two minutes and brings neighbours together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to={user ? '/activities/new' : '/signup'}
            className="rounded-full bg-[#D4A373] px-6 py-3 text-sm font-semibold text-[#FEFAE0] hover:bg-[#C39262] transition-colors whitespace-nowrap"
          >
            {user ? 'Host an Activity' : 'Join COMMON'}
          </Link>
          <Link
            to="/activities"
            className="rounded-full border border-[#E9EDC9]/40 px-5 py-3 text-sm font-medium text-[#FEFAE0] hover:bg-[#FEFAE0]/10 transition-colors whitespace-nowrap"
          >
            Explore activities
          </Link>
        </div>
      </section>
    </div>
  );
}
