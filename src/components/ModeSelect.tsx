"use client";

import type { GameMode } from "@/lib/types";
import { getStats } from "@/lib/storage";
import { useEffect, useState } from "react";

const MODES: { id: GameMode; icon: string; name: string; desc: string }[] = [
  { id: "classic", icon: "🎯", name: "Classic Quiz", desc: "Pick the right definition" },
  { id: "reverse", icon: "🔄", name: "Reverse", desc: "Definition → find the word" },
  { id: "spell", icon: "📝", name: "Fill in the Blank", desc: "Pick the word that fits the sentence" },
  { id: "match", icon: "🧩", name: "Match Up", desc: "Pair words with definitions" },
  { id: "speed", icon: "⚡", name: "Speed Round", desc: "Beat the clock!" },
  { id: "study", icon: "📖", name: "Study Cards", desc: "Review all words first" },
];

interface Props {
  onSelect: (mode: GameMode) => void;
  wordCount: number;
}

export default function ModeSelect({ onSelect, wordCount }: Props) {
  const [stats, setStats] = useState({ streak: 0, bestScore: 0, gamesPlayed: 0 });

  useEffect(() => {
    setStats(getStats());
  }, []);

  return (
    <>
      {/* Stats bar */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        margin: "15px 0 25px",
        flexWrap: "wrap",
      }}>
        {[
          { label: "Streak", value: stats.streak, color: "var(--accent)" },
          { label: "Best", value: `${stats.bestScore}%`, color: "var(--success)" },
          { label: "Played", value: stats.gamesPlayed, color: "var(--secondary)" },
          { label: "Words", value: wordCount, color: "var(--primary)" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--card)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "12px 22px",
            textAlign: "center",
            minWidth: "90px",
          }}>
            <div style={{ fontSize: "0.72em", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
              {s.label}
            </div>
            <div style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.8em",
              color: s.color,
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Mode grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "15px",
      }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              background: "var(--card)",
              border: "2px solid rgba(255,255,255,0.06)",
              borderRadius: "20px",
              padding: "24px 18px",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.3s",
              color: "var(--text)",
              fontFamily: "'Nunito', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(108,92,231,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "2.4em", marginBottom: "8px" }}>{m.icon}</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.2em" }}>{m.name}</div>
            <div style={{ fontSize: "0.8em", color: "#888", marginTop: "4px" }}>{m.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
