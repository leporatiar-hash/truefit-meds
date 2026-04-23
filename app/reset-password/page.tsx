"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Lora, DM_Sans } from "next/font/google";
import { api } from "../lib/api";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500"], display: "swap" });

const C = { sage: "#4a7c59", forest: "#2d4f38", ink: "#1a2420", inkSoft: "#6b7d74", cream: "#faf9f6", white: "#ffffff", rule: "#d4e0d7", red: "#b91c1c" };

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.rule}`, boxShadow: "0 4px 24px rgba(45,79,56,0.08)", padding: "2rem" }}>
      {done ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontWeight: 500, fontSize: "1.2rem", color: C.ink, marginBottom: 8 }}>
            Password updated
          </h2>
          <p style={{ color: C.inkSoft, fontSize: "0.9rem" }}>Redirecting you to sign in…</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontWeight: 500, fontSize: "1.2rem", color: C.ink, marginBottom: 6 }}>
            Set a new password
          </h2>
          <p style={{ color: C.inkSoft, fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Choose a password with at least 8 characters.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: C.ink, marginBottom: 6 }}>New password</label>
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

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: C.ink, marginBottom: 6 }}>Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 12, border: `1.5px solid ${C.rule}`, fontSize: "0.9rem", color: C.ink, background: C.cream, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = C.sage}
                onBlur={e => e.target.style.borderColor = C.rule}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              style={{ marginTop: 4, width: "100%", padding: "0.85rem", borderRadius: 50, border: "none", background: (loading || !token) ? "#6a9f78" : C.sage, color: C.white, fontWeight: 600, fontSize: "0.95rem", cursor: (loading || !token) ? "not-allowed" : "pointer", transition: "background 0.2s", fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={`${lora.variable} ${dmSans.variable} min-h-screen flex flex-col items-center justify-center px-4 py-12`} style={{ background: C.cream, fontFamily: "var(--font-dm-sans), sans-serif" }}>

      <Link href="/login" className="absolute top-6 left-6 text-sm font-medium flex items-center gap-1.5" style={{ color: C.inkSoft }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        Back to sign in
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/advocate-icon.png" alt="Advocate" width={56} height={56} unoptimized className="mx-auto mb-4 rounded-2xl" style={{ boxShadow: "0 2px 12px rgba(45,79,56,0.10)" }} />
          <h1 style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 500, fontSize: "1.75rem", color: C.forest, letterSpacing: "-0.01em" }}>
            Advocate
          </h1>
        </div>

        <Suspense fallback={<div style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.rule}`, padding: "2rem", textAlign: "center", color: C.inkSoft }}>Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
