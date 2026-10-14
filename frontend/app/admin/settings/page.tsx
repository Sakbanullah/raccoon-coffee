"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Settings, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AdminProfile = { adminId: string; email: string; name: string };
type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "error" }
  | { status: "ready"; profile: AdminProfile };

export default function SettingsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) return setState({ status: "unauthenticated" });
        if (!res.ok) return setState({ status: "error" });
        setState({ status: "ready", profile: await res.json() });
      })
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, []);

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
              {state.status === "loading" && "Checking session…"}
              {state.status === "ready" && "Signed in."}
              {state.status === "unauthenticated" && "Not signed in."}
              {state.status === "error" && "Could not load session. Is the backend running?"}
            </p>
          </div>
        </div>

        {state.status === "ready" && (
          <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-foreground">{state.profile.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{state.profile.email}</dd>
            <dt className="text-muted-foreground">Admin ID</dt>
            <dd className="break-all text-foreground">{state.profile.adminId}</dd>
          </dl>
        )}

        {state.status !== "ready" && state.status !== "loading" && (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <ShieldAlert aria-hidden="true" className="h-4 w-4 text-amber-600" />
            <span>
              {state.status === "unauthenticated"
                ? "Sign in to view your admin profile."
                : "Session check failed."}
            </span>
          </div>
        )}

        <Link
          href="/admin/login"
          className="mt-6 inline-flex items-center rounded-md border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          {state.status === "ready" ? "Switch account" : "Go to login"}
        </Link>
      </div>
    </div>
  );
}
