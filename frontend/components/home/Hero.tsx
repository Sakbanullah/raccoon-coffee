import Image from "next/image";
import { MOCK_BRANCHES } from "@/lib/mock-data";
import type { SiteImage } from "@/types";

const branch = MOCK_BRANCHES[0];

const FALLBACK_SRC = "/images/raccoon/atmosphere/barista.jpg";

export default function Hero({ images }: { images: SiteImage[] }) {
  // `primary` slot drives the hero visual; server-fetched before first render.
  const heroSrc =
    images.find((img) => img.slotKey === "primary")?.imageUrl ?? FALLBACK_SRC;

  const locationText = `${branch.address}, ${branch.city}`;
  const hoursText = `${branch.openingTime} – ${branch.closingTime}`;

  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[600px] overflow-hidden bg-forest-deep text-cream"
    >
      <Image
        src={heroSrc}
        alt="Suasana di Raccoon Coffee"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 hero-veil" aria-hidden="true" />
      {/* Cinematic dissolve: photo melts through warm tones into the cream
          background of the Ritual Kecil section below. */}
      <div
        className="hero-dissolve absolute inset-x-0 bottom-0 h-[36vh] min-h-[13rem] sm:h-[42vh]"
        aria-hidden="true"
      />

      <div className="section-shell relative z-10 flex h-full flex-col justify-center pb-36 pt-24 sm:pb-44">
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-[1.08] text-cream sm:text-5xl">
            Tempat untuk{" "}
            <em className="italic text-gold-light">Berhenti Sebentar.</em>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/80 sm:text-base">
            Good coffee, slow moments, and stories worth sharing.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-cream/75">
            <span className="inline-flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {locationText}
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {hoursText}
            </span>
          </div>
        </div>
      </div>

      {/* Oversized signature wordmark dissolving into the cream section below. */}
      <p
        aria-hidden="true"
        className="wordmark-mask pointer-events-none absolute inset-x-0 bottom-6 z-[5] select-none text-center font-script text-[clamp(5rem,17vw,16rem)] leading-[0.8] text-cream/95 sm:bottom-8"
      >
        Raccoon
      </p>
    </section>
  );
}
