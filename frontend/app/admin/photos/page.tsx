"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PhotoUpload } from "../../../types";

export default function AdminPhotos() {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos/pending");
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setPhotos(json.data || []);
    } catch (err) {
      console.error(err);
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
      const res = await fetch(`/api/photos/${id}/${action}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to moderate");
      // Remove from list
      setPhotos((prev) => prev.filter((p) => p.photoId !== id));
    } catch (err) {
      console.error(err);
      alert("Error moderating photo");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display">Pending Photos</h2>
        <button onClick={handleLogout} className="text-sm border border-navy px-3 py-1 rounded hover:bg-navy hover:text-cream transition-colors">
          Logout
        </button>
      </div>

      {photos.length === 0 ? (
        <p className="text-navy/70">No pending photos to review.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.photoId} className="border border-navy/20 rounded bg-white p-4 flex flex-col">
              <div className="relative aspect-square w-full bg-navy/5 rounded overflow-hidden mb-4">
                <Image src={photo.imageUrl} alt="Upload" fill className="object-cover" />
              </div>
              <div className="flex-1 mb-4">
                <p className="font-semibold">{photo.visitorName}</p>
                <p className="text-sm text-navy/70">{new Date(photo.createdAt).toLocaleString()}</p>
                {photo.caption && <p className="text-sm mt-2 italic">"{photo.caption}"</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleModerate(photo.photoId, "approve")}
                  className="flex-1 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleModerate(photo.photoId, "reject")}
                  className="flex-1 bg-red-600 text-white py-2 rounded font-medium hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
