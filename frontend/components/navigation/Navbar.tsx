"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const LINKS = [
  { href: "#menu", label: "Menu" },
  { href: "#story", label: "Story" },
  { href: "#atmosphere", label: "Atmosphere" },
  { href: "#inside", label: "Raccoon Wall" },
  { href: "#location", label: "Location" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 28);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const textColor = scrolled ? "text-ink" : "text-cream";
  const hoverColor = scrolled ? "hover:text-coffee" : "hover:text-gold";

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 " +
        (scrolled
          ? "border-cream-dark/80 bg-cream/95 backdrop-blur-md supports-[backdrop-filter]:bg-cream/85 shadow-sm"
          : "border-transparent bg-gradient-to-b from-forest-deep/90 via-forest-deep/30 to-transparent")
      }
    >
      <div className="section-shell flex h-14 items-center justify-between gap-6 sm:h-16">
        <Link
          href="/"
          className={`group inline-flex items-center gap-3 font-display text-lg tracking-tight transition-colors duration-300 sm:text-xl ${textColor}`}
          aria-label="Raccoon Coffee & Chill - Home"
        >
          {/* Logo brand image */}

          <span className="inline-flex items-baseline gap-2">
            Raccoon
            <span className={`hidden text-[10px] font-medium uppercase tracking-[0.3em] sm:inline ${scrolled ? "text-coffee" : "text-gold"}`}>
              Coffee & Chill
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`group relative py-2 text-xs font-medium uppercase tracking-[0.16em] transition-colors duration-200 ${textColor} ${hoverColor}`}
            >
              {l.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100 ${scrolled ? "bg-coffee" : "bg-gold"}`}
              />
            </Link>
          ))}
          <Link
            href="#location"
            className={
              "group ml-2 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-5 pr-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 " +
              (scrolled
                ? "bg-forest-deep text-cream hover:bg-forest"
                : "bg-cream text-forest-deep hover:bg-gold"
            )
            }
          >
            Visit Us
            <span
              aria-hidden="true"
              className={
                "flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:-rotate-45 " +
                (scrolled ? "bg-cream text-forest-deep" : "bg-forest-deep text-cream")
              }
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </span>
          </Link>
        </nav>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors lg:hidden ${scrolled ? "text-ink hover:bg-ink/5" : "text-cream hover:bg-cream/10"}`}
        >
          <span className="relative flex h-[14px] w-[18px] flex-col justify-between">
            <span
              className={
                "block h-px w-full origin-center transition-all duration-300 " +
                (scrolled ? "bg-ink" : "bg-cream") +
                (open ? " translate-y-[6.5px] rotate-45" : "")
              }
            />
            <span
              className={
                "block h-px w-full transition-opacity duration-200 " +
                (scrolled ? "bg-ink" : "bg-cream") +
                (open ? " opacity-0" : " opacity-100")
              }
            />
            <span
              className={
                "block h-px w-full origin-center transition-all duration-300 " +
                (scrolled ? "bg-ink" : "bg-cream") +
                (open ? " -translate-y-[6.5px] -rotate-45" : "")
              }
            />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-cream-dark bg-cream text-ink lg:hidden shadow-xl"
          >
            <ul className="section-shell flex max-h-[calc(100dvh-8rem)] flex-col space-y-2 overflow-y-auto py-8">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 font-display text-2xl text-ink transition-colors hover:text-coffee"
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ delay: 0.25, duration: 0.25 }}
                className="pt-6"
              >
                <Link
                  href="#location"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-forest-deep px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:bg-forest"
                >
                  Visit Raccoon Coffee
                </Link>
              </motion.li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
