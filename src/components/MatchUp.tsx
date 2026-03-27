"use client";

import { useState } from "react";
import type { QuizData, GameResult } from "@/lib/types";
import { pickRandom, shuffle } from "@/lib/utils";
import { playCorrect, playWrong, playStreak } from "@/lib/sounds";
import Results from "./Results";

interface Props {
  quiz: QuizData;
  onBack: () => void;
  onReplay: () => void;
}

type TileState = "default" | "selected" | "matched" | "wrong";

interface Tile {
  id: string;
  word: string;
  text: string;
  kind: "word" | "def";
  state: TileState;
}

function buildRound(quiz: QuizData): Tile[] {
  const chosen = pickRandom(quiz.words, Math.min(5, quiz.words.length));
  const wordTiles: Tile[] = chosen.map((v) => ({
    id: `w-${v.word}`,
    word: v.word,
    text: v.word,
    kind: "word",
    state: "default",
  }));
  const defTiles: Tile[] = chosen.map((v) => ({
    id: `d-${v.word}`,
    word: v.word,
    text: v.short || v.def,
    kind: "def",
    state: "default",
  }));
  return shuffle([...wordTiles, ...defTiles]);
}

export default function MatchUp({ quiz, onBack, onReplay }: Props) {
  const [round, setRound] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>(() => buildRound(quiz));
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  const totalPairs = Math.min(5, quiz.words.length);
  const totalRounds = Math.ceil(quiz.words.length / 5);

  const handleTileClick = (tile: Tile) => {
    if (tile.state === "matched" || tile.state === "wrong") return;

    if (!selected) {
      setSelected(tile);
      setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, state: "selected" } : t));
      return;
    }

    if (selected.id === tile.id) {
      // Deselect
      setSelected(null);
      setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, state: "default" } : t));
      return;
    }

    // Check match
    const isMatch = selected.word === tile.word && selected.kind !== tile.kind;

    if (isMatch) {
      const newMatchedCount = matchedCount + 1;
      const newScore = score + 1;
      const newStreak = streak + 1;
      const newBestStreak = Math.max(bestStreak, newStreak);
      if (newStreak >= 3) playStreak(); else playCorrect();

      setMatchedCount(newMatchedCount);
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak(newBestStreak);
      setSelected(null);
      setTiles((prev) => prev.map((t) =>
        t.id === selected.id || t.id === tile.id ? { ...t, state: "matched" } : t
      ));

      if (newMatchedCount >= totalPairs) {
        // Round complete
        if (round >= totalRounds) {
          setResult({ correct: newScore, wrong, bestStreak: newBestStreak, total: totalPairs * totalRounds, mode: "match" });
        } else {
          setTimeout(() => {
            setRound((r) => r + 1);
            setTiles(buildRound(quiz));
            setMatchedCount(0);
            setSelected(null);
          }, 600);
        }
      }
    } else {
      const newWrong = wrong + 1;
      const newStreak = 0;
      setWrong(newWrong);
      setStreak(newStreak);
      playWrong();
      setSelected(null);

      // Flash wrong state then reset
      setTiles((prev) => prev.map((t) =>
        t.id === selected.id || t.id === tile.id ? { ...t, state: "wrong" } : t
      ));
      setTimeout(() => {
        setTiles((prev) => prev.map((t) =>
          (t.id === selected.id || t.id === tile.id) && t.state === "wrong" ? { ...t, state: "default" } : t
        ));
      }, 500);
    }
  };

  if (result) {
    return <Results result={result} onPlayAgain={onReplay} onBack={onBack} />;
  }

  const tileStyle = (tile: Tile): React.CSSProperties => {
    const base: React.CSSProperties = {
      background: "rgba(255,255,255,0.04)",
      border: "2px solid rgba(255,255,255,0.1)",
      borderRadius: "14px",
      padding: "16px 14px",
      cursor: "pointer",
      transition: "all 0.3s",
      fontSize: "0.93em",
      textAlign: "center",
      minHeight: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text)",
      fontFamily: "'Nunito', sans-serif",
      fontWeight: tile.kind === "word" ? 900 : 400,
    };

    if (tile.state === "selected") {
      return { ...base, border: "2px solid var(--accent)", background: "rgba(253,203,110,0.15)" };
    }
    if (tile.state === "matched") {
      return { ...base, border: "2px solid var(--success)", background: "rgba(0,184,148,0.1)", opacity: 0.6, pointerEvents: "none" };
    }
    if (tile.state === "wrong") {
      return { ...base, border: "2px solid var(--danger)" };
    }
    return base;
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#888", fontSize: "1em", cursor: "pointer", padding: "8px 0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
      >
        ← Games
      </button>

      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", margin: "12px 0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(matchedCount / totalPairs) * 100}%`, background: "linear-gradient(90deg, var(--primary), var(--secondary))", borderRadius: "10px", transition: "width 0.5s ease" }} />
      </div>

      <div style={{
        background: "var(--card)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "30px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))" }} />

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "0.85em", color: "var(--secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
            🧩 Match Up — Round {round} of {totalRounds}
          </div>
          <div style={{ color: "#888", fontSize: "0.9em" }}>
            Match the words to their definitions!
            {" "}{matchedCount}/{totalPairs} matched
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}>
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              className={tile.state === "wrong" ? "animate-shake" : ""}
              style={tileStyle(tile)}
              onMouseEnter={(e) => {
                if (tile.state === "default") {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.background = "rgba(108,92,231,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (tile.state === "default") {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }
              }}
            >
              <span style={{ color: tile.kind === "word" ? "var(--secondary)" : "#ccc" }}>
                {tile.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
