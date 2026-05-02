"use client";

import { useState, useEffect } from "react";

export function StepLoader({
  steps,
  intervalMs = 3000,
}: {
  steps: string[];
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (idx >= steps.length - 1) return;
    const timer = setTimeout(() => {
      setFading(true);
      const swap = setTimeout(() => {
        setIdx((i) => i + 1);
        setFading(false);
      }, 200);
      return () => clearTimeout(swap);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [idx, steps.length, intervalMs]);

  return (
    <p
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.2s ease",
        color: "#94a3b8",
        fontSize: "0.95rem",
        textAlign: "center",
        fontWeight: 400,
        margin: 0,
      }}
    >
      {steps[idx]}
    </p>
  );
}
