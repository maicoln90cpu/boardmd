
-- Shared notes table for public read-only links
CREATE TABLE public.shared_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  public_slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

-- RLS
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can create own shared notes"
  ON public.shared_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shared notes"
  ON public.shared_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared notes"
  ON public.shared_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public read policy (anyone can read by slug, for the public route)
CREATE POLICY "Anyone can read shared notes by slug"
  ON public.shared_notes FOR SELECT TO anon
  USING (true);
