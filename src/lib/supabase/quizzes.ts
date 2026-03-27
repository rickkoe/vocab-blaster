import { createClient } from "./client";
import type { QuizData, VocabWord } from "@/lib/types";

// ── DB row shape ──────────────────────────────────────────────
interface QuizRow {
  id: string;
  user_id: string;
  title: string;
  root_info: string;
  words: VocabWord[];
  source_file_name: string | null;
  created_at: string;
}

function rowToQuiz(row: QuizRow): QuizData {
  return {
    id: row.id,
    title: row.title,
    rootInfo: row.root_info,
    words: row.words,
    sourceFileName: row.source_file_name ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Queries ───────────────────────────────────────────────────

export async function getQuizzes(): Promise<QuizData[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuizRow[]).map(rowToQuiz);
}

export async function getQuiz(id: string): Promise<QuizData | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return rowToQuiz(data as QuizRow);
}

export async function saveQuiz(
  quiz: Omit<QuizData, "id" | "createdAt">
): Promise<QuizData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to save a quiz");

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      user_id: user.id,
      title: quiz.title,
      root_info: quiz.rootInfo,
      words: quiz.words,
      source_file_name: quiz.sourceFileName ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToQuiz(data as QuizRow);
}

export async function deleteQuiz(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) throw error;
}

// ── Stats (stored per-quiz in quiz_stats) ─────────────────────

interface StatsRow {
  quiz_id: string;
  best_score: number;
  games_played: number;
  best_streak: number;
}

export async function getQuizStats(
  quizId: string
): Promise<{ bestScore: number; gamesPlayed: number; bestStreak: number }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("quiz_stats")
    .select("*")
    .eq("quiz_id", quizId)
    .single();

  if (!data) return { bestScore: 0, gamesPlayed: 0, bestStreak: 0 };
  const row = data as StatsRow;
  return {
    bestScore: row.best_score,
    gamesPlayed: row.games_played,
    bestStreak: row.best_streak,
  };
}

export async function upsertQuizStats(
  quizId: string,
  pct: number,
  streak: number
): Promise<void> {
  const supabase = createClient();
  const existing = await getQuizStats(quizId);

  await supabase.from("quiz_stats").upsert(
    {
      quiz_id: quizId,
      best_score: Math.max(existing.bestScore, Math.round(pct)),
      games_played: existing.gamesPlayed + 1,
      best_streak: Math.max(existing.bestStreak, streak),
    },
    { onConflict: "quiz_id" }
  );
}
