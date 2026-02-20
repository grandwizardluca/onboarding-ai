-- ============================================
-- 004 Quiz Mode
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Add type column to conversations (chat or quiz)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'chat';

-- 2. Quiz scores table
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations ON DELETE CASCADE NOT NULL,
  topic_key TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

-- Users can read their own quiz scores
CREATE POLICY "Users can read own quiz_scores"
  ON public.quiz_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert quiz scores (called from API with service key)
CREATE POLICY "Service role can insert quiz_scores"
  ON public.quiz_scores FOR INSERT
  WITH CHECK (true);
