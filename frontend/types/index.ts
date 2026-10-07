export type ProductStatus = "ACTIVE" | "INACTIVE";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PhotoStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

/** Mirrors backend `Branch` columns that the public website may consume. */
export interface Branch {
  branchId: string;
  name: string;
  address: string;
  city: string;
  postalCode: string | null;
  openingTime: string | null;
  closingTime: string | null;
  phone: string | null;
  mapsUrl: string | null;
  isActive: boolean;
}

/** Mirrors backend `ProductCategory`. */
export interface ProductCategory {
  categoryId: string;
  name: string;
  slug: string;
  displayOrder: number;
}

/** Mirrors backend `Product`. */
export interface Product {
  productId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  /** Decimal string as returned by the API/Prisma, formatted in the UI. */
  price: string;
  imageUrl: string | null;
  status: ProductStatus;
  displayOrder: number;
}

/** Mirrors backend `Story`. */
export interface Story {
  storyId: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
}

/** Mirrors backend `Event`. */
export interface Event {
  eventId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  /** ISO date string, e.g. `2026-11-14`. */
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  status: ContentStatus;
}

/** Mirrors backend `PhotoUpload` (public fields only). */
export interface PhotoUpload {
  photoId: string;
  visitorName: string;
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  status: PhotoStatus;
  createdAt: string;
}
