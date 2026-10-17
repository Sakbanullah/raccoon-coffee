"use client";

import Reveal from "../ui/Reveal";
import { ExpandableGallery } from "@/components/ui/gallery-animation";
import type { SiteImage } from "@/types";

const FALLBACK_IMAGES = [
  "/images/raccoon/atmosphere/interior.jpg",
  "/images/raccoon/atmosphere/barista.jpg",
  "/images/raccoon/atmosphere/table.jpg",
  "/images/raccoon/atmosphere/evening.jpg",
  "/images/raccoon/atmosphere/counter.jpg",
  "/images/raccoon/atmosphere/crowd.jpg",
];

export default function Atmosphere({ images: siteImages }: { images: SiteImage[] }) {
  // Gallery slot: visible images ordered by displayOrder ascending, capped at 6.
  const gallery = siteImages
    .filter((i) => i.slotKey === "gallery")
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 6);
  const images = gallery.length > 0 ? gallery.map((i) => i.imageUrl) : FALLBACK_IMAGES;
  return (
    <section id="atmosphere" className="relative bg-cream py-20 text-ink sm:py-28 overflow-hidden">
      <div className="section-shell">
        <Reveal>
          <p className="eyebrow text-center text-coffee">
            <span aria-hidden="true" className="mr-2 text-gold">•</span>
            Atmosphere
          </p>
          <h2 className="mx-auto mt-4 max-w-xl text-center font-display text-3xl leading-snug text-ink sm:text-4xl">
            Ruang untuk tinggal <em className="italic text-coffee">lebih lama.</em>
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <ExpandableGallery
            images={images}
            className="w-full"
          />
        </Reveal>
        <Reveal delay={0.15} className="mt-12 text-center">
          <a
            href="#location"
            className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-forest-deep py-2 pl-6 pr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream transition-colors duration-200 hover:bg-forest"
          >
            Explore Space
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
        </Reveal>
      </div>
    </section>
  );
}
