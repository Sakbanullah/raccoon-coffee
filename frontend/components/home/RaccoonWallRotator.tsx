"use client";

import { useEffect, useRef, useState } from "react";
import PolaroidLineCarousel from "../ui/polaroid-line-carousel";
import type { PhotoUpload } from "../../types";

/** Polaroids on the line at any one time. */
const WALL_SLOTS = 9;
/** Photos retired from the line each cycle when a bigger pool exists. */
const ROTATE_STEP = 3;
const ROTATE_INTERVAL_MS = 5000;

type Props = {
  /** Approved photos; 9 hang on the line, the rest rotate in. */
  photos: PhotoUpload[];
  onUploadClick: () => void;
};

const photoKey = (photo: PhotoUpload) => photo.photoId || photo.imageUrl;

/** Fisher–Yates, non-mutating. */
function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffles until the arrangement differs, so a cycle never looks like a no-op.
 * Bounded: 6 attempts, then whatever we have.
 */
function reshuffle<T>(items: T[], previous: T[], keyOf: (item: T) => string): T[] {
  const before = previous.map(keyOf).join("|");
  let next = shuffle(items);
  for (let attempt = 0; attempt < 6 && next.map(keyOf).join("|") === before; attempt++) {
    next = shuffle(items);
  }
  return next;
}

/**
 * Next arrangement for the line: retire the last `ROTATE_STEP` photos, fill the
 * gap with photos that are not currently hanging (walking the loaded pool so
 * every photo gets its turn), then shuffle all positions. With a pool of 9 or
 * fewer nothing new comes in and the same photos are just reshuffled.
 */
function nextArrangement(current: PhotoUpload[], pool: PhotoUpload[], cursor: { value: number }): PhotoUpload[] {
  const onLine = new Set(current.map(photoKey));
  const incoming: PhotoUpload[] = [];

  if (pool.length > WALL_SLOTS) {
    for (let guard = 0; guard < pool.length && incoming.length < ROTATE_STEP; guard++) {
      const candidate = pool[cursor.value % pool.length];
      cursor.value += 1;
      const key = photoKey(candidate);
      if (onLine.has(key)) continue; // already hanging → would duplicate
      onLine.add(key);
      incoming.push(candidate);
    }
  }

  const kept = current.slice(0, Math.max(0, WALL_SLOTS - incoming.length));
  const merged = kept.concat(incoming);
  if (merged.length < 2) return merged;
  return reshuffle(merged, current, photoKey);
}

/**
 * The original Raccoon Wall line of polaroids — layout, framing, swing, drag,
 * keyboard and prev/next all untouched. Every 5s the photos on the line are
 * reshuffled across the carousel; with a pool above 9, three of them are also
 * swapped out for photos that were waiting their turn. Client-side only: no
 * extra API calls, the parent already loaded the pool.
 */
export default function RaccoonWallRotator({ photos, onUploadClick }: Props) {
  const [wall, setWall] = useState<PhotoUpload[]>(() => photos.slice(0, WALL_SLOTS));
  const poolRef = useRef(photos);
  const cursorRef = useRef({ value: WALL_SLOTS });

  // Realign when the parent's photo list changes (late data, refetch).
  useEffect(() => {
    poolRef.current = photos;
    cursorRef.current = { value: WALL_SLOTS };
    setWall(photos.slice(0, WALL_SLOTS));
  }, [photos]);

  useEffect(() => {
    if (photos.length < 2) return;

    const timer = window.setInterval(() => {
      // Idle tick only: no work while the tab is in the background.
      if (document.hidden) return;
      setWall((current) => nextArrangement(current, poolRef.current, cursorRef.current));
    }, ROTATE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [photos]);

  return (
    <PolaroidLineCarousel
      slides={wall.map((photo) => ({
        image: photo.imageUrl,
        alt: photo.caption || photo.visitorName || "Momen di Raccoon Coffee",
      }))}
      height="max(60vh, 24rem)"
      cardWidth={300}
      sag={46}
      swing={1}
      autoplay={0}
      string="#8a7f72"
      background="#F9F1E3"
      ink="#1F261F"
      showUploadCard={true}
      onUploadClick={onUploadClick}
      uploadLabel="Bagikan momenmu"
    />
  );
}
