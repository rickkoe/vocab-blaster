import { createClient } from "./client";

export const FREE_MONTHLY_LIMIT = 5;

export interface UsageStatus {
  subscriptionStatus: "free" | "pro" | "promo";
  monthlyCount: number;
  canCreate: boolean;
  remainingFree: number; // Infinity for pro/promo
}

export async function getUsageStatus(): Promise<UsageStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      subscriptionStatus: "free",
      monthlyCount: 0,
      canCreate: true,
      remainingFree: FREE_MONTHLY_LIMIT,
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("subscription_status, monthly_quiz_count, quiz_count_reset_at")
    .eq("id", user.id)
    .single();

  if (!data) {
    return {
      subscriptionStatus: "free",
      monthlyCount: 0,
      canCreate: true,
      remainingFree: FREE_MONTHLY_LIMIT,
    };
  }

  const status = (data.subscription_status as "free" | "pro" | "promo") ?? "free";

  // Check whether the monthly counter needs resetting
  const resetAt = new Date(data.quiz_count_reset_at as string);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - resetAt.getFullYear()) * 12 +
    (now.getMonth() - resetAt.getMonth());

  let count = data.monthly_quiz_count as number;
  if (monthsElapsed >= 1) {
    // Fire-and-forget reset; server will also reset on next extract call
    supabase
      .from("profiles")
      .update({
        monthly_quiz_count: 0,
        quiz_count_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      })
      .eq("id", user.id);
    count = 0;
  }

  const hasFullAccess = status === "pro" || status === "promo";
  const canCreate = hasFullAccess || count < FREE_MONTHLY_LIMIT;
  const remainingFree = hasFullAccess ? Infinity : Math.max(0, FREE_MONTHLY_LIMIT - count);

  return { subscriptionStatus: status, monthlyCount: count, canCreate, remainingFree };
}
