"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Lora, DM_Sans } from "next/font/google";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import type { User } from "../lib/types";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500"], display: "swap" });

const C = { sage: "#4a7c59", forest: "#2d4f38", ink: "#1a2420", inkSoft: "#6b7d74", cream: "#faf9f6", white: "#ffffff", rule: "#d4e0d7", sagePale: "#e8f0eb" };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email, password }) as { access_token: string; user: User };
      login(res.access_token, res.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${lora.variable} ${dmSans.variable} min-h-screen flex flex-col items-center justify-center px-4 py-12`} style={{ background: C.cream, fontFamily: "var(--font-dm-sans), sans-serif" }}>

      {/* Back to landing */}
      <Link href="/" className="absolute top-6 left-6 text-sm font-medium flex items-center gap-1.5" style={{ color: C.inkSoft, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        Back
      </Link>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/witness-icon.png" alt="Witness" width={56} height={56} className="mx-auto mb-4 rounded-2xl" style={{ boxShadow: "0 2px 12px rgba(45,79,56,0.10)" }} />
          <h1 style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 500, fontSize: "1.75rem", color: C.forest, letterSpacing: "-0.01em" }}>
            Witness
          </h1>
          <p style={{ color: C.inkSoft, fontSize: "0.9rem", marginTop: 4 }}>Welcome back</p>
        </div>

        {/* Card */}
        <div style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.rule}`, boxShadow: "0 4px 24px rgba(45,79,56,0.08)", padding: "2rem" }}>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontWeight: 500, fontSize: "1.2rem", color: C.ink, marginBottom: "1.5rem" }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: C.ink, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 12, border: `1.5px solid ${C.rule}`, fontSize: "0.9rem", color: C.ink, background: C.cream, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = C.sage}
                onBlur={e => e.target.style.borderColor = C.rule}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: C.ink }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: C.sage, fontWeight: 500, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 12, border: `1.5px solid ${C.rule}`, fontSize: "0.9rem", color: C.ink, background: C.cream, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = C.sage}
                onBlur={e => e.target.style.borderColor = C.rule}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: 4, width: "100%", padding: "0.85rem", borderRadius: 50, border: "none", background: loading ? "#6a9f78" : C.sage, color: C.white, fontWeight: 600, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: C.inkSoft, marginTop: "1.25rem" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: C.sage, fontWeight: 600, textDecoration: "none" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
