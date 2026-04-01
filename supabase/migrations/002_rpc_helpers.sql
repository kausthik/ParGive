-- Run this in your Supabase SQL editor after the initial schema migration.
-- This adds the RPC helper used by the Stripe webhook.

create or replace function public.increment_charity_members(p_charity_id uuid)
returns void as $$
begin
  update public.charities
  set member_count = member_count + 1,
      updated_at   = now()
  where id = p_charity_id;
end;
$$ language plpgsql security definer;

-- Also grant usage to the anon/authenticated roles so the webhook (service role) can call it
grant execute on function public.increment_charity_members(uuid) to service_role;

-- Decrement helper (for when subscription is cancelled and user changes charity)
create or replace function public.decrement_charity_members(p_charity_id uuid)
returns void as $$
begin
  update public.charities
  set member_count = greatest(0, member_count - 1),
      updated_at   = now()
  where id = p_charity_id;
end;
$$ language plpgsql security definer;

grant execute on function public.decrement_charity_members(uuid) to service_role;

-- Update total_raised for a charity (call after marking winners as paid)
create or replace function public.update_charity_total_raised()
returns trigger as $$
begin
  -- Recalculate total raised from all active subscriptions for that charity
  update public.charities c
  set total_raised = (
    select coalesce(sum(
      case s.plan
        when 'monthly' then 9.99 * s.charity_percentage / 100.0
        when 'yearly'  then 89.99 / 12.0 * s.charity_percentage / 100.0
      end
    ), 0)
    from public.subscriptions s
    where s.charity_id = c.id and s.status = 'active'
  ) * 12  -- annualised estimate
  where c.id in (
    select charity_id from public.subscriptions where user_id = new.user_id
  );
  return new;
end;
$$ language plpgsql security definer;
