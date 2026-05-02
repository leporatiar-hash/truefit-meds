"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#4a7c59", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#faf9f6" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-navy">Settings</h1>
          <p className="text-base text-slate-500 mt-1">Manage your account and preferences</p>
        </div>

        {/* Account card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-5 space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Account</p>
          <p className="text-lg font-bold text-navy">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>

        {/* Change password */}
        <Link
          href="/forgot-password"
          className="flex items-center justify-between w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-5 transition-all active:scale-[0.98]"
        >
          <div>
            <p className="text-lg font-bold text-navy">Change Password</p>
            <p className="text-sm text-slate-500 mt-0.5">Send a reset link to {user.email}</p>
          </div>
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Customize button */}
        <Link
          href="/settings/customize"
          className="flex items-center justify-between w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-5 transition-all active:scale-[0.98]"
        >
          <div>
            <p className="text-lg font-bold text-navy">Customize Your Dashboard</p>
            <p className="text-sm text-slate-500 mt-0.5">Medications, symptoms, tracking, activities &amp; more</p>
          </div>
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
