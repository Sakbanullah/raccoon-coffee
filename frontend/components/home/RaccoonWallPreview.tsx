"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import Reveal from "../ui/Reveal";
import { PhotoUpload } from "../../types";

const WALL_MAX = 8;

function sample<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

type Slot = {
  className: string;
  rotate: number;
  scale: number;
  tape?: "top" | "corner";
  pin?: boolean;
  caption?: string;
  lift?: boolean;
};

const SLOTS: Slot[] = [
  { className: "col-span-6 sm:col-span-4 lg:col-span-5 lg:row-span-2", rotate: -2.5, scale: 1.02, tape: "top", caption: "interior raccoon", lift: true },
  { className: "col-span-6 sm:col-span-4 lg:col-span-4", rotate: 1.5, scale: 0.98, pin: true, caption: "coffee & chill" },
  { className: "col-span-6 sm:col-span-4 lg:col-span-3", rotate: -1, scale: 1 },
  { className: "col-span-6 sm:col-span-4 lg:col-span-3", rotate: 3, scale: 0.96, tape: "corner" },
  { className: "col-span-6 sm:col-span-4 lg:col-span-4", rotate: -2, scale: 0.99 },
  { className: "col-span-6 sm:col-span-4 lg:col-span-4", rotate: 2.5, scale: 0.97, pin: true, lift: true },
  { className: "col-span-6 sm:col-span-4 lg:col-span-3", rotate: -3.5, scale: 0.95 },
  { className: "col-span-6 sm:col-span-4 lg:col-span-3", rotate: 1, scale: 1, tape: "corner" },
];

const TAPE_STYLES: Record<string, string> = {
  top: "left-1/2 top-0 h-6 w-16 -translate-x-1/2 -translate-y-1/2 -rotate-2 bg-gold/30",
  corner:
    "right-0 top-0 h-6 w-12 translate-x-1/4 -translate-y-1/4 rotate-[35deg] bg-cream-dark/80",
};

export default function RaccoonWallPreview() {
  const reduceMotion = useReducedMotion() ?? false;
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/photos", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = (await res.json()) as { data?: PhotoUpload[] };

        if (Array.isArray(json?.data)) {
          setPhotos(sample(json.data, Math.min(WALL_MAX, json.data.length, SLOTS.length)));
        }
      } catch {
        if (!controller.signal.aborted) {
          setPhotos([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  return (
    <section id="inside" className="bg-cream-dark py-20 text-navy sm:py-28">
      <div className="section-shell">
        <Reveal>
          <p className="eyebrow">Inside Raccoon</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl leading-[1.05] sm:text-4xl md:text-5xl">
            Coffee, food, and a place to slow down.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-14">
          <div className="relative overflow-hidden rounded-[10px] border border-navy/15 bg-cream px-5 py-10 shadow-[0_30px_60px_-30px_rgba(16,27,45,0.5)] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(16,27,45,0.06)]"
            />

            <div className="relative grid grid-cols-12 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
              {photos.map((photo, i) => {
                const slot = SLOTS[i];
                const tilt = slot.rotate;

                return (
                  <motion.figure
                    key={photo.photoId}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 20, scale: 0.96, rotate: tilt }
                    }
                    whileInView={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, y: 0, scale: slot.scale, rotate: tilt }
                    }
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                      duration: reduceMotion ? 0.3 : 0.65,
                      delay: reduceMotion ? 0 : i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={
                      reduceMotion || !slot.lift
                        ? undefined
                        : { y: -4, rotate: tilt / 2, scale: slot.scale * 1.01 }
                    }
                    className={`group relative ${slot.className}`}
                  >
                    <div className="relative rounded-[3px] bg-cream p-2 pb-10 shadow-[0_10px_24px_-12px_rgba(16,27,45,0.45)] transition-shadow duration-500 group-hover:shadow-[0_18px_36px_-14px_rgba(16,27,45,0.5)] sm:p-3 sm:pb-12">
                      {slot.tape && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute z-10 opacity-80 ${TAPE_STYLES[slot.tape]}`}
                        />
                      )}
                      {slot.pin && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-1/2 top-2 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_4px_rgba(16,27,45,0.35)]"
                        />
                      )}

                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-navy/5">
                        <Image
                          src={photo.imageUrl}
                          alt={slot.caption ?? "Suasana Raccoon Coffee Baturaja"}
                          fill
                          loading="lazy"
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 40vw, 90vw"
                          className="object-cover"
                        />
                      </div>

                      {slot.caption && (
                        <figcaption className="absolute bottom-3 left-3 right-3 truncate font-display text-sm italic text-navy/70 sm:bottom-4 sm:left-4 sm:right-4">
                          {slot.caption}
                        </figcaption>
                      )}
                    </div>
                  </motion.figure>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 text-center">
          <a
            href="https://instagram.com/raccooncoffee.id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-navy/30 px-6 py-3 text-sm font-medium tracking-wide text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Ikuti kami di Instagram
          </a>
        </Reveal>
      </div>
    </section>
  );
}
