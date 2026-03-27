export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function scoreEmoji(pct: number): { emoji: string; title: string } {
  if (pct === 100) return { emoji: "🏆", title: "PERFECT!" };
  if (pct >= 90) return { emoji: "🔥", title: "On Fire!" };
  if (pct >= 80) return { emoji: "⭐", title: "Excellent!" };
  if (pct >= 70) return { emoji: "💪", title: "Great Job!" };
  if (pct >= 60) return { emoji: "👍", title: "Good Try!" };
  if (pct >= 50) return { emoji: "🤔", title: "Keep Practicing!" };
  return { emoji: "💡", title: "Study Up!" };
}
