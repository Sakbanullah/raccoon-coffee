"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { ADMIN_NAV, findNavItem } from "./nav-config";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        "h-4 w-4 shrink-0 transition-transform duration-300 ease-out " +
        (open ? "rotate-180" : "rotate-0")
      }
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Only user overrides live here; a group without an entry follows the
  // "expanded when it contains the active route" default.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const active = findNavItem(pathname);
  const activeLabel = active?.label ?? "Overview";

  const toggleGroup = (key: string, current: boolean) =>
    setOverrides((prev) => ({ ...prev, [key]: !current }));

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
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-display text-base font-semibold tracking-tight text-white">
          Raccoon Coffee
        </p>
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.28em] text-gold">
          Admin Console
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((group, gi) => {
          const key = group.label ?? `group-${gi}`;
          const hasActiveChild = group.items.some(
            (item) => item.href === pathname,
          );
          const isOpen = overrides[key] ?? hasActiveChild;
          const hasChildren = group.items.length > 1;

          return (
            <div
              key={key}
              className={gi > 0 ? "mt-3 border-t border-white/10 pt-3" : undefined}
            >
              {group.label &&
                (hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(key, isOpen)}
                    aria-expanded={isOpen}
                    aria-controls={`admin-nav-${gi}`}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span>{group.label}</span>
                    <Chevron open={isOpen} />
                  </button>
                ) : (
                  <p className="px-4 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-white/70">
                    {group.label}
                  </p>
                ))}

              {hasChildren ? (
                <div
                  id={`admin-nav-${gi}`}
                  className={
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out " +
                    (isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
                  }
                >
                  <div className="overflow-hidden">
                    <ul className="space-y-1 pb-1">
                      {group.items.map((item) => {
                        const isActive = item.href === pathname;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={isActive ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              tabIndex={isOpen ? undefined : -1}
                              className={
                                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors " +
                                (isActive
                                  ? "bg-white/[0.18] font-semibold text-white"
                                  : "font-medium text-white/75 hover:bg-white/[0.08] hover:text-white")
                              }
                            >
                              <item.icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0" />
                              <span className="flex-1">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : (
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.href === pathname;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={
                            "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors " +
                            (isActive
                              ? "bg-white/[0.18] font-semibold text-white"
                              : "font-medium text-white/75 hover:bg-white/[0.08] hover:text-white")
                          }
                        >
                          <item.icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <LogOut aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0" />
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
        <p className="font-display text-sm font-semibold text-foreground">{activeLabel}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-white/10"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="admin-glass fixed bottom-4 left-4 top-4 z-40 hidden w-[16.25rem] rounded-3xl lg:block">
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
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="admin-glass fixed bottom-4 left-4 top-4 z-50 w-[17.5rem] max-w-[85vw] overflow-hidden rounded-3xl lg:hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
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
