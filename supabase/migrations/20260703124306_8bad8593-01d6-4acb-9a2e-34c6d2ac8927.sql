-- Fix avatars bucket SELECT policy to require ownership
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can view their own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Restrict assignments SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Public can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Assignments are viewable by everyone" ON public.assignments;

CREATE POLICY "Authenticated users can view assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.assignments FROM anon;
