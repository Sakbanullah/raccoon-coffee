"use client";

import Image from "next/image";

const NAV = [
  { href: "#top", label: "Home" },
  { href: "#story", label: "Story" },
  { href: "#menu", label: "Menu" },
  { href: "#atmosphere", label: "Atmosphere" },
  { href: "#inside", label: "Raccoon Wall" },
  { href: "#location", label: "Location" },
];

export default function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-forest-deep text-cream py-16 sm:py-20">
      <div className="section-shell grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3">

            <h3 className="font-display text-xl text-cream">Raccoon Coffee Baturaja</h3>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/70">
            Coffee and Chill — tempat untuk berhenti sebentar.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-gold">Navigation</h4>
          <ul className="mt-4 space-y-1 text-sm text-cream/80">
            {NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-block py-2 transition-colors hover:text-gold">{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-gold">Contact</h4>
          <p className="mt-4 text-sm text-cream/80">Bakung, Baturaja</p>
          <p className="text-sm text-cream/70">Setiap hari · 13.00 – 23.00</p>
          <div className="mt-4">
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gold hover:underline"
            >
              Instagram @raccooncoffee.id →
            </a>
          </div>
        </div>
        {/* Small photo thumbnails, echoing the reference's editorial footer. */}
        <div className="hidden gap-3 md:col-span-2 md:grid md:grid-cols-1">
          <div className="relative aspect-square overflow-hidden rounded-xl">
            <Image src="/images/raccoon/atmosphere/interior.jpg" alt="Interior Raccoon Coffee" fill sizes="160px" className="object-cover" />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-xl">
            <Image src="/images/raccoon/atmosphere/evening.jpg" alt="Suasana sore di Raccoon Coffee" fill sizes="160px" className="object-cover" />
          </div>
        </div>
        <div className="col-span-full border-t border-cream/10 pt-8 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Raccoon Coffee Baturaja. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
