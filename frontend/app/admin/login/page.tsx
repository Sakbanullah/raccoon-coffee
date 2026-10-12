"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      router.push("/admin/raccoon-wall");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-md">
      <h2 className="mb-6 font-display text-2xl text-foreground">Admin Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-border bg-input p-2 text-foreground"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-border bg-input p-2 text-foreground"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand-primary py-2 font-medium text-foreground hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}