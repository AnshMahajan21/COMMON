import * as React from 'react';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { CheckCircleIcon, CircleNotchIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/helpers/classname-helper';

export type ReceiptPrinterStage = 'idle' | 'processing' | 'printing' | 'complete' | 'error';

export type ReceiptPrinterFeedMotion = 'stepped' | 'smooth';

type ReceiptPrinterContextValue = {
  stage: ReceiptPrinterStage;
  animate: boolean;
  feedMotion: ReceiptPrinterFeedMotion;
  printerId: string;
  screenStatusId: string;
  onAnimationComplete?: () => void;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

function useReceiptPrinterContext() {
  const ctx = useContext(ReceiptPrinterContext);
  if (!ctx) {
    throw new Error('ReceiptPrinter components must be used within ReceiptPrinter.Root');
  }
  return ctx;
}

const DEFAULT_RECEIPT_CUT = { teeth: 40, toothHeightPx: 4 } as const;

const RECEIPT_FEED_DURATION_S = 1.75;
const RECEIPT_FEED_STEPS = 20;

const smoothFeedEase = [0.22, 1, 0.36, 1] as const;

const steppedFeedValues = Array.from({ length: RECEIPT_FEED_STEPS + 1 }, (_, i) => {
  const p = i / RECEIPT_FEED_STEPS;
  const micro = i < RECEIPT_FEED_STEPS && i % 2 === 1 ? -0.35 : 0;
  return `${-100 + p * 100 + micro}%`;
});

const steppedFeedTimes = Array.from({ length: RECEIPT_FEED_STEPS + 1 }, (_, i) =>
  i / RECEIPT_FEED_STEPS
);

function getSerratedBottomClipPath(teeth: number, heightPx: number) {
  const points: string[] = ['0% 0%', '100% 0%'];
  const step = 100 / teeth;
  for (let i = 0; i < teeth; i++) {
    const rightX = 100 - i * step;
    const midX = rightX - step / 2;
    const leftX = Math.max(0, rightX - step);
    points.push(`${rightX.toFixed(2)}% calc(100% - ${heightPx}px)`);
    points.push(`${midX.toFixed(2)}% 100%`);
    points.push(`${leftX.toFixed(2)}% calc(100% - ${heightPx}px)`);
  }
  return `polygon(${points.join(', ')})`;
}

export function ReceiptPrinterRoot({
  stage = 'complete',
  animate = true,
  feedMotion = 'stepped',
  onAnimationComplete,
  className,
  children,
}: {
  stage?: ReceiptPrinterStage;
  animate?: boolean;
  feedMotion?: ReceiptPrinterFeedMotion;
  onAnimationComplete?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const printerId = useId();
  const screenStatusId = useId();

  return (
    <ReceiptPrinterContext.Provider
      value={{
        stage,
        animate,
        feedMotion,
        printerId,
        screenStatusId,
        onAnimationComplete,
      }}
    >
      <div
        className={cn(
          'relative mx-auto w-full max-w-[360px] select-none',
          className
        )}
      >
        {children}
      </div>
    </ReceiptPrinterContext.Provider>
  );
}

export function ReceiptPrinterMachine({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative z-10 rounded-[26px] border border-grayscale-7/70 bg-gradient-to-b from-grayscale-3 via-grayscale-4 to-grayscale-5 p-4 shadow-[0_14px_30px_-10px_rgba(43,51,34,0.22),inset_0_1px_0_rgba(255,255,255,0.6)]',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[26px] opacity-35 mix-blend-multiply"
        style={{
          backgroundImage: 'url(/textures/plastic-noise.svg)',
          backgroundSize: '180px 180px',
        }}
      />
      <div className="relative z-10 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function ReceiptPrinterHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between px-1', className)}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-earth shadow-inner" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-grayscale-10">
          {children || 'COMMON · PASS PRESS'}
        </span>
      </div>
      <div className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1 w-4 rounded-full bg-grayscale-7" />
        <span className="h-1 w-1.5 rounded-full bg-grayscale-7" />
      </div>
    </div>
  );
}

export function ReceiptPrinterScreen({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { screenStatusId } = useReceiptPrinterContext();
  return (
    <div
      id={screenStatusId}
      role="status"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-grayscale-11 bg-grayscale-12 px-4 py-3.5 text-grayscale-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/20"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function ReceiptPrinterStatus({
  processingLabel = 'Confirming your spot',
  printingLabel = 'Printing your ticket',
  completeLabel = "You're in",
  errorLabel = 'Payment did not go through',
  errorDetail,
  onRetry,
  className,
}: {
  processingLabel?: string;
  printingLabel?: string;
  completeLabel?: string;
  errorLabel?: string;
  errorDetail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const { stage } = useReceiptPrinterContext();
  const shouldReduceMotion = useReducedMotion();

  const statusText =
    stage === 'processing'
      ? processingLabel
      : stage === 'printing'
      ? printingLabel
      : stage === 'error'
      ? errorLabel
      : stage === 'complete'
      ? completeLabel
      : 'Ready';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2 font-mono text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {stage === 'processing' || stage === 'printing' ? (
            <CircleNotchIcon
              weight="bold"
              className={cn(
                'h-4 w-4 shrink-0 text-green-9',
                !shouldReduceMotion && 'animate-spin'
              )}
              aria-hidden="true"
            />
          ) : stage === 'error' ? (
            <WarningCircleIcon
              weight="fill"
              className="h-4 w-4 shrink-0 text-amber-400"
              aria-hidden="true"
            />
          ) : (
            <CheckCircleIcon
              weight="fill"
              className="h-4 w-4 shrink-0 text-green-9"
              aria-hidden="true"
            />
          )}
          <span className="truncate font-medium tracking-wide text-grayscale-1">
            {statusText}
          </span>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-grayscale-7 tabular-nums">
          {stage === 'processing'
            ? 'AUTH'
            : stage === 'printing'
            ? 'FEED'
            : stage === 'error'
            ? 'ERR'
            : 'DONE'}
        </span>
      </div>

      {stage === 'error' && (
        <div className="pt-1 space-y-2">
          {errorDetail && (
            <p className="font-sans text-[11px] leading-snug text-peach">
              {errorDetail}
            </p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-full bg-cream px-3.5 py-1.5 font-sans text-xs font-semibold text-olive hover:bg-peach transition-colors"
            >
              Try payment again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReceiptPrinterOutput({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { stage } = useReceiptPrinterContext();
  const showPaper = stage === 'printing' || stage === 'complete';

  return (
    <div className={cn('relative -mt-3 px-4 pt-1', className)}>
      {/* Paper feed slot */}
      <div
        aria-hidden="true"
        className="mx-1 h-3 rounded-b-xl border-x border-b border-grayscale-8/70 bg-grayscale-12 shadow-inner"
      />
      <div className="relative -mt-1.5 overflow-hidden px-1.5 pb-4">
        <AnimatePresence mode="wait">
          {showPaper && children}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ReceiptPrinterPaper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { stage, animate, feedMotion, onAnimationComplete } = useReceiptPrinterContext();
  const shouldReduceMotion = useReducedMotion();
  const didNotifyRef = useRef(false);
  const [hasSettled, setHasSettled] = useState(!animate || stage === 'complete');

  useEffect(() => {
    if (!animate || shouldReduceMotion) {
      setHasSettled(true);
      if (stage === 'complete' && !didNotifyRef.current) {
        didNotifyRef.current = true;
        onAnimationComplete?.();
      }
      return;
    }
    if (stage === 'printing') {
      didNotifyRef.current = false;
      setHasSettled(false);
    }
  }, [animate, shouldReduceMotion, stage, onAnimationComplete]);

  const clipPath = getSerratedBottomClipPath(
    DEFAULT_RECEIPT_CUT.teeth,
    DEFAULT_RECEIPT_CUT.toothHeightPx
  );

  const shouldRunFeedAnimation = animate && !shouldReduceMotion && !hasSettled;

  const initialProps = shouldRunFeedAnimation
    ? { y: '-100%', opacity: 0.96 }
    : shouldReduceMotion
    ? { opacity: 0 }
    : { y: '0%', opacity: 1 };

  const animateProps = shouldRunFeedAnimation
    ? feedMotion === 'stepped'
      ? { y: steppedFeedValues, opacity: 1 }
      : { y: '0%', opacity: 1 }
    : { y: '0%', opacity: 1 };

  const transitionProps = shouldRunFeedAnimation
    ? feedMotion === 'stepped'
      ? {
          y: {
            duration: RECEIPT_FEED_DURATION_S,
            times: steppedFeedTimes,
            ease: 'linear' as const,
          },
          opacity: { duration: 0.15 },
        }
      : {
          y: { duration: RECEIPT_FEED_DURATION_S, ease: smoothFeedEase },
          opacity: { duration: 0.2 },
        }
    : { duration: 0.25 };

  return (
    <motion.div
      initial={initialProps}
      animate={animateProps}
      exit={{ opacity: 0 }}
      transition={transitionProps}
      onAnimationComplete={() => {
        setHasSettled(true);
        if (!didNotifyRef.current) {
          didNotifyRef.current = true;
          onAnimationComplete?.();
        }
      }}
      style={{
        clipPath,
        backgroundImage: 'url(/textures/receipt-paper.svg)',
        backgroundRepeat: 'repeat',
      }}
      className={cn(
        'relative mx-auto w-full bg-grayscale-1 px-5 pt-5 pb-7 text-grayscale-12 shadow-[0_12px_28px_-6px_rgba(43,51,34,0.18)] border-x border-t border-grayscale-6/60 font-mono text-xs',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export const ReceiptPrinter = {
  Root: ReceiptPrinterRoot,
  Machine: ReceiptPrinterMachine,
  Header: ReceiptPrinterHeader,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
};
