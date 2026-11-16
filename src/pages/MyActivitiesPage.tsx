import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, Edit3, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { Activity } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { ActivityCard, ActivityCardSkeleton } from '../components/ActivityCard';
import { HeadingWithAccent } from '../components/BrandAndIcons';

export function MyActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'joined' | 'organised'>('joined');
  const [organised, setOrganised] = useState<Activity[]>([]);
  const [joined, setJoined] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/my-activities');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    apiFetch<{ organised: Activity[]; joined: Activity[] }>('/api/my-activities')
      .then((res) => {
        if (!active) return;
        setOrganised(res.organised);
        setJoined(res.joined);
      })
      .catch((err: any) => {
        if (active) setError(err.message || 'Could not load your activities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const activeList = tab === 'organised' ? organised : joined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <HeadingWithAccent
            as="h1"
            prefix="My"
            accent="Activities"
            className="text-3xl sm:text-4xl font-bold"
          />
          <p className="mt-1 text-sm text-[#5A4D3F]">
            Gatherings you are attending and sessions you organise.
          </p>
        </div>

        <Link
          to="/activities/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Host Activity
        </Link>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="My activity lists"
        className="inline-flex items-center rounded-full bg-[#FEFAE0] border border-[#D7DEB0] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'joined'}
          onClick={() => setTab('joined')}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors tabular-nums ${
            tab === 'joined'
              ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
              : 'text-[#5A4D3F] hover:text-[#2B3322]'
          }`}
        >
          Joined ({joined.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'organised'}
          onClick={() => setTab('organised')}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors tabular-nums ${
            tab === 'organised'
              ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
              : 'text-[#5A4D3F] hover:text-[#2B3322]'
          }`}
        >
          Organised ({organised.length})
        </button>
      </div>

      {error && (
        <div className="rounded-3xl bg-[#FAEDCD] border border-[#D4A373] p-5 text-sm text-[#8C3B2B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <ActivityCardSkeleton key={i} />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-10 text-center max-w-xl mx-auto">
          <Calendar className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-[#2B3322]">
            {tab === 'organised'
              ? 'You haven’t organised an activity yet'
              : 'You haven’t joined any activities yet'}
          </h2>
          <p className="mt-2 text-sm text-[#5A4D3F]">
            {tab === 'organised'
              ? 'Share a morning walk, café sketch table, or online study hour with neighbours.'
              : 'Browse upcoming Delhi-NCR activities and join one that sparks your curiosity.'}
          </p>
          <div className="mt-6">
            <Link
              to={tab === 'organised' ? '/activities/new' : '/activities'}
              className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0]"
            >
              {tab === 'organised' ? 'Create an activity' : 'Discover activities'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeList.map((act) => (
            <div key={act.id} className="flex flex-col gap-2">
              <ActivityCard activity={act} />
              {tab === 'organised' && (
                <div className="flex flex-wrap justify-end items-center gap-4 px-2">
                  {act.kind === 'EVENT' && (
                    <Link
                      to={`/activities/${act.id}/manage`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B3322] hover:underline"
                    >
                      <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                      Sales &amp; Check-in
                    </Link>
                  )}
                  {act.status === 'ACTIVE' && !act.isPast && (
                    <Link
                      to={`/activities/${act.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A4D3F] hover:text-[#2B3322]"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      Edit {act.kind === 'EVENT' ? 'event' : 'activity'}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
