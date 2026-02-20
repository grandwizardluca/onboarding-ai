-- ============================================
-- 005 Subtopics
-- Run this in the Supabase SQL Editor
-- ============================================

-- ─── 1. Add subtopic_key columns ─────────────────────────────────────────────

ALTER TABLE public.conversation_topics
  ADD COLUMN IF NOT EXISTS subtopic_key TEXT;

ALTER TABLE public.quiz_scores
  ADD COLUMN IF NOT EXISTS subtopic_key TEXT;


-- ─── 2. Rename topic keys from hyphen to underscore format ───────────────────
-- Simple 1-to-1 renames: no unique constraint conflict possible

UPDATE public.conversation_topics
  SET topic_key = 'demand_supply'
  WHERE topic_key = 'demand-supply';

UPDATE public.conversation_topics
  SET topic_key = 'market_failure',
      topic_label = 'Market Failure'
  WHERE topic_key = 'market-failure';

UPDATE public.conversation_topics
  SET topic_key = 'firms_decisions',
      topic_label = 'Firms & Decisions'
  WHERE topic_key = 'firms-decisions';

UPDATE public.conversation_topics
  SET topic_key = 'govt_micro_intervention',
      topic_label = 'Govt Micro Intervention'
  WHERE topic_key = 'government-micro';

UPDATE public.conversation_topics
  SET topic_key = 'national_income',
      topic_label = 'National Income & Standard of Living'
  WHERE topic_key = 'national-income';

UPDATE public.conversation_topics
  SET topic_key = 'economic_growth',
      topic_label = 'Economic Growth'
  WHERE topic_key = 'economic-growth';

UPDATE public.conversation_topics
  SET topic_key = 'international_trade',
      topic_label = 'International Trade'
  WHERE topic_key = 'trade';

UPDATE public.conversation_topics
  SET topic_key = 'exchange_rates_bop',
      topic_label = 'Exchange Rates & BOP'
  WHERE topic_key = 'exchange-rate';

UPDATE public.conversation_topics
  SET topic_key = 'fiscal_supply_side',
      topic_label = 'Fiscal & Supply-Side Policies'
  WHERE topic_key = 'fiscal-policy';


-- ─── 3. Merge old elasticity rows into demand_supply ─────────────────────────
-- Two cases to handle due to the unique(conversation_id, topic_key) constraint.

-- Case A: conversation has elasticity but no demand_supply yet → rename directly
UPDATE public.conversation_topics
  SET topic_key = 'demand_supply',
      topic_label = 'Demand & Supply'
  WHERE topic_key = 'elasticity'
    AND conversation_id NOT IN (
      SELECT conversation_id
      FROM public.conversation_topics
      WHERE topic_key = 'demand_supply'
    );

-- Case B: conversation already has demand_supply (renamed from demand-supply above)
-- → add elasticity mention_count to it, then delete the elasticity row
UPDATE public.conversation_topics AS dst
  SET mention_count = dst.mention_count + src.mention_count
  FROM public.conversation_topics AS src
  WHERE dst.topic_key   = 'demand_supply'
    AND src.topic_key   = 'elasticity'
    AND dst.conversation_id = src.conversation_id;

DELETE FROM public.conversation_topics
  WHERE topic_key = 'elasticity';


-- ─── 4. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conversation_topics_user_subtopic
  ON public.conversation_topics (user_id, topic_key, subtopic_key);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_subtopic
  ON public.quiz_scores (user_id, topic_key, subtopic_key);
