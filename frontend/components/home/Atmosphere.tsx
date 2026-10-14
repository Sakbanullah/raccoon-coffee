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
  // Gallery slot: visible images already arrive ordered by displayOrder.
  const gallery = siteImages.filter((i) => i.slotKey === "gallery");
  const images = gallery.length > 0 ? gallery.map((i) => i.imageUrl) : FALLBACK_IMAGES;
  return (
    <section id="atmosphere" className="relative bg-forest-deep py-20 text-cream sm:py-28 overflow-hidden">
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center text-gold">Atmosphere</h2>
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
            className="group inline-flex items-center gap-3 border border-forest/40 bg-forest px-7 py-3.5 text-sm font-medium tracking-widest text-cream transition-colors hover:border-forest hover:bg-forest-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            <span className="font-display text-base leading-none">EXPLORE SPACE</span>
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
