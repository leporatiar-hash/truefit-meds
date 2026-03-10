"use client";

import { useEffect } from "react";

const CURRENT_DEPLOY = process.env.NEXT_PUBLIC_DEPLOY_ID ?? "dev";

export function UpdateBanner() {
  useEffect(() => {
    if (CURRENT_DEPLOY === "dev") return;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { v } = await res.json();
        if (v !== CURRENT_DEPLOY) window.location.reload();
      } catch {
        // network error — ignore
      }
    }

    const initial = setTimeout(check, 30_000);
    const interval = setInterval(check, 5 * 60_000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);

  return null;
}
