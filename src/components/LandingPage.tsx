"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_ID ?? "";
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY_ID ?? "";

export default function LandingPage() {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);

  const startCheckout = async (priceId: string, plan: "monthly" | "yearly") => {
    if (!priceId) {
      window.location.href = "/auth/login";
      return;
    }
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/login?next=/";
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Hero ── */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "64px 24px 40px", textAlign: "center" }}>
        <div style={{ marginBottom: "16px" }}>
          <span style={{
            display: "inline-block",
            padding: "5px 16px",
            background: "rgba(108,92,231,0.12)",
            border: "1px solid rgba(108,92,231,0.3)",
            borderRadius: "20px",
            fontSize: "0.82em",
            color: "var(--primary)",
            fontWeight: 700,
            letterSpacing: "0.5px",
          }}>
            ⚡ Free to start — no credit card required
          </span>
        </div>

        <h1
          className="animate-title-glow"
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "clamp(2.2em, 7vw, 3.6em)",
            lineHeight: 1.12,
            margin: "20px 0 18px",
            background: "linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Turn Any Worksheet Into<br />a Fun Quiz in Seconds
        </h1>

        <p style={{
          color: "#a0a0c0",
          fontSize: "1.15em",
          lineHeight: 1.65,
          maxWidth: "540px",
          margin: "0 auto 36px",
        }}>
          Upload a vocabulary worksheet — PDF, photo, or Word doc. AI extracts every word and builds <strong style={{ color: "var(--text)" }}>6 interactive game modes</strong> instantly.
        </p>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/auth/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "15px 34px",
              background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
              color: "white",
              textDecoration: "none",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1em",
              boxShadow: "0 4px 28px rgba(108,92,231,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 36px rgba(108,92,231,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 28px rgba(108,92,231,0.4)";
            }}
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
          <Link
            href="/auth/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "15px 34px",
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.14)",
              color: "#ccc",
              textDecoration: "none",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1em",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLElement).style.color = "#ccc";
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Social proof line */}
        <p style={{ color: "#444", fontSize: "0.82em", marginTop: "24px" }}>
          Perfect for teachers, students & parents ✏️
        </p>
      </div>

      {/* ── How it works ── */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "16px 24px 48px" }}>
        <p style={{
          textAlign: "center",
          color: "#555",
          fontSize: "0.75em",
          textTransform: "uppercase",
          letterSpacing: "2.5px",
          fontWeight: 700,
          marginBottom: "20px",
        }}>
          How it works
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
          {[
            {
              icon: "📤",
              step: "1",
              title: "Upload",
              desc: "Drop a PDF, snap a photo of a worksheet, or upload a Word doc. Multi-page? Add one photo per page.",
            },
            {
              icon: "✏️",
              step: "2",
              title: "Review",
              desc: "AI extracts every vocabulary word with definitions and example sentences. Fix mistakes or add words.",
            },
            {
              icon: "🎮",
              step: "3",
              title: "Play",
              desc: "Choose from 6 game modes. Classic quiz, spelling, speed round, flashcards, and more — all included.",
            },
          ].map(({ icon, step, title, desc }) => (
            <div
              key={step}
              style={{
                background: "var(--card)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "20px",
                padding: "24px 20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "3px",
                background: "linear-gradient(90deg, var(--primary), var(--secondary))",
              }} />
              <div style={{ fontSize: "2em", marginBottom: "10px" }}>{icon}</div>
              <div style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.1em",
                color: "var(--secondary)",
                marginBottom: "8px",
              }}>
                {step}. {title}
              </div>
              <p style={{ color: "#888", fontSize: "0.87em", lineHeight: 1.55, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Game modes ── */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px 52px" }}>
        <p style={{
          textAlign: "center",
          color: "#555",
          fontSize: "0.75em",
          textTransform: "uppercase",
          letterSpacing: "2.5px",
          fontWeight: 700,
          marginBottom: "18px",
        }}>
          6 Game Modes — All Included
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[
            { icon: "🎯", name: "Classic Quiz", desc: "Pick the right definition" },
            { icon: "🔄", name: "Reverse", desc: "Match word to definition" },
            { icon: "⌨️", name: "Spell It", desc: "Type the word from a clue" },
            { icon: "🧩", name: "Match Up", desc: "Connect word-definition pairs" },
            { icon: "⚡", name: "Speed Round", desc: "Race against the clock" },
            { icon: "📖", name: "Study Cards", desc: "Flip through flashcards" },
          ].map((m) => (
            <div
              key={m.name}
              style={{
                background: "rgba(26,26,46,0.7)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "16px",
                padding: "18px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.7em" }}>{m.icon}</div>
              <div style={{ fontSize: "0.8em", fontWeight: 700, marginTop: "7px", color: "#d0d0d0" }}>{m.name}</div>
              <div style={{ fontSize: "0.7em", color: "#555", marginTop: "3px" }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ── */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={{
          textAlign: "center",
          color: "#555",
          fontSize: "0.75em",
          textTransform: "uppercase",
          letterSpacing: "2.5px",
          fontWeight: 700,
          marginBottom: "24px",
        }}>
          Simple, Honest Pricing
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "18px" }}>

          {/* Free tier */}
          <div style={{
            background: "var(--card)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "22px",
            padding: "30px 26px",
          }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.15em", color: "#bbb", marginBottom: "8px" }}>
              Free
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "2.6em", color: "var(--text)", lineHeight: 1 }}>
              $0
            </div>
            <div style={{ color: "#555", fontSize: "0.85em", margin: "4px 0 26px" }}>forever</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginBottom: "26px" }}>
              {[
                "5 quizzes per month",
                "All 6 game modes",
                "PDF, photo & Word doc upload",
                "AI word extraction",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "0.88em", color: "#999" }}>
                  <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/auth/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "13px",
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: "50px",
                color: "var(--text)",
                textDecoration: "none",
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1em",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              Start for Free
            </Link>
          </div>

          {/* Pro tier */}
          <div style={{
            background: "linear-gradient(140deg, rgba(108,92,231,0.18), rgba(0,206,201,0.08))",
            border: "1.5px solid rgba(108,92,231,0.45)",
            borderRadius: "22px",
            padding: "30px 26px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "4px",
              background: "linear-gradient(90deg, var(--primary), var(--secondary))",
            }} />

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.15em", color: "var(--secondary)" }}>
                Pro
              </span>
              <span style={{
                padding: "2px 10px",
                background: "rgba(108,92,231,0.2)",
                border: "1px solid rgba(108,92,231,0.4)",
                borderRadius: "20px",
                fontSize: "0.68em",
                color: "var(--primary)",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}>
                MOST POPULAR
              </span>
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "2.6em", color: "var(--text)", lineHeight: 1 }}>
              $1.99
            </div>
            <div style={{ color: "#888", fontSize: "0.85em", margin: "2px 0 2px" }}>/ month</div>
            <div style={{ color: "#555", fontSize: "0.78em", marginBottom: "26px" }}>or $19.99/year — save 16%</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginBottom: "26px" }}>
              {[
                "Unlimited quizzes",
                "All 6 game modes",
                "PDF, photo & Word doc upload",
                "AI word extraction",
                "Priority support",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "0.88em", color: "#999" }}>
                  <Check size={14} style={{ color: "var(--secondary)", flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <button
                onClick={() => startCheckout(MONTHLY_PRICE_ID, "monthly")}
                disabled={loadingPlan !== null}
                style={{
                  padding: "13px",
                  background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
                  color: "white",
                  border: "none",
                  borderRadius: "50px",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1em",
                  cursor: loadingPlan !== null ? "wait" : "pointer",
                  opacity: loadingPlan !== null ? 0.75 : 1,
                  transition: "transform 0.2s",
                  boxShadow: "0 3px 18px rgba(108,92,231,0.35)",
                }}
                onMouseEnter={(e) => { if (!loadingPlan) (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                {loadingPlan === "monthly" ? "Loading..." : "Upgrade — $1.99 / month"}
              </button>
              <button
                onClick={() => startCheckout(YEARLY_PRICE_ID, "yearly")}
                disabled={loadingPlan !== null}
                style={{
                  padding: "11px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#777",
                  borderRadius: "50px",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "0.88em",
                  cursor: loadingPlan !== null ? "wait" : "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#777"; }}
              >
                {loadingPlan === "yearly" ? "Loading..." : "$19.99 / year — save 16%"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px",
        textAlign: "center",
        color: "#444",
        fontSize: "0.82em",
      }}>
        Made with ❤️ for students and teachers everywhere
      </div>

    </main>
  );
}
