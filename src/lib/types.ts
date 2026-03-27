export interface VocabWord {
  word: string;
  pos: string; // part of speech
  def: string; // full definition
  short: string; // short definition (5-7 words)
  root: string; // root word info
  sentences?: string[]; // example sentences with blank
}

export interface QuizData {
  id: string;
  title: string; // e.g., "TRACT = pull"
  rootInfo: string; // e.g., "Latin root TRACT means 'pull'"
  words: VocabWord[];
  createdAt: string;
  sourceFileName?: string;
}

export interface PendingQuizData {
  title: string;
  rootInfo: string;
  words: VocabWord[];
  sourceFileName?: string;
}

export type GameMode = "classic" | "reverse" | "spell" | "match" | "speed" | "study";

export interface QuizStats {
  streak: number;
  bestScore: number;
  gamesPlayed: number;
}

export interface GameResult {
  correct: number;
  wrong: number;
  bestStreak: number;
  total: number;
  mode: GameMode;
}
