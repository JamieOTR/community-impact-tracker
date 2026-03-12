-- PATH: supabase/migrations/20260224190000_rewards_payout_lifecycle.sql
-- Purpose: Add missing payout lifecycle fields to rewards, without DROP/DELETE.
-- Safe for production: additive-only changes.

BEGIN;

-- 1) Add payout lifecycle columns (additive-only)
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS network varchar(50),
  ADD COLUMN IF NOT EXISTS error_code varchar(100),
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_batch_id uuid;

-- 2) Improve status consistency (optional guardrails)
-- Keep as varchar to avoid destructive enum migrations.
ALTER TABLE public.rewards
  ALTER COLUMN status SET DEFAULT 'pending';

-- 3) Indexes for payout operations
CREATE INDEX IF NOT EXISTS rewards_status_idx ON public.rewards(status);
CREATE INDEX IF NOT EXISTS rewards_user_status_idx ON public.rewards(user_id, status);
CREATE INDEX IF NOT EXISTS rewards_paid_at_idx ON public.rewards(paid_at);
CREATE INDEX IF NOT EXISTS rewards_payout_batch_idx ON public.rewards(payout_batch_id);

-- 4) Canonical payout function: marks reward paid + increments token_balance atomically
-- This is the governance rule you approved:
-- - Approval creates rewards row (pending)
-- - Payout marks paid + updates users.token_balance += token_amount
CREATE OR REPLACE FUNCTION public.process_reward_payout(
  p_reward_id uuid,
  p_tx_hash text,
  p_network varchar,
  p_wallet_address varchar,
  p_mark_status varchar DEFAULT 'paid'
)
RETURNS TABLE (
  reward_id uuid,
  user_id uuid,
  token_amount integer,
  status varchar,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
  v_current_status varchar;
BEGIN
  -- Lock the reward row to prevent double-pay
  SELECT r.user_id, r.token_amount, r.status
    INTO v_user_id, v_amount, v_current_status
  FROM public.rewards r
  WHERE r.reward_id = p_reward_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reward not found: %', p_reward_id;
  END IF;

  -- Idempotency: if already paid/confirmed, return current state without re-credit
  IF v_current_status IN ('paid', 'confirmed') THEN
    RETURN QUERY
      SELECT r.reward_id, r.user_id, r.token_amount, r.status, r.paid_at
      FROM public.rewards r
      WHERE r.reward_id = p_reward_id;
    RETURN;
  END IF;

  -- Only pending can be paid
  IF v_current_status <> 'pending' THEN
    RAISE EXCEPTION 'Reward not payable in status: % (reward_id=%)', v_current_status, p_reward_id;
  END IF;

  -- 1) Update reward payout metadata
  UPDATE public.rewards
  SET
    status = COALESCE(p_mark_status, 'paid'),
    paid_at = now(),
    tx_hash = p_tx_hash,
    -- Maintain legacy compatibility if your UI still looks at transaction_hash
    transaction_hash = COALESCE(transaction_hash, LEFT(p_tx_hash, 66)),
    network = p_network,
    wallet_address = p_wallet_address,
    error_code = NULL,
    error_message = NULL,
    last_retry_at = NULL
  WHERE reward_id = p_reward_id;

  -- 2) Credit user's stored balance (paid-only accounting)
  UPDATE public.users
  SET token_balance = COALESCE(token_balance, 0) + v_amount
  WHERE user_id = v_user_id;

  RETURN QUERY
    SELECT r.reward_id, r.user_id, r.token_amount, r.status, r.paid_at
    FROM public.rewards r
    WHERE r.reward_id = p_reward_id;
END;
$$;

-- 5) Failure function: records error + increments retry metadata (no balance changes)
CREATE OR REPLACE FUNCTION public.mark_reward_failed(
  p_reward_id uuid,
  p_error_code varchar,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rewards
  SET
    status = 'failed',
    error_code = p_error_code,
    error_message = p_error_message,
    retry_count = COALESCE(retry_count, 0) + 1,
    last_retry_at = now()
  WHERE reward_id = p_reward_id;
END;
$$;

COMMIT;