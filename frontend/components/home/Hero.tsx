"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { MOCK_BRANCHES } from "@/lib/mock-data";

const branch = MOCK_BRANCHES[0];

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: shouldReduceMotion ? 0 : 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const locationText = `${branch.address}, ${branch.city}`;
  const hoursText = `${branch.openingTime} – ${branch.closingTime}`;

  return (
    <section id="top" className="relative bg-forest-deep text-cream grain overflow-hidden">
      {/* Full‑bleed cinematic backdrop */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/raccoon/atmosphere/barista.jpg"
          alt="Barista pulling an espresso shot at Raccoon Coffee"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 1440px"
          quality={90}
        />
        <div className="absolute inset-0 hidden sm:block hero-grade" />
        <div className="absolute inset-0 sm:hidden hero-grade-mobile" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Editorial overlay – asymmetric, breathing space */}
      <div className="relative z-10 section-shell">
        <div className="flex min-h-[80vh] md:min-h-[92svh] items-end md:items-center justify-between">
          <div className="w-full md:max-w-[48rem] pb-10 md:pb-0">
            <motion.div initial="hidden" animate="show" variants={containerVariants}>
              <motion.p variants={itemVariants} className="text-xs font-semibold uppercase tracking-[0.32em] text-gold">
                Raccoon Coffee &amp; Chill
              </motion.p>
              <motion.h1 variants={itemVariants} className="mt-3 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-cream drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                Tempat untuk
                <br />
                <span className="italic font-serif text-gold">Berhenti Sebentar.</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="mt-6 max-w-[38ch] text-base leading-relaxed text-cream/85 sm:text-lg lg:text-xl font-light">
                Good coffee, slow moments, and stories worth sharing.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cream/80">
                <span className="inline-flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {locationText}
                </span>
                <span className="inline-flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {hoursText}
                </span>
              </motion.div>
              <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
                <a href="#location" className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 bg-forest-deep/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cream backdrop-blur-sm transition-all duration-200 hover:border-gold hover:bg-forest-deep/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Reservasi
                </a>
                <a href="#menu" className="inline-flex items-center justify-center gap-2 rounded-full border border-cream/40 bg-forest-deep/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cream backdrop-blur-sm transition-all duration-200 hover:border-cream hover:bg-cream/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Order
                </a>
                <a href="#menu" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                  Lihat Menu<span aria-hidden="true">→</span>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
