
-- Function to get shared note content by slug (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_shared_note(p_slug text)
RETURNS TABLE(title text, content text, color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.title, n.content, n.color
  FROM shared_notes sn
  JOIN notes n ON n.id = sn.note_id
  WHERE sn.public_slug = p_slug
    AND (sn.expires_at IS NULL OR sn.expires_at > now())
  LIMIT 1;
$$;
