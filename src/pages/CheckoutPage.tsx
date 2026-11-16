import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Download,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Landmark,
  Ticket,
} from 'lucide-react';
import {
  apiFetch,
  formatActivityDate,
  formatInr,
  formatTime12h,
} from '../lib/api';
import type {
  Activity,
  PaymentMethod,
  TicketOrderSummary,
  TicketRecord,
} from '../types/common';
import { useAuth } from '../context/AuthContext';
import { HeadingWithAccent, SafeImage } from '../components/BrandAndIcons';
import { ReceiptPrinter, type ReceiptPrinterStage } from '../components/ReceiptPrinter';
import {
  ReceiptPaperContent,
  TicketCard,
  downloadTicketIcs,
  downloadTicketPng,
} from '../components/TicketCard';

function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `cmn-${crypto.randomUUID()}`;
  }
  return `cmn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [simulateFailure, setSimulateFailure] = useState(false);

  const [printerStage, setPrinterStage] = useState<ReceiptPrinterStage>('idle');
  const [paymentError, setPaymentError] = useState('');
  const [issuedOrder, setIssuedOrder] = useState<TicketOrderSummary | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<TicketRecord[]>([]);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  useEffect(() => {
    if (!authLoading && !user) {
      const nextUrl = `/events/${id}/checkout${
        searchParams.get('tier') ? `?tier=${encodeURIComponent(searchParams.get('tier')!)}` : ''
      }`;
      navigate(`/login?next=${encodeURIComponent(nextUrl)}`);
    }
  }, [authLoading, user, navigate, id, searchParams]);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch<{ activity: Activity }>(`/api/activities/${id}`);
      setActivity(res.activity);
      const requestedTier = searchParams.get('tier');
      const matched = res.activity.ticketTiers.find(
        (t) => t.id === requestedTier && t.remaining > 0
      );
      const fallback =
        res.activity.ticketTiers.find((t) => t.remaining > 0) ||
        res.activity.ticketTiers[0];
      if (matched) {
        setSelectedTierId(matched.id);
      } else if (fallback) {
        setSelectedTierId(fallback.id);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Event not found.');
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => {
    if (user) loadEvent();
  }, [user, loadEvent]);

  const selectedTier = useMemo(
    () =>
      activity?.ticketTiers.find((t) => t.id === selectedTierId) ||
      activity?.ticketTiers[0] ||
      null,
    [activity, selectedTierId]
  );

  const maxQty = selectedTier ? Math.min(5, Math.max(selectedTier.remaining, 1)) : 1;

  useEffect(() => {
    if (quantity > maxQty) {
      setQuantity(maxQty);
    }
  }, [maxQty, quantity]);

  // Reset idempotency key if buyer edits order configuration before success
  useEffect(() => {
    if (printerStage === 'idle' || printerStage === 'error') {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
  }, [selectedTierId, quantity, paymentMethod, printerStage]);

  const isFreeOrder = selectedTier ? selectedTier.priceInr === 0 : true;
  const totalAmount = selectedTier ? selectedTier.priceInr * quantity : 0;

  const canCheckout =
    Boolean(activity) &&
    activity!.status === 'ACTIVE' &&
    !activity!.isPast &&
    Boolean(selectedTier) &&
    selectedTier!.remaining >= quantity;

  const runCheckout = async () => {
    if (!activity || !selectedTier || !canCheckout) return;

    setPaymentError('');
    setIssuedOrder(null);
    setIssuedTickets([]);
    setActiveTicketIndex(0);
    setPrinterStage('processing');

    const minDelay = new Promise((r) => setTimeout(r, prefersReducedMotion ? 350 : 1450));

    try {
      const [res] = await Promise.all([
        apiFetch<{ order: TicketOrderSummary; tickets: TicketRecord[] }>(
          '/api/orders/checkout',
          {
            method: 'POST',
            body: JSON.stringify({
              activityId: activity.id,
              tierId: selectedTier.id,
              quantity,
              paymentMethod: isFreeOrder ? 'FREE' : paymentMethod,
              idempotencyKey: idempotencyKeyRef.current,
              simulateFailure,
            }),
          }
        ),
        minDelay,
      ]);

      setIssuedOrder(res.order);
      setIssuedTickets(res.tickets);
      setPrinterStage('printing');
      loadEvent();
    } catch (err: any) {
      await minDelay;
      idempotencyKeyRef.current = generateIdempotencyKey();
      setPaymentError(
        err.message || 'Demo payment declined. No tickets were issued and no money was charged.'
      );
      setPrinterStage('error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-7 w-40 rounded bg-[#E9EDC9]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 rounded-3xl bg-[#FEFAE0]" />
          <div className="lg:col-span-5 h-80 rounded-3xl bg-[#E9EDC9]" />
        </div>
      </div>
    );
  }

  if (loadError || !activity) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center">
        <h1 className="text-xl font-bold text-[#2B3322]">Checkout unavailable</h1>
        <p className="mt-2 text-sm text-[#5A4D3F]">{loadError || 'Event not found.'}</p>
        <Link
          to="/activities"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-medium text-[#FEFAE0]"
        >
          Back to discover
        </Link>
      </div>
    );
  }

  const activeTicket = issuedTickets[activeTicketIndex] || issuedTickets[0] || null;
  const showFulfillmentStage = printerStage !== 'idle';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Link
        to={`/activities/${activity.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5A4D3F] hover:text-[#2B3322]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to event
      </Link>

      <div>
        <HeadingWithAccent
          as="h1"
          prefix="Reserve your"
          accent="tickets"
          className="text-3xl font-bold"
        />
        <p className="mt-1 text-sm text-[#5A4D3F]">
          Demo mode, no real money is charged. Passes appear instantly in your COMMON wallet.
        </p>
      </div>

      {/* Show Form before checkout OR alongside error retry; once complete/printing, focus on the ReceiptPrinter & Ticket Card */}
      {!issuedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Tier, Quantity & Demo Payment Method */}
          <div className="lg:col-span-7 space-y-5">
            {/* Event Summary Strip */}
            <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-[#E9EDC9]">
                <SafeImage
                  src={activity.imageUrl}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#5A4D3F]">
                  {activity.category.name} · {formatActivityDate(activity.date)} ·{' '}
                  {formatTime12h(activity.startTime)}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-[#2B3322] line-clamp-1">
                  {activity.title}
                </h2>
                <p className="text-xs text-[#5A4D3F] truncate">
                  {activity.venueName || activity.neighborhood}
                </p>
              </div>
            </div>

            {activity.status === 'CANCELLED' || activity.isPast ? (
              <div className="rounded-3xl bg-[#FAEDCD] border border-[#D4A373] p-6 text-sm text-[#8C3B2B] font-medium">
                {activity.status === 'CANCELLED'
                  ? 'This event has been cancelled and is no longer accepting ticket reservations.'
                  : 'This event has already taken place.'}
              </div>
            ) : (
              <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-6">
                {/* Tier Selection */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-[#2B3322]">1. Choose ticket tier</h2>
                  <div className="space-y-2.5">
                    {activity.ticketTiers.map((tier) => {
                      const soldOut = tier.remaining <= 0;
                      const isSelected = selectedTier?.id === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          disabled={soldOut || printerStage === 'processing'}
                          onClick={() => setSelectedTierId(tier.id)}
                          className={`w-full text-left rounded-2xl p-4 border transition-all ${
                            soldOut
                              ? 'bg-[#F7F5EE]/70 border-[#E4DEC3] opacity-55 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#E9EDC9]/75 border-2 border-[#D4A373]'
                              : 'bg-[#F7F5EE] border-[#D7DEB0] hover:bg-[#E9EDC9]/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#2B3322]">{tier.name}</p>
                              {tier.description && (
                                <p className="mt-0.5 text-xs text-[#5A4D3F]">{tier.description}</p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-[#2B3322] tabular-nums shrink-0">
                              {formatInr(tier.priceInr)}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] font-medium text-[#5A4D3F] tabular-nums">
                            {soldOut ? 'Sold out' : `${tier.remaining} remaining`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="pt-4 border-t border-[#E4DEC3] flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#2B3322]">2. Quantity</h2>
                    <p className="text-xs text-[#5A4D3F]">Up to 5 tickets per order</p>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-full bg-[#F7F5EE] border border-[#D7DEB0] p-1">
                    <button
                      type="button"
                      disabled={quantity <= 1 || printerStage === 'processing'}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-[#2B3322] hover:bg-[#E9EDC9] disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[#2B3322] tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= maxQty || printerStage === 'processing'}
                      onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                      aria-label="Increase quantity"
                      className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-[#2B3322] hover:bg-[#E9EDC9] disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Payment Method (Paid tiers only, NO card details collected) */}
                {!isFreeOrder && (
                  <div className="pt-4 border-t border-[#E4DEC3] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-[#2B3322]">3. Demo payment method</h2>
                      <span className="text-[11px] font-medium text-[#5A4D3F]">
                        No card details required
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'UPI', label: 'UPI', icon: Smartphone },
                        { id: 'CARD', label: 'Card', icon: CreditCard },
                        { id: 'NETBANKING', label: 'Netbanking', icon: Landmark },
                      ].map((m) => {
                        const Icon = m.icon;
                        const active = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={printerStage === 'processing'}
                            onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                            className={`min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                              active
                                ? 'bg-[#2B3322] text-[#FEFAE0] border-[#2B3322]'
                                : 'bg-[#F7F5EE] text-[#2B3322] border-[#D7DEB0] hover:bg-[#E9EDC9]'
                            }`}
                          >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtle Failure Simulator for Demo Testing */}
                <div className="pt-3 border-t border-[#E4DEC3] flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-[#5A4D3F] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="rounded border-[#5A4D3F] accent-[#8C3B2B]"
                    />
                    <span>Simulate payment failure (demo test)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary + ReceiptPrinter Processing / Error */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 space-y-4">
              <div className="rounded-2xl bg-[#E9EDC9]/70 border border-[#D7DEB0] p-3 flex items-start gap-2.5 text-xs text-[#2B3322]">
                <ShieldCheck className="w-4 h-4 text-[#5E7446] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Demo mode, no real money is charged.</strong> Your ticket pass &amp; QR code will be generated immediately.
                </span>
              </div>

              <h2 className="text-base font-bold text-[#2B3322]">Order summary</h2>

              {selectedTier && (
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2 text-[#4A4238]">
                    <dt>
                      {selectedTier.name} × {quantity}
                    </dt>
                    <dd className="tabular-nums font-medium">
                      {isFreeOrder ? 'Free' : formatInr(selectedTier.priceInr)} each
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 text-[#4A4238]">
                    <dt>Platform fee</dt>
                    <dd className="tabular-nums">₹0</dd>
                  </div>
                  <div className="pt-3 border-t border-[#E4DEC3] flex justify-between gap-2 text-base font-bold text-[#2B3322]">
                    <dt>Total</dt>
                    <dd className="tabular-nums">
                      {isFreeOrder ? 'Free (₹0)' : formatInr(totalAmount)}
                    </dd>
                  </div>
                </dl>
              )}

              <button
                type="button"
                disabled={!canCheckout || printerStage === 'processing'}
                onClick={runCheckout}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-[#2B3322] px-6 py-3 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-55 transition-colors"
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                {printerStage === 'processing'
                  ? 'Confirming your spot...'
                  : isFreeOrder
                  ? 'Confirm Free Ticket'
                  : `Pay ${formatInr(totalAmount)} (Demo)`}
              </button>
            </div>

            {showFulfillmentStage && (
              <ReceiptPrinter.Root
                stage={printerStage}
                animate={true}
                feedMotion="stepped"
                onAnimationComplete={() => setPrinterStage('complete')}
              >
                <ReceiptPrinter.Machine>
                  <ReceiptPrinter.Header />
                  <ReceiptPrinter.Screen>
                    <ReceiptPrinter.Status
                      errorDetail={paymentError}
                      onRetry={() => {
                        setSimulateFailure(false);
                        setPrinterStage('idle');
                        setPaymentError('');
                      }}
                    />
                  </ReceiptPrinter.Screen>
                </ReceiptPrinter.Machine>
                <ReceiptPrinter.Output>{null}</ReceiptPrinter.Output>
              </ReceiptPrinter.Root>
            )}
          </div>
        </div>
      ) : (
        /* Success: ReceiptPrinter feeding paper + TicketCard below */
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ReceiptPrinter Moment */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <ReceiptPrinter.Root
                stage={printerStage}
                animate={true}
                feedMotion="stepped"
                onAnimationComplete={() => setPrinterStage('complete')}
              >
                <ReceiptPrinter.Machine>
                  <ReceiptPrinter.Header />
                  <ReceiptPrinter.Screen>
                    <ReceiptPrinter.Status />
                  </ReceiptPrinter.Screen>
                </ReceiptPrinter.Machine>
                <ReceiptPrinter.Output>
                  <ReceiptPrinter.Paper>
                    <ReceiptPaperContent
                      orderNumber={issuedOrder.orderNumber}
                      eventTitle={activity.title}
                      eventDate={activity.date}
                      startTime={activity.startTime}
                      venue={activity.venueName || activity.neighborhood}
                      tierName={issuedTickets[0]?.tier.name || selectedTier?.name || 'Pass'}
                      quantity={issuedOrder.quantity}
                      unitPriceInr={issuedOrder.unitPriceInr}
                      totalAmountInr={issuedOrder.totalAmountInr}
                      paymentMethod={issuedOrder.paymentMethod}
                      holderName={user?.fullName || issuedTickets[0]?.owner.fullName || 'Guest'}
                      issuedAt={issuedOrder.createdAt}
                    />
                  </ReceiptPrinter.Paper>
                </ReceiptPrinter.Output>
              </ReceiptPrinter.Root>
            </div>

            {/* Revealed Ticket Card & Actions */}
            <div className="lg:col-span-7 space-y-5">
              {printerStage === 'complete' && activeTicket ? (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="rounded-3xl bg-[#E9EDC9] border border-[#B9C496] p-5 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2B3322] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h2 className="text-base font-bold text-[#2B3322]">
                        You&apos;re in — {issuedTickets.length}{' '}
                        {issuedTickets.length === 1 ? 'ticket' : 'tickets'} issued
                      </h2>
                      <p className="mt-0.5 text-xs text-[#4A4238]">
                        Order {issuedOrder.orderNumber} · Added to your event group chat &amp; My Tickets wallet.
                      </p>
                    </div>
                  </div>

                  {issuedTickets.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {issuedTickets.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTicketIndex(idx)}
                          className={`min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            idx === activeTicketIndex
                              ? 'bg-[#2B3322] text-[#FEFAE0]'
                              : 'bg-[#FEFAE0] border border-[#D7DEB0] text-[#2B3322]'
                          }`}
                        >
                          Pass {idx + 1} · {t.code}
                        </button>
                      ))}
                    </div>
                  )}

                  <TicketCard ticket={activeTicket} showActions={false} qrSize={132} />

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/tickets"
                      className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#2B3322] px-6 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F]"
                    >
                      View my tickets
                    </Link>
                    <button
                      type="button"
                      onClick={() => downloadTicketIcs(activeTicket)}
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-4 py-2.5 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9]"
                    >
                      <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                      Add to calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTicketPng(activeTicket)}
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-4 py-2.5 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9]"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      Download pass
                    </button>
                    <Link
                      to="/activities?kind=EVENT"
                      className="min-h-[44px] inline-flex items-center px-3 text-xs font-semibold text-[#5A4D3F] hover:text-[#2B3322]"
                    >
                      Back to events
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#2B3322]">
                    Printing your pass...
                  </p>
                  <p className="text-xs text-[#5A4D3F]">
                    Your QR ticket will appear here as soon as the receipt finishes printing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
