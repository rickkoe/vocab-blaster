"use client";

import { useEffect } from "react";
import type { GameResult, VocabWord } from "@/lib/types";
import { scoreEmoji } from "@/lib/utils";
import { updateStats } from "@/lib/storage";
import { playCelebration } from "@/lib/sounds";

interface Props {
  result: GameResult;
  onPlayAgain: () => void;
  onBack: () => void;
  missedWords?: VocabWord[];
  onPracticeMissed?: (words: VocabWord[]) => void;
}

function launchConfetti() {
  if (typeof window === "undefined") return;
  import("canvas-confetti").then((mod) => {
    const confetti = mod.default;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 } }), 400);
  });
}

export default function Results({ result, onPlayAgain, onBack, missedWords, onPracticeMissed }: Props) {
  const pct = Math.round((result.correct / result.total) * 100);
  const { emoji, title } = scoreEmoji(pct);

  useEffect(() => {
    updateStats(pct, result.bestStreak);
    if (pct >= 80) {
      launchConfetti();
      playCelebration();
    }
  }, [pct, result.bestStreak]);

  return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
    }} className="animate-fade-up">
      <div style={{ fontSize: "4em", marginBottom: "15px" }}>{emoji}</div>
      <div style={{
        fontFamily: "'Fredoka One', cursive",
        fontSize: "2.2em",
        background: "linear-gradient(135deg, var(--primary), var(--secondary))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        marginBottom: "5px",
      }}>
        {title}
      </div>
      <div style={{ fontSize: "1.3em", color: "#a0a0c0", marginBottom: "25px" }}>
        You scored <strong style={{ color: "var(--accent)" }}>{pct}%</strong> — {result.correct} of {result.total} correct
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "12px",
        margin: "20px 0",
      }}>
        <div style={{
          background: "var(--card)",
          borderRadius: "16px",
          padding: "18px",
        }}>
          <div style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "2em",
            color: "var(--success)"
          }}>{result.correct}</div>
          <div style={{ fontSize: "0.8em", color: "#888" }}>Correct</div>
        </div>
        <div style={{
          background: "var(--card)",
          borderRadius: "16px",
          padding: "18px",
        }}>
          <div style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "2em",
            color: "var(--danger)"
          }}>{result.wrong}</div>
          <div style={{ fontSize: "0.8em", color: "#888" }}>Wrong</div>
        </div>
        <div style={{
          background: "var(--card)",
          borderRadius: "16px",
          padding: "18px",
        }}>
          <div style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "2em",
            color: "var(--accent)"
          }}>{result.bestStreak}</div>
          <div style={{ fontSize: "0.8em", color: "#888" }}>Best Streak</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "25px" }}>
        {missedWords && missedWords.length > 0 && onPracticeMissed && (
          <button
            onClick={() => onPracticeMissed(missedWords)}
            style={{
              padding: "16px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1em",
              background: "linear-gradient(135deg, var(--danger), #e17055aa)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Practice {missedWords.length} Missed →
          </button>
        )}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onPlayAgain}
            style={{
              padding: "16px 40px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.2em",
              background: "linear-gradient(135deg, var(--secondary), #00b894)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Play Again
          </button>
          <button
            onClick={onBack}
            style={{
              padding: "16px 30px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1em",
              background: "rgba(255,255,255,0.06)",
              color: "var(--text)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            Choose Mode
          </button>
        </div>
      </div>
    </div>
  );
}
