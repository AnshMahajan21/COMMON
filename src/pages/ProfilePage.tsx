import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, MapPin, Save } from 'lucide-react';
import { apiFetch, formatActivityDate } from '../lib/api';
import type { Activity, AuthUser, Community, Interest } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, HeadingWithAccent } from '../components/BrandAndIcons';
import { ActivityCard } from '../components/ActivityCard';

export function ProfilePage() {
  const { user, loading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();

  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [organised, setOrganised] = useState<Activity[]>([]);
  const [joined, setJoined] = useState<Activity[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarTone, setAvatarTone] = useState('sage');
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/profile');
    }
  }, [authLoading, user, navigate]);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<{
        user: AuthUser;
        organisedActivities: Activity[];
        joinedActivities: Activity[];
        communities: Community[];
      }>('/api/profile'),
      apiFetch<{ interests: Interest[] }>('/api/interests'),
    ])
      .then(([profileRes, intRes]) => {
        if (!active) return;
        const p = profileRes.user;
        setFullName(p.fullName);
        setBio(p.bio || '');
        setLocation(p.location || '');
        setAvatarUrl(p.avatarUrl || '');
        setAvatarTone(p.avatarTone || 'sage');
        setSelectedInterestIds(p.interests.map((i) => i.id));
        setOrganised(profileRes.organisedActivities);
        setJoined(profileRes.joinedActivities);
        setCommunities(profileRes.communities);
        setAllInterests(intRes.interests);
      })
      .catch((err: any) => {
        if (active) setFeedback({ type: 'error', text: err.message || 'Could not load profile.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (fullName.trim().length < 2) {
      setFeedback({ type: 'error', text: 'Full name must be at least 2 characters.' });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatarUrl: avatarUrl.trim(),
          avatarTone,
          interestIds: selectedInterestIds,
        }),
      });
      setUser(res.user);
      setFeedback({ type: 'success', text: 'Profile and interests saved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-[#E9EDC9]" />
        <div className="h-80 rounded-3xl bg-[#FEFAE0]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Card */}
      <section className="rounded-3xl bg-[#E9EDC9] border border-[#D7DEB0] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <Avatar
          user={{ fullName, avatarUrl, avatarTone }}
          size="xl"
        />
        <div className="flex-1 min-w-0">
          <HeadingWithAccent
            as="h1"
            prefix="Your"
            accent="Profile"
            className="text-2xl sm:text-3xl font-bold"
          />
          <p className="mt-1 text-base font-semibold text-[#2B3322]">{fullName}</p>
          <p className="mt-0.5 text-xs text-[#5A4D3F] flex flex-wrap items-center gap-2 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {location || 'Delhi-NCR'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatActivityDate(user.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{joined.length} joined</span>
            <span aria-hidden="true">·</span>
            <span>{organised.length} organised</span>
          </p>
        </div>
      </section>

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

      {/* Edit Form & Interests */}
      <form
        onSubmit={handleSave}
        className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-6"
      >
        <h2 className="text-xl font-semibold text-[#2B3322]">Personal details & interests</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Full name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prof-location" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Neighbourhood / City
            </label>
            <input
              id="prof-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prof-bio" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
            Short biography
          </label>
          <textarea
            id="prof-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share the hobbies you enjoy or what kind of activities you are looking for..."
            className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-avatar-url" className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Profile picture URL (optional)
            </label>
            <input
              id="prof-avatar-url"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Leave blank to use your botanical monogram"
              className="w-full rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#2B3322] mb-1.5">
              Monogram palette tone
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { key: 'sage', label: 'Sage', bg: 'bg-[#CCD5AE]' },
                { key: 'light-sage', label: 'Leaf', bg: 'bg-[#E9EDC9]' },
                { key: 'peach', label: 'Peach', bg: 'bg-[#FAEDCD]' },
                { key: 'earth', label: 'Earth', bg: 'bg-[#D4A373]' },
                { key: 'cream', label: 'Cream', bg: 'bg-[#FEFAE0]' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setAvatarTone(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    avatarTone === t.key
                      ? 'border-[#2B3322] ring-2 ring-[#2B3322] bg-[#F7F5EE]'
                      : 'border-[#D7DEB0] bg-[#F7F5EE]'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.bg} border border-[#2B3322]/20`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interests Selection */}
        <div>
          <span className="block text-sm font-semibold text-[#2B3322] mb-2">
            Interests & hobbies ({selectedInterestIds.length} selected)
          </span>
          <p className="text-xs text-[#5A4D3F] mb-3">
            Used to help you discover people who enjoy similar activities.
          </p>
          <div className="flex flex-wrap gap-2">
            {allInterests.map((interest) => {
              const selected = selectedInterestIds.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322]'
                      : 'bg-[#F7F5EE] text-[#4A4238] border-[#D7DEB0] hover:bg-[#E9EDC9]'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  {interest.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-6 py-3 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      {/* Communities */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2B3322]">Your communities</h2>
          <Link to="/communities" className="text-sm font-medium text-[#2B3322] hover:underline">
            Browse communities
          </Link>
        </div>
        {communities.length === 0 ? (
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 text-sm text-[#5A4D3F]">
            You have not joined a community yet. Explore interest groups across Delhi-NCR.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((com) => (
              <Link
                key={com.id}
                to={`/communities/${com.slug}`}
                className="rounded-2xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 hover:bg-[#E9EDC9]/60 transition-colors"
              >
                <p className="text-xs text-[#5A4D3F]">{com.category?.name}</p>
                <p className="mt-1 font-semibold text-[#2B3322]">{com.name}</p>
                <p className="mt-0.5 text-xs text-[#5A4D3F]">{com.neighborhood}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Organised Activities */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2B3322]">
            Activities you organised ({organised.length})
          </h2>
          <Link to="/activities/new" className="text-sm font-medium text-[#2B3322] hover:underline">
            Host new
          </Link>
        </div>
        {organised.length === 0 ? (
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 text-sm text-[#5A4D3F]">
            No activities organised yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {organised.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </section>

      {/* Joined Activities */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2B3322]">
          Activities you joined ({joined.length})
        </h2>
        {joined.length === 0 ? (
          <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 text-sm text-[#5A4D3F]">
            You haven’t joined any activities yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {joined.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
