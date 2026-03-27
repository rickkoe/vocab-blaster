import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before redeeming a code." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const code = (body.code as string | undefined)?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "No code provided." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code: code,
    p_user_id: user.id,
  });

  if (error) {
    console.error("redeem_promo_code RPC error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  switch (data as string) {
    case "ok":
      return NextResponse.json({ success: true });
    case "invalid":
      return NextResponse.json({ error: "That code doesn't exist." }, { status: 404 });
    case "inactive":
      return NextResponse.json({ error: "That code is no longer active." }, { status: 410 });
    case "exhausted":
      return NextResponse.json({ error: "That code has reached its usage limit." }, { status: 410 });
    case "already_redeemed":
      return NextResponse.json({ error: "You've already redeemed this code." }, { status: 409 });
    default:
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
