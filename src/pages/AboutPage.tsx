import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeadingWithAccent, SafeImage } from '../components/BrandAndIcons';

const JOURNEY_CARDS = [
  {
    step: '01',
    title: 'Interest',
    text: 'Start with a curiosity or everyday hobby you already enjoy—walking, badminton, sketching, cycling, or reading.',
    tint: 'bg-[#FEFAE0] border-[#E4DEC3]',
  },
  {
    step: '02',
    title: 'Activity',
    text: 'Find an open, human-scale gathering nearby in Delhi-NCR or an online circle with clear timing and location.',
    tint: 'bg-[#E9EDC9] border-[#D7DEB0]',
  },
  {
    step: '03',
    title: 'People',
    text: 'Show up alongside others who chose the exact same activity. You already have something genuine in common.',
    tint: 'bg-[#FAEDCD] border-[#EAD8B0]',
  },
  {
    step: '04',
    title: 'Shared Experience',
    text: 'Do the thing together—walk a park trail, share chai, trade film framing tips, or finish a board game.',
    tint: 'bg-[#CCD5AE] border-[#B9C496]',
  },
  {
    step: '05',
    title: 'Repeated Interaction',
    text: 'Join local communities and familiar weekly sessions so acquaintances become people you recognise.',
    tint: 'bg-[#FEFAE0] border-[#E4DEC3]',
  },
  {
    step: '06',
    title: 'Friendship',
    text: 'Friendships grow naturally out of shared time and consistency—without forced icebreakers or feeds.',
    tint: 'bg-[#E9EDC9] border-[#D7DEB0]',
  },
];

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Intro */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-xs font-semibold tracking-wide text-[#5A4D3F]">
            About COMMON
          </p>
          <HeadingWithAccent
            as="h1"
            prefix="Built for real"
            accent="companionship"
            className="text-3xl sm:text-4xl font-bold leading-tight"
          />
          <p className="text-base text-[#3A352D] leading-relaxed">
            Making meaningful friends as an adult—especially after moving to a new city or changing routines—is surprisingly hard. Traditional social apps ask you to judge strangers by profile photos, follower counts, or awkward cold messages.
          </p>
          <p className="text-base text-[#3A352D] leading-relaxed">
            COMMON flips that order completely. Instead of putting profiles first, we start with what people want to do on a Saturday morning or a Wednesday evening. When you gather around a shared activity, connection happens naturally.
          </p>
        </div>

        <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-[#D7DEB0] aspect-[4/3]">
          <SafeImage
            src="/src/assets/images/activity_cafe_sketchbook_1794851446562.jpg"
            alt="Friends sketching together at a sunlit garden cafe table"
            fallbackLabel="Shared creative moments"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* The 6-Stage Journey */}
      <section className="space-y-6">
        <div>
          <HeadingWithAccent
            prefix="Our core"
            accent="journey"
            className="text-2xl sm:text-3xl font-bold"
          />
          <p className="mt-1 text-sm text-[#5A4D3F]">
            Every feature inside COMMON supports these six steady steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {JOURNEY_CARDS.map((card) => (
            <div
              key={card.step}
              className={`rounded-3xl border p-6 ${card.tint}`}
            >
              <span className="text-xs font-semibold text-[#5A4D3F] tabular-nums">
                {card.step}.
              </span>
              <h2 className="mt-2 text-lg font-semibold text-[#2B3322]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[#4A4238] leading-relaxed">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What COMMON Deliberately Leaves Out */}
      <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-bold text-[#2B3322]">
          What we deliberately leave out
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[#4A4238] leading-relaxed">
          <div>
            <h3 className="font-semibold text-[#2B3322]">No swipes or match scores</h3>
            <p className="mt-1">
              You discover people because you share an interest, a neighbourhood walk, or a community—not through a compatibility percentage.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#2B3322]">No popularity feeds</h3>
            <p className="mt-1">
              There are no follower counts, likes, or endless timelines competing for attention. Participation stays grounded in real calendars.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#2B3322]">No tickets or paywalls</h3>
            <p className="mt-1">
              Activities on COMMON are free, community-hosted gatherings focused on showing up and sharing time together.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl bg-[#2B3322] text-[#FEFAE0] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">Ready to join your first gathering?</h2>
          <p className="mt-1 text-sm text-[#E9EDC9]">
            Browse walks, cafés, games, and communities happening across Delhi-NCR.
          </p>
        </div>
        <Link
          to="/activities"
          className="inline-flex items-center gap-2 rounded-full bg-[#D4A373] px-6 py-3 text-sm font-semibold text-[#FEFAE0] hover:bg-[#C39262] whitespace-nowrap shrink-0"
        >
          Browse Activities
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
