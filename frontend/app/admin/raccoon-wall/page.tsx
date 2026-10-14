"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Image as Images } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/Overview";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PhotoUpload } from "../../../types";

type Tab = "pending" | "approved";

const TABS: { id: Tab; label: string; endpoint: string }[] = [
  { id: "pending", label: "Pending", endpoint: "/api/photos/pending" },
  { id: "approved", label: "Approved", endpoint: "/api/photos/approved" },
];

export default function RaccoonWallPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PhotoUpload | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPhotos = async (current: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = TABS.find((t) => t.id === current)!.endpoint;
      const res = await fetch(endpoint);
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setAuthRequired(false);
      setPhotos(json.data || []);
    } catch {
      setError("Could not reach the moderation endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/photos/${id}/${action}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to moderate");
      setPhotos((prev) => prev.filter((p) => p.photoId !== id));
    } catch {
      setError("Could not moderate this photo. Please retry.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete.photoId;
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setPhotos((prev) => prev.filter((p) => p.photoId !== id));
      setPendingDelete(null);
    } catch {
      setError("Could not delete this photo. Please retry.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const isPending = tab === "pending";

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Raccoon Wall"
        description="Review visitor photo submissions before they appear on the public wall."
      />

      <div role="tablist" aria-label="Filter foto" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-brand-primary text-foreground"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
          <span className="sr-only">Loading photos…</span>
        </div>
      ) : authRequired ? (
        <EmptyState
          icon={Images}
          title="Admin session required"
          body="Photo moderation uses the raccoon_auth_token cookie. Sign in to view photos."
          action={{ label: "Go to login", href: "/admin/login" }}
        />
      ) : error ? (
        <EmptyState
          icon={Images}
          title="Moderation endpoint unavailable"
          body={error}
          action={{ label: "Back to overview", href: "/admin" }}
        />
      ) : photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title={isPending ? "No pending photos" : "No approved photos"}
          body={
            isPending
              ? "Visitor uploads pending review will appear here."
              : "Photos you approve will appear here."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article
              key={photo.photoId}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
            >
              <div className="relative aspect-square w-full bg-surface">
                <Image src={photo.imageUrl} alt={`Upload by ${photo.visitorName}`} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-medium text-foreground">{photo.visitorName}</p>
                <p className="text-xs text-muted-foreground">{new Date(photo.createdAt).toLocaleString()}</p>
                {photo.caption && <p className="mt-2 text-sm italic text-muted-foreground">"{photo.caption}"</p>}
                {isPending && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerate(photo.photoId, "approve")}
                      className="flex-1 rounded-md bg-brand-primary py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-primary-hover"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate(photo.photoId, "reject")}
                      className="flex-1 rounded-md border border-destructive bg-destructive/10 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {!isPending && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(photo)}
                    className="mt-4 rounded-md border border-destructive bg-destructive/10 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this photo?"
        description={
          pendingDelete?.visitorName
            ? `The photo by ${pendingDelete.visitorName} will be permanently deleted. This cannot be undone.`
            : "This photo will be permanently deleted. This cannot be undone."
        }
        confirmLabel="Delete photo"
        pending={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
