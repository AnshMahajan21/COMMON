import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, Download, Ticket as TicketIcon } from 'lucide-react';
import { apiFetch, formatActivityDate, formatTime12h } from '../lib/api';
import type { TicketRecord } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { HeadingWithAccent } from '../components/BrandAndIcons';
import { ModalDialog } from '../components/ui/dialog';
import { ReceiptPrinter } from '../components/ReceiptPrinter';
import {
  QrCodeGraphic,
  ReceiptPaperContent,
  TicketCard,
  downloadTicketIcs,
  downloadTicketPng,
} from '../components/TicketCard';

export function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [qrModalTicket, setQrModalTicket] = useState<TicketRecord | null>(null);
  const [receiptModalTicket, setReceiptModalTicket] = useState<TicketRecord | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/tickets');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    apiFetch<{ tickets: TicketRecord[] }>('/api/tickets')
      .then((res) => {
        if (active) setTickets(res.tickets);
      })
      .catch((err: any) => {
        if (active) setError(err.message || 'Could not load your tickets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const { upcomingTickets, pastTickets } = useMemo(() => {
    const now = new Date();
    const upcoming: TicketRecord[] = [];
    const past: TicketRecord[] = [];

    for (const t of tickets) {
      const eventDate = new Date(t.activity.date);
      const isUpcomingValid =
        t.status === 'VALID' &&
        t.activity.status === 'ACTIVE' &&
        eventDate >= now;

      if (isUpcomingValid) {
        upcoming.push(t);
      } else {
        past.push(t);
      }
    }

    return { upcomingTickets: upcoming, pastTickets: past };
  }, [tickets]);

  const visibleList = tab === 'upcoming' ? upcomingTickets : pastTickets;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <HeadingWithAccent
            as="h1"
            prefix="My"
            accent="Tickets"
            className="text-3xl sm:text-4xl font-bold"
          />
          <p className="mt-1 text-sm text-[#5A4D3F]">
            Tap any ticket pass to enlarge the QR code for entry, download an offline copy, or view your receipt.
          </p>
        </div>

        <Link
          to="/activities?kind=EVENT"
          className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] self-start sm:self-auto"
        >
          Browse events
        </Link>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Ticket status tabs"
        className="inline-flex items-center rounded-full bg-[#FEFAE0] border border-[#D7DEB0] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
          className={`min-h-[38px] rounded-full px-5 py-1.5 text-sm font-medium transition-colors tabular-nums ${
            tab === 'upcoming'
              ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
              : 'text-[#5A4D3F] hover:text-[#2B3322]'
          }`}
        >
          Upcoming ({upcomingTickets.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'past'}
          onClick={() => setTab('past')}
          className={`min-h-[38px] rounded-full px-5 py-1.5 text-sm font-medium transition-colors tabular-nums ${
            tab === 'past'
              ? 'bg-[#2B3322] text-[#FEFAE0] font-semibold'
              : 'text-[#5A4D3F] hover:text-[#2B3322]'
          }`}
        >
          Past &amp; Refunded ({pastTickets.length})
        </button>
      </div>

      {error && (
        <div className="rounded-3xl bg-[#FAEDCD] border border-[#D4A373] p-5 text-sm text-[#8C3B2B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[440px] rounded-3xl bg-[#E9EDC9]/60 animate-pulse" />
          ))}
        </div>
      ) : visibleList.length === 0 ? (
        <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-10 text-center max-w-xl mx-auto">
          <TicketIcon className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-[#2B3322]">
            {tab === 'upcoming' ? 'No upcoming tickets yet' : 'No past or refunded tickets'}
          </h2>
          <p className="mt-2 text-sm text-[#5A4D3F]">
            {tab === 'upcoming'
              ? 'Discover workshops, open mics, sunrise treks, and food tables across Delhi-NCR.'
              : 'Checked-in passes and any refunded reservations will stay archived here.'}
          </p>
          <div className="mt-6">
            <Link
              to="/activities?kind=EVENT"
              className="inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0]"
            >
              Explore events
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleList.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setQrModalTicket(ticket)}
              onViewReceipt={(t) => setReceiptModalTicket(t)}
            />
          ))}
        </div>
      )}

      {/* Enlarged QR Pass Modal */}
      <ModalDialog
        open={Boolean(qrModalTicket)}
        onClose={() => setQrModalTicket(null)}
        title={qrModalTicket?.activity.title || 'Event Pass'}
      >
        {qrModalTicket && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-[#5A4D3F]">
              {formatActivityDate(qrModalTicket.activity.date)} ·{' '}
              {formatTime12h(qrModalTicket.activity.startTime)} ·{' '}
              {qrModalTicket.activity.venueName || qrModalTicket.activity.neighborhood}
            </p>

            <div className="flex justify-center py-2">
              <QrCodeGraphic code={qrModalTicket.code} size={210} />
            </div>

            <div className="rounded-2xl bg-[#F7F5EE] border border-[#E4DEC3] p-3 text-xs space-y-1">
              <p className="font-mono text-base font-bold text-[#2B3322] tracking-wider">
                {qrModalTicket.code}
              </p>
              <p className="text-[#5A4D3F]">
                {qrModalTicket.tier.name} · Holder: {qrModalTicket.owner.fullName}
              </p>
              <p className="text-[11px] font-semibold text-[#4E5A3C]">
                Status: {qrModalTicket.status}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => downloadTicketIcs(qrModalTicket)}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-full bg-[#E9EDC9] border border-[#D7DEB0] px-4 py-2 text-xs font-semibold text-[#2B3322]"
              >
                <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                Add to calendar
              </button>
              <button
                type="button"
                onClick={() => downloadTicketPng(qrModalTicket)}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-full bg-[#2B3322] px-4 py-2 text-xs font-semibold text-[#FEFAE0]"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download pass
              </button>
              <Link
                to={`/activities/${qrModalTicket.activity.id}`}
                onClick={() => setQrModalTicket(null)}
                className="min-h-[42px] inline-flex items-center px-3 text-xs font-semibold text-[#5A4D3F] hover:text-[#2B3322]"
              >
                Event details →
              </Link>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Receipt Modal (Static ReceiptPrinter with animate={false}) */}
      <ModalDialog
        open={Boolean(receiptModalTicket)}
        onClose={() => setReceiptModalTicket(null)}
        title="Order Receipt"
      >
        {receiptModalTicket && (
          <div className="py-2">
            <ReceiptPrinter.Root stage="complete" animate={false}>
              <ReceiptPrinter.Machine>
                <ReceiptPrinter.Header />
                <ReceiptPrinter.Screen>
                  <ReceiptPrinter.Status
                    completeLabel={
                      receiptModalTicket.status === 'REFUNDED'
                        ? 'Refunded (Demo)'
                        : "You're in"
                    }
                  />
                </ReceiptPrinter.Screen>
              </ReceiptPrinter.Machine>
              <ReceiptPrinter.Output>
                <ReceiptPrinter.Paper>
                  <ReceiptPaperContent
                    orderNumber={receiptModalTicket.order.orderNumber}
                    eventTitle={receiptModalTicket.activity.title}
                    eventDate={receiptModalTicket.activity.date}
                    startTime={receiptModalTicket.activity.startTime}
                    venue={
                      receiptModalTicket.activity.venueName ||
                      receiptModalTicket.activity.neighborhood
                    }
                    tierName={receiptModalTicket.tier.name}
                    quantity={receiptModalTicket.order.quantity}
                    unitPriceInr={receiptModalTicket.order.unitPriceInr}
                    totalAmountInr={receiptModalTicket.order.totalAmountInr}
                    paymentMethod={receiptModalTicket.order.paymentMethod}
                    holderName={receiptModalTicket.owner.fullName}
                    issuedAt={receiptModalTicket.order.createdAt}
                  />
                </ReceiptPrinter.Paper>
              </ReceiptPrinter.Output>
            </ReceiptPrinter.Root>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
