"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuiz } from "@/lib/supabase/quizzes";
import type { QuizData, GameMode } from "@/lib/types";
import ModeSelect from "@/components/ModeSelect";
import ClassicQuiz from "@/components/ClassicQuiz";
import FillBlank from "@/components/FillBlank";
import MatchUp from "@/components/MatchUp";
import StudyCards from "@/components/StudyCards";
import UserNav from "@/components/UserNav";
import { isSoundMuted, setSoundMuted } from "@/lib/sounds";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSoundMuted());
  }, []);

  useEffect(() => {
    const id = params.id as string;
    getQuiz(id).then((data) => {
      if (!data) { router.push("/history"); return; }
      setQuiz(data);
    }).catch(() => router.push("/history"));
  }, [params.id, router]);

  const handleSelectMode = (m: GameMode) => {
    setMode(m);
    setGameKey((k) => k + 1);
  };

  const handleBack = () => setMode(null);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  if (!quiz) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#888" }}>Loading quiz...</p>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
        <UserNav rightExtra={
          <button
            onClick={toggleMute}
            title={muted ? "Unmute sounds" : "Mute sounds"}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "7px 10px",
              color: muted ? "#555" : "var(--secondary)",
              cursor: "pointer",
              fontSize: "1em",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        } />

        {/* Header */}
        <div style={{ textAlign: "center", padding: "30px 0 20px" }}>
          <h1
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "2.8em",
              background: "linear-gradient(135deg, var(--primary), var(--secondary), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            className="animate-title-glow"
          >
            Vocab Blaster!
          </h1>
          <p style={{ color: "#a0a0c0", fontSize: "1.05em", marginTop: "5px" }}>
            Master your roots. Crush the test.
          </p>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            padding: "6px 18px",
            borderRadius: "30px",
            fontWeight: 900,
            fontSize: "0.95em",
            marginTop: "12px",
            letterSpacing: "1px",
          }}>
            {quiz.title}
          </div>
        </div>

        {/* Game area */}
        {!mode || mode === "study" ? (
          <>
            {mode === "study" ? (
              <StudyCards key={gameKey} quiz={quiz} onBack={handleBack} />
            ) : (
              <ModeSelect onSelect={handleSelectMode} wordCount={quiz.words.length} />
            )}
          </>
        ) : mode === "match" ? (
          <MatchUp key={gameKey} quiz={quiz} onBack={handleBack} onReplay={() => handleSelectMode("match")} />
        ) : mode === "spell" ? (
          <FillBlank key={gameKey} quiz={quiz} onBack={handleBack} onReplay={() => handleSelectMode("spell")} />
        ) : (
          <ClassicQuiz key={gameKey} quiz={quiz} mode={mode} onBack={handleBack} onReplay={() => handleSelectMode(mode)} />
        )}
      </div>
    </main>
  );
}
