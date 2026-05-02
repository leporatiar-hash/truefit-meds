const SK_STYLE = `
  @keyframes shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
  .sk {
    background: linear-gradient(90deg, #e8f0eb 25%, #d4e0d7 50%, #e8f0eb 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }
`;

export default function RegisterLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        background: "#faf9f6",
      }}
    >
      <style>{SK_STYLE}</style>

      <div style={{ width: "100%", maxWidth: 384 }}>
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
            gap: 12,
          }}
        >
          <div className="sk" style={{ width: 56, height: 56, borderRadius: 16 }} />
          <div className="sk" style={{ width: 130, height: 28 }} />
          <div className="sk" style={{ width: 90, height: 16 }} />
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #d4e0d7",
            padding: 32,
            boxShadow: "0 4px 24px rgba(45,79,56,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Form heading */}
          <div className="sk" style={{ width: 170, height: 22 }} />

          {/* 3 input fields */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="sk" style={{ width: 72, height: 13 }} />
              <div className="sk" style={{ width: "100%", height: 46, borderRadius: 12 }} />
            </div>
          ))}

          {/* Checkbox + label row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sk" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
            <div className="sk" style={{ width: 210, height: 13 }} />
          </div>

          {/* Submit button */}
          <div className="sk" style={{ width: "100%", height: 50, borderRadius: 50 }} />
        </div>
      </div>
    </div>
  );
}
