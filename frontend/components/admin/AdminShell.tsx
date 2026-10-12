"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <main className="p-5 sm:p-6 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
