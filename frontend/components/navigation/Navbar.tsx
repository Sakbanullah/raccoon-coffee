"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const LINKS = [
  { href: "#menu", label: "Menu" },
  { href: "#story", label: "Story" },
  { href: "#inside", label: "Inside" },
  { href: "#location", label: "Location" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
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

  const textColor = scrolled ? "text-navy" : "text-cream";
  const hoverColor = scrolled ? "hover:text-coffee" : "hover:text-gold";

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 " +
        (scrolled
          ? "border-navy/15 bg-cream/95 backdrop-blur-md supports-[backdrop-filter]:bg-cream/85"
          : "border-transparent bg-gradient-to-b from-navy/80 via-navy/30 to-transparent")
      }
    >
      <div className="section-shell flex h-16 items-center justify-between gap-6 sm:h-[4.25rem]">
        <Link
          href="/"
          className={`font-display text-lg tracking-tight transition-colors duration-300 sm:text-xl ${textColor}`}
        >
          <span className="inline-flex items-baseline gap-2">
            Raccoon
            <span className={`text-sm font-normal uppercase tracking-[0.28em] ${scrolled ? "text-coffee" : "text-gold"}`}>
              Coffee
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`group relative py-2 text-sm tracking-wide transition-colors duration-200 ${textColor} ${hoverColor}`}
            >
              {l.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100 ${scrolled ? "bg-navy" : "bg-cream"}`}
              />
            </Link>
          ))}
          <Link
            href="#location"
            className={
              "ml-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors duration-200 " +
              (scrolled
                ? "bg-navy text-cream hover:bg-navy-light"
                : "bg-gold text-navy hover:bg-cream")
            }
          >
            Visit
          </Link>
        </nav>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-sm transition-colors md:hidden ${scrolled ? "text-navy hover:bg-navy/5" : "text-cream hover:bg-cream/10"}`}
        >
          <span className="relative flex h-[14px] w-[18px] flex-col justify-between">
            <span
              className={
                "block h-px w-full origin-center transition-all duration-300 " +
                (scrolled ? "bg-navy" : "bg-cream") +
                (open ? " translate-y-[6.5px] rotate-45" : "")
              }
            />
            <span
              className={
                "block h-px w-full transition-opacity duration-200 " +
                (scrolled ? "bg-navy" : "bg-cream") +
                (open ? " opacity-0" : " opacity-100")
              }
            />
            <span
              className={
                "block h-px w-full origin-center transition-all duration-300 " +
                (scrolled ? "bg-navy" : "bg-cream") +
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
            className="overflow-hidden border-t border-navy/10 bg-cream text-navy md:hidden"
          >
            <ul className="section-shell flex flex-col py-6">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 font-display text-lg text-navy transition-colors hover:text-coffee"
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: 0.22, duration: 0.25 }}
                className="pt-4"
              >
                <Link
                  href="#location"
                  onClick={() => setOpen(false)}
                  className="block bg-navy px-5 py-3 text-center text-sm font-medium uppercase tracking-[0.14em] text-cream"
                >
                  Visit Raccoon
                </Link>
              </motion.li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
