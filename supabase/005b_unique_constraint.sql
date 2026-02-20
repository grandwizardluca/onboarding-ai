-- ============================================
-- 005b Fix unique constraint for subtopic tracking
-- Run this BEFORE deploying Phase 3 code.
-- ============================================

-- Drop the old constraint that only allows one row per (conversation, topic).
-- PostgreSQL auto-named it based on table + column names.
ALTER TABLE public.conversation_topics
  DROP CONSTRAINT IF EXISTS conversation_topics_conversation_id_topic_key_key;

-- For Phase 3+ rows that carry a subtopic_key:
-- unique per (conversation, topic, subtopic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_topics_with_subtopic
  ON public.conversation_topics (conversation_id, topic_key, subtopic_key)
  WHERE subtopic_key IS NOT NULL;

-- For legacy rows that have no subtopic_key (pre-Phase-3 data):
-- keep the old uniqueness guarantee
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_topics_without_subtopic
  ON public.conversation_topics (conversation_id, topic_key)
  WHERE subtopic_key IS NULL;
