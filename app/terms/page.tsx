import { Lora, DM_Sans } from "next/font/google";
import Link from "next/link";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500"], display: "swap" });

const C = { sage: "#4a7c59", forest: "#2d4f38", ink: "#1a2420", inkSoft: "#6b7d74", cream: "#faf9f6", white: "#ffffff", rule: "#d4e0d7" };

export default function TermsPage() {
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
          <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "2.4rem", fontWeight: 500, color: C.forest, lineHeight: 1.15, marginBottom: 16 }}>Terms of Service</h1>
          <p style={{ fontSize: "0.9rem", color: C.inkSoft }}>Last updated: April 26, 2026</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <Section title="1. Agreement to Terms">
            <p>By creating an account or using Advocate (&ldquo;Service,&rdquo; &ldquo;App,&rdquo; or &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including caregivers and patients.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Advocate is a caregiver health-tracking application that allows users to:</p>
            <ul>
              <li>Log daily observations about a patient&rsquo;s symptoms, medications, mood, and lifestyle</li>
              <li>Track medication adherence and health patterns over time</li>
              <li>Generate AI-assisted summaries intended to support conversations with healthcare providers</li>
            </ul>
            <p style={{ marginTop: 12 }}><strong>Advocate is not a medical device and does not provide medical advice, diagnosis, or treatment.</strong> The Service is designed to help caregivers organize and communicate observations — not to replace professional medical judgment.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>You must be at least 18 years of age to create an account. By registering, you represent that you are 18 or older and have the legal capacity to enter into these Terms.</p>
          </Section>

          <Section title="4. Account Responsibilities">
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring that any patient data you log is entered with the knowledge and consent of the individual (or their legal guardian) whose health information is being recorded</li>
            </ul>
            <p style={{ marginTop: 12 }}>Notify us immediately at <a href="mailto:support@advocatetrack.com" style={{ color: C.sage }}>support@advocatetrack.com</a> if you suspect unauthorized use of your account.</p>
          </Section>

          <Section title="5. Health Data and HIPAA Notice">
            <p>Advocate may collect and store Protected Health Information (PHI) as defined by the Health Insurance Portability and Accountability Act (HIPAA). While we implement reasonable security measures to protect this information, <strong>Advocate is not a HIPAA-covered entity and does not currently offer a Business Associate Agreement (BAA).</strong></p>
            <p style={{ marginTop: 12 }}>You should not use Advocate to store data that requires HIPAA-compliant handling in a regulated clinical or enterprise context. Personal use by caregivers and patients for individual health tracking does not generally trigger HIPAA obligations on the part of the user.</p>
          </Section>

          <Section title="6. AI-Generated Summaries">
            <p>Advocate uses artificial intelligence to generate health summaries based on the data you log. These summaries:</p>
            <ul>
              <li>Are generated for informational purposes only</li>
              <li>Are not reviewed or verified by licensed medical professionals</li>
              <li>Should not be relied upon as a substitute for professional medical evaluation</li>
              <li>May contain inaccuracies, omissions, or errors</li>
            </ul>
            <p style={{ marginTop: 12 }}>Always consult a qualified healthcare provider before making medical decisions.</p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload false, misleading, or harmful information</li>
              <li>Attempt to access other users&rsquo; accounts or data</li>
              <li>Reverse-engineer, scrape, or abuse the platform or its APIs</li>
              <li>Use Advocate in a clinical, diagnostic, or enterprise medical setting without appropriate agreements in place</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>All content, design, software, and branding on the Advocate platform are owned by or licensed to Advocate and protected by applicable intellectual property laws. You retain ownership of the health data you submit. By using the Service, you grant Advocate a limited license to process your data solely to provide the Service features you use.</p>
          </Section>

          <Section title="9. Data Deletion">
            <p>You may request deletion of your account and associated data at any time by contacting <a href="mailto:support@advocatetrack.com" style={{ color: C.sage }}>support@advocatetrack.com</a>. We will process deletion requests within 30 days, subject to any legal retention obligations.</p>
          </Section>

          <Section title="10. Disclaimers and Limitation of Liability">
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, ADVOCATE DISCLAIMS ALL WARRANTIES AND SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>
            <p style={{ marginTop: 12 }}>IN NO EVENT SHALL ADVOCATE&rsquo;S TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID (IF ANY) FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
          </Section>

          <Section title="11. Changes to Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes by posting a notice in the app or by email. Continued use of the Service after such changes constitutes acceptance of the new Terms.</p>
          </Section>

          <Section title="12. Governing Law">
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of South Carolina, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts located in Charleston County, South Carolina.</p>
          </Section>

          <Section title="13. Contact">
            <p>Questions about these Terms? Reach us at <a href="mailto:support@advocatetrack.com" style={{ color: C.sage }}>support@advocatetrack.com</a>.</p>
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
