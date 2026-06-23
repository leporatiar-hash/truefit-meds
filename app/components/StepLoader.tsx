"use client";

import { useState, useEffect } from "react";

const LOADER_CSS = `
@keyframes sl-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.75); }
}
@keyframes sl-fadein {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sl-progress {
  from { width: 0%; }
  to   { width: 90%; }
}
`;

export function StepLoader({
  steps,
  intervalMs = 3000,
  done = false,
}: {
  steps: string[];
  intervalMs?: number;
  done?: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (activeIdx >= steps.length - 1) return;
    const timer = setTimeout(() => setActiveIdx((i) => i + 1), intervalMs);
    return () => clearTimeout(timer);
  }, [activeIdx, steps.length, intervalMs]);

  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <style>{LOADER_CSS}</style>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step, i) => {
          const completed = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: i > activeIdx ? 0.25 : 1,
                animation: active ? "sl-fadein 0.3s ease" : undefined,
              }}
            >
              {/* Indicator */}
              <div style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {completed ? (
                  <span style={{ color: "#4a7c59", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
                ) : active ? (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#4a7c59",
                    animation: "sl-pulse 1.4s ease-in-out infinite",
                  }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1" }} />
                )}
              </div>

              {/* Label */}
              <p style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: active ? 500 : 400,
                color: completed ? "#94a3b8" : active ? "#1a2420" : "#94a3b8",
                transition: "color 0.2s ease",
              }}>
                {step}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14, height: 3, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: 99,
          background: "linear-gradient(90deg, #4a7c59, #2d4f38)",
          width: done ? "100%" : "0%",
          animation: done ? "none" : "sl-progress 12s linear forwards",
        }} />
      </div>
    </div>
  );
}
