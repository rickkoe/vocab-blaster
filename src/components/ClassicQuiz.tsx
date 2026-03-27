"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QuizData, GameMode, GameResult } from "@/lib/types";
import { shuffle, pickRandom } from "@/lib/utils";
import { playCorrect, playWrong, playStreak, playTimerWarning } from "@/lib/sounds";
import Results from "./Results";

interface Question {
  word: string;
  pos: string;
  prompt: string;
  context: string;
  answer: string;
  options: string[];
}

interface Props {
  quiz: QuizData;
  mode: Exclude<GameMode, "match" | "spell" | "study">;
  onBack: () => void;
  onReplay: () => void;
}

function buildQuestion(quiz: QuizData, mode: Props["mode"]): Question[] {
  return shuffle(quiz.words).map((v) => {
    if (mode === "classic" || mode === "speed") {
      const wrong = pickRandom(quiz.words.filter((x) => x.word !== v.word), 3).map((x) => x.def);
      return {
        word: v.word,
        pos: v.pos,
        prompt: v.word,
        context: v.sentences?.[Math.floor(Math.random() * (v.sentences?.length ?? 1))] ?? "",
        answer: v.def,
        options: shuffle([v.def, ...wrong]),
      };
    } else {
      // reverse
      const wrong = pickRandom(quiz.words.filter((x) => x.word !== v.word), 3).map((x) => x.word);
      return {
        word: v.word,
        pos: v.pos,
        prompt: v.def,
        context: "Which word matches this definition?",
        answer: v.word,
        options: shuffle([v.word, ...wrong]),
      };
    }
  });
}

