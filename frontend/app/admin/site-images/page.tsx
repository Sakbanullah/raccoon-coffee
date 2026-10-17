"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Trash2, Upload } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/Overview";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { SiteImage } from "@/types";

/** Mirrors backend/src/site-images/section-slots.ts. */
const SECTION_SLOTS: Record<string, string[]> = {
  hero: ["primary", "secondary"],
  brand_story: ["primary", "secondary"],
  atmosphere: ["gallery"],
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  brand_story: "Brand Story",
  atmosphere: "Atmosphere",
};

const SECTION_KEYS = Object.keys(SECTION_SLOTS);

// Mirrors server limits in backend/src/uploads/upload.config.ts.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const checkImageFile = (file: File): string | null => {
  if (!IMAGE_TYPES.includes(file.type)) return "Image must be JPG, PNG, or GIF.";
  if (file.size > IMAGE_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return null;
};

const errorBody = async (res: Response): Promise<string> => {
  const body = await res.json().catch(() => null);
  const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
  return message || `Request failed (HTTP ${res.status}).`;
};

export default function SiteImagesPage() {
  const [section, setSection] = useState<string>("hero");
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  // Upload form state.
  const [slot, setSlot] = useState("primary");
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Per-image state.
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SiteImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const slots = SECTION_SLOTS[section];

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    setAuthRequired(false);
    try {
      const res = await fetch(`/api/site-images/admin?section=${section}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthRequired(true);
          setImages([]);
        } else {
          throw new Error(await errorBody(res));
        }
        return;
      }
      const json = await res.json();
      const data: SiteImage[] = json.data ?? [];
      setImages(data);
      setAltDrafts(Object.fromEntries(data.map((i) => [i.siteImageId, i.altText ?? ""])));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not reach the site images endpoint.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the slot selection valid when switching sections.
  useEffect(() => {
    setSlot(SECTION_SLOTS[section][0]);
    setFile(null);
    setAltText("");
    setUploadError(null);
  }, [section]);

  const patchImage = async (id: string, payload: Partial<Pick<SiteImage, "altText" | "isVisible" | "displayOrder">>) => {
    const res = await apiFetch(`/api/site-images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await errorBody(res));
    return res.json();
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    setUploadError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const imageError = checkImageFile(selected);
    if (imageError) {
      setUploadError(imageError);
      return;
    }
    setFile(selected);
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("section", section);
      formData.append("slot", slot);
      if (altText.trim()) formData.append("altText", altText.trim());
      const res = await apiFetch("/api/site-images", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await errorBody(res));
      setFile(null);
      setAltText("");
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const saveAlt = async (image: SiteImage) => {
    const draft = (altDrafts[image.siteImageId] ?? "").trim();
    if (draft === (image.altText ?? "")) return;
    setSavingId(image.siteImageId);
    try {
      await patchImage(image.siteImageId, { altText: draft || "" });
      setImages((prev) =>
        prev.map((i) => (i.siteImageId === image.siteImageId ? { ...i, altText: draft || null } : i)),
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not save the alt text.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleVisibility = async (image: SiteImage) => {
    if (savingId) return;
    setSavingId(image.siteImageId);
    const next = !image.isVisible;
    setImages((prev) =>
      prev.map((i) => (i.siteImageId === image.siteImageId ? { ...i, isVisible: next } : i)),
    );
    try {
      await patchImage(image.siteImageId, { isVisible: next });
    } catch {
      // Roll back the optimistic toggle on failure.
      setImages((prev) =>
        prev.map((i) => (i.siteImageId === image.siteImageId ? { ...i, isVisible: image.isVisible } : i)),
      );
      setListError("Could not update visibility. Please retry.");
    } finally {
      setSavingId(null);
    }
  };

  // Swap displayOrder with the adjacent image in the same ordered list.
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (reordering || target < 0 || target >= images.length) return;
    const a = images[index];
    const b = images[target];
    setReordering(true);
    setImages((prev) => prev.map((i, idx) => (idx === index ? b : idx === target ? a : i)));
    try {
      await Promise.all([
        patchImage(a.siteImageId, { displayOrder: b.displayOrder }),
        patchImage(b.siteImageId, { displayOrder: a.displayOrder }),
      ]);
    } catch {
      setImages((prev) => prev.map((i, idx) => (idx === index ? a : idx === target ? b : i)));
      setListError("Could not reorder images. Please retry.");
    } finally {
      setReordering(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/site-images/${pendingDelete.siteImageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorBody(res));
      setImages((prev) => prev.filter((i) => i.siteImageId !== pendingDelete.siteImageId));
      setPendingDelete(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not delete the image.");
    } finally {
      setDeleting(false);
    }
  };

  // Slots that already hold an image (single-slot sections replace in place on upload).
  const slotLabel = (image: SiteImage) =>
    section === "atmosphere" ? `Gallery · order ${image.displayOrder}` : image.slotKey;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Site Images"
        description="Manage the landing-page section images: hero backdrop, brand story collage, and atmosphere gallery."
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Section">
        {SECTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              section === key
                ? "border-brand-primary bg-brand-primary/20 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-elevated",
            )}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {listError && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {listError}
        </div>
      )}

      {authRequired ? (
        <EmptyState
          icon={ImageIcon}
          title="Admin session required"
          body="Site image management uses the raccoon_auth_token cookie. Sign in to manage section images."
          action={{ label: "Go to login", href: "/admin/login" }}
        />
      ) : (
        <>
          {!loading && (
            <form
              onSubmit={submitUpload}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <h2 className="font-display text-lg font-semibold text-foreground">
                {section === "atmosphere" ? "Add gallery image" : "Upload / replace image"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {section === "atmosphere"
                  ? "Uploads append to the gallery after the current last order."
                  : "Uploading to a slot that already has an image replaces it in place."}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {slots.length > 1 && (
                  <div>
                    <label htmlFor="site-image-slot" className="mb-1 block text-sm font-medium text-foreground">
                      Slot
                    </label>
                    <select
                      id="site-image-slot"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      disabled={uploading}
                      className="w-full rounded border border-border bg-input p-2 text-foreground disabled:opacity-50"
                    >
                      {slots.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={slots.length > 1 ? "" : "sm:col-span-2"}>
                  <label htmlFor="site-image-file" className="mb-1 block text-sm font-medium text-foreground">
                    Image
                  </label>
                  <input
                    id="site-image-file"
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={onFileSelect}
                    disabled={uploading}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-elevated file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-surface disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or GIF · max 5 MB</p>
                </div>
                <div>
                  <label htmlFor="site-image-alt" className="mb-1 block text-sm font-medium text-foreground">
                    Alt text (optional)
                  </label>
                  <input
                    id="site-image-alt"
                    value={altText}
                    maxLength={255}
                    onChange={(e) => setAltText(e.target.value)}
                    disabled={uploading}
                    className="w-full rounded border border-border bg-input p-2 text-foreground disabled:opacity-50"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={!file || uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload aria-hidden="true" className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </div>
              {uploadError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {uploadError}
                </p>
              )}
            </form>
          )}

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg border border-border bg-surface"
                />
              ))}
              <span className="sr-only">Loading site images…</span>
            </div>
          ) : images.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title={`No ${SECTION_LABELS[section]} images yet`}
              body="Upload the first image above. The homepage falls back to its built-in static images until then."
            />
          ) : (
            <ul className="space-y-4">
              {images.map((image, index) => (
                <li
                  key={image.siteImageId}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start"
                >
                  <div className="h-28 w-full shrink-0 overflow-hidden rounded border border-border bg-input sm:w-44">
                    {/* eslint-disable-next-line @next/next/no-img-element -- /api upload paths, admin previews */}
                    <img
                      src={image.imageUrl}
                      alt={image.altText || `${SECTION_LABELS[section]} image`}
                      className={cn("h-full w-full object-cover", !image.isVisible && "opacity-40")}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 font-medium uppercase tracking-wide text-muted-foreground">
                        {slotLabel(image)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 font-medium",
                          image.isVisible
                            ? "border-brand-primary bg-brand-primary/20 text-foreground"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {image.isVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`alt-${image.siteImageId}`}>
                        Alt text
                      </label>
                      <input
                        id={`alt-${image.siteImageId}`}
                        value={altDrafts[image.siteImageId] ?? ""}
                        maxLength={255}
                        placeholder="Alt text"
                        onChange={(e) =>
                          setAltDrafts((prev) => ({ ...prev, [image.siteImageId]: e.target.value }))
                        }
                        disabled={savingId === image.siteImageId}
                        className="min-w-0 flex-1 rounded border border-border bg-input p-2 text-sm text-foreground disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => void saveAlt(image)}
                        disabled={
                          savingId === image.siteImageId ||
                          (altDrafts[image.siteImageId] ?? "").trim() === (image.altText ?? "")
                        }
                        className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingId === image.siteImageId ? "Saving…" : "Save alt"}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleVisibility(image)}
                        disabled={savingId !== null}
                        aria-pressed={image.isVisible}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {image.isVisible ? (
                          <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {image.isVisible ? "Hide" : "Show"}
                      </button>
                      {section === "atmosphere" && (
                        <>
                          <button
                            type="button"
                            onClick={() => void move(index, -1)}
                            disabled={reordering || index === 0}
                            aria-label="Move earlier"
                            className="inline-flex items-center rounded-md border border-border px-2 py-1.5 text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void move(index, 1)}
                            disabled={reordering || index === images.length - 1}
                            aria-label="Move later"
                            className="inline-flex items-center rounded-md border border-border px-2 py-1.5 text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(image)}
                        disabled={deleting}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete site image?"
        description={
          pendingDelete
            ? `The ${SECTION_LABELS[pendingDelete.sectionKey] ?? pendingDelete.sectionKey} “${pendingDelete.slotKey}” image will be permanently removed. This cannot be undone.`
            : ""
        }
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
