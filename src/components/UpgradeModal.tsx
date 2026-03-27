"use client";

import { useState } from "react";
import { X, Zap, Check } from "lucide-react";

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_ID ?? "";
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY_ID ?? "";

interface Props {
  monthlyCount: number;
  onClose: () => void;
}

export default function UpgradeModal({ monthlyCount, onClose }: Props) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const startCheckout = async (priceId: string, plan: "monthly" | "yearly") => {
    if (!priceId) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1.5px solid rgba(108,92,231,0.45)",
          borderRadius: "24px",
          padding: "34px 28px",
          maxWidth: "400px",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
        className="animate-fade-up"
      >
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "4px",
          background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
        }} />

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "8px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <Zap
            size={42}
            style={{
              color: "var(--accent)",
              margin: "0 auto 14px",
              display: "block",
              filter: "drop-shadow(0 0 12px rgba(253,203,110,0.5))",
            }}
          />
          <h2 style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1.55em",
            color: "var(--text)",
            marginBottom: "10px",
          }}>
            Monthly Limit Reached
          </h2>
          <p style={{ color: "#a0a0c0", fontSize: "0.9em", lineHeight: 1.55 }}>
            You&apos;ve used <strong style={{ color: "var(--text)" }}>{monthlyCount} of 5</strong> free quizzes this month.
            Upgrade to Pro for unlimited access.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {[
            "Unlimited quizzes every month",
            "All 6 game modes",
            "Cancel anytime",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "0.88em", color: "#a0a0c0" }}>
              <Check size={14} style={{ color: "var(--secondary)", flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
          <button
            onClick={() => startCheckout(MONTHLY_PRICE_ID, "monthly")}
            disabled={loading !== null}
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.05em",
              cursor: loading !== null ? "wait" : "pointer",
              opacity: loading !== null ? 0.75 : 1,
              transition: "transform 0.2s",
              boxShadow: "0 3px 18px rgba(108,92,231,0.35)",
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            {loading === "monthly" ? "Redirecting..." : "Upgrade — $1.99 / month"}
          </button>
          <button
            onClick={() => startCheckout(YEARLY_PRICE_ID, "yearly")}
            disabled={loading !== null}
            style={{
              padding: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#777",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.9em",
              cursor: loading !== null ? "wait" : "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#777"; }}
          >
            {loading === "yearly" ? "Redirecting..." : "$19.99 / year — save 37%"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px",
              background: "none",
              border: "none",
              color: "#444",
              cursor: "pointer",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.88em",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#777"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#444"; }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
