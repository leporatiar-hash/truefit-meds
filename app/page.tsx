"use client";

import { useEffect, useState } from "react";
import { Lora, DM_Sans } from "next/font/google";
import Link from "next/link";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
  display: "swap",
});

const C = {
  sage:      "#4a7c59",
  sageLight: "#6a9f78",
  sagePale:  "#e8f0eb",
  sageMist:  "#f2f7f3",
  forest:    "#2d4f38",
  ink:       "#1a2420",
  inkMid:    "#3d4f47",
  inkSoft:   "#6b7d74",
  cream:     "#faf9f6",
  white:     "#ffffff",
  rule:      "#d4e0d7",
};

const SITE_URL = "https://usewitnes.com";

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, i * 80);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(SITE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "Advocate — Care, Documented",
        text: "A free tool that turns daily caregiver notes into doctor-ready summaries.",
        url: SITE_URL,
      });
    } else {
      handleCopy();
    }
  }

  return (
    <div
      className={`${lora.variable} ${dmSans.variable}`}
      style={{ fontFamily: "var(--font-dm-sans), sans-serif", background: C.cream, color: C.ink, lineHeight: "1.6", overflowX: "hidden" }}
    >
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        .lp-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .lp-nav-links { display: flex; align-items: center; gap: 28px; list-style: none; }
        .lp-nav-link { font-size: 0.875rem; color: ${C.inkSoft}; text-decoration: none; transition: color 0.2s; }
        .lp-nav-link:hover { color: ${C.sage}; }
        .lp-nav-login { font-size: 0.875rem; font-weight: 500; color: ${C.inkMid}; text-decoration: none; padding: 8px 16px; border-radius: 100px; border: 1px solid ${C.rule}; transition: border-color 0.2s, color 0.2s; }
        .lp-nav-login:hover { border-color: ${C.sage}; color: ${C.sage}; }
        .lp-nav-cta { font-size: 0.875rem; font-weight: 500; color: ${C.white} !important; background: ${C.sage}; padding: 8px 20px; border-radius: 100px; text-decoration: none; transition: background 0.2s; }
        .lp-nav-cta:hover { background: ${C.forest} !important; }
        .lp-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: ${C.sage}; color: ${C.white}; font-size: 1rem; font-weight: 500; padding: 14px 32px; border-radius: 100px; text-decoration: none; transition: background 0.2s, transform 0.15s; }
        .lp-btn-primary:hover { background: ${C.forest}; transform: translateY(-1px); }
        .lp-btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: ${C.inkMid}; font-size: 1rem; padding: 14px 28px; border-radius: 100px; border: 1px solid ${C.rule}; text-decoration: none; transition: border-color 0.2s, color 0.2s; }
        .lp-btn-ghost:hover { border-color: ${C.sage}; color: ${C.sage}; }
        .lp-step { background: ${C.white}; border-radius: 16px; padding: 40px 32px; border: 1px solid ${C.rule}; transition: transform 0.2s, box-shadow 0.2s; }
        .lp-step:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(45,79,56,0.08); }
        .lp-feature-card { padding: 36px; border: 1px solid ${C.rule}; border-radius: 16px; background: ${C.white}; transition: border-color 0.2s, box-shadow 0.2s; }
        .lp-feature-card:hover { border-color: ${C.sage}; box-shadow: 0 8px 32px rgba(74,124,89,0.08); }
        .lp-share-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: ${C.sage}; color: ${C.white}; font-family: inherit; font-size: 0.95rem; font-weight: 500; border: none; border-radius: 100px; cursor: pointer; transition: background 0.2s; }
        .lp-share-btn:hover { background: ${C.forest}; }
        .lp-copy-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px; background: transparent; color: ${C.inkMid}; font-family: inherit; font-size: 0.95rem; border: 1px solid ${C.rule}; border-radius: 100px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
        .lp-copy-btn:hover { border-color: ${C.sage}; color: ${C.sage}; }
        @media (max-width: 768px) {
          .lp-nav-links { display: none; }
          .lp-problem { grid-template-columns: 1fr !important; gap: 40px !important; }
          .lp-steps { grid-template-columns: 1fr !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-featured-card { grid-column: span 1 !important; grid-template-columns: 1fr !important; }
          .lp-who-cards { grid-template-columns: 1fr !important; }
          .lp-footer { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
          .lp-nav { padding: 0 20px !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="lp-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 64, background: "rgba(250,249,246,0.88)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.rule}` }}>
        <a href="#" style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.2rem", fontWeight: 500, color: C.forest, letterSpacing: "0.02em", textDecoration: "none" }}>
          Advocate
        </a>
        <ul className="lp-nav-links">
          <li><a href="#how" className="lp-nav-link">How it works</a></li>
          <li><a href="#features" className="lp-nav-link">Features</a></li>
          <li><a href="#story" className="lp-nav-link">Our story</a></li>
          <li><Link href="/login" className="lp-nav-login">Log in</Link></li>
          <li><Link href="/signup" className="lp-nav-cta">Get Started Free</Link></li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(74,124,89,0.08) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 70%, rgba(106,159,120,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, background: C.sagePale, padding: "6px 16px", borderRadius: "100px", marginBottom: 32, animation: "fadeUp 0.8s 0.2s both" }}>
          <span style={{ width: 6, height: 6, background: C.sage, borderRadius: "50%", display: "inline-block" }} />
          Free for caregivers
        </div>

        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 500, lineHeight: 1.12, color: C.forest, maxWidth: 780, marginBottom: 12, animation: "fadeUp 0.8s 0.35s both" }}>
          The doctor sees a chart.<br />
          <em style={{ fontStyle: "italic", color: C.sage }}>You see the whole person.</em>
        </h1>

        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.1rem, 2vw, 1.35rem)", fontStyle: "italic", color: C.inkSoft, marginBottom: 40, animation: "fadeUp 0.8s 0.5s both" }}>
          Care, documented.
        </p>

        <p style={{ fontSize: "1.05rem", color: C.inkMid, maxWidth: 540, lineHeight: 1.7, marginBottom: 48, animation: "fadeUp 0.8s 0.65s both" }}>
          Advocate turns daily caregiver observations into structured, doctor-ready health summaries — so nothing important gets lost between appointments.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.8s 0.8s both" }}>
          <Link href="/signup" className="lp-btn-primary">Get Started Free →</Link>
          <Link href="/login" className="lp-btn-ghost">Log in</Link>
        </div>

        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeUp 0.8s 1.2s both" }}>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${C.sage}, transparent)`, animation: "scrollPulse 2s ease-in-out infinite" }} />
        </div>
      </section>

      <div style={{ height: 1, background: C.rule }} />

      {/* ── PROBLEM ── */}
      <section id="problem" className="lp-problem" style={{ padding: "100px 24px", maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div className="lp-reveal">
          <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, marginBottom: 20 }}>The problem</div>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 500, lineHeight: 1.2, color: C.forest, marginBottom: 24 }}>
            Critical details disappear between visits
          </h2>
          <p style={{ fontSize: "1rem", color: C.inkMid, lineHeight: 1.75, marginBottom: 16 }}>
            Caregivers spend hours observing their loved ones — tracking symptoms, medications, mood shifts, and patterns. But when the appointment arrives, that knowledge lives in scattered notes, memory, and text threads.
          </p>
          <p style={{ fontSize: "1rem", color: C.inkMid, lineHeight: 1.75 }}>
            Doctors make decisions in 15-minute windows. Without structured input, the most important observations never make it into the chart.
          </p>
        </div>
        <div className="lp-reveal" style={{ padding: 40, background: C.sageMist, borderRadius: 16, borderLeft: `3px solid ${C.sage}` }}>
          <blockquote style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.35rem", fontStyle: "italic", lineHeight: 1.5, color: C.forest }}>
            "She told me he seemed off for weeks. But she couldn't remember exactly when it started, or how often it happened. That's information I needed."
          </blockquote>
          <cite style={{ display: "block", marginTop: 16, fontSize: "0.85rem", fontStyle: "normal", color: C.inkSoft }}>
            — Geriatric physician, patient feedback session
          </cite>
        </div>
      </section>

      <div style={{ height: 1, background: C.rule }} />

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ background: C.sageMist, padding: "100px 24px" }}>
        <div className="lp-reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 72px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 500, lineHeight: 1.2, color: C.forest, marginBottom: 16 }}>
            Sixty seconds a day.<br />Everything the doctor needs.
          </h2>
          <p style={{ fontSize: "1.05rem", color: C.inkSoft, lineHeight: 1.7 }}>
            Advocate is designed for the caregiver who doesn&apos;t have time for another app — just a fast, focused daily check-in that builds into a complete health picture.
          </p>
        </div>
        <div className="lp-steps" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { num: "01", title: "Log daily", body: "Track symptoms, medications, mood, vitals, and lifestyle in a simple 60-second daily check-in built for non-technical caregivers." },
            { num: "02", title: "Patterns emerge", body: "Advocate surfaces trends across your entries — flagging changes in symptom frequency, medication adherence, and wellbeing over time." },
            { num: "03", title: "Walk in prepared", body: "Before each appointment, generate a clean clinical summary organized by system — the kind of structured input that changes what a doctor can do in 15 minutes." },
          ].map((step) => (
            <div key={step.num} className="lp-step lp-reveal">
              <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "2.5rem", fontWeight: 400, color: C.sagePale, lineHeight: 1, marginBottom: 20 }}>{step.num}</div>
              <h3 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.2rem", fontWeight: 500, color: C.forest, marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontSize: "0.95rem", color: C.inkSoft, lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: C.rule }} />

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="lp-reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, marginBottom: 16 }}>Features</div>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 500, lineHeight: 1.2, color: C.forest }}>
            Built around the caregiver,<br />designed for the doctor.
          </h2>
        </div>
        <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, marginTop: 64 }}>
          <div className="lp-featured-card lp-reveal" style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center", padding: 36, borderRadius: 16, background: C.forest, border: `1px solid ${C.forest}` }}>
            <div>
              <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.15rem", fontWeight: 500, color: C.white, marginBottom: 10 }}>Doctor-ready clinical summaries</div>
              <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                Advocate takes everything you&apos;ve logged and generates a structured summary organized by symptom category, medication history, and trend analysis — formatted the way clinicians actually read patient information.
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 28, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.sageLight, marginBottom: 8 }}>Visit Summary · March 2026</div>
              {[
                "Fatigue frequency increased 3× over 14 days",
                "Metformin — 100% adherence, no missed doses",
                "Sleep avg. 5.2 hrs/night (down from 6.8)",
                "Appetite: mild decline noted since Feb 22",
                "Recommend discussing energy management",
              ].map((line, i, arr) => (
                <div key={i} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.8, padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
          {[
            { title: "60-second daily check-in", body: "No long forms. No medical jargon. Just a fast, focused daily entry that a non-technical caregiver can complete in under a minute." },
            { title: "Trend detection", body: "Advocate automatically surfaces changes in symptom patterns, medication adherence, and wellbeing — things that are invisible day-to-day but obvious over time." },
            { title: "Medication tracking", body: "Log medications with dosage, timing, and adherence. Build a complete medication history that travels with you to every appointment." },
            { title: "Private by default", body: "Your loved one's health data stays yours. Advocate is built with privacy as a foundation — not an afterthought." },
          ].map((f) => (
            <div key={f.title} className="lp-feature-card lp-reveal">
              <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.15rem", fontWeight: 500, color: C.forest, marginBottom: 10 }}>{f.title}</div>
              <div style={{ fontSize: "0.95rem", color: C.inkSoft, lineHeight: 1.7 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STORY ── */}
      <section id="story" style={{ background: C.forest, padding: "100px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sageLight, marginBottom: 32 }}>Why we built this</div>
        <div className="lp-reveal" style={{ maxWidth: 640, margin: "0 auto 48px" }}>
          <blockquote style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontStyle: "italic", color: C.white, lineHeight: 1.45 }}>
            &ldquo;The doctor sees a chart.<br />
            <em style={{ color: C.sageLight }}>The mother sees a son.</em>&rdquo;
          </blockquote>
        </div>
        <div className="lp-reveal" style={{ maxWidth: 540, margin: "0 auto", fontSize: "1rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>
          <p>My mother has been caring for my brother since he was eighteen. He was diagnosed with schizophrenia, and from that day forward, she became his primary advocate — mostly on her own, for years.</p>
          <p style={{ marginTop: 16 }}>I watched her carry everything in her head. Every symptom shift. Every medication adjustment. Every pattern she noticed but couldn&apos;t quite articulate when the appointment finally came. The doctor had fifteen minutes. She had years of observations and nowhere to put them.</p>
          <p style={{ marginTop: 16 }}>So I built Advocate for her. A simple way to log what she saw every day and surface it in a format a doctor could actually use. What I didn&apos;t expect was what happened next — she started finding the patterns herself. She started walking into appointments with confidence. She stopped feeling like a bystander in her own son&apos;s care.</p>
          <p style={{ marginTop: 16 }}>That&apos;s when I knew this wasn&apos;t just a tool. It was a shift in who gets to understand the patient.</p>
        </div>
      </section>

      <div style={{ height: 1, background: C.rule }} />

      {/* ── WHO ── */}
      <section id="who" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div className="lp-reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.sage, marginBottom: 16 }}>Who it&apos;s for</div>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 500, lineHeight: 1.2, color: C.forest }}>
            For anyone who carries<br />someone else&apos;s health.
          </h2>
        </div>
        <div className="lp-who-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { title: "Parents & family members", body: "Caring for a loved one with a chronic illness or mental health condition — navigating complex medication regimens, unpredictable symptoms, and appointments that never feel long enough." },
            { title: "Long-term caregivers", body: "People who have been doing this for years, largely alone, with deep knowledge of their loved one that rarely makes it into the medical record." },
            { title: "Anyone who advocates", body: "If you are the person who tracks, remembers, notices, and speaks up — Advocate is built for you." },
          ].map((card) => (
            <div key={card.title} className="lp-reveal" style={{ background: C.sageMist, borderRadius: 16, padding: "36px 28px", border: `1px solid ${C.rule}` }}>
              <h3 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.05rem", fontWeight: 500, color: C.forest, marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: "0.92rem", color: C.inkSoft, lineHeight: 1.7 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHARE CTA ── */}
      <section id="cta" style={{ padding: "100px 24px", textAlign: "center", background: C.sageMist, borderTop: `1px solid ${C.rule}` }}>
        <div className="lp-reveal" style={{ maxWidth: 560, margin: "0 auto 48px" }}>
          <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 500, lineHeight: 1.2, color: C.forest, marginBottom: 16 }}>
            Know a caregiver<br />who needs this?
          </h2>
          <p style={{ fontSize: "1.05rem", color: C.inkSoft, lineHeight: 1.7 }}>
            Advocate is free. If someone in your life is carrying another person&apos;s health — a parent, a sibling, a partner — send them this.
          </p>
        </div>

        <div className="lp-reveal" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <button onClick={handleShare} className="lp-share-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Send Advocate
          </button>
          <button onClick={handleCopy} className="lp-copy-btn">
            {copied ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>

        <div className="lp-reveal" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", background: C.white, borderRadius: 100, border: `1px solid ${C.rule}` }}>
          <span style={{ fontSize: "0.85rem", color: C.inkSoft, fontFamily: "monospace" }}>{SITE_URL}</span>
        </div>

        <div className="lp-reveal" style={{ marginTop: 64, paddingTop: 64, borderTop: `1px solid ${C.rule}` }}>
          <p style={{ fontSize: "0.95rem", color: C.inkSoft, marginBottom: 24 }}>Ready to start yourself?</p>
          <Link href="/signup" className="lp-btn-primary">Get Started Free →</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" style={{ padding: "40px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "1rem", fontWeight: 500, color: C.forest }}>Advocate</div>
        <div style={{ fontSize: "0.83rem", color: C.inkSoft }}>© 2026 Advocate. Built in Charleston, SC.</div>
      </footer>
    </div>
  );
}
