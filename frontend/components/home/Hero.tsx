"use client";

import Image from "next/image";
import { motion } from "motion/react";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-navy"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/images/raccoon/atmosphere/interior.jpg"
          alt="Interior Raccoon Coffee Baturaja"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/25" />
      </motion.div>

      <motion.div
        className="section-shell relative z-10 pb-16 pt-32 text-cream sm:pb-24"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
        }}
      >
        <motion.p
          className="eyebrow text-cream/70"
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Bakung, Baturaja
        </motion.p>

        <motion.h1
          className="mt-6 max-w-4xl font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
          variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          Raccoon Coffee
          <br />
          Coffee and Chill.
        </motion.h1>

        <motion.p
          className="mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg"
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Tempat ngopi, makan, dan bersantai di Baturaja.
        </motion.p>

        <motion.p
          className="mt-3 text-sm text-cream/70"
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Selasa–Minggu · 13.00–23.00
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-4"
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <a
            href="#menu"
            className="inline-flex items-center justify-center bg-gold px-6 py-3 text-sm font-medium tracking-wide text-navy transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            Lihat Menu
          </a>
          <a
            href="#location"
            className="inline-flex items-center justify-center border border-cream/40 px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:border-cream hover:bg-cream/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            Kunjungi Kami
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
