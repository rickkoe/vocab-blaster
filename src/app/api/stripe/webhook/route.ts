import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || session.mode !== "subscription") break;

      await supabase
        .from("profiles")
        .update({
          subscription_status: "pro",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      if (!profile) break;

      const active = sub.status === "active" || sub.status === "trialing";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const periodEnd = (sub as any).current_period_end;
      await supabase
        .from("profiles")
        .update({
          subscription_status: active ? "pro" : "free",
          ...(periodEnd ? { subscription_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        })
        .eq("id", profile.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      if (!profile) break;

      await supabase
        .from("profiles")
        .update({
          subscription_status: "free",
          stripe_subscription_id: null,
          subscription_period_end: null,
        })
        .eq("id", profile.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
