"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden items-center gap-2 lg:inline-flex">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <Link href="/admin" className="hidden hover:text-foreground sm:inline">
          Admin
        </Link>
        <ChevronRight aria-hidden="true" className="hidden h-3.5 w-3.5 sm:inline" />
        <span className="font-medium text-foreground">{title}</span>
      </div>
      {description && <p className="w-full text-sm text-muted-foreground sm:max-w-md">{description}</p>}
    </div>
  );
}
