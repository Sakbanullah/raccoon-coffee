"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Settings, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Settings"
        description="Admin account details, session, and preferences."
      />
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-elevated text-brand-accent">
            <Settings aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Admin Profile</h2>
            <p className="text-sm text-muted-foreground">
              Session details load from <code className="rounded bg-surface-elevated px-1 text-foreground">/api/auth/me</code> once
              authentication integration is complete.
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 text-amber-600" />
          <span>
            Authentication integration is a separate phase. The backend uses an HttpOnly cookie
            (<code>raccoon_auth_token</code>) that JavaScript cannot read.
          </span>
        </div>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex items-center rounded-md border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}