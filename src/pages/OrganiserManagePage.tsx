import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  QrCode,
  Search,
  Ticket,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { apiFetch, formatActivityDate, formatInr, formatTime12h } from '../lib/api';
import type { OrganiserManageData } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, HeadingWithAccent } from '../components/BrandAndIcons';

export function OrganiserManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<OrganiserManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [codeInput, setCodeInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInFeedback, setCheckInFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?next=${encodeURIComponent(`/activities/${id}/manage`)}`);
    }
  }, [authLoading, user, navigate, id]);

  const loadManageData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<OrganiserManageData>(`/api/activities/${id}/manage`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Could not load organiser dashboard.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) loadManageData();
  }, [user, loadManageData]);

  const performCheckIn = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase();
    if (!id || !trimmed) return;

    setCheckingIn(true);
    setCheckInFeedback(null);
    try {
      const res = await apiFetch<{
        ticket: { code: string; owner: { fullName: string }; tierName: string };
      }>(`/api/activities/${id}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      });

      setCheckInFeedback({
        type: 'success',
        text: `Checked in ${res.ticket.owner.fullName} (${res.ticket.tierName} · ${res.ticket.code}).`,
      });
      setCodeInput('');
      await loadManageData();
    } catch (err: any) {
      setCheckInFeedback({
        type: 'error',
        text: err.message || 'Ticket could not be checked in.',
      });
    } finally {
      setCheckingIn(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-[#E9EDC9]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-[#FEFAE0]" />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-[#FEFAE0]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
        <h1 className="text-xl font-bold text-[#2B3322]">Access restricted</h1>
        <p className="mt-2 text-sm text-[#5A4D3F]">{error || 'Listing not found.'}</p>
        <Link
          to={id ? `/activities/${id}` : '/activities'}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  const filteredTickets = data.tickets.filter((t) => {
    const q = attendeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.code.toLowerCase().includes(q) ||
      t.owner.fullName.toLowerCase().includes(q) ||
      t.tierName.toLowerCase().includes(q) ||
      t.orderNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/activities/${data.activity.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to event page
        </Link>

        <Link
          to={`/activities/${data.activity.id}/edit`}
          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-4 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9]"
        >
          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
          Edit event &amp; tiers
        </Link>
      </div>

      <div>
        <p className="text-xs font-medium text-[#5A4D3F]">
          {formatActivityDate(data.activity.date)} · {formatTime12h(data.activity.startTime)} ·{' '}
          {data.activity.venueName || data.activity.neighborhood}
        </p>
        <HeadingWithAccent
          as="h1"
          prefix="Sales &amp;"
          accent="Check-in"
          className="mt-1 text-3xl font-bold"
        />
        <p className="mt-1 text-sm font-semibold text-[#2B3322]">{data.activity.title}</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-[#E9EDC9] border border-[#D7DEB0] p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A4D3F]">
            <span>Demo Revenue</span>
            <Wallet className="w-4 h-4 text-[#5E7446]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2B3322] tabular-nums">
            {data.summary.totalRevenueInr === 0 ? '₹0 (Free)' : formatInr(data.summary.totalRevenueInr)}
          </p>
        </div>

        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A4D3F]">
            <span>Tickets Sold</span>
            <Ticket className="w-4 h-4 text-[#A66C3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2B3322] tabular-nums">
            {data.summary.totalSold}{' '}
            <span className="text-sm font-medium text-[#5A4D3F]">
              / {data.summary.totalCapacity}
            </span>
          </p>
        </div>

        <div className="rounded-3xl bg-[#FAEDCD] border border-[#EAD8B0] p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A4D3F]">
            <span>Remaining</span>
            <Users className="w-4 h-4 text-[#7A4E24]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2B3322] tabular-nums">
            {data.summary.totalRemaining}
          </p>
        </div>

        <div className="rounded-3xl bg-[#CCD5AE] border border-[#B9C496] p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#2B3322]">
            <span>Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-[#2B3322]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2B3322] tabular-nums">
            {data.summary.totalUsed}{' '}
            <span className="text-sm font-medium text-[#4A4238]">
              / {data.summary.totalSold}
            </span>
          </p>
        </div>
      </div>

      {/* Ticket Check-In Station */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E9EDC9] flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-[#2B3322]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#2B3322]">Door Check-In</h2>
            <p className="text-xs text-[#5A4D3F]">
              Enter a guest&apos;s ticket code (e.g. CMN-OPEN-401A) or tap Check in on the list below. Rejects used, cancelled, refunded, or mismatched codes.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            performCheckIn(codeInput);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <label htmlFor="checkin-code" className="sr-only">
            Ticket code
          </label>
          <input
            id="checkin-code"
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter ticket code (CMN-XXXX-XXXX)"
            className="flex-1 rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-3 font-mono text-sm text-[#2B3322] placeholder:font-sans focus:border-[#2B3322] focus:outline-none"
          />
          <button
            type="submit"
            disabled={checkingIn || codeInput.trim().length < 3}
            className="min-h-[46px] rounded-full bg-[#2B3322] px-7 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-55 transition-colors whitespace-nowrap"
          >
            {checkingIn ? 'Verifying...' : 'Verify & Check In'}
          </button>
        </form>

        {checkInFeedback && (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm font-medium flex items-center gap-2.5 ${
              checkInFeedback.type === 'success'
                ? 'bg-[#E9EDC9] border-[#B9C496] text-[#2B3322]'
                : 'bg-[#FAEDCD] border-[#D4A373] text-[#8C3B2B]'
            }`}
          >
            {checkInFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{checkInFeedback.text}</span>
          </div>
        )}
      </section>

      {/* Tier Breakdown */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#2B3322]">Sales by Tier</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E4DEC3] text-xs font-semibold text-[#5A4D3F]">
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 px-4">Price</th>
                <th className="pb-3 px-4">Sold</th>
                <th className="pb-3 px-4">Checked In</th>
                <th className="pb-3 px-4">Remaining</th>
                <th className="pb-3 pl-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DEC3]/60 tabular-nums">
              {data.tierStats.map((tier) => (
                <tr key={tier.id}>
                  <td className="py-3 pr-4 font-semibold text-[#2B3322]">{tier.name}</td>
                  <td className="py-3 px-4 text-[#4A4238]">{formatInr(tier.priceInr)}</td>
                  <td className="py-3 px-4 text-[#2B3322]">
                    {tier.soldCount} / {tier.quantity}
                  </td>
                  <td className="py-3 px-4 text-[#4A4238]">{tier.usedCount}</td>
                  <td className="py-3 px-4 text-[#4A4238]">{tier.remaining}</td>
                  <td className="py-3 pl-4 text-right font-semibold text-[#2B3322]">
                    {tier.revenueInr === 0 ? '₹0' : formatInr(tier.revenueInr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attendee Ticket List */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#2B3322]">
            Attendee Tickets ({data.tickets.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="w-4 h-4 text-[#5A4D3F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              placeholder="Search guest or ticket code..."
              className="w-full rounded-full bg-[#F7F5EE] border border-[#D7DEB0] pl-9 pr-4 py-2 text-xs text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
            />
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <p className="text-sm text-[#5A4D3F] py-4">No matching tickets issued yet.</p>
        ) : (
          <div className="divide-y divide-[#E4DEC3]">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={t.owner} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2B3322] truncate">
                      {t.owner.fullName}
                    </p>
                    <p className="text-xs text-[#5A4D3F] truncate tabular-nums">
                      <span className="font-mono font-semibold text-[#2B3322]">{t.code}</span> ·{' '}
                      {t.tierName} · {t.pricePaidInr === 0 ? 'Free' : formatInr(t.pricePaidInr)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      t.status === 'VALID'
                        ? 'bg-[#E9EDC9] text-[#2B3322]'
                        : t.status === 'USED'
                        ? 'bg-[#CCD5AE] text-[#2B3322]'
                        : 'bg-[#FAEDCD] text-[#8C3B2B]'
                    }`}
                  >
                    {t.status}
                  </span>

                  {t.status === 'VALID' && (
                    <button
                      type="button"
                      disabled={checkingIn}
                      onClick={() => performCheckIn(t.code)}
                      className="min-h-[36px] rounded-full bg-[#2B3322] px-3.5 py-1.5 text-xs font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-50"
                    >
                      Check in
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
