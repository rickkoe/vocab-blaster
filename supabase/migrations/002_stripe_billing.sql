-- Add Stripe billing and subscription tracking to profiles

alter table public.profiles
  add column if not exists stripe_customer_id       text unique,
  add column if not exists subscription_status      text not null default 'free',
  add column if not exists stripe_subscription_id   text,
  add column if not exists subscription_period_end  timestamptz,
  add column if not exists monthly_quiz_count        integer not null default 0,
  add column if not exists quiz_count_reset_at       timestamptz not null default date_trunc('month', now());

-- Atomic increment to avoid race conditions
create or replace function public.increment_quiz_count(p_user_id uuid)
returns void as $$
begin
  update public.profiles
  set monthly_quiz_count = monthly_quiz_count + 1
  where id = p_user_id;
end;
$$ language plpgsql security definer;
