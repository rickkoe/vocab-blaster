"use client";

import { useState, useEffect, useRef } from "react";
import type { QuizData, GameResult } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import Results from "./Results";

interface Props {
  quiz: QuizData;
  onBack: () => void;
  onReplay: () => void;
}

export default function SpellIt({ quiz, onBack, onReplay }: Props) {
  const [questions] = useState(() => shuffle(quiz.words));
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (answered === null) inputRef.current?.focus();
  }, [currentQ, answered]);

  const submit = () => {
    if (answered !== null || input.trim() === "") return;
    const q = questions[currentQ];
    const isCorrect = input.trim().toLowerCase() === q.word.toLowerCase();

    setAnswered(isCorrect ? "correct" : "wrong");

    let newScore = score;
    let newWrong = wrong;
    let newStreak = streak;
    let newBestStreak = bestStreak;

    if (isCorrect) {
      newScore += 1;
      newStreak += 1;
      if (newStreak > newBestStreak) newBestStreak = newStreak;
    } else {
      newWrong += 1;
      newStreak = 0;
    }

    setScore(newScore);
    setWrong(newWrong);
    setStreak(newStreak);
    setBestStreak(newBestStreak);

    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        setResult({
          correct: newScore,
          wrong: newWrong,
          bestStreak: newBestStreak,
          total: questions.length,
          mode: "spell",
        });
      } else {
        setCurrentQ((q) => q + 1);
        setInput("");
        setAnswered(null);
      }
    }, 1400);
  };

  if (result) {
    return <Results result={result} onPlayAgain={onReplay} onBack={onBack} />;
  }

  const q = questions[currentQ];
  const sentence = q.sentences?.[Math.floor(Math.random() * (q.sentences?.length ?? 1))] ?? `Definition: ${q.def}`;
  const hint = q.word[0] + " _ ".repeat(q.word.length - 1).trim();
  const progress = (currentQ / questions.length) * 100;

  let inputBorder = "2px solid rgba(255,255,255,0.15)";
  let inputBg = "rgba(255,255,255,0.05)";
  if (answered === "correct") { inputBorder = "2px solid var(--success)"; inputBg = "rgba(0,184,148,0.1)"; }
  if (answered === "wrong") { inputBorder = "2px solid var(--danger)"; inputBg = "rgba(225,112,85,0.1)"; }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#888", fontSize: "1em", cursor: "pointer", padding: "8px 0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
      >
        ← Back to modes
      </button>

      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", margin: "12px 0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--primary), var(--secondary))", borderRadius: "10px", transition: "width 0.5s ease" }} />
      </div>

      <div style={{
        background: "var(--card)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "35px 30px",
        margin: "8px 0",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))" }} />

        <div style={{ fontSize: "0.85em", color: "var(--secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>
          ⌨️ Spell It — Question {currentQ + 1} of {questions.length}
        </div>

        <div style={{ fontSize: "0.9em", color: "#a0a0c0", fontStyle: "italic", marginBottom: "8px" }}>
          Type the missing word!
        </div>

        <div style={{ fontSize: "1.45em", fontWeight: 900, margin: "10px 0", lineHeight: 1.4 }}>
          {sentence}
        </div>

        <div style={{ display: "inline-block", background: "rgba(108,92,231,0.2)", color: "var(--primary)", padding: "3px 14px", borderRadius: "20px", fontSize: "0.8em", fontWeight: 700, marginBottom: "20px" }}>
          {q.pos}
        </div>

        <div style={{ position: "relative", marginTop: "10px" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            disabled={answered !== null}
            placeholder="Type your answer..."
            autoComplete="off"
            autoCapitalize="off"
            style={{
              width: "100%",
              padding: "18px 24px",
              fontSize: "1.3em",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              background: inputBg,
              border: inputBorder,
              borderRadius: "16px",
              color: "var(--text)",
              textAlign: "center",
              outline: "none",
              transition: "border-color 0.3s",
            }}
          />
        </div>

        <div style={{ marginTop: "10px", color: "#888", fontSize: "0.9em" }}>
          Hint: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{hint}</span>
          {" "}({q.word.length} letters) — Root: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{q.root}</span>
        </div>

        {answered !== null && (
          <div style={{
            marginTop: "16px",
            padding: "16px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            fontSize: "1.1em",
            background: answered === "correct" ? "rgba(0,184,148,0.12)" : "rgba(225,112,85,0.12)",
            color: answered === "correct" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${answered === "correct" ? "rgba(0,184,148,0.3)" : "rgba(225,112,85,0.3)"}`,
          }} className="animate-fade-up">
            {answered === "correct" ? "✅ Correct!" : `❌ The word was: "${q.word}"`}
          </div>
        )}

        {answered === null && (
          <button
            onClick={submit}
            style={{
              marginTop: "18px",
              padding: "14px 40px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1em",
              background: "linear-gradient(135deg, var(--primary), #a855f7)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Submit →
          </button>
        )}

        {streak >= 2 && (
          <div style={{ marginTop: "10px", color: "var(--accent)", fontWeight: 700, fontSize: "0.9em" }}>
            🔥 {streak} streak!
          </div>
        )}
      </div>
    </div>
  );
}
