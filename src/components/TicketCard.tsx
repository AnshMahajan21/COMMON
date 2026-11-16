import React, { useEffect, useState } from 'react';
import { CalendarPlus, Download, Receipt, Sparkles } from 'lucide-react';
import type { TicketRecord } from '../types/common';
import {
  formatActivityDate,
  formatInr,
  formatTime12h,
  getTintSurfaceClasses,
} from '../lib/api';
import { SafeImage } from './BrandAndIcons';

function getQrMatrixDataUrl(value: string, size = 180): Promise<string> {
  return import('qrcode').then((QRCode) =>
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#2B3322',
        light: '#FEFAE0',
      },
      errorCorrectionLevel: 'M',
    })
  );
}

export function QrCodeGraphic({
  code,
  size = 128,
  className = '',
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    getQrMatrixDataUrl(`COMMON:${code}`, size * 2)
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#E9EDC9] animate-pulse ${className}`}
        aria-label={`QR code for ${code}`}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={`Entry QR code for ticket ${code}`}
      className={`rounded-xl border border-[#D7DEB0] bg-[#FEFAE0] p-1.5 ${className}`}
    />
  );
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function downloadTicketIcs(ticket: TicketRecord) {
  const start = new Date(ticket.activity.date);
  const end = ticket.activity.endDate
    ? new Date(ticket.activity.endDate)
    : new Date(start.getTime() + 120 * 60 * 1000);

  const locationText =
    ticket.activity.fullAddress ||
    ticket.activity.venueName ||
    ticket.activity.location;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//COMMON//Event Ticket//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ticket.id}@common.in`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${ticket.activity.title.replace(/,/g, '\\,')}`,
    `LOCATION:${locationText.replace(/,/g, '\\,')}`,
    `DESCRIPTION:COMMON Ticket (${ticket.tier.name}) · Code: ${ticket.code} · Holder: ${ticket.owner.fullName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `common-${ticket.code.toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadTicketPng(ticket: TicketRecord) {
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 1040;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const tint = getTintSurfaceClasses(ticket.activity.tintColor);

  // Outer tint card
  ctx.fillStyle = tint.hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Inner Cream ticket sheet
  ctx.fillStyle = '#FEFAE0';
  const pad = 36;
  const r = 32;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w, h, r);
  ctx.fill();
  ctx.strokeStyle = '#D7DEB0';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Header brand
  ctx.fillStyle = '#2B3322';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('COMMON', 76, 108);

  ctx.fillStyle = '#5A4D3F';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(ticket.activity.category.name.toUpperCase(), 76, 144);

  // Event Title (wrapped)
  ctx.fillStyle = '#2B3322';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  const words = ticket.activity.title.split(' ');
  let line = '';
  let y = 210;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 80) {
      ctx.fillText(line, 76, y);
      line = word;
      y += 44;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 76, y);

  // Details 2-col grid
  const gridY = Math.max(y + 64, 340);
  const details = [
    ['DATE', formatActivityDate(ticket.activity.date), 76, gridY],
    ['TIME', formatTime12h(ticket.activity.startTime), 400, gridY],
    ['VENUE', ticket.activity.venueName || ticket.activity.location, 76, gridY + 95],
    ['TIER', `${ticket.tier.name} (${formatInr(ticket.pricePaidInr)})`, 400, gridY + 95],
    ['TICKET HOLDER', ticket.owner.fullName, 76, gridY + 190],
    ['TICKET ID', ticket.code, 400, gridY + 190],
  ] as const;

  for (const [label, val, dx, dy] of details) {
    ctx.fillStyle = '#5A4D3F';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(label, dx, dy);
    ctx.fillStyle = '#2B3322';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    const trimmed = val.length > 26 ? `${val.slice(0, 24)}…` : val;
    ctx.fillText(trimmed, dx, dy + 32);
  }

  // Dashed perforation line
  const perfY = 670;
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#B7C198';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, perfY);
  ctx.lineTo(canvas.width - 64, perfY);
  ctx.stroke();
  ctx.setLineDash([]);

  // QR code
  const qrData = await getQrMatrixDataUrl(`COMMON:${ticket.code}`, 240);
  const img = new Image();
  img.src = qrData;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
  ctx.drawImage(img, (canvas.width - 220) / 2, perfY + 40, 220, 220);

  ctx.fillStyle = '#2B3322';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ticket.code, canvas.width / 2, perfY + 292);

  ctx.fillStyle = '#5A4D3F';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Status: ${ticket.status} · Present this QR pass at entry`, canvas.width / 2, perfY + 326);

  const link = document.createElement('a');
  link.download = `common-ticket-${ticket.code}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const STAMP_STYLES: Record<string, { label: string; border: string; text: string; bg: string }> = {
  USED: {
    label: 'CHECKED IN · USED',
    border: 'border-[#5A4D3F]',
    text: 'text-[#5A4D3F]',
    bg: 'bg-[#E9EDC9]/90',
  },
  CANCELLED: {
    label: 'CANCELLED',
    border: 'border-[#8C3B2B]',
    text: 'text-[#8C3B2B]',
    bg: 'bg-[#FAEDCD]/95',
  },
  REFUNDED: {
    label: 'REFUNDED',
    border: 'border-[#8C3B2B]',
    text: 'text-[#8C3B2B]',
    bg: 'bg-[#FAEDCD]/95',
  },
};

export function TicketCard({
  ticket,
  onClick,
  onViewReceipt,
  compact = false,
  showActions = true,
  qrSize = 112,
}: {
  ticket: TicketRecord;
  onClick?: () => void;
  onViewReceipt?: (ticket: TicketRecord) => void;
  compact?: boolean;
  showActions?: boolean;
  qrSize?: number;
}) {
  const tint = getTintSurfaceClasses(ticket.activity.tintColor);
  const isInactive = ticket.status !== 'VALID';
  const stamp = STAMP_STYLES[ticket.status];

  return (
    <article
      className={cnCard(
        `relative rounded-3xl ${tint.bg} border ${tint.border} p-3 sm:p-4 transition-all`,
        isInactive ? 'opacity-80' : 'hover:shadow-md',
        onClick ? 'cursor-pointer' : ''
      )}
    >
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className="relative rounded-2xl bg-[#FEFAE0] border border-[#E4DEC3] overflow-hidden"
      >
        {/* Status Stamp Overlay for non-VALID tickets */}
        {stamp && (
          <div className="absolute top-3 right-3 z-20 rotate-[-4deg] pointer-events-none">
            <span
              className={`inline-block rounded-lg border-2 ${stamp.border} ${stamp.bg} ${stamp.text} px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider shadow-xs`}
            >
              {stamp.label}
            </span>
          </div>
        )}

        {/* Top Rounded Image */}
        <div className="p-3 pb-0">
          <div
            className={`relative overflow-hidden rounded-xl bg-[#E9EDC9] ${
              compact ? 'h-32' : 'h-40 sm:h-44'
            }`}
          >
            <SafeImage
              src={ticket.activity.imageUrl}
              alt={ticket.activity.title}
              fallbackLabel={ticket.activity.category.name}
              className={`h-full w-full object-cover ${isInactive ? 'grayscale-[45%] opacity-80' : ''}`}
            />
          </div>
        </div>

        {/* Event Title & 2-Column Details */}
        <div className="px-4 pt-3.5 pb-4">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#5A4D3F]">
            <span>{ticket.activity.category.name}</span>
            <span className="tabular-nums font-semibold text-[#2B3322]">
              {ticket.pricePaidInr === 0 ? 'Free ticket' : formatInr(ticket.pricePaidInr)}
            </span>
          </div>

          <h3 className="mt-1 text-lg font-bold leading-snug text-[#2B3322] line-clamp-2">
            {ticket.activity.title}
          </h3>

          <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Date</dt>
              <dd className="mt-0.5 font-semibold text-[#2B3322] tabular-nums">
                {formatActivityDate(ticket.activity.date)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Time</dt>
              <dd className="mt-0.5 font-semibold text-[#2B3322] tabular-nums">
                {formatTime12h(ticket.activity.startTime)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Venue</dt>
              <dd className="mt-0.5 font-semibold text-[#2B3322] truncate">
                {ticket.activity.venueName || ticket.activity.neighborhood}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Tier</dt>
              <dd className="mt-0.5 font-semibold text-[#2B3322] truncate">{ticket.tier.name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Holder</dt>
              <dd className="mt-0.5 font-semibold text-[#2B3322] truncate">{ticket.owner.fullName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6F7359]">Ticket ID</dt>
              <dd className="mt-0.5 font-mono font-bold text-[#2B3322] tabular-nums">{ticket.code}</dd>
            </div>
          </dl>

          {ticket.status === 'REFUNDED' && (
            <div className="mt-3 rounded-xl bg-[#FAEDCD] border border-[#D4A373]/70 px-3 py-2 text-[11px] text-[#5A4D3F]">
              Refund status:{' '}
              <span className="font-semibold text-[#8C3B2B]">
                {ticket.pricePaidInr > 0
                  ? `Demo refund of ${formatInr(ticket.pricePaidInr)} processed back to ${ticket.order.paymentMethod}.`
                  : 'Event cancelled — spot released.'}
              </span>
            </div>
          )}
        </div>

        {/* Dashed Perforation Line with Side Notches */}
        <div className="relative flex items-center justify-between my-1">
          <span
            aria-hidden="true"
            className={`-ml-3 h-6 w-6 rounded-full ${tint.bg} border-r border-[#E4DEC3] shrink-0`}
          />
          <div className="flex-1 border-t-2 border-dashed border-[#D7DEB0] mx-2" />
          <span
            aria-hidden="true"
            className={`-mr-3 h-6 w-6 rounded-full ${tint.bg} border-l border-[#E4DEC3] shrink-0`}
          />
        </div>

        {/* QR Code Section */}
        <div className="px-4 py-4 flex flex-col items-center text-center gap-2 bg-[#F7F5EE]/50">
          <QrCodeGraphic code={ticket.code} size={qrSize} />
          <p className="font-mono text-xs font-semibold tracking-wider text-[#2B3322]">
            {ticket.code}
          </p>
          <p className="text-[11px] text-[#5A4D3F]">
            {ticket.status === 'VALID'
              ? 'Show this QR pass at entry'
              : ticket.status === 'USED'
              ? `Checked in${ticket.usedAt ? ` · ${formatActivityDate(ticket.usedAt)}` : ''}`
              : 'No longer valid for entry'}
          </p>
        </div>
      </div>

      {/* Quick Actions Footer */}
      {showActions && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadTicketIcs(ticket);
              }}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-1.5 text-xs font-medium text-[#2B3322] hover:bg-[#E9EDC9] transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Add to calendar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadTicketPng(ticket);
              }}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-1.5 text-xs font-medium text-[#2B3322] hover:bg-[#E9EDC9] transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download pass
            </button>
          </div>
          {onViewReceipt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewReceipt(ticket);
              }}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full bg-[#2B3322] px-3.5 py-1.5 text-xs font-semibold text-[#FEFAE0] hover:bg-[#3B462F] transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
              View receipt
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function cnCard(...parts: string[]) {
  return parts.filter(Boolean).join(' ');
}

export function ReceiptPaperContent({
  orderNumber,
  eventTitle,
  eventDate,
  startTime,
  venue,
  tierName,
  quantity,
  unitPriceInr,
  totalAmountInr,
  paymentMethod,
  holderName,
  issuedAt,
}: {
  orderNumber: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  venue: string;
  tierName: string;
  quantity: number;
  unitPriceInr: number;
  totalAmountInr: number;
  paymentMethod: string;
  holderName: string;
  issuedAt: string;
}) {
  const isFree = totalAmountInr === 0;
  return (
    <div className="space-y-3 text-grayscale-12">
      <div className="text-center border-b border-dashed border-grayscale-7 pb-3">
        <div className="inline-flex items-center gap-1.5 font-sans text-sm font-bold tracking-tight text-olive">
          <Sparkles className="w-3.5 h-3.5 text-earth" aria-hidden="true" />
          COMMON
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-grayscale-9">
          Activity-first Gathering Pass
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-bold leading-snug text-olive uppercase">
          {eventTitle}
        </p>
        <p className="text-[11px] text-grayscale-10">
          {formatActivityDate(eventDate)} · {formatTime12h(startTime)}
        </p>
        <p className="text-[11px] text-grayscale-10 truncate">{venue}</p>
      </div>

      <div className="border-y border-dashed border-grayscale-7 py-2.5 space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="text-grayscale-10">
            {tierName} × {quantity}
          </span>
          <span className="tabular-nums font-semibold">
            {isFree ? 'Free ticket' : formatInr(unitPriceInr)}
          </span>
        </div>
        <div className="flex justify-between gap-2 font-bold text-xs pt-1 border-t border-grayscale-5">
          <span>TOTAL PAID</span>
          <span className="tabular-nums">{isFree ? '₹0' : formatInr(totalAmountInr)}</span>
        </div>
      </div>

      <div className="space-y-1 text-[10px] text-grayscale-10">
        <div className="flex justify-between gap-2">
          <span>METHOD</span>
          <span className="font-semibold text-olive">{paymentMethod} (DEMO)</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>ORDER ID</span>
          <span className="font-semibold text-olive tabular-nums">{orderNumber}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>HOLDER</span>
          <span className="font-semibold text-olive truncate">{holderName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>ISSUED</span>
          <span className="tabular-nums">
            {new Date(issuedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      <p className="pt-2 text-center font-sans text-xs italic text-bark border-t border-dashed border-grayscale-7">
        See you there.
      </p>
    </div>
  );
}