export default function ClassicQuiz({ quiz, mode, onBack, onReplay }: Props) {
  const [questions] = useState(() => buildQuestion(quiz, mode));
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(8000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const warnedRef = useRef(false); // tracks whether timer warning has fired this question
  const isSpeed = mode === "speed";

  const endGame = useCallback((finalScore: number, finalWrong: number, finalBestStreak: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResult({
      correct: finalScore,
      wrong: finalWrong,
      bestStreak: finalBestStreak,
      total: questions.length,
      mode,
    });
  }, [questions.length, mode]);

  const handleAnswer = useCallback((opt: string, currentScore: number, currentWrong: number, currentStreak: number, currentBestStreak: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const q = questions[currentQ];
    const isCorrect = opt === q.answer;
    setAnswered(opt);

    let newScore = currentScore;
    let newWrong = currentWrong;
    let newStreak = currentStreak;
    let newBestStreak = currentBestStreak;

    if (isCorrect) {
      newScore += 1;
      newStreak += 1;
      if (newStreak > newBestStreak) newBestStreak = newStreak;
      setFeedback({ text: "✅ Correct!", correct: true });
      if (newStreak >= 3) playStreak(); else playCorrect();
    } else {
      newWrong += 1;
      newStreak = 0;
      setFeedback({ text: `❌ The answer was: "${q.answer}"`, correct: false });
      playWrong();
    }

    setScore(newScore);
    setWrong(newWrong);
    setStreak(newStreak);
    setBestStreak(newBestStreak);

    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        endGame(newScore, newWrong, newBestStreak);
      } else {
        setCurrentQ((q) => q + 1);
        setAnswered(null);
        setFeedback(null);
        setTimeLeft(8000);
      }
    }, 1200);
  }, [currentQ, questions, endGame]);

  // Speed timer
  useEffect(() => {
    if (!isSpeed || answered !== null || result !== null) return;

    lastTickRef.current = Date.now();
    warnedRef.current = false;
    setTimeLeft(8000);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimeLeft((prev) => {
        const next = prev - elapsed;
        // Play warning once when under 2 seconds
        if (next <= 2000 && prev > 2000 && !warnedRef.current) {
          warnedRef.current = true;
          playTimerWarning();
        }
        if (next <= 0) {
          clearInterval(timerRef.current!);
          handleAnswer("__timeout__", score, wrong, streak, bestStreak);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, isSpeed]);

  if (result) {
    return <Results result={result} onPlayAgain={onReplay} onBack={onBack} />;
  }

  const q = questions[currentQ];
  const LETTERS = ["A", "B", "C", "D"];
  const progress = (currentQ / questions.length) * 100;

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#888",
          fontSize: "1em",
          cursor: "pointer",
          padding: "8px 0",
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
        }}
      >
        ← Back to modes
      </button>

      {/* Progress bar */}
      <div style={{
        width: "100%",
        height: "8px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "10px",
        margin: "12px 0",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--primary), var(--secondary))",
          borderRadius: "10px",
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Speed timer bar */}
      {isSpeed && (
        <div style={{
          width: "100%",
          height: "6px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "10px",
          marginBottom: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${(timeLeft / 8000) * 100}%`,
            background: "linear-gradient(90deg, var(--success), var(--accent), var(--danger))",
            borderRadius: "10px",
            transition: "width 0.05s linear",
          }} />
        </div>
      )}

      {/* Question card */}
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
        {/* Top gradient bar */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "4px",
          background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
        }} />

        <div style={{
          fontSize: "0.85em",
          color: "var(--secondary)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "2px",
          marginBottom: "10px",
        }}>
          Question {currentQ + 1} of {questions.length}
          {isSpeed && ` • ⚡ Speed Round`}
        </div>

        {q.context && (
          <div style={{ fontSize: "0.95em", color: "#a0a0c0", fontStyle: "italic", marginBottom: "6px" }}>
            {q.context}
          </div>
        )}

        <div style={{
          fontSize: "1.5em",
          fontWeight: 900,
          margin: "10px 0 8px",
          lineHeight: 1.3,
        }}>
          {q.prompt}
        </div>

        <div style={{
          display: "inline-block",
          background: "rgba(108,92,231,0.2)",
          color: "var(--primary)",
          padding: "3px 14px",
          borderRadius: "20px",
          fontSize: "0.8em",
          fontWeight: 700,
          marginBottom: "20px",
        }}>
          {q.pos}
        </div>

        {/* Options */}
        <div style={{ display: "grid", gap: "12px", marginTop: "8px" }}>
          {q.options.map((opt, i) => {
            const isSelected = answered === opt;
            const isCorrect = opt === q.answer;
            let bg = "rgba(255,255,255,0.04)";
            let border = "2px solid rgba(255,255,255,0.1)";
            let letterBg = "rgba(108,92,231,0.2)";
            let letterColor = "var(--primary)";
            let animClass = "";

            if (answered !== null) {
              if (isCorrect) {
                bg = "rgba(0,184,148,0.15)";
                border = "2px solid var(--success)";
                letterBg = "var(--success)";
                letterColor = "white";
                animClass = "animate-correct-pop";
              } else if (isSelected && !isCorrect) {
                bg = "rgba(225,112,85,0.15)";
                border = "2px solid var(--danger)";
                letterBg = "var(--danger)";
                letterColor = "white";
                animClass = "animate-shake";
              }
            }

            return (
              <button
                key={opt}
                disabled={answered !== null}
                onClick={() => handleAnswer(opt, score, wrong, streak, bestStreak)}
                className={animClass}
                style={{
                  background: bg,
                  border,
                  borderRadius: "16px",
                  padding: "16px 20px",
                  cursor: answered !== null ? "default" : "pointer",
                  fontSize: "1.05em",
                  color: "var(--text)",
                  textAlign: "left",
                  fontFamily: "'Nunito', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.25s",
                  opacity: answered !== null && !isCorrect && !isSelected ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (answered === null) {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.background = "rgba(108,92,231,0.1)";
                    e.currentTarget.style.transform = "translateX(6px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (answered === null) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <span style={{
                  background: letterBg,
                  color: letterColor,
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.9em",
                  flexShrink: 0,
                  transition: "all 0.25s",
                }}>
                  {LETTERS[i]}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: "18px",
            padding: "16px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            fontSize: "1.1em",
            background: feedback.correct ? "rgba(0,184,148,0.12)" : "rgba(225,112,85,0.12)",
            color: feedback.correct ? "var(--success)" : "var(--danger)",
            border: `1px solid ${feedback.correct ? "rgba(0,184,148,0.3)" : "rgba(225,112,85,0.3)"}`,
          }} className="animate-fade-up">
            {feedback.text}
          </div>
        )}

        {/* Streak display */}
        {streak >= 2 && (
          <div style={{ marginTop: "10px", color: "var(--accent)", fontWeight: 700, fontSize: "0.9em" }}>
            🔥 {streak} streak!
          </div>
        )}
      </div>
    </div>
  );
}
