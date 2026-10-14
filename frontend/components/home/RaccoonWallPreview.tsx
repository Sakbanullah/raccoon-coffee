"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Reveal from "../ui/Reveal";
import { FileUploadCard } from "../ui/file-upload-card";
import PolaroidLineCarousel from "../ui/polaroid-line-carousel";
import { PhotoUpload } from "../../types";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
const WALL_MAX = 8;

export default function RaccoonWallPreview() {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/photos", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = (await res.json()) as { data?: PhotoUpload[] };

        if (Array.isArray(json?.data)) {
          setPhotos(json.data.slice(0, WALL_MAX));
        }
      } catch {
        if (!controller.signal.aborted) {
          setPhotos([]);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  return (
    <section id="inside" className="bg-cream py-20 text-ink sm:py-28 torn-bottom">
      <div className="section-shell">
        <Reveal>
          <p className="eyebrow text-gold">Raccoon Wall</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl">
            Coffee, food, and a place to slow down.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-14">
          <PolaroidLineCarousel
            slides={photos.map((p) => ({ image: p.imageUrl }))}
            height="60vh"
            cardWidth={300}
            sag={46}
            swing={1}
            autoplay={4500}
            string="#8a7f72"
            background="#F4EBDD"
            ink="#1F261F"
            showUploadCard={true}
            onUploadClick={() => setOpen(true)}
            uploadLabel="Bagikan momenmu"
          />
        </Reveal>
      </div>

      {open && (
        <UploadModal onClose={() => setOpen(false)} />
      )}
    </section>
  );
}

import { UploadedFile } from "../ui/file-upload-card";

function UploadModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, submitting]);

  const handleFilesChange = (newFiles: File[]) => {
    setError(null);
    const uploaded: UploadedFile[] = newFiles.map((f) => ({
      id: `${f.name}-${Date.now()}`,
      file: f,
      progress: 0,
      status: "uploading",
    }));
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const handleFileRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (files.length === 0) { setError("Pilih foto terlebih dahulu."); return; }
    if (!visitorName.trim()) { setError("Nama wajib diisi."); return; }
    if (!consent) { setError("Anda harus menyetujui persyaratan publikasi foto."); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", files[0].file);
      formData.append("visitorName", visitorName.trim());
      if (caption.trim()) formData.append("caption", caption.trim());
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      if (!res.ok) {
        let message = "Gagal mengunggah foto.";
        try { const json = await res.json(); if (json?.message) message = json.message; } catch {}
        throw new Error(message);
      }
      setSuccess(true);
      setFiles([]);
      setVisitorName("");
      setCaption("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-3 backdrop-blur-sm sm:p-4" onClick={() => !submitting && onClose()} role="dialog" aria-modal="true" aria-label="Bagikan momenmu">
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[10px] border border-navy/15 bg-cream p-5 text-navy shadow-[0_30px_60px_-30px_rgba(16,27,45,0.6)] sm:p-8">
        <button type="button" onClick={() => !submitting && onClose()} aria-label="Tutup" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-navy/50 transition-colors hover:bg-navy/5 hover:text-navy sm:right-3 sm:top-3">✕</button>
        {success ? (
          <div className="py-6 text-center">
            <p className="font-display text-2xl">Terima kasih!</p>
            <p className="mt-3 text-sm text-navy/75">Fotomu sudah dikirim dan akan tampil setelah ditinjau admin.</p>
            <button type="button" onClick={onClose} className="mt-8 inline-flex items-center gap-2 border border-navy bg-navy px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-coffee hover:border-coffee">Selesai</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="pr-8 font-display text-2xl">Bagikan Momenmu</h3>
            <p className="text-sm text-navy/70">Kirim fotomu di Raccoon Coffee. Foto akan tampil setelah ditinjau admin.</p>
            <FileUploadCard files={files} onFilesChange={handleFilesChange} onFileRemove={handleFileRemove} />
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="wall-name">Nama</label>
              <input id="wall-name" type="text" value={visitorName} maxLength={255} onChange={e => setVisitorName(e.target.value)} className="w-full rounded border border-navy/25 bg-cream px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy" placeholder="Namamu" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="wall-caption">Caption <span className="text-navy/50">(opsional)</span></label>
              <textarea id="wall-caption" value={caption} rows={2} onChange={e => setCaption(e.target.value)} className="w-full resize-none rounded border border-navy/25 bg-cream px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy" placeholder="Ceritakan momenmu…" />
            </div>
            <div className="mt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={() => setConsent(c => !c)}
                  className="mt-1 h-4 w-4 rounded border-navy/25 border text-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-cream"
                  aria-describedby="consent-text"
                />
                <span id="consent-text" className="text-sm text-navy leading-relaxed">
                  Saya menyetujui <Link href="/raccoon-wall/terms" className="underline text-brand-primary">Ketentuan Publikasi Foto Raccoon Wall</Link>.
                </span>
              </label>
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting || !consent} className="w-full border border-navy bg-navy py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-coffee hover:border-coffee disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Mengunggah…" : "Kirim untuk ditinjau"}</button>
            {!consent && <p className="text-center text-xs text-navy/60">Centang persetujuan di atas untuk mengirim.</p>}
          </form>
        )}
      </motion.div>
    </div>
  );
}