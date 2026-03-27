import type { QuizData, QuizStats, PendingQuizData } from "./types";

const QUIZZES_KEY = "vb_quizzes";
const STATS_KEY = "vb_stats";
const PENDING_KEY = "vb_pending";

export function savePending(data: PendingQuizData): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(data));
}

export function getPending(): PendingQuizData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  localStorage.removeItem(PENDING_KEY);
}

export function saveQuiz(quiz: QuizData): void {
  const quizzes = getQuizzes();
  const existing = quizzes.findIndex((q) => q.id === quiz.id);
  if (existing >= 0) {
    quizzes[existing] = quiz;
  } else {
    quizzes.unshift(quiz);
  }
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes.slice(0, 50)));
}

export function getQuizzes(): QuizData[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUIZZES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getQuiz(id: string): QuizData | null {
  return getQuizzes().find((q) => q.id === id) ?? null;
}

export function deleteQuiz(id: string): void {
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function getStats(): QuizStats {
  if (typeof window === "undefined") return { streak: 0, bestScore: 0, gamesPlayed: 0 };
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{"streak":0,"bestScore":0,"gamesPlayed":0}');
  } catch {
    return { streak: 0, bestScore: 0, gamesPlayed: 0 };
  }
}

export function updateStats(pct: number, currentStreak: number): QuizStats {
  const stats = getStats();
  stats.gamesPlayed += 1;
  if (pct > stats.bestScore) stats.bestScore = Math.round(pct);
  if (currentStreak > stats.streak) stats.streak = currentStreak;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}
