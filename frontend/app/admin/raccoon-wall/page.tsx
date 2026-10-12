"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Image as Images } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/Overview";
import { PhotoUpload } from "../../../types";

export default function RaccoonWallPage() {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos/pending");
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setPhotos(json.data || []);
    } catch {
      setError("Could not reach the moderation endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/photos/${id}/${action}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to moderate");
      setPhotos((prev) => prev.filter((p) => p.photoId !== id));
    } catch {
      setError("Could not moderate this photo. Please retry.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Raccoon Wall"
        description="Review visitor photo submissions before they appear on the public wall."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
          <span className="sr-only">Loading pending photos…</span>
        </div>
      ) : authRequired ? (
        <EmptyState
          icon={Images}
          title="Admin session required"
          body="Pending photo moderation uses the raccoon_auth_token cookie. Sign in to view the queue."
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
          title="No pending photos"
          body="Visitor uploads pending review will appear here."
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
