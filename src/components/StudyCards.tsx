"use client";

import { useState } from "react";
import type { QuizData } from "@/lib/types";

interface Props {
  quiz: QuizData;
  onBack: () => void;
}

export default function StudyCards({ quiz, onBack }: Props) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  const toggle = (word: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#888", fontSize: "1em", cursor: "pointer", padding: "8px 0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
      >
        ← Modes
      </button>

      <h2 style={{
        fontFamily: "'Fredoka One', cursive",
        margin: "10px 0 18px",
        textAlign: "center",
        fontSize: "1.4em",
        color: "var(--text)"
      }}>
        📖 Tap a card to reveal the definition
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {quiz.words.map((v) => {
          const isOpen = openCards.has(v.word);
          return (
            <div
              key={v.word}
              onClick={() => toggle(v.word)}
              style={{
                background: "var(--card)",
                border: `1px solid ${isOpen ? "rgba(108,92,231,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "18px",
                padding: "20px 24px",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.transform = "translateX(5px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isOpen ? "rgba(108,92,231,0.4)" : "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1.3em",
                  color: "var(--secondary)",
                }}>
                  {v.word}
                </span>
                <span style={{
                  fontSize: "0.8em",
                  color: "var(--primary)",
                  fontWeight: 700,
                  marginLeft: "6px",
                }}>
                  ({v.pos})
                </span>
                <span style={{ marginLeft: "auto", color: "#555", fontSize: "1em" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {isOpen && (
                <div className="animate-fade-up" style={{ marginTop: "10px" }}>
                  <div style={{ color: "#ccc", lineHeight: 1.5 }}>{v.def}</div>
                  <div style={{ marginTop: "8px", fontSize: "0.85em" }}>
                    <span style={{ color: "#666" }}>Root: </span>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>{v.root}</span>
                  </div>
                  {v.sentences?.[0] && (
                    <div style={{
                      marginTop: "10px",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: "10px",
                      fontSize: "0.9em",
                      color: "#a0a0c0",
                      fontStyle: "italic",
                    }}>
                      {v.sentences[0]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
