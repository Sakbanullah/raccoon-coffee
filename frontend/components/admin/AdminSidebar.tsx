"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { ADMIN_NAV, findNavItem } from "./nav-config";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = findNavItem(pathname);
  const activeLabel = active?.label ?? "Overview";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Image
          src="/images/logo.svg"
          alt="Raccoon Coffee logo"
          width={30}
          height={30}
          className="object-contain"
        />
        <div className="leading-tight">
          <p className="font-display text-base font-semibold tracking-tight text-foreground">
            Raccoon Coffee
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-brand-accent">
            Admin Console
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {ADMIN_NAV.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === pathname;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                        (isActive
                          ? "bg-brand-primary text-foreground"
                          : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground")
                      }
                    >
                      <item.icon
                        aria-hidden="true"
                        className={
                          "h-[18px] w-[18px] shrink-0 " +
                          (isActive ? "text-brand-accent" : "text-muted-foreground group-hover:text-foreground")
                        }
                      />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px] text-brand-accent" />
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <p className="font-display text-sm font-semibold text-foreground">{activeLabel}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-surface-elevated"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface lg:block">
        {nav}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              key="drawer"
              id="admin-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-surface shadow-xl lg:hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
              {nav}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
