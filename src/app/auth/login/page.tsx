"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Zap } from "lucide-react";

type Tab = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(next);
    });
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push(next);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email for a confirmation link, then sign in.");
        setTab("signin");
      }
    }

    setLoading(false);
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <Zap size={32} style={{ color: "var(--accent)" }} />
            <span style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "2em",
              background: "linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Vocab Blaster!
            </span>
          </div>
          <p style={{ color: "#888", fontSize: "0.95em" }}>
            {tab === "signin" ? "Sign in to access your quizzes" : "Create an account to get started"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Top bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "4px",
            background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
          }} />

          {/* Tabs */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "24px",
          }}>
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                style={{
                  padding: "10px",
                  border: "none",
                  borderRadius: "9px",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: tab === t ? "var(--primary)" : "transparent",
                  color: tab === t ? "white" : "#888",
                }}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Success message */}
          {success && (
            <div style={{
              marginBottom: "16px", padding: "12px 16px",
              background: "rgba(0,184,148,0.1)", border: "1px solid rgba(0,184,148,0.3)",
              borderRadius: "12px", color: "var(--success)", fontSize: "0.9em", fontWeight: 700,
            }}>
              ✅ {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              marginBottom: "16px", padding: "12px 16px",
              background: "rgba(225,112,85,0.1)", border: "1px solid rgba(225,112,85,0.3)",
              borderRadius: "12px", color: "var(--danger)", fontSize: "0.9em", fontWeight: 700,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8em", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8em", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={tab === "signup" ? "At least 6 characters" : "••••••••"}
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                minLength={6}
                style={fieldStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                padding: "14px",
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.1em",
                background: loading
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, var(--primary), #a855f7)",
                color: loading ? "#555" : "white",
                border: "none",
                borderRadius: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Please wait..." : tab === "signin" ? "Sign In →" : "Create Account →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: "1em",
  fontFamily: "'Nunito', sans-serif",
  background: "rgba(255,255,255,0.05)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "var(--text)",
  outline: "none",
};
