"use client";

import Image from "next/image";
import Reveal from "../ui/Reveal";

export default function BrandIntro() {
  return (
    <section id="story" className="relative bg-cream text-ink py-24 sm:py-32 overflow-hidden torn-bottom">
      <div className="section-shell grid md:grid-cols-12 items-center gap-12 lg:gap-16">
        {/* Left: Editorial story column */}
        <Reveal className="md:col-span-7">
          <p className="eyebrow text-gold mb-3">Cerita Kami</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.04] text-ink">
            Lebih dari sekadar secangkir kopi.
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-ink/85 leading-relaxed font-light">
            Raccoon lahir dari keinginan sederhana: menyediakan tempat yang nyaman untuk menikmati kopi, bertemu teman, bekerja sebentar, atau sekadar menikmati waktu luang.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <a
              href="#atmosphere"
              className="inline-flex items-center justify-center rounded-full bg-forest px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-all hover:bg-forest-deep shadow-sm"
            >
              Tentang Kami →
            </a>
          </div>
        </Reveal>

        {/* Right: Asymmetric polaroid and interior photo collage */}
        <div className="relative md:col-span-5 h-[420px] sm:h-[480px]">
          <div className="absolute inset-x-4 top-4 h-[320px] sm:h-[380px] rounded-lg overflow-hidden shadow-2xl rotate-1 transition-transform duration-500 hover:rotate-0">
            <Image
              src="/images/raccoon/atmosphere/interior.jpg"
              alt="Raccoon interior atmosphere"
              fill
              className="object-cover"
            />
          </div>
          {/* Overlapping polaroid card */}
          <div className="absolute -bottom-6 left-6 w-48 sm:w-56 bg-cream p-3 pb-8 rounded shadow-xl -rotate-3 border border-ink/10 hidden sm:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-forest/10">
              <Image
                src="/images/raccoon/atmosphere/barista.jpg"
                alt="Barista at Raccoon"
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
