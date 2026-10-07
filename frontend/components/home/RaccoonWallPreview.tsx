"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Reveal from "../ui/Reveal";
import { PhotoUpload } from "../../types";

const WALL_MAX = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

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
  const [open, setOpen] = useState(false);

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
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 border border-navy bg-navy px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-coffee hover:border-coffee focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <span aria-hidden="true">＋</span>
              Bagikan Momenmu
            </button>
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-navy/30 px-6 py-3 text-sm font-medium tracking-wide text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Ikuti kami di Instagram
            </a>
          </div>
        </Reveal>
      </div>

      {open && (
        <UploadModal onClose={() => setOpen(false)} />
      )}
    </section>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const handleFile = (selected: File | undefined) => {
    setError(null);
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Format harus JPG, PNG, atau GIF.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setVisitorName("");
    setCaption("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    if (!file) {
      setError("Pilih foto terlebih dahulu.");
      return;
    }
    if (!visitorName.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("visitorName", visitorName.trim());
      if (caption.trim()) formData.append("caption", caption.trim());

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = "Gagal mengunggah foto.";
        try {
          const json = await res.json();
          if (json?.message) message = json.message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      setSuccess(true);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Bagikan momenmu"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[10px] border border-navy/15 bg-cream p-6 text-navy shadow-[0_30px_60px_-30px_rgba(16,27,45,0.6)] sm:p-8"
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          aria-label="Tutup"
          className="absolute right-4 top-4 text-navy/50 transition-colors hover:text-navy"
        >
          ✕
        </button>

        {success ? (
          <div className="py-6 text-center">
            <p className="font-display text-2xl">Terima kasih!</p>
            <p className="mt-3 text-sm text-navy/75">
              Your photo has been submitted for review.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex items-center gap-2 border border-navy bg-navy px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-coffee hover:border-coffee"
            >
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-display text-2xl">Bagikan Momenmu</h3>
            <p className="text-sm text-navy/70">
              Kirim fotomu di Raccoon Coffee. Foto akan tampil setelah ditinjau admin.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative block w-full overflow-hidden rounded-[3px] border border-dashed border-navy/30 bg-cream-dark/50 transition-colors hover:border-navy/60"
            >
              {previewUrl ? (
                <span className="relative block aspect-[4/5] w-full">
                  <Image
                    src={previewUrl}
                    alt="Pratinjau foto"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-navy/60">
                  <span className="text-3xl" aria-hidden="true">🖼️</span>
                  <span className="text-sm font-medium">Pilih foto</span>
                  <span className="text-xs">JPG, PNG, atau GIF · maks 5 MB</span>
                </span>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="wall-name">Nama</label>
              <input
                id="wall-name"
                type="text"
                value={visitorName}
                maxLength={255}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full rounded border border-navy/25 bg-cream px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy"
                placeholder="Namamu"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="wall-caption">
                Caption <span className="text-navy/50">(opsional)</span>
              </label>
              <textarea
                id="wall-caption"
                value={caption}
                rows={2}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full resize-none rounded border border-navy/25 bg-cream px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy"
                placeholder="Ceritakan momenmu…"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-navy bg-navy py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-coffee hover:border-coffee disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Mengunggah…" : "Kirim untuk ditinjau"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
