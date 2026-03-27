"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, BookOpen, Zap, Camera, Plus, X, ArrowRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getUsageStatus, FREE_MONTHLY_LIMIT } from "@/lib/supabase/billing";
import { savePending } from "@/lib/storage";
import LandingPage from "@/components/LandingPage";
import UpgradeModal from "@/components/UpgradeModal";
import UserNav from "@/components/UserNav";

interface StagedPage {
  file: File;
  previewUrl: string;
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPageInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Reading your worksheet...");
  const [stagedPages, setStagedPages] = useState<StagedPage[]>([]);

  // Auth + billing state
  // undefined = still checking, null = not logged in, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        getUsageStatus().then((s) => setMonthlyCount(s.monthlyCount));
      }
    });
  }, []);

  const LOADING_MESSAGES = [
    "Reading your worksheet...",
    "Extracting vocabulary words...",
    "Generating example sentences...",
    "Building your quiz...",
    "Almost ready to blast!",
  ];

  // Process a single non-image file (PDF, doc, txt) immediately
  const processSingleFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    setLoadingMsg(LOADING_MESSAGES[0]);
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-vocab", { method: "POST", body: formData });
      const data = await res.json();
      if (res.status === 402 && data.upgradeRequired) {
        setIsLoading(false);
        setUpgradeRequired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to process file");
      savePending({
        title: data.title || "Vocabulary Quiz",
        rootInfo: data.rootInfo || "",
        words: data.words,
        sourceFileName: file.name,
      });
      router.push("/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    } finally {
      clearInterval(msgTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Submit all staged image pages together
  const submitPages = useCallback(async () => {
    if (stagedPages.length === 0) return;
    setError(null);
    setIsLoading(true);
    setLoadingMsg(LOADING_MESSAGES[0]);
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    try {
      const formData = new FormData();
      stagedPages.forEach((p) => formData.append("files", p.file));
      const res = await fetch("/api/extract-vocab", { method: "POST", body: formData });
      const data = await res.json();
      if (res.status === 402 && data.upgradeRequired) {
        setIsLoading(false);
        setUpgradeRequired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to process file");
      savePending({
        title: data.title || "Vocabulary Quiz",
        rootInfo: data.rootInfo || "",
        words: data.words,
        sourceFileName: stagedPages.map((p) => p.file.name).join(", "),
      });
      // Clean up preview URLs
      stagedPages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      router.push("/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    } finally {
      clearInterval(msgTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedPages, router]);

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Detect HEIC/HEIF before staging — these can't be processed
    const heicFile = files.find(
      (f) =>
        f.type === "image/heic" ||
        f.type === "image/heif" ||
        f.name.toLowerCase().endsWith(".heic") ||
        f.name.toLowerCase().endsWith(".heif"),
    );
    if (heicFile) {
      setError(
        'Your photo is in HEIC format, which can\'t be processed. On your iPhone go to Settings → Camera → Formats and choose "Most Compatible", then try again.',
      );
      return;
    }

    const images = files.filter((f) => f.type.startsWith("image/") || f.type === "");
    const nonImages = files.filter((f) => !f.type.startsWith("image/") && f.type !== "");

    // Non-images (PDF/doc/txt): process the first one immediately
    if (nonImages.length > 0) {
      processSingleFile(nonImages[0]);
      return;
    }

    // Images: add to staging area
    const newPages: StagedPage[] = images.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setStagedPages((prev) => [...prev, ...newPages]);
  }, [processSingleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = ""; // reset so same file can be re-added
  };

  const removePage = (index: number) => {
    setStagedPages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearStaged = () => {
    stagedPages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setStagedPages([]);
    setError(null);
  };

  // ── Auth gate ────────────────────────────────────────────────
  // Still loading auth state — show nothing to avoid flash
  if (user === undefined) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  // Not logged in — show marketing landing page
  if (user === null) {
    return <LandingPage />;
  }

  // ── Logged-in upload UI ──────────────────────────────────────

  const quizzesLeft = Math.max(0, FREE_MONTHLY_LIMIT - monthlyCount);

  return (
    <main style={{ minHeight: "100vh" }}>
      {upgradeRequired && (
        <UpgradeModal
          monthlyCount={monthlyCount}
          onClose={() => setUpgradeRequired(false)}
        />
      )}

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px 20px 40px" }}>
        <UserNav />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "36px", marginTop: "20px" }}>
          <h1
            className="animate-title-glow"
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "2.8em",
              background: "linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Vocab Blaster!
          </h1>
          <p style={{ color: "#a0a0c0", marginTop: "8px", fontSize: "1.1em" }}>
            Upload a vocabulary worksheet. We&apos;ll turn it into a game.
          </p>

          {/* Quota badge */}
          <div style={{ marginTop: "10px" }}>
            {monthlyCount >= FREE_MONTHLY_LIMIT ? (
              <button
                onClick={() => setUpgradeRequired(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "4px 14px",
                  background: "rgba(225,112,85,0.1)", border: "1px solid rgba(225,112,85,0.3)",
                  borderRadius: "20px", fontSize: "0.8em", color: "var(--danger)",
                  cursor: "pointer", fontWeight: 700,
                }}
              >
                ⚠️ Free limit reached — Upgrade for unlimited
              </button>
            ) : (
              <span style={{
                display: "inline-block", padding: "4px 14px",
                background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)",
                borderRadius: "20px", fontSize: "0.78em", color: "#888",
              }}>
                {quizzesLeft} free quiz{quizzesLeft !== 1 ? "zes" : ""} left this month
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingCard msg={loadingMsg} />
        ) : stagedPages.length > 0 ? (
          /* ── Staging area ── */
          <StagingArea
            pages={stagedPages}
            error={error}
            onRemove={removePage}
            onAddMore={() => addPageInputRef.current?.click()}
            onClear={clearStaged}
            onSubmit={submitPages}
          />
        ) : (
          /* ── Initial drop zone ── */
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                background: isDragging ? "rgba(108,92,231,0.15)" : "rgba(26,26,46,0.9)",
                border: `3px dashed ${isDragging ? "var(--primary)" : "rgba(255,255,255,0.15)"}`,
                borderRadius: "24px",
                padding: "50px 40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s",
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: "3.5em", marginBottom: "14px" }}>
                {isDragging ? "📂" : "📋"}
              </div>
              <p style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5em",
                marginBottom: "6px",
                color: isDragging ? "var(--primary)" : "var(--text)",
              }}>
                {isDragging ? "Drop it here!" : "Drop your worksheet here"}
              </p>
              <p style={{ color: "#888", fontSize: "0.9em", marginBottom: "24px" }}>
                PDF, Word doc, or photo — or click to browse
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
                {[
                  { icon: FileText, label: "PDF" },
                  { icon: FileText, label: "Word Doc" },
                  { icon: BookOpen, label: "Text" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "#888", fontSize: "0.85em" }}>
                    <Icon size={20} style={{ color: "var(--secondary)" }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Camera / photo option — prominent on mobile */}
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={() => addPageInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: "rgba(0,206,201,0.08)",
                  border: "2px solid rgba(0,206,201,0.2)",
                  borderRadius: "18px",
                  color: "var(--secondary)",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,206,201,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,206,201,0.08)"; }}
              >
                <Camera size={20} />
                Take / Add Photos
              </button>
            </div>

            <p style={{ textAlign: "center", color: "#555", fontSize: "0.8em", marginTop: "8px" }}>
              Multi-page worksheet? Take one photo per page — you can add more before submitting.
            </p>

            {error && <ErrorBanner msg={error} />}

            {/* Game mode grid */}
            <div style={{ marginTop: "36px" }}>
              <p style={{ textAlign: "center", color: "#666", fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "14px" }}>
                6 Game Modes Included
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {[
                  { icon: "🎯", name: "Classic Quiz" },
                  { icon: "🔄", name: "Reverse" },
                  { icon: "📝", name: "Fill in Blank" },
                  { icon: "🧩", name: "Match Up" },
                  { icon: "⚡", name: "Speed Round" },
                  { icon: "📖", name: "Study Cards" },
                ].map((m) => (
                  <div key={m.name} style={{
                    background: "rgba(26,26,46,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px",
                    padding: "14px 10px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "1.5em" }}>{m.icon}</div>
                    <div style={{ fontSize: "0.78em", fontWeight: 700, marginTop: "4px", color: "#ccc" }}>{m.name}</div>
                  </div>
                ))}
              </div>
            </div>

          </>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {/* Image/camera input — supports multiple, camera capture on mobile */}
        <input
          ref={addPageInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StagingArea({ pages, error, onRemove, onAddMore, onClear, onSubmit }: {
  pages: StagedPage[];
  error: string | null;
  onRemove: (i: number) => void;
  onAddMore: () => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <div style={{
        background: "var(--card)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
        }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.2em", color: "var(--secondary)" }}>
              📸 {pages.length} page{pages.length !== 1 ? "s" : ""} ready
            </p>
            <p style={{ fontSize: "0.82em", color: "#666", marginTop: "2px" }}>
              Add more pages or extract when done
            </p>
          </div>
          <button onClick={onClear} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "4px" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thumbnails */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", marginBottom: "18px" }}>
          {pages.map((p, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "3/4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt={`Page ${i + 1}`}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <div style={{
                position: "absolute", bottom: "4px", left: "4px",
                background: "rgba(0,0,0,0.65)", color: "#fff",
                fontSize: "0.7em", fontWeight: 700,
                padding: "2px 7px", borderRadius: "6px",
              }}>
                pg {i + 1}
              </div>
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: "absolute", top: "4px", right: "4px",
                  background: "rgba(0,0,0,0.65)", border: "none",
                  color: "#fff", width: "22px", height: "22px",
                  borderRadius: "50%", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7em",
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add page tile */}
          <button
            onClick={onAddMore}
            style={{
              aspectRatio: "3/4",
              background: "rgba(108,92,231,0.06)",
              border: "2px dashed rgba(108,92,231,0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "4px", color: "var(--primary)",
              transition: "all 0.2s",
              minHeight: "80px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
          >
            <Plus size={20} />
            <span style={{ fontSize: "0.72em", fontWeight: 700 }}>Add page</span>
          </button>
        </div>

        {error && <ErrorBanner msg={error} />}

        <button
          onClick={onSubmit}
          style={{
            width: "100%",
            padding: "16px",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1.15em",
            background: "linear-gradient(135deg, var(--success), #00cec9)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.2s",
            boxShadow: "0 4px 20px rgba(0,184,148,0.3)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Extract Vocabulary <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

function LoadingCard({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "rgba(26,26,46,0.9)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "24px",
      padding: "60px 40px",
      textAlign: "center",
    }}>
      <Zap size={52} style={{ color: "var(--accent)", margin: "0 auto 20px", display: "block", animation: "titleGlow 1s ease-in-out infinite alternate" }} />
      <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.6em", marginBottom: "8px", color: "var(--accent)" }}>
        Loading...
      </p>
      <p style={{ color: "#a0a0c0", fontSize: "1em" }}>{msg}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: "var(--primary)",
            animation: `titleGlow 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      marginTop: "16px", padding: "14px 18px",
      background: "rgba(225,112,85,0.12)",
      border: "1px solid rgba(225,112,85,0.3)",
      borderRadius: "14px",
      color: "var(--danger)", fontWeight: 700, fontSize: "0.9em",
    }} className="animate-fade-up">
      ⚠️ {msg}
    </div>
  );
}
