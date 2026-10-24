"use client";

import Image from "next/image";
import Reveal from "../ui/Reveal";
import type { SiteImage } from "@/types";

export default function BrandIntro({ images }: { images: SiteImage[] }) {
  const primary = images.find((i) => i.slotKey === "primary");
  const secondary = images.find((i) => i.slotKey === "secondary");
  return (
    <section id="story" className="relative bg-cream text-ink py-24 sm:py-32 overflow-hidden">
      <div className="section-shell grid md:grid-cols-12 items-center gap-12 lg:gap-16">
        {/* Left: Editorial story column */}
        <Reveal className="md:col-span-7">
          <p className="eyebrow text-gold mb-3">
            <span aria-hidden="true" className="mr-2"></span>
            Cerita Kami
          </p>
          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.04] text-ink">
            Lebih dari sekadar{" "}
            <em className="italic text-coffee">secangkir kopi.</em>
          </h2>
          <p className="mt-8 max-w-xl text-lg sm:text-xl text-ink/75 leading-relaxed font-light">
            Raccoon lahir dari keinginan sederhana: menyediakan tempat yang nyaman untuk menikmati kopi, bertemu teman, bekerja sebentar, atau sekadar menikmati waktu luang.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <a
              href="#menu"
              className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-forest-deep py-2 pl-6 pr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream transition-colors duration-200 hover:bg-forest"
            >
              Tentang Kami
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-forest-deep transition-transform duration-300 group-hover:-rotate-45"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </span>
            </a>
          </div>
        </Reveal>

        {/* Right: Asymmetric polaroid and interior photo collage */}
        <div className="relative md:col-span-5 h-[340px] sm:h-[480px]">
          <div className="absolute inset-x-4 top-4 h-[300px] sm:h-[380px] rounded-[1.5rem] overflow-hidden shadow-2xl rotate-1 transition-transform duration-500 hover:rotate-0">
            <Image
              src={primary?.imageUrl ?? "/images/raccoon/atmosphere/interior.jpg"}
              alt={primary?.altText || "Raccoon interior atmosphere"}
              fill
              sizes="(min-width: 768px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
          {/* Overlapping polaroid card */}
          <div className="absolute -bottom-6 left-6 w-48 sm:w-56 bg-cream p-3 pb-8 rounded shadow-xl -rotate-3 border border-ink/10 hidden sm:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-forest/10">
              <Image
                src={secondary?.imageUrl ?? "/images/raccoon/atmosphere/barista.jpg"}
                alt={secondary?.altText || "Barista at Raccoon"}
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-3 font-display text-xs italic text-ink/80 text-center">
              This is Raccoon
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
