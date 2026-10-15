"use client";

import { MOCK_BRANCHES } from "../../lib/mock-data";
import Reveal from "../ui/Reveal";

export default function LocationSection() {
  const branch = MOCK_BRANCHES[0];
  return (
    <section id="location" className="bg-forest-deep py-24 text-cream sm:py-32">
      <div className="section-shell">
        <Reveal>
          <p className="eyebrow text-gold">
            <span aria-hidden="true" className="mr-2">•</span>
            Kunjungi Kami
          </p>
          <div className="mt-8 grid gap-12 md:grid-cols-2 md:items-center">
            <div className="md:col-span-1">
              <h2 className="font-display text-4xl leading-tight text-cream sm:text-5xl">
                Mampir dulu, <em className="italic text-gold-light">pulang kemudian.</em>
              </h2>
              <p className="mt-6 text-base text-cream/80">{branch.name}</p>
              <p className="mt-1 text-base text-cream/70">{branch.address}, {branch.city}</p>
              {branch.openingTime && branch.closingTime && (
                <p className="mt-2 text-sm text-cream/60">Selasa–Minggu · {branch.openingTime} – {branch.closingTime}</p>
              )}
              <div className="mt-8">
                <a
                  href={branch.mapsUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-cream py-2 pl-6 pr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-deep transition-colors duration-200 hover:bg-gold"
                >
                  Get Directions
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-deep text-cream transition-transform duration-300 group-hover:-rotate-45"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M7 17 17 7" />
                      <path d="M8 7h9v9" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>
            {/* Intentional map card: arc motif + coordinates, not an empty frame. */}
            <div className="md:col-span-1 relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-cream/15 bg-cream/5 p-10 text-center">
              <svg
                viewBox="0 0 400 200"
                className="pointer-events-none absolute inset-x-6 top-8 opacity-40"
                aria-hidden="true"
              >
                <path d="M 20 170 Q 200 10 380 170" fill="none" stroke="#DFDBD3" strokeWidth="1" strokeDasharray="3 5" />
                <circle cx="200" cy="55" r="5" fill="#C69A4E" />
              </svg>
              <div className="relative">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <p className="mt-4 font-display text-xl text-cream">Lokasi Kedai</p>
                <p className="mt-2 text-sm text-cream/70">Bakung, Baturaja</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
