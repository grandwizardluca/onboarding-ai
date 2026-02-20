-- ============================================
-- 007 UI Image Customization
-- Run this in the Supabase SQL Editor
-- ============================================

-- ─── 1. Storage bucket ───────────────────────────────────────────────────────
-- Public bucket so uploaded images are readable without auth
INSERT INTO storage.buckets (id, name, public)
VALUES ('ui-images', 'ui-images', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. ui_images table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ui_images (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('background', 'sidebar')),
  file_path    TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ui_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read ui_images" ON public.ui_images;
CREATE POLICY "Authenticated read ui_images"
  ON public.ui_images FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── 3. ui_settings singleton ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ui_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  background_mode TEXT NOT NULL DEFAULT 'standard'
                  CHECK (background_mode IN ('standard', 'image')),
  sidebar_mode    TEXT NOT NULL DEFAULT 'standard'
                  CHECK (sidebar_mode IN ('standard', 'image'))
);

ALTER TABLE public.ui_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read ui_settings" ON public.ui_settings;
CREATE POLICY "Authenticated read ui_settings"
  ON public.ui_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── 4. Seed default settings ─────────────────────────────────────────────────
INSERT INTO public.ui_settings (id, background_mode, sidebar_mode)
VALUES (1, 'standard', 'standard')
ON CONFLICT (id) DO NOTHING;
