"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QuizData, GameResult, VocabWord } from "@/lib/types";
import { shuffle, pickRandom } from "@/lib/utils";
import { playCorrect, playWrong, playStreak } from "@/lib/sounds";
import Results from "./Results";

interface Question {
  sentence: string;       // full sentence with ___ placeholder
  answer: string;         // the correct word
  options: string[];      // 4 shuffled word choices
  pos: string;
  vocabWord: VocabWord;
}

interface Props {
  quiz: QuizData;
  onBack: () => void;
  onReplay: () => void;
}

function buildQuestions(words: VocabWord[], allWords: VocabWord[]): Question[] {
  return shuffle(words).map((v) => {
    const sentence =
      v.sentences?.[Math.floor(Math.random() * (v.sentences?.length ?? 1))] ??
      `The definition of ___ is: ${v.def}`;
    const distractors = pickRandom(
      allWords.filter((x) => x.word !== v.word),
      3,
    ).map((x) => x.word);
    return {
      sentence,
      answer: v.word,
      options: shuffle([v.word, ...distractors]),
      pos: v.pos,
      vocabWord: v,
    };
  });
}

// Render sentence with ___ as a highlighted blank
function SentenceWithBlank({ sentence, filled }: { sentence: string; filled?: string }) {
  const parts = sentence.split("___");
  return (
    <span>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{
              display: "inline-block",
              borderBottom: filled ? "none" : "2.5px solid var(--accent)",
              background: filled ? "rgba(108,92,231,0.2)" : "transparent",
              color: filled ? "var(--accent)" : "inherit",
              fontWeight: filled ? 900 : "inherit",
              padding: filled ? "0 8px" : "0 4px",
              borderRadius: filled ? "6px" : 0,
              minWidth: "70px",
              textAlign: "center",
            }}>
              {filled ?? "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function FillBlank({ quiz, onBack, onReplay }: Props) {
  const [questions, setQuestions] = useState<Question[]>(() =>
    buildQuestions(quiz.words, quiz.words),
  );
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    new Array(quiz.words.length).fill(null),
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [activeQ, setActiveQ] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  const activeQRef = useRef(0);

  const resetWithWords = useCallback((words: VocabWord[]) => {
    const qs = buildQuestions(words, quiz.words);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setCurrentQ(0);
    setActiveQ(0);
    setScore(0);
    setWrong(0);
    setStreak(0);
    setBestStreak(0);
    setResult(null);
    setShowReview(false);
    activeQRef.current = 0;
  }, [quiz.words]);

  const endGame = useCallback((
    finalScore: number,
    finalWrong: number,
    finalBestStreak: number,
    total: number,
  ) => {
    setResult({ correct: finalScore, wrong: finalWrong, bestStreak: finalBestStreak, total, mode: "spell" });
  }, []);

  const handleAnswer = useCallback((
    opt: string,
    curScore: number,
    curWrong: number,
    curStreak: number,
    curBestStreak: number,
    qIndex: number,
    qs: Question[],
  ) => {
    const isCorrect = opt === qs[qIndex].answer;
    let newScore = curScore;
    let newWrong = curWrong;
    let newStreak = curStreak;
    let newBestStreak = curBestStreak;

    if (isCorrect) {
      newScore += 1;
      newStreak += 1;
      if (newStreak > newBestStreak) newBestStreak = newStreak;
      if (newStreak >= 3) playStreak(); else playCorrect();
    } else {
      newWrong += 1;
      newStreak = 0;
      playWrong();
    }

    setAnswers((prev) => { const next = [...prev]; next[qIndex] = opt; return next; });
    setScore(newScore);
    setWrong(newWrong);
    setStreak(newStreak);
    setBestStreak(newBestStreak);
  }, []);

  const handleNext = useCallback(() => {
    if (currentQ < activeQ) {
      setCurrentQ(currentQ + 1);
    } else if (answers[activeQ] !== null) {
      if (activeQ + 1 >= questions.length) {
        setShowReview(true);
      } else {
        const next = activeQ + 1;
        setActiveQ(next);
        setCurrentQ(next);
        activeQRef.current = next;
      }
    }
  }, [currentQ, activeQ, answers, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  }, [currentQ]);

  // ── Final results ──────────────────────────────────────────────────
  if (result) {
    const missedWords = questions
      .filter((q, i) => answers[i] !== q.answer)
      .map((q) => q.vocabWord);
    return (
      <Results
        result={result}
        onPlayAgain={onReplay}
        onBack={onBack}
        missedWords={missedWords.length > 0 ? missedWords : undefined}
        onPracticeMissed={missedWords.length > 0 ? () => resetWithWords(missedWords) : undefined}
      />
    );
  }

  // ── Review screen ──────────────────────────────────────────────────
  if (showReview) {
    const missedCount = questions.filter((q, i) => answers[i] !== q.answer).length;
    const missedWords = questions
      .filter((q, i) => answers[i] !== q.answer)
      .map((q) => q.vocabWord);

    return (
      <div className="animate-fade-up">
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.6em", color: "var(--text)", marginBottom: "6px", textAlign: "center" }}>
          Quiz Review
        </div>
        <div style={{ color: "#a0a0c0", fontSize: "0.9em", textAlign: "center", marginBottom: "20px" }}>
          {score} of {questions.length} correct
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {questions.map((q, i) => {
            const chosen = answers[i];
            const isCorrect = chosen === q.answer;
            return (
              <div key={i} style={{
                background: isCorrect ? "rgba(0,184,148,0.08)" : "rgba(225,112,85,0.08)",
                border: `1.5px solid ${isCorrect ? "rgba(0,184,148,0.3)" : "rgba(225,112,85,0.3)"}`,
                borderRadius: "16px",
                padding: "14px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "1.2em", flexShrink: 0, lineHeight: 1.3 }}>
                    {isCorrect ? "✅" : "❌"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9em", color: "#a0a0c0", fontStyle: "italic", marginBottom: "4px", lineHeight: 1.4 }}>
                      <SentenceWithBlank sentence={q.sentence} filled={q.answer} />
                    </div>
                    {!isCorrect && (
                      <>
                        <div style={{ fontSize: "0.82em", color: "var(--danger)", marginBottom: "2px" }}>
                          Your answer: {chosen ?? "—"}
                        </div>
                        <div style={{ fontSize: "0.82em", color: "var(--success)" }}>
                          Correct: {q.answer}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {missedCount > 0 && (
            <button
              onClick={() => resetWithWords(missedWords)}
              style={{
                padding: "16px",
                background: "linear-gradient(135deg, var(--danger), #e17055aa)",
                color: "white",
                border: "none",
                borderRadius: "50px",
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.1em",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              Practice {missedCount} Missed →
            </button>
          )}
          <button
            onClick={() => endGame(score, wrong, bestStreak, questions.length)}
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, var(--secondary), #00b894)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.05em",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            See Results →
          </button>
        </div>
      </div>
    );
  }

  // ── Question ───────────────────────────────────────────────────────
  const q = questions[currentQ];
  const currentAnswer = answers[currentQ];
  const isReadOnly = currentQ < activeQ;
  const hasAnswered = currentAnswer !== null;
  const canGoNext = isReadOnly || hasAnswered;
  const canGoPrev = currentQ > 0;
  const LETTERS = ["A", "B", "C", "D"];
  const progress = (activeQ / questions.length) * 100;

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#888", fontSize: "1em", cursor: "pointer", padding: "8px 0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
      >
        ← Back to modes
      </button>

      {/* Progress bar */}
      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", margin: "12px 0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--primary), var(--secondary))", borderRadius: "10px", transition: "width 0.5s ease" }} />
      </div>

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
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "4px",
          background: isReadOnly
            ? "linear-gradient(90deg, #555, #777)"
            : "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
        }} />

        <div style={{ fontSize: "0.85em", color: isReadOnly ? "#666" : "var(--secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
          📝 Fill in the Blank — {currentQ + 1} of {questions.length}
          {isReadOnly && " • Review"}
        </div>

        {/* Sentence */}
        <div style={{
          fontSize: "1.35em",
          fontWeight: 700,
          lineHeight: 1.6,
          margin: "0 0 10px",
          color: "var(--text)",
          fontFamily: "'Nunito', sans-serif",
        }}>
          <SentenceWithBlank
            sentence={q.sentence}
            filled={hasAnswered ? q.answer : undefined}
          />
        </div>

        <div style={{
          display: "inline-block",
          background: "rgba(108,92,231,0.2)",
          color: "var(--primary)",
          padding: "3px 14px",
          borderRadius: "20px",
          fontSize: "0.8em",
          fontWeight: 700,
          marginBottom: "22px",
        }}>
          {q.pos}
        </div>

        {/* Options */}
        <div style={{ display: "grid", gap: "10px" }}>
          {q.options.map((opt, i) => {
            const isSelected = currentAnswer === opt;
            const isCorrect = opt === q.answer;
            let bg = "rgba(255,255,255,0.04)";
            let border = "2px solid rgba(255,255,255,0.1)";
            let letterBg = "rgba(108,92,231,0.2)";
            let letterColor = "var(--primary)";
            let animClass = "";

            if (hasAnswered) {
              if (isCorrect) {
                bg = "rgba(0,184,148,0.15)";
                border = "2px solid var(--success)";
                letterBg = "var(--success)";
                letterColor = "white";
                if (!isReadOnly) animClass = "animate-correct-pop";
              } else if (isSelected) {
                bg = "rgba(225,112,85,0.15)";
                border = "2px solid var(--danger)";
                letterBg = "var(--danger)";
                letterColor = "white";
                if (!isReadOnly) animClass = "animate-shake";
              }
            }

            return (
              <button
                key={opt}
                disabled={hasAnswered || isReadOnly}
                onClick={() => handleAnswer(opt, score, wrong, streak, bestStreak, currentQ, questions)}
                className={animClass}
                style={{
                  background: bg,
                  border,
                  borderRadius: "16px",
                  padding: "14px 20px",
                  cursor: hasAnswered || isReadOnly ? "default" : "pointer",
                  fontSize: "1.05em",
                  color: "var(--text)",
                  textAlign: "left",
                  fontFamily: "'Nunito', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.25s",
                  opacity: hasAnswered && !isCorrect && !isSelected ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!hasAnswered && !isReadOnly) {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.background = "rgba(108,92,231,0.1)";
                    e.currentTarget.style.transform = "translateX(6px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasAnswered && !isReadOnly) {
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
                <span style={{ fontWeight: 700 }}>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {hasAnswered && (
          <div style={{
            marginTop: "16px",
            padding: "14px 20px",
            borderRadius: "16px",
            fontWeight: 700,
            fontSize: "1em",
            background: currentAnswer === q.answer ? "rgba(0,184,148,0.12)" : "rgba(225,112,85,0.12)",
            color: currentAnswer === q.answer ? "var(--success)" : "var(--danger)",
            border: `1px solid ${currentAnswer === q.answer ? "rgba(0,184,148,0.3)" : "rgba(225,112,85,0.3)"}`,
          }} className={isReadOnly ? "" : "animate-fade-up"}>
            {currentAnswer === q.answer
              ? `✅ Correct! "${q.answer}"`
              : `❌ The answer was "${q.answer}"`}
          </div>
        )}

        {/* Streak */}
        {streak >= 2 && currentQ === activeQ && !isReadOnly && (
          <div style={{ marginTop: "10px", color: "var(--accent)", fontWeight: 700, fontSize: "0.9em" }}>
            🔥 {streak} streak!
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", gap: "10px" }}>
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          style={{
            padding: "12px 22px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50px",
            color: canGoPrev ? "#a0a0c0" : "transparent",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1em",
            cursor: canGoPrev ? "pointer" : "default",
            transition: "all 0.2s",
            pointerEvents: canGoPrev ? "auto" : "none",
          }}
          onMouseEnter={(e) => { if (canGoPrev) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        >
          ← Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext}
          style={{
            padding: "12px 28px",
            background: canGoNext ? "linear-gradient(135deg, var(--primary), #8b5cf6)" : "rgba(255,255,255,0.05)",
            border: canGoNext ? "none" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50px",
            color: canGoNext ? "white" : "#555",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1em",
            cursor: canGoNext ? "pointer" : "default",
            transition: "all 0.2s",
            boxShadow: canGoNext ? "0 3px 14px rgba(108,92,231,0.35)" : "none",
          }}
          onMouseEnter={(e) => { if (canGoNext) e.currentTarget.style.transform = "scale(1.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {currentQ === activeQ && hasAnswered && activeQ + 1 >= questions.length
            ? "Review Answers →"
            : "Next →"}
        </button>
      </div>
    </div>
  );
}
