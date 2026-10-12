"use client";

import { MOCK_BRANCHES } from "../../lib/mock-data";
import Reveal from "../ui/Reveal";

export default function LocationSection() {
  const branch = MOCK_BRANCHES[0];
  return (
    <section id="location" className="bg-forest-deep py-20 text-cream sm:py-28">
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center text-gold">Find Us</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-center">
            <div className="md:col-span-1">
              <h3 className="font-display text-4xl text-cream">{branch.name}</h3>
              <p className="mt-4 text-base text-cream/80">{branch.address}, {branch.city}</p>
              {branch.openingTime && branch.closingTime && (
                <p className="mt-2 text-sm text-cream/70">Selasa–Minggu · {branch.openingTime} – {branch.closingTime}</p>
              )}
              <div className="mt-8">
                <a
                  href={branch.mapsUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 border border-gold/40 bg-gold px-7 py-3.5 text-sm font-medium tracking-widest text-forest-deep transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <span className="font-display text-base leading-none">GET DIRECTIONS</span>
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
              </div>
            </div>
            <div className="md:col-span-1 min-h-[320px] flex items-center justify-center border border-cream/15 bg-forest/20 p-10 rounded-xl text-center">
              <div>
                <p className="font-display text-xl text-cream">Lokasi Kedai</p>
                <p className="mt-2 text-sm text-cream/70">Bakung, Baturaja</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
