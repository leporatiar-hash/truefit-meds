import { Lora, DM_Sans } from "next/font/google";
import Link from "next/link";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500"], display: "swap" });

const C = { sage: "#4a7c59", forest: "#2d4f38", ink: "#1a2420", inkSoft: "#6b7d74", cream: "#faf9f6", white: "#ffffff", rule: "#d4e0d7" };

export default function PrivacyPage() {
  return (
    <div className={`${lora.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm-sans), sans-serif", background: C.cream, color: C.ink, minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 64, background: "rgba(250,249,246,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.rule}` }}>
        <Link href="/" style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.1rem", fontWeight: 500, color: C.forest, textDecoration: "none" }}>Advocate</Link>
        <div style={{ display: "flex", gap: 24, fontSize: "0.875rem" }}>
          <Link href="/login" style={{ color: C.inkSoft, textDecoration: "none" }}>Log in</Link>
          <Link href="/register" style={{ color: C.sage, fontWeight: 600, textDecoration: "none" }}>Get started</Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 96px" }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "2.4rem", fontWeight: 500, color: C.forest, lineHeight: 1.15, marginBottom: 16 }}>Privacy Policy</h1>
          <p style={{ fontSize: "0.9rem", color: C.inkSoft }}>Last updated: April 26, 2026</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <Section title="1. Overview">
            <p>Advocate (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a caregiver health-tracking application. We take the privacy of health-related information seriously. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.</p>
            <p style={{ marginTop: 12 }}>By using Advocate, you agree to the collection and use of information as described in this policy.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong>Account information:</strong> When you register, we collect your name, email address, and hashed password.</p>
            <p style={{ marginTop: 12 }}><strong>Health and care data:</strong> Data you voluntarily enter about a patient, including:</p>
            <ul>
              <li>Daily symptoms, mood scores, and episode descriptions</li>
              <li>Medication names, dosages, and adherence logs</li>
              <li>Sleep, hydration, activity, and lifestyle entries</li>
              <li>Vital signs and custom health metrics</li>
              <li>Notes and free-text observations</li>
            </ul>
            <p style={{ marginTop: 12 }}><strong>Usage data:</strong> We may collect standard server logs including IP addresses, browser type, and page interactions to diagnose technical issues and improve the Service.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information you provide to:</p>
            <ul>
              <li>Deliver core app features (daily logging, history, summaries)</li>
              <li>Generate AI-assisted health summaries from your logged data</li>
              <li>Send account-related emails (password resets, notifications you opt into)</li>
              <li>Diagnose technical problems and improve service reliability</li>
            </ul>
            <p style={{ marginTop: 12 }}>We <strong>do not</strong> sell your personal or health data to third parties. We do not use your health data for advertising.</p>
          </Section>

          <Section title="4. AI Processing">
            <p>Advocate uses the Anthropic Claude API to generate health summaries from the data you log. When you request a summary, relevant entries are transmitted to Anthropic&rsquo;s API for processing. Anthropic&rsquo;s data handling is governed by their <a href="https://www.anthropic.com/privacy" style={{ color: C.sage }} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
            <p style={{ marginTop: 12 }}>AI-generated summaries are stored on our servers and associated with your account. They are not used to train AI models.</p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>Your data is stored on servers hosted by Railway (infrastructure provider). We use:</p>
            <ul>
              <li>HTTPS encryption for all data in transit</li>
              <li>Hashed passwords (bcrypt) — we never store plain-text passwords</li>
              <li>JWT-based authentication with short-lived access tokens</li>
            </ul>
            <p style={{ marginTop: 12 }}>No security system is perfect. We recommend using a strong, unique password and not sharing your account credentials.</p>
          </Section>

          <Section title="6. Third-Party Services">
            <p>Advocate integrates with the following third-party services:</p>
            <ul>
              <li><strong>Anthropic Claude API</strong> — AI summary generation</li>
              <li><strong>Resend</strong> — transactional email (password resets)</li>
              <li><strong>Railway</strong> — backend infrastructure and PostgreSQL database hosting</li>
              <li><strong>Vercel</strong> — frontend hosting</li>
            </ul>
            <p style={{ marginTop: 12 }}>Each provider has their own privacy policies. We share only the minimum data necessary to provide the feature in question.</p>
          </Section>

          <Section title="7. Health Data and HIPAA">
            <p>Advocate may process information that qualifies as Protected Health Information (PHI) under HIPAA. <strong>Advocate is not a HIPAA-covered entity</strong> and is designed for personal caregiver use, not for regulated clinical or enterprise healthcare settings.</p>
            <p style={{ marginTop: 12 }}>If you are a healthcare organization subject to HIPAA requirements, you should evaluate whether Advocate is appropriate for your use case before storing regulated PHI.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain your data for as long as your account is active. If you delete your account, we will remove your personal data and health logs within 30 days, except where we are required by law to retain certain records.</p>
          </Section>

          <Section title="9. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Correct</strong> inaccurate data in your account settings</li>
              <li><strong>Delete</strong> your account and associated data by contacting us</li>
              <li><strong>Export</strong> your data (contact us to request a copy)</li>
            </ul>
            <p style={{ marginTop: 12 }}>To exercise any of these rights, email <a href="mailto:support@advocatetrack.com" style={{ color: C.sage }}>support@advocatetrack.com</a>.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>Advocate is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected such information, contact us and we will delete it promptly.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy as the Service evolves. We will notify you of material changes by posting a notice in the app or by email. The &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent revision.</p>
          </Section>

          <Section title="12. Contact">
            <p>Questions, concerns, or data requests? Contact us at <a href="mailto:support@advocatetrack.com" style={{ color: C.sage }}>support@advocatetrack.com</a>.</p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.95rem", fontWeight: 500, color: C.forest }}>Advocate</div>
        <div style={{ display: "flex", gap: 24, fontSize: "0.82rem" }}>
          <Link href="/privacy" style={{ color: C.inkSoft, textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: C.inkSoft, textDecoration: "none" }}>Terms of Service</Link>
        </div>
        <div style={{ fontSize: "0.82rem", color: C.inkSoft }}>© 2026 Advocate. Built in Charleston, SC.</div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.15rem", fontWeight: 500, color: "#2d4f38", marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: "0.95rem", color: "#3d4f47", lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}
