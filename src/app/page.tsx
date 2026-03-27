"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, Image, BookOpen, Zap, History } from "lucide-react";
import { savePending } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Extracting vocabulary...");

  const LOADING_MESSAGES = [
    "Reading your worksheet...",
    "Extracting vocabulary words...",
    "Generating example sentences...",
    "Building your quiz...",
    "Almost ready to blast!",
  ];

  const processFile = useCallback(async (file: File) => {
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

      const res = await fetch("/api/extract-vocab", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process file");
      }

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <main style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="font-fredoka text-5xl gradient-text animate-title-glow"
            style={{ fontFamily: "'Fredoka One', cursive" }}
          >
            Vocab Blaster!
          </h1>
          <p style={{ color: "#a0a0c0", marginTop: "8px", fontSize: "1.1em" }}>
            Upload a vocabulary worksheet. We'll turn it into a game.
          </p>
        </div>

        {/* Upload Zone */}
        {!isLoading ? (
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
                padding: "60px 40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s",
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: "4em", marginBottom: "16px" }}>
                {isDragging ? "📂" : "📋"}
              </div>
              <p style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5em",
                marginBottom: "8px",
                color: isDragging ? "var(--primary)" : "var(--text)"
              }}>
                {isDragging ? "Drop it here!" : "Drop your worksheet here"}
              </p>
              <p style={{ color: "#888", fontSize: "0.95em", marginBottom: "20px" }}>
                or click to browse files
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
                {[
                  { icon: FileText, label: "PDF" },
                  { icon: Image, label: "Photo" },
                  { icon: BookOpen, label: "Word Doc" },
                  { icon: FileText, label: "Text" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    color: "#888",
                    fontSize: "0.85em"
                  }}>
                    <Icon size={22} style={{ color: "var(--secondary)" }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {error && (
              <div style={{
                marginTop: "20px",
                padding: "16px 20px",
                background: "rgba(225,112,85,0.12)",
                border: "1px solid rgba(225,112,85,0.3)",
                borderRadius: "16px",
                color: "var(--danger)",
                fontWeight: 700,
              }} className="animate-fade-up">
                ⚠️ {error}
              </div>
            )}

            {/* Game mode previews */}
            <div style={{ marginTop: "40px" }}>
              <p style={{
                textAlign: "center",
                color: "#888",
                fontSize: "0.85em",
                textTransform: "uppercase",
                letterSpacing: "2px",
                marginBottom: "16px"
              }}>
                6 Game Modes Included
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}>
                {[
                  { icon: "🎯", name: "Classic Quiz" },
                  { icon: "🔄", name: "Reverse" },
                  { icon: "⌨️", name: "Spell It" },
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
                    <div style={{ fontSize: "1.6em" }}>{m.icon}</div>
                    <div style={{
                      fontSize: "0.78em",
                      fontWeight: 700,
                      marginTop: "4px",
                      color: "#ccc"
                    }}>{m.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* History link */}
            <div style={{ textAlign: "center", marginTop: "30px" }}>
              <Link href="/history" style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#888",
                textDecoration: "none",
                fontSize: "0.95em",
                fontWeight: 700,
                transition: "color 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
              >
                <History size={18} />
                View past quizzes
              </Link>
            </div>
          </>
        ) : (
          /* Loading state */
          <div style={{
            background: "rgba(26,26,46,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "60px 40px",
            textAlign: "center",
          }}>
            <div style={{ marginBottom: "24px" }}>
              <Zap
                size={52}
                style={{
                  color: "var(--accent)",
                  margin: "0 auto",
                  animation: "titleGlow 1s ease-in-out infinite alternate",
                }}
              />
            </div>
            <p style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.6em",
              marginBottom: "8px",
              color: "var(--accent)"
            }}>
              Loading...
            </p>
            <p style={{ color: "#a0a0c0", fontSize: "1em" }}>{loadingMsg}</p>

            {/* Animated dots */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginTop: "24px"
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  animation: `titleGlow 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
