-- Promo / access codes

create table public.promo_codes (
  code        text primary key,
  max_uses    integer,                             -- null = unlimited
  times_used  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Track which users have redeemed which codes (prevents double-redemption)
create table public.user_promos (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  code        text not null references public.promo_codes(code),
  redeemed_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.promo_codes enable row level security;
alter table public.user_promos enable row level security;

-- Users can see their own redemption history
create policy "Users can view own promo redemptions"
  on public.user_promos for select
  using (auth.uid() = user_id);

-- promo_codes and user_promos writes happen exclusively through the
-- redeem_promo_code function below (security definer bypasses RLS).

-- ── Atomic redemption function ────────────────────────────────
-- Returns one of: 'ok' | 'invalid' | 'inactive' | 'exhausted' | 'already_redeemed'
create or replace function public.redeem_promo_code(p_code text, p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_active      boolean;
  v_max_uses    integer;
  v_times_used  integer;
  v_already     boolean;
begin
  -- Lock the row so concurrent redemptions don't race past max_uses
  select active, max_uses, times_used
  into   v_active, v_max_uses, v_times_used
  from   public.promo_codes
  where  code = p_code
  for update;

  if not found then
    return 'invalid';
  end if;

  if not v_active then
    return 'inactive';
  end if;

  if v_max_uses is not null and v_times_used >= v_max_uses then
    return 'exhausted';
  end if;

  select exists(
    select 1 from public.user_promos
    where user_id = p_user_id and code = p_code
  ) into v_already;

  if v_already then
    return 'already_redeemed';
  end if;

  -- All checks passed — apply the redemption
  update public.promo_codes set times_used = times_used + 1 where code = p_code;
  insert into public.user_promos (user_id, code) values (p_user_id, p_code);
  update public.profiles set subscription_status = 'promo' where id = p_user_id;

  return 'ok';
end;
$$;
