"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface ExpandableGalleryProps {
  images: string[];
  className?: string;
}

/** True below the sm breakpoint, where hover-expand makes no sense. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const ExpandableGallery: React.FC<ExpandableGalleryProps> = ({
  images,
  className = "",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const openImage = (index: number) => {
    setSelectedIndex(index);
  };

  const closeImage = () => {
    setSelectedIndex(null);
  };

  const step = (dir: number) => {
    setSelectedIndex((cur) =>
      cur === null ? cur : (cur + dir + images.length) % images.length
    );
  };

  // Keyboard support for the lightbox: Escape closes, arrows navigate.
  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImage();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, images.length]);

  const getFlexValue = (index: number) => {
    if (hoveredIndex === null) {
      return 1;
    }
    return hoveredIndex === index ? 2 : 0.5;
  };

  return (
    <div className={className}>
      {/* Desktop: hover-expandable flex row. Mobile: touch snap-scroll strip,
          full-width cards, no dimming (there is no hover on touch). */}
      <div className="flex h-72 w-full snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-96 sm:snap-none sm:overflow-visible">
        {images.map((image, index) => (
          <motion.div
            key={index}
            role="button"
            tabIndex={0}
            aria-label={`Buka gambar ${index + 1}`}
            className="relative w-[78vw] max-w-[340px] shrink-0 cursor-pointer snap-center overflow-hidden rounded-md sm:w-auto sm:max-w-none sm:shrink"
            style={{ flex: isMobile ? "0 0 auto" : 1 }}
            animate={isMobile ? {} : { flex: getFlexValue(index) }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => openImage(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openImage(index);
              }
            }}
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: isMobile || hoveredIndex === index ? 0 : 0.3 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Expanded View Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/95 p-4 backdrop-blur-sm"
            onClick={closeImage}
            role="dialog"
            aria-modal="true"
            aria-label={`Gambar ${selectedIndex + 1} dari ${images.length}`}
          >
            {/* Close Button */}
            <button
              type="button"
              aria-label="Tutup"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10"
              onClick={closeImage}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Previous Button */}
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Gambar sebelumnya"
                className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 sm:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}

            {/* Image */}
            <motion.div
              className="relative max-w-5xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={selectedIndex}
                src={images[selectedIndex]}
                alt={`Gallery image ${selectedIndex + 1}`}
                className="w-full h-full object-contain rounded-md"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
              />
            </motion.div>

            {/* Next Button */}
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Gambar berikutnya"
                className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 sm:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-md bg-forest-deep/70 px-4 py-2 text-sm text-cream">
              {selectedIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { ExpandableGallery };
